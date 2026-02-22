// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "forge-std/Script.sol";
import "../src/PredictionMarket.sol";

/// @notice Create initial prediction markets on deployed contract
/// Usage: forge script script/CreateMarkets.s.sol --rpc-url https://testnet-rpc.monad.xyz --broadcast

contract CreateMarketsScript is Script {
    // Deployed contract address
    address payable constant PREDICTION_MARKET = payable(0x342063473A0e5B1D1b69E3C2b8721490547E1df5);
    
    // Pyth BTC/USD price feed ID
    bytes32 constant BTC_USD_FEED = 0xe62df6c8b4a85fe1a67db44dc12de5db330f7ac66b72dc658afedf0f4a415b43;

    function run() external {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        
        console.log("Creating initial prediction markets...");
        console.log("Contract:", PREDICTION_MARKET);

        PredictionMarket pm = PredictionMarket(PREDICTION_MARKET);

        vm.startBroadcast(deployerPrivateKey);

        // Market 0: Will Bitcoin hit $100K by April 2026?
        uint256 market0 = pm.createMarket{value: 0.01 ether}(
            "Will Bitcoin hit $100K by April 2026?",
            1775203200, // April 1, 2026 00:00:00 UTC
            PredictionMarket.ResolutionType.CommunityVote, // Use community vote (no real Pyth on Monad testnet yet)
            bytes32(0), // No Pyth feed
            0,
            false
        );
        console.log("Market 0 created: Will Bitcoin hit $100K by April 2026?");

        // Market 1: Will Monad mainnet launch by Q2 2026?
        uint256 market1 = pm.createMarket{value: 0.01 ether}(
            "Will Monad mainnet launch by Q2 2026?",
            1783065600, // July 1, 2026 00:00:00 UTC
            PredictionMarket.ResolutionType.CommunityVote,
            bytes32(0),
            0,
            false
        );
        console.log("Market 1 created: Will Monad mainnet launch by Q2 2026?");

        // Market 2: Will ETH surpass $5K in 2026?
        uint256 market2 = pm.createMarket{value: 0.01 ether}(
            "Will ETH surpass $5K by end of 2026?",
            1798761600, // Jan 1, 2027 00:00:00 UTC
            PredictionMarket.ResolutionType.CommunityVote,
            bytes32(0),
            0,
            false
        );
        console.log("Market 2 created: Will ETH surpass $5K by end of 2026?");

        // Market 3: Will AI agents manage $1B in crypto by 2027?
        uint256 market3 = pm.createMarket{value: 0.01 ether}(
            "Will AI agents manage $1B in crypto by 2027?",
            1798761600, // Jan 1, 2027 00:00:00 UTC
            PredictionMarket.ResolutionType.CommunityVote,
            bytes32(0),
            0,
            false
        );
        console.log("Market 3 created: Will AI agents manage $1B in crypto by 2027?");

        // Market 4: Will Solana flip Ethereum by TVL?
        uint256 market4 = pm.createMarket{value: 0.01 ether}(
            "Will Solana flip Ethereum by TVL in 2026?",
            1798761600, // Jan 1, 2027 00:00:00 UTC
            PredictionMarket.ResolutionType.CommunityVote,
            bytes32(0),
            0,
            false
        );
        console.log("Market 4 created: Will Solana flip Ethereum by TVL in 2026?");

        vm.stopBroadcast();

        console.log("All markets created successfully!");
        console.log("Total markets:", pm.marketCount());
    }
}
