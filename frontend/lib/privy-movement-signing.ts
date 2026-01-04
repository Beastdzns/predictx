/**
 * Privy Movement Chain Signing Utilities
 * 
 * This module provides utilities for signing and submitting Move transactions
 * using Privy embedded wallets on Movement Bedrock Testnet.
 * 
 * Uses the Aptos SDK with Privy's raw signing capability.
 */

import {
  Aptos,
  AptosConfig,
  Network,
  AccountAddress,
  AccountAuthenticatorEd25519,
  Ed25519PublicKey,
  Ed25519Signature,
  generateSigningMessageForTransaction,
  SimpleTransaction,
  UserTransactionResponse,
} from '@aptos-labs/ts-sdk';
import { movementBedrockConfig } from './movement-bedrock-config';

// Initialize Aptos client for Movement Bedrock Testnet
const aptosConfig = new AptosConfig({
  network: Network.CUSTOM,
  fullnode: movementBedrockConfig.rpcUrl,
});

export const movementAptos = new Aptos(aptosConfig);

/**
 * Build a Move transfer transaction for signing
 */
export async function buildMoveTransaction(
  senderAddress: string,
  recipientAddress: string,
  amountOctas: bigint
) {
  const sender = AccountAddress.from(senderAddress);
  const recipient = recipientAddress.startsWith('0x') 
    ? recipientAddress 
    : `0x${recipientAddress}`;

  const rawTxn = await movementAptos.transaction.build.simple({
    sender,
    data: {
      function: '0x1::aptos_account::transfer',
      typeArguments: [],
      functionArguments: [recipient, amountOctas],
    },
  });

  return rawTxn;
}

/**
 * Generate the signing message for a transaction
 * This is what gets signed by the Privy wallet
 */
export function getTransactionSigningMessage(transaction: SimpleTransaction): Uint8Array {
  return generateSigningMessageForTransaction(transaction);
}

/**
 * Create an authenticator from a signature and public key
 * Used after getting a raw signature from Privy
 */
export function createAuthenticator(
  publicKeyHex: string,
  signatureHex: string
): AccountAuthenticatorEd25519 {
  // Remove 0x prefix if present
  const pubKey = publicKeyHex.startsWith('0x') 
    ? publicKeyHex.slice(2) 
    : publicKeyHex;
  const sig = signatureHex.startsWith('0x') 
    ? signatureHex.slice(2) 
    : signatureHex;

  return new AccountAuthenticatorEd25519(
    new Ed25519PublicKey(pubKey),
    new Ed25519Signature(sig)
  );
}

/**
 * Submit a signed transaction to the Movement network
 */
export async function submitSignedTransaction(
  transaction: SimpleTransaction,
  senderAuthenticator: AccountAuthenticatorEd25519
): Promise<string> {
  const pending = await movementAptos.transaction.submit.simple({
    transaction,
    senderAuthenticator,
  });

  return pending.hash;
}

/**
 * Wait for transaction execution and return result
 */
export async function waitForExecution(
  txHash: string,
  options?: { timeoutSecs?: number; checkSuccess?: boolean }
) {
  const { timeoutSecs = 30, checkSuccess = true } = options || {};

  const executed = await movementAptos.waitForTransaction({
    transactionHash: txHash,
    options: {
      timeoutSecs,
      checkSuccess,
    },
  });

  return executed;
}

/**
 * Privy Aptos Wallet interface
 */
interface PrivyAptosWallet {
  getAccounts?: () => Promise<Array<{ address: string; publicKey: string }>>;
  account?: () => Promise<{ address: string; publicKey: string }>;
  signMessage?: (message: string) => Promise<{ signature: string } | string>;
  signAndSubmitTransaction?: (payload: { transaction: SimpleTransaction }) => Promise<{ hash: string } | string>;
}

/**
 * Complete flow: Build, sign with Privy wallet, and submit transaction
 * 
 * @param privyAptosWallet - The Privy Aptos embedded wallet
 * @param recipientAddress - Recipient's Move address
 * @param amountOctas - Amount in octas (1 MOVE = 10^8 octas)
 * @returns Transaction hash
 */
