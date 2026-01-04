import { NextRequest, NextResponse } from 'next/server';
import { PrivyClient } from '@privy-io/node';
import {
  Aptos,
  AptosConfig,
  Network,
  AccountAddress,
  AccountAuthenticatorEd25519,
  Ed25519PublicKey,
  Ed25519Signature,
  generateSigningMessageForTransaction,
} from '@aptos-labs/ts-sdk';

// Movement Bedrock Testnet config
const MOVEMENT_RPC = 'https://testnet.movementnetwork.xyz/v1';

// Initialize Aptos client for Movement
const aptosConfig = new AptosConfig({
  network: Network.CUSTOM,
  fullnode: MOVEMENT_RPC,
});
const aptos = new Aptos(aptosConfig);

// Initialize Privy Node SDK client
// This SDK has the rawSign method for Tier 2 chains like Aptos/Movement
const privy = new PrivyClient({
  appId: process.env.NEXT_PUBLIC_PRIVY_APP_ID!,
  appSecret: process.env.PRIVY_APP_SECRET!,
});

// Helper to convert Uint8Array to hex string
function toHex(bytes: Uint8Array): string {
  return '0x' + Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('');
}

// API to create an app-owned wallet for a user (for x402 payments)
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { userId } = body;

    if (!userId) {
      return NextResponse.json(
        { error: 'Missing userId' },
        { status: 400 }
      );
    }

    // Check for app secret
    if (!process.env.PRIVY_APP_SECRET) {
      return NextResponse.json(
        { error: 'Server configuration error: PRIVY_APP_SECRET not set' },
        { status: 500 }
      );
    }

    console.log('[Movement API] Creating app-owned Aptos wallet for user:', userId);

    // Create an app-owned wallet (no owner specified = app-owned)
    // This wallet can be signed by our server without user involvement
    const walletsService = privy.wallets();
    const wallet = await walletsService.create({
      chain_type: 'aptos',
    });

    console.log('[Movement API] Created wallet:', wallet.id, wallet.address);

    return NextResponse.json({
      success: true,
      walletId: wallet.id,
      address: wallet.address,
      publicKey: wallet.public_key,
    });

  } catch (error) {
    console.error('[Movement API] Error creating wallet:', error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    
    return NextResponse.json(
      { error: errorMessage, success: false },
      { status: 500 }
    );
  }
}

// API to sign and submit a transaction
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { 
      senderAddress, 
      recipientAddress, 
      amountOctas,
      walletId,
      publicKey,
    } = body;

    // Validate required fields
    if (!senderAddress || !recipientAddress || !amountOctas || !walletId || !publicKey) {
      return NextResponse.json(
        { error: 'Missing required fields: senderAddress, recipientAddress, amountOctas, walletId, publicKey' },
        { status: 400 }
      );
    }

    // Check for app secret
    if (!process.env.PRIVY_APP_SECRET) {
      console.error('[Movement API] PRIVY_APP_SECRET is not set');
      return NextResponse.json(
        { error: 'Server configuration error: PRIVY_APP_SECRET not set' },
        { status: 500 }
      );
    }

    console.log('[Movement API] Building transaction...');
    console.log('[Movement API] Sender:', senderAddress);
    console.log('[Movement API] Recipient:', recipientAddress);
    console.log('[Movement API] Amount:', amountOctas);
    console.log('[Movement API] Wallet ID:', walletId);

    // 1. Build the transaction
    const transaction = await aptos.transaction.build.simple({
      sender: AccountAddress.from(senderAddress),
      data: {
        function: '0x1::aptos_account::transfer',
        typeArguments: [],
        functionArguments: [recipientAddress, BigInt(amountOctas)],
      },
    });

    console.log('[Movement API] Transaction built, generating signing message...');

    // 2. Generate the signing message (this is what gets signed)
    const signingMessage = generateSigningMessageForTransaction(transaction);
    const messageHex = toHex(signingMessage);

    console.log('[Movement API] Message to sign:', messageHex.slice(0, 50) + '...');
    console.log('[Movement API] Requesting raw signature from Privy...');

    // 3. Sign with Privy Node SDK using rawSign for Tier 2 chains (Aptos/Movement)
    // Note: This only works for app-owned wallets or wallets with configured signers
    const walletsService = privy.wallets();
    const signatureResponse = await walletsService.rawSign(walletId, {
      params: {
        hash: messageHex,
      },
    });

    // Response contains the signature data
    const signature = signatureResponse?.signature;
    
    if (!signature || typeof signature !== 'string') {
      console.error('[Movement API] Invalid signature response:', signatureResponse);
      throw new Error('Invalid signature response from Privy rawSign');
    }

    console.log('[Movement API] Signature received:', signature.slice(0, 20) + '...');

    // 4. Create authenticator
    // Strip 0x prefix for Ed25519 classes
    let pubKeyHex = publicKey.startsWith('0x') ? publicKey.slice(2) : publicKey;
    const sigHex = signature.startsWith('0x') ? signature.slice(2) : signature;

    console.log('[Movement API] Raw public key from request:', publicKey);
    console.log('[Movement API] After 0x strip:', pubKeyHex, 'length:', pubKeyHex.length);

    // Handle Aptos multi-key prefix format
    // Privy returns keys like "00028a40..." where:
    // - First byte (00) = number of keys - 1 in multi-sig (0 means single key)
    // - Second byte (02) = key scheme (02 = Ed25519)
    // - Remaining 32 bytes = actual public key
    // We need just the 32-byte raw key (64 hex chars)
    if (pubKeyHex.length === 68) {
      // 68 hex chars = 34 bytes (2 prefix bytes + 32 key bytes)
      console.log('[Movement API] Stripping multi-key prefix from public key');
      pubKeyHex = pubKeyHex.slice(4); // Remove first 2 bytes (4 hex chars)
    } else if (pubKeyHex.length > 64) {
      // If it's some other format, try to extract last 64 chars
      console.log('[Movement API] Unexpected key length, extracting last 64 chars');
      pubKeyHex = pubKeyHex.slice(-64);
    }

    console.log('[Movement API] Final public key:', pubKeyHex, 'length:', pubKeyHex.length);
    console.log('[Movement API] Creating authenticator...');
    console.log('[Movement API] Signature:', sigHex.slice(0, 20) + '...');

    const authenticator = new AccountAuthenticatorEd25519(
      new Ed25519PublicKey(pubKeyHex),
      new Ed25519Signature(sigHex)
    );

    // 5. Submit transaction
    console.log('[Movement API] Submitting transaction...');
    const pending = await aptos.transaction.submit.simple({
      transaction,
      senderAuthenticator: authenticator,
    });

    console.log('[Movement API] Transaction submitted:', pending.hash);

    // 6. Wait for confirmation
    const result = await aptos.waitForTransaction({
      transactionHash: pending.hash,
      options: { timeoutSecs: 30 },
    });

    console.log('[Movement API] Transaction confirmed:', result.hash);

    return NextResponse.json({
      success: true,
      txHash: result.hash,
      status: 'success' in result ? (result as { success: boolean }).success : true,
    });

  } catch (error) {
    console.error('[Movement API] Error:', error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    const errorStack = error instanceof Error ? error.stack : undefined;
    
    return NextResponse.json(
      { error: errorMessage, stack: errorStack, success: false },
      { status: 500 }
    );
  }
}
