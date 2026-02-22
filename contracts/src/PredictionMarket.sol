// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/// @title PredictX — Prediction Market on Monad Testnet
/// @notice Constant-product AMM with Pyth oracle + community vote resolution
/// @dev Deploy to Monad Testnet (chainId 10143)

interface IPyth {
    struct Price {
        int64 price;
        uint64 conf;
        int32 expo;
        uint publishTime;
    }
    function getPriceUnsafe(bytes32 id) external view returns (Price memory price);
}

contract PredictionMarket {
    // ─── Constants ────────────────────────────────────────────────────────────
    uint256 public constant PLATFORM_FEE_BPS = 100; // 1%
    uint256 public constant INITIAL_LIQUIDITY = 0.001 ether; // seed both sides equally
    uint256 public constant VOTE_WINDOW = 48 hours;
    uint256 public constant MIN_BET = 0.0001 ether;

    // ─── Enums / Structs ──────────────────────────────────────────────────────
    enum ResolutionType { Pyth, CommunityVote }
    enum Outcome { Open, Yes, No, Cancelled }

    struct Market {
        address creator;
        string question;
        uint256 deadline;         // unix timestamp — no new bets after this
        uint256 voteDeadline;     // deadline + VOTE_WINDOW (for community vote)
        ResolutionType resolutionType;
        // Pyth fields
        bytes32 pythFeedId;
        int64 targetPrice;        // in Pyth price units (adjust for expo)
        bool targetAbove;         // true = resolve YES if price > target
        // Pool
        uint256 yesPool;          // total MON in YES side
        uint256 noPool;           // total MON in NO side
        // Resolution
        Outcome outcome;
        uint256 yesVotes;
        uint256 noVotes;
        bool feesWithdrawn;
    }

    // ─── State ────────────────────────────────────────────────────────────────
    IPyth public immutable pyth;
    address public owner;
    address public treasury;

    uint256 public marketCount;
    mapping(uint256 => Market) public markets;

    /// user => marketId => yes shares
    mapping(address => mapping(uint256 => uint256)) public yesShares;
    /// user => marketId => no shares
    mapping(address => mapping(uint256 => uint256)) public noShares;
    /// user => marketId => already voted (community vote)
    mapping(address => mapping(uint256 => bool)) public hasVoted;
    /// user => marketId => already claimed
    mapping(address => mapping(uint256 => bool)) public hasClaimed;

    // ─── Events ───────────────────────────────────────────────────────────────
    event MarketCreated(uint256 indexed marketId, address indexed creator, string question, ResolutionType resType);
    event BoughtYes(uint256 indexed marketId, address indexed buyer, uint256 amountIn, uint256 shares);
    event BoughtNo(uint256 indexed marketId, address indexed buyer, uint256 amountIn, uint256 shares);
    event Sold(uint256 indexed marketId, address indexed seller, bool isYes, uint256 shares, uint256 amountOut);
    event Voted(uint256 indexed marketId, address indexed voter, bool voteYes);
    event Resolved(uint256 indexed marketId, Outcome outcome);
    event WinningsClaimed(uint256 indexed marketId, address indexed user, uint256 amount);

    // ─── Errors ───────────────────────────────────────────────────────────────
    error MarketNotOpen();
    error MarketNotResolved();
    error DeadlinePassed();
    error DeadlineNotPassed();
    error VoteWindowClosed();
    error AlreadyVoted();
    error AlreadyClaimed();
    error InsufficientShares();
    error BelowMinBet();
    error OnlyOwner();
    error ZeroShares();

    // ─── Modifiers ────────────────────────────────────────────────────────────
    modifier onlyOwner() {
        if (msg.sender != owner) revert OnlyOwner();
        _;
    }

    modifier marketOpen(uint256 marketId) {
        Market storage m = markets[marketId];
        if (m.outcome != Outcome.Open) revert MarketNotOpen();
        if (block.timestamp >= m.deadline) revert DeadlinePassed();
        _;
    }

    // ─── Constructor ──────────────────────────────────────────────────────────
    constructor(address _pyth, address _treasury) {
        pyth = IPyth(_pyth);
        treasury = _treasury;
        owner = msg.sender;
    }

    // ─── Create Market ────────────────────────────────────────────────────────
    /// @notice Create a new prediction market and seed both YES and NO pools
    function createMarket(
        string calldata question,
        uint256 deadline,
        ResolutionType resType,
        bytes32 pythFeedId,
        int64 targetPrice,
        bool targetAbove
    ) external payable returns (uint256 marketId) {
        require(deadline > block.timestamp, "Deadline in past");
        require(msg.value >= INITIAL_LIQUIDITY, "Seed with >= 0.001 MON");

        marketId = marketCount++;
        uint256 seedEach = msg.value / 2;

        markets[marketId] = Market({
            creator: msg.sender,
            question: question,
            deadline: deadline,
            voteDeadline: deadline + VOTE_WINDOW,
            resolutionType: resType,
            pythFeedId: pythFeedId,
            targetPrice: targetPrice,
            targetAbove: targetAbove,
            yesPool: seedEach,
            noPool: msg.value - seedEach,
            outcome: Outcome.Open,
            yesVotes: 0,
            noVotes: 0,
            feesWithdrawn: false
        });

        // Creator gets equal shares in both sides as seed LP
        yesShares[msg.sender][marketId] = seedEach;
        noShares[msg.sender][marketId] = msg.value - seedEach;

        emit MarketCreated(marketId, msg.sender, question, resType);
    }

    // ─── Internal Share Tracking ──────────────────────────────────────────────
    /// Total outstanding YES shares
    uint256 private _totalYesShares;
    /// Total outstanding NO shares
    uint256 private _totalNoShares;
    // NOTE: per-market tracking — for a multi-market contract, these are per marketId
    // Stored in secondary mappings below:

    mapping(uint256 => uint256) public totalYesShares; // marketId => total yes shares
    mapping(uint256 => uint256) public totalNoShares;  // marketId => total no shares

    // ─── Buy ──────────────────────────────────────────────────────────────────
    /// @notice Buy YES shares
    /// Shares are pro-rata: shares = (netIn / yesPool) * totalYesShares, or 1:1 if first buyer
    function buyYes(uint256 marketId) external payable marketOpen(marketId) {
        if (msg.value < MIN_BET) revert BelowMinBet();
        Market storage m = markets[marketId];

        uint256 fee = (msg.value * PLATFORM_FEE_BPS) / 10000;
        uint256 netIn = msg.value - fee;

        uint256 shares;
        uint256 totalShares = totalYesShares[marketId];
        if (totalShares == 0 || m.yesPool == 0) {
            shares = netIn; // 1:1 for first buyer
        } else {
            shares = (netIn * totalShares) / m.yesPool;
        }
        if (shares == 0) revert ZeroShares();

        m.yesPool += netIn;
        totalYesShares[marketId] += shares;
        yesShares[msg.sender][marketId] += shares;

        payable(treasury).transfer(fee);

        emit BoughtYes(marketId, msg.sender, msg.value, shares);
    }

    /// @notice Buy NO shares
    function buyNo(uint256 marketId) external payable marketOpen(marketId) {
        if (msg.value < MIN_BET) revert BelowMinBet();
        Market storage m = markets[marketId];

        uint256 fee = (msg.value * PLATFORM_FEE_BPS) / 10000;
        uint256 netIn = msg.value - fee;

        uint256 shares;
        uint256 totalShares = totalNoShares[marketId];
        if (totalShares == 0 || m.noPool == 0) {
            shares = netIn;
        } else {
            shares = (netIn * totalShares) / m.noPool;
        }
        if (shares == 0) revert ZeroShares();

        m.noPool += netIn;
        totalNoShares[marketId] += shares;
        noShares[msg.sender][marketId] += shares;

        payable(treasury).transfer(fee);

        emit BoughtNo(marketId, msg.sender, msg.value, shares);
    }

    // ─── Sell ─────────────────────────────────────────────────────────────────
    /// @notice Sell YES shares back to the pool before deadline
    function sellYes(uint256 marketId, uint256 shares) external marketOpen(marketId) {
        if (yesShares[msg.sender][marketId] < shares) revert InsufficientShares();
        Market storage m = markets[marketId];
        uint256 total = totalYesShares[marketId];
        if (total == 0) revert ZeroShares();

        // amountOut proportional to share of YES pool
        uint256 rawOut = (shares * m.yesPool) / total;
        uint256 fee = (rawOut * PLATFORM_FEE_BPS) / 10000;
        uint256 amountOut = rawOut - fee;

        m.yesPool -= rawOut;
        totalYesShares[marketId] -= shares;
        yesShares[msg.sender][marketId] -= shares;

        payable(treasury).transfer(fee);
        payable(msg.sender).transfer(amountOut);

        emit Sold(marketId, msg.sender, true, shares, amountOut);
    }

    /// @notice Sell NO shares back to the pool before deadline
    function sellNo(uint256 marketId, uint256 shares) external marketOpen(marketId) {
        if (noShares[msg.sender][marketId] < shares) revert InsufficientShares();
        Market storage m = markets[marketId];
        uint256 total = totalNoShares[marketId];
        if (total == 0) revert ZeroShares();

        uint256 rawOut = (shares * m.noPool) / total;
        uint256 fee = (rawOut * PLATFORM_FEE_BPS) / 10000;
        uint256 amountOut = rawOut - fee;

        m.noPool -= rawOut;
        totalNoShares[marketId] -= shares;
        noShares[msg.sender][marketId] -= shares;

        payable(treasury).transfer(fee);
        payable(msg.sender).transfer(amountOut);

        emit Sold(marketId, msg.sender, false, shares, amountOut);
    }

    // ─── Resolution: Pyth ─────────────────────────────────────────────────────
    /// @notice Resolve using Pyth price oracle (anyone can call after deadline)
    function resolvePyth(uint256 marketId) external {
        Market storage m = markets[marketId];
        if (m.outcome != Outcome.Open) revert MarketNotOpen();
        if (block.timestamp < m.deadline) revert DeadlineNotPassed();
        if (m.resolutionType != ResolutionType.Pyth) revert();

        IPyth.Price memory p = pyth.getPriceUnsafe(m.pythFeedId);
        bool yesWins = m.targetAbove
            ? p.price > m.targetPrice
            : p.price < m.targetPrice;

        m.outcome = yesWins ? Outcome.Yes : Outcome.No;
        emit Resolved(marketId, m.outcome);
    }

    // ─── Resolution: Community Vote ────────────────────────────────────────────
    /// @notice Cast a vote on outcome after deadline (community vote markets only)
    function vote(uint256 marketId, bool voteYes) external {
        Market storage m = markets[marketId];
        if (m.outcome != Outcome.Open) revert MarketNotOpen();
        if (block.timestamp < m.deadline) revert DeadlineNotPassed();
        if (block.timestamp > m.voteDeadline) revert VoteWindowClosed();
        if (m.resolutionType != ResolutionType.CommunityVote) revert();
        if (hasVoted[msg.sender][marketId]) revert AlreadyVoted();

        hasVoted[msg.sender][marketId] = true;
        if (voteYes) m.yesVotes++; else m.noVotes++;

        emit Voted(marketId, msg.sender, voteYes);
    }

    /// @notice Finalize community vote after vote window closes
    function finalizeVote(uint256 marketId) external {
        Market storage m = markets[marketId];
        if (m.outcome != Outcome.Open) revert MarketNotOpen();
        if (block.timestamp <= m.voteDeadline) revert VoteWindowClosed();
        if (m.resolutionType != ResolutionType.CommunityVote) revert();

        if (m.yesVotes == m.noVotes) {
            m.outcome = Outcome.Cancelled; // tie → refund
        } else {
            m.outcome = m.yesVotes > m.noVotes ? Outcome.Yes : Outcome.No;
        }
        emit Resolved(marketId, m.outcome);
    }

    // ─── Claim Winnings ───────────────────────────────────────────────────────
    /// @notice Claim winnings or refund after market is resolved
    function claimWinnings(uint256 marketId) external {
        Market storage m = markets[marketId];
        if (m.outcome == Outcome.Open) revert MarketNotResolved();
        if (hasClaimed[msg.sender][marketId]) revert AlreadyClaimed();

        hasClaimed[msg.sender][marketId] = true;
        uint256 payout = _calculatePayout(marketId, msg.sender);

        if (payout > 0) {
            payable(msg.sender).transfer(payout);
            emit WinningsClaimed(marketId, msg.sender, payout);
        }
    }

    function _calculatePayout(uint256 marketId, address user) internal view returns (uint256) {
        Market storage m = markets[marketId];
        uint256 totalPool = m.yesPool + m.noPool;

        if (m.outcome == Outcome.Cancelled) {
            // Refund proportional to invested amount on each side
            uint256 userYes = yesShares[user][marketId];
            uint256 userNo = noShares[user][marketId];
            uint256 yesRefund = (totalYesShares[marketId] > 0)
                ? (userYes * m.yesPool) / totalYesShares[marketId]
                : 0;
            uint256 noRefund = (totalNoShares[marketId] > 0)
                ? (userNo * m.noPool) / totalNoShares[marketId]
                : 0;
            return yesRefund + noRefund;
        }

        bool isYesWin = m.outcome == Outcome.Yes;
        uint256 userWinShares = isYesWin ? yesShares[user][marketId] : noShares[user][marketId];
        uint256 totalWinShares = isYesWin ? totalYesShares[marketId] : totalNoShares[marketId];
        if (totalWinShares == 0 || userWinShares == 0) return 0;
        return (totalPool * userWinShares) / totalWinShares;
    }

    // ─── View helpers ─────────────────────────────────────────────────────────
    /// @notice Current YES probability (proportion of MON bet on YES side)
    function getYesPrice(uint256 marketId) external view returns (uint256) {
        Market storage m = markets[marketId];
        uint256 total = m.yesPool + m.noPool;
        if (total == 0) return 0.5 ether;
        return (m.yesPool * 1e18) / total;
    }

    /// @notice Current NO probability
    function getNoPrice(uint256 marketId) external view returns (uint256) {
        Market storage m = markets[marketId];
        uint256 total = m.yesPool + m.noPool;
        if (total == 0) return 0.5 ether;
        return (m.noPool * 1e18) / total;
    }

    function getMarket(uint256 marketId) external view returns (Market memory) {
        return markets[marketId];
    }

    function getUserPositions(address user, uint256 marketId)
        external view returns (uint256 yes, uint256 no)
    {
        return (yesShares[user][marketId], noShares[user][marketId]);
    }

    // ─── Admin ────────────────────────────────────────────────────────────────
    function setTreasury(address _treasury) external onlyOwner {
        treasury = _treasury;
    }

    function transferOwnership(address newOwner) external onlyOwner {
        owner = newOwner;
    }

    receive() external payable {}
}
