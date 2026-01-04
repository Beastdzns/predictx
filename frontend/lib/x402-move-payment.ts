/**
 * x402 Payment utilities for Movement Bedrock Testnet using Aptos SDK
 * Builds and signs Move transfer transactions
 */

import { Aptos, AptosConfig, Network, Account } from "@aptos-labs/ts-sdk";
import { movementBedrockConfig, x402Config } from "./movement-bedrock-config";

const aptosConfig = new AptosConfig({
  network: Network.CUSTOM,
  fullnode: movementBedrockConfig.rpcUrl,
});

const aptos = new Aptos(aptosConfig);

/**
 * Build a Move transfer transaction
 */
export async function buildMoveTransfer(
  senderAddress: string,
  recipientAddress: string,
  amountOctas: string // in octas (8 decimals)
) {
  try {
    // Ensure addresses are properly formatted (with 0x prefix)
    const sender = senderAddress.startsWith("0x") ? senderAddress : `0x${senderAddress}`;
    const recipient = recipientAddress.startsWith("0x") ? recipientAddress : `0x${recipientAddress}`;
    
    // Convert amount to number if it's a string
    const amount = typeof amountOctas === "string" ? BigInt(amountOctas) : amountOctas;
    
    const transaction = await aptos.transaction.build.simple({
      sender,
      data: {
        function: "0x1::aptos_account::transfer",
        functionArguments: [recipient, amount],
        typeArguments: [],
      },
    });

    return transaction;
  } catch (error) {
    console.error("[x402] Failed to build Move transfer:", error);
    throw new Error(`Failed to build Move transfer transaction: ${error}`);
  }
}

/**
 * Send a MOVE payment via the wallet
 * Wallet must implement signAndSubmitTransaction
 */
export async function sendMovePayment(
  wallet: any, // Privy Aptos wallet
  recipientAddress: string,
  amountOctas: string
): Promise<string> {
  try {
    if (!wallet) {
      throw new Error("Wallet not available");
    }

    console.log("[x402] Wallet type:", wallet?.constructor?.name);
    console.log("[x402] Wallet methods:", Object.getOwnPropertyNames(Object.getPrototypeOf(wallet || {})));

    // Get sender address from wallet
    let accounts;
    try {
      // Try getAccounts first
      accounts = await wallet.getAccounts();
    } catch (e) {
      // Try account() as fallback
      accounts = await wallet.account?.();
    }
    
    if (!accounts || accounts.length === 0) {
      throw new Error("No accounts found in wallet");
    }

    const senderAddress = accounts[0].address;
    console.log(`[x402] Sending ${amountOctas} octas from ${senderAddress}`);

    // Build the transaction
    const transaction = await buildMoveTransfer(
      senderAddress,
      recipientAddress,
      amountOctas
    );
    console.log(`[x402] Built transaction, requesting signature...`);

    // Try different signing methods for Privy Aptos wallet
    let response;
    
    if (typeof wallet.signAndSubmitTransaction === 'function') {
      console.log("[x402] Using signAndSubmitTransaction");
      response = await wallet.signAndSubmitTransaction({ transaction });
    } else if (typeof wallet.submitTransaction === 'function') {
      console.log("[x402] Using submitTransaction");
      response = await wallet.submitTransaction(transaction);
    } else if (typeof wallet.signTransaction === 'function') {
      console.log("[x402] Using signTransaction + submitTransaction");
      const signedTx = await wallet.signTransaction(transaction);
      response = await wallet.submitTransaction(signedTx);
    } else {
      const methods = Object.getOwnPropertyNames(Object.getPrototypeOf(wallet || {}));
      throw new Error(`Wallet has no signing method. Available: ${methods.join(', ')}`);
    }

    // Return transaction hash
    const txHash = response?.hash || response?.transactionHash || response;
    if (!txHash) {
      throw new Error("No transaction hash returned from wallet");
    }
    console.log(`[x402] Payment submitted. TX: ${txHash}`);
    return String(txHash);
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    console.error("[x402] Payment failed:", errorMsg);
    throw new Error(`Payment submission failed: ${errorMsg}`);
  }
}

/**
 * Wait for transaction confirmation on-chain
 */
export async function waitForTransaction(
  txHash: string,
  maxWaitSeconds: number = 30
): Promise<boolean> {
  try {
    const startTime = Date.now();
    const maxWait = maxWaitSeconds * 1000;

    while (Date.now() - startTime < maxWait) {
      try {
        const tx = await aptos.getTransactionByHash({ transactionHash: txHash });

        if (tx.success) {
          console.log(`[x402] Transaction confirmed: ${txHash}`);
          return true;
        } else {
          console.error(`[x402] Transaction failed: ${txHash}`);
          return false;
        }
      } catch (e) {
        // Transaction not yet available, wait and retry
        await new Promise((resolve) => setTimeout(resolve, 2000));
      }
    }

    console.error(`[x402] Transaction confirmation timeout: ${txHash}`);
    return false;
  } catch (error) {
    console.error("[x402] Error waiting for transaction:", error);
    throw error;
  }
}

/**
 * Send unlock payment (orchestrates build, sign, and verification)
 * For now: Skip on-chain verification, just sign and return tx hash
 */
export async function sendUnlockPayment(
  wallet: any,
  recipientAddress: string,
  amountOctas: string
): Promise<string> {
  try {
    console.log(`[x402] Starting unlock payment: ${amountOctas} octas to ${recipientAddress}`);
    
    // Send the payment (sign + submit)
    const txHash = await sendMovePayment(wallet, recipientAddress, amountOctas);
    console.log(`[x402] Payment signed and submitted: ${txHash}`);

    // TODO: In production, wait for on-chain confirmation
    // For now, accept immediately after signature
    console.log(`[x402] Payment accepted (skipping on-chain verification for testing)`);
    
    return txHash;
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    console.error("[x402] Unlock payment failed:", errorMsg);
    throw error;
  }
}

/**
 * Create payment data for X-PAYMENT header
 */
export function createPaymentData(
  txHash: string,
  sender: string,
  amount: string,
  chainId: number = movementBedrockConfig.chainId
) {
  return {
    tx_hash: txHash,
    sender,
    amount,
    chainId,
  };
}
