// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "forge-std/Test.sol";
import "../src/PredictionMarket.sol";

/// @notice Mock Pyth oracle for testing
contract MockPyth {
    mapping(bytes32 => IPyth.Price) private prices;

    function setPrice(bytes32 feedId, int64 price, int32 expo) external {
        prices[feedId] = IPyth.Price({
            price: price,
            conf: 0,
            expo: expo,
            publishTime: block.timestamp
        });
    }

    function getPriceUnsafe(bytes32 id) external view returns (IPyth.Price memory) {
        return prices[id];
    }
}

contract PredictionMarketTest is Test {
    PredictionMarket public market;
    MockPyth public mockPyth;

    address public owner = address(this);
    address public treasury = address(0xBEEF);
    address public alice = address(0xA11CE);
    address public bob = address(0xB0B);

    bytes32 public constant ETH_FEED = keccak256("ETH/USD");

    function setUp() public {
        mockPyth = new MockPyth();
        market = new PredictionMarket(address(mockPyth), treasury);

        // Fund test accounts
        vm.deal(alice, 10 ether);
        vm.deal(bob, 10 ether);
        vm.deal(owner, 10 ether);
    }

    // ── Create Market ────────────────────────────────────────────────────────

    function test_CreatePythMarket() public {
        uint256 deadline = block.timestamp + 7 days;

        uint256 id = market.createMarket{value: 0.01 ether}(
            "Will ETH > $5000 by Jun 30?",
            deadline,
            PredictionMarket.ResolutionType.Pyth,
            ETH_FEED,
            5000_00000000, // $5000 in 8-decimal Pyth format
            true
        );

        PredictionMarket.Market memory m = market.getMarket(id);
        assertEq(m.creator, owner);
        assertEq(m.yesPool + m.noPool, 0.01 ether);
        assertEq(uint8(m.outcome), uint8(PredictionMarket.Outcome.Open));
    }

    function test_CreateCommunityVoteMarket() public {
        uint256 id = market.createMarket{value: 0.01 ether}(
            "Will BTC ETF get approved?",
            block.timestamp + 7 days,
            PredictionMarket.ResolutionType.CommunityVote,
            bytes32(0),
            0,
            true
        );
        PredictionMarket.Market memory m = market.getMarket(id);
        assertEq(uint8(m.resolutionType), uint8(PredictionMarket.ResolutionType.CommunityVote));
    }

    // ── Buy ────────────────────────────────────────────────────────────────────

    function test_BuyYes() public {
        uint256 id = _createMarket();

        vm.prank(alice);
        market.buyYes{value: 0.1 ether}(id);

        (uint256 aliceYes,) = market.getUserPositions(alice, id);
        assertGt(aliceYes, 0, "Alice should have YES shares");
    }

    function test_BuyNo() public {
        uint256 id = _createMarket();

        vm.prank(bob);
        market.buyNo{value: 0.1 ether}(id);

        (, uint256 bobNo) = market.getUserPositions(bob, id);
        assertGt(bobNo, 0, "Bob should have NO shares");
    }

    function test_BuyYesBelowMin_Reverts() public {
        uint256 id = _createMarket();
        vm.prank(alice);
        vm.expectRevert(PredictionMarket.BelowMinBet.selector);
        market.buyYes{value: 0.00001 ether}(id);
    }

    function test_FeeGoesToTreasury() public {
        uint256 id = _createMarket();
        uint256 beforeBalance = treasury.balance;

        vm.prank(alice);
        market.buyYes{value: 0.1 ether}(id);

        uint256 fee = (0.1 ether * 100) / 10000; // 1%
        assertEq(treasury.balance - beforeBalance, fee);
    }

    // ── Prices ─────────────────────────────────────────────────────────────────

    function test_InitialPriceIs50pct() public {
        uint256 id = _createMarket();
        uint256 yesPrice = market.getYesPrice(id);
        // With equal initial pools, YES price = yesPool / (yesPool + noPool) = 50%
        assertApproxEqRel(yesPrice, 0.5 ether, 0.01 ether);
    }

    function test_PriceMoves_AfterBuyYes() public {
        uint256 id = _createMarket();

        vm.prank(alice);
        market.buyYes{value: 1 ether}(id); // big buy shifts YES pool

        uint256 yesPrice = market.getYesPrice(id);
        assertGt(yesPrice, 0.5 ether, "YES price should rise after big YES buy");
    }

    // ── Pyth Resolution ───────────────────────────────────────────────────────

    function test_ResolvePyth_YesWins() public {
        uint256 deadline = block.timestamp + 1 days;
        uint256 id = market.createMarket{value: 0.01 ether}(
            "ETH > $5k?", deadline,
            PredictionMarket.ResolutionType.Pyth, ETH_FEED,
            5000_00000000, true
        );

        // Buy YES for alice
        vm.prank(alice);
        market.buyYes{value: 0.1 ether}(id);

        // Warp past deadline, set Pyth price above target
        vm.warp(deadline + 1);
        mockPyth.setPrice(ETH_FEED, 5500_00000000, -8);

        market.resolvePyth(id);

        PredictionMarket.Market memory m = market.getMarket(id);
        assertEq(uint8(m.outcome), uint8(PredictionMarket.Outcome.Yes));
    }

    function test_ResolvePyth_NoWins() public {
        uint256 deadline = block.timestamp + 1 days;
        uint256 id = market.createMarket{value: 0.01 ether}(
            "ETH > $5k?", deadline,
            PredictionMarket.ResolutionType.Pyth, ETH_FEED,
            5000_00000000, true
        );

        vm.warp(deadline + 1);
        mockPyth.setPrice(ETH_FEED, 4000_00000000, -8); // below target

        market.resolvePyth(id);
        PredictionMarket.Market memory m = market.getMarket(id);
        assertEq(uint8(m.outcome), uint8(PredictionMarket.Outcome.No));
    }

    // ── Community Vote ────────────────────────────────────────────────────────

    function test_CommunityVote_YesWins() public {
        uint256 deadline = block.timestamp + 1 days;
        uint256 id = market.createMarket{value: 0.01 ether}(
            "BTC ETF?", deadline,
            PredictionMarket.ResolutionType.CommunityVote, bytes32(0), 0, true
        );

        vm.warp(deadline + 1);

        vm.prank(alice);
        market.vote(id, true);
        vm.prank(bob);
        market.vote(id, true);

        vm.warp(deadline + 48 hours + 1);
        market.finalizeVote(id);

        PredictionMarket.Market memory m = market.getMarket(id);
        assertEq(uint8(m.outcome), uint8(PredictionMarket.Outcome.Yes));
    }

    function test_CommunityVote_TieIsCancelled() public {
        uint256 deadline = block.timestamp + 1 days;
        uint256 id = market.createMarket{value: 0.01 ether}(
            "Tie test?", deadline,
            PredictionMarket.ResolutionType.CommunityVote, bytes32(0), 0, true
        );

        vm.warp(deadline + 1);
        vm.prank(alice); market.vote(id, true);
        vm.prank(bob);   market.vote(id, false);

        vm.warp(deadline + 48 hours + 1);
        market.finalizeVote(id);

        PredictionMarket.Market memory m = market.getMarket(id);
        assertEq(uint8(m.outcome), uint8(PredictionMarket.Outcome.Cancelled));
    }

    function test_DoubleVote_Reverts() public {
        uint256 deadline = block.timestamp + 1 days;
        uint256 id = market.createMarket{value: 0.01 ether}(
            "Double vote?", deadline,
            PredictionMarket.ResolutionType.CommunityVote, bytes32(0), 0, true
        );
        vm.warp(deadline + 1);
        vm.startPrank(alice);
        market.vote(id, true);
        vm.expectRevert(PredictionMarket.AlreadyVoted.selector);
        market.vote(id, true);
        vm.stopPrank();
    }

    // ── Claim Winnings ────────────────────────────────────────────────────────

    function test_ClaimWinnings_YesWinner() public {
        uint256 deadline = block.timestamp + 1 days;
        uint256 id = market.createMarket{value: 0.01 ether}(
            "ETH > $5k?", deadline,
            PredictionMarket.ResolutionType.Pyth, ETH_FEED, 5000_00000000, true
        );

        vm.prank(alice);
        market.buyYes{value: 0.5 ether}(id);

        vm.prank(bob);
        market.buyNo{value: 0.5 ether}(id);

        vm.warp(deadline + 1);
        mockPyth.setPrice(ETH_FEED, 6000_00000000, -8);
        market.resolvePyth(id);

        uint256 beforeBalance = alice.balance;
        vm.prank(alice);
        market.claimWinnings(id);

        assertGt(alice.balance, beforeBalance, "Alice should receive payout");
    }

    function test_ClaimTwice_Reverts() public {
        uint256 id = _resolvedMarket(true);
        vm.prank(alice);
        market.claimWinnings(id);

        vm.prank(alice);
        vm.expectRevert(PredictionMarket.AlreadyClaimed.selector);
        market.claimWinnings(id);
    }

    // ── Helper ────────────────────────────────────────────────────────────────

    function _createMarket() internal returns (uint256) {
        return market.createMarket{value: 0.01 ether}(
            "Test market",
            block.timestamp + 7 days,
            PredictionMarket.ResolutionType.Pyth,
            ETH_FEED,
            5000_00000000,
            true
        );
    }

    function _resolvedMarket(bool yesWins) internal returns (uint256 id) {
        uint256 deadline = block.timestamp + 1 days;
        id = market.createMarket{value: 0.01 ether}(
            "Resolved market", deadline,
            PredictionMarket.ResolutionType.Pyth, ETH_FEED, 5000_00000000, true
        );
        vm.prank(alice);
        market.buyYes{value: 0.1 ether}(id);

        vm.warp(deadline + 1);
        int64 price = yesWins ? int64(6000_00000000) : int64(4000_00000000);
        mockPyth.setPrice(ETH_FEED, price, -8);
        market.resolvePyth(id);
    }
}
