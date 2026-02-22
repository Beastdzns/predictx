import { NextResponse } from 'next/server';

// Movement/Aptos signing has been removed — this project uses Monad (EVM).
// Transactions are signed via Privy embedded wallets + viem on the client side.

export async function PUT() {
  return NextResponse.json(
    { error: 'Movement signing not supported. Use Monad/EVM via Privy + viem.' },
    { status: 410 }
  );
}

export async function POST() {
  return NextResponse.json(
    { error: 'Movement signing not supported. Use Monad/EVM via Privy + viem.' },
    { status: 410 }
  );
}