export async function signAndSubmitMoveTransfer(
  privyAptosWallet: PrivyAptosWallet,
  recipientAddress: string,
  amountOctas: bigint
): Promise<string> {
  // Get wallet info
  const accounts = await privyAptosWallet.getAccounts?.() 
    || [await privyAptosWallet.account?.()];
  
  if (!accounts || accounts.length === 0 || !accounts[0]) {
    throw new Error('No Aptos account found in wallet');
  }

  const account = accounts[0];
  const senderAddress = account.address;
  const publicKey = account.publicKey;

  console.log('[Privy-Movement] Building transaction...');
  console.log('[Privy-Movement] Sender:', senderAddress);
  console.log('[Privy-Movement] Recipient:', recipientAddress);
  console.log('[Privy-Movement] Amount (octas):', amountOctas.toString());

  // 1. Build the transaction
  const rawTxn = await buildMoveTransaction(
    senderAddress,
    recipientAddress,
    amountOctas
  );

  // 2. Generate signing message
  const signingMessage = getTransactionSigningMessage(rawTxn);
  console.log('[Privy-Movement] Signing message generated');

  // 3. Sign with Privy wallet
  // Privy Aptos wallets support signMessage for raw bytes
  let signature: string;
  
  if (typeof privyAptosWallet.signMessage === 'function') {
    // Convert Uint8Array to hex for signing
    const messageHex = '0x' + Buffer.from(signingMessage).toString('hex');
    const signResult = await privyAptosWallet.signMessage(messageHex);
    signature = typeof signResult === 'string' ? signResult : signResult.signature;
  } else if (typeof privyAptosWallet.signAndSubmitTransaction === 'function') {
    // Fallback: Use native signAndSubmitTransaction if available
    console.log('[Privy-Movement] Using signAndSubmitTransaction fallback');
    const result = await privyAptosWallet.signAndSubmitTransaction({ 
      transaction: rawTxn 
    });
    return typeof result === 'string' ? result : result.hash;
  } else {
    throw new Error('Wallet does not support required signing methods');
  }

  console.log('[Privy-Movement] Transaction signed');

  // 4. Create authenticator and submit
  const authenticator = createAuthenticator(publicKey, signature);
  const txHash = await submitSignedTransaction(rawTxn, authenticator);
  
  console.log('[Privy-Movement] Transaction submitted:', txHash);

  return txHash;
}

/**
 * Verify transaction status
 */
export async function verifyTransaction(txHash: string): Promise<{
  success: boolean;
  hash: string;
  sender?: string;
  vmStatus?: string;
}> {
  try {
    const tx = await movementAptos.getTransactionByHash({ 
      transactionHash: txHash 
    });

    // Check if it's a user transaction (has success property)
    if ('success' in tx) {
      const userTx = tx as UserTransactionResponse;
      return {
        success: userTx.success,
        hash: userTx.hash,
        sender: userTx.sender,
        vmStatus: userTx.vm_status,
      };
    }

    // For pending or other transaction types
    return {
      success: false,
      hash: tx.hash,
      vmStatus: 'pending',
    };
  } catch (error) {
    console.error('[Privy-Movement] Failed to verify transaction:', error);
    return {
      success: false,
      hash: txHash,
      vmStatus: String(error),
    };
  }
}

/**
 * Get account balance in MOVE
 */
export async function getAccountBalance(address: string): Promise<{
  balanceOctas: bigint;
  balanceMove: string;
}> {
  try {
    const resources = await movementAptos.getAccountResources({
      accountAddress: AccountAddress.from(address),
    });

    const coinResource = resources.find(
      (r) => r.type === '0x1::coin::CoinStore<0x1::aptos_coin::AptosCoin>'
    );

    if (!coinResource) {
      return { balanceOctas: BigInt(0), balanceMove: '0' };
    }

    const balanceOctas = BigInt(
      ((coinResource.data as { coin: { value: string } }).coin.value)
    );
    const balanceMove = (Number(balanceOctas) / 1e8).toFixed(8);

    return { balanceOctas, balanceMove };
  } catch (error) {
    console.error('[Privy-Movement] Failed to get balance:', error);
    return { balanceOctas: BigInt(0), balanceMove: '0' };
  }
}
