// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "forge-std/Script.sol";
import "../src/PredictionMarket.sol";

/// @notice Deploy PredictionMarket to Monad Testnet
/// Usage: forge script script/Deploy.s.sol --rpc-url https://testnet-rpc.monad.xyz --broadcast --private-key $PRIVATE_KEY

contract DeployScript is Script {
    // Pyth EVM address on Monad Testnet (update when Pyth is live on Monad)
    // Using Pyth EVM Stable — check https://docs.pyth.network/price-feeds/contract-addresses/evm
    address constant PYTH_MONAD = 0x2880aB155794e7179c9eE2e38200202908C17B43; // Pyth Hermes EVM

    function run() external {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        address deployer = vm.addr(deployerPrivateKey);
        address treasury = vm.envOr("TREASURY_ADDRESS", deployer);

        console.log("Deploying PredictionMarket...");
        console.log("Deployer:", deployer);
        console.log("Treasury:", treasury);
        console.log("Chain ID:", block.chainid);
        console.log("Pyth Address:", PYTH_MONAD);

        vm.startBroadcast(deployerPrivateKey);

        PredictionMarket pm = new PredictionMarket(PYTH_MONAD, treasury);

        vm.stopBroadcast();

        console.log("PredictionMarket deployed at:", address(pm));
        console.log("Add to .env.local:");
        console.log("NEXT_PUBLIC_PREDICTION_MARKET_ADDRESS=", address(pm));
    }
}
