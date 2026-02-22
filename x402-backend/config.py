"""
Configuration for x402 Payment System on Monad Testnet
"""
import os
from decimal import Decimal
from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv()

# Network Configuration - Monad Testnet (EVM-compatible)
BASE_RPC = os.getenv("BASE_RPC", "https://testnet-rpc.monad.xyz")
CHAIN_ID = 10143  # Monad Testnet

# Token Configuration - MON (18 decimals, standard EVM)
TOKEN_DECIMALS = 18
TOKEN_DECIMALS_MULTIPLIER = 10 ** TOKEN_DECIMALS  # 1e18

# Payment Configuration
PAYMENT_TIMEOUT_SECONDS = int(os.getenv("PAYMENT_TIMEOUT", "300"))  # 5 minutes default
PAYMENT_RECIPIENT_ADDRESS = os.getenv(
    "RECIPIENT_ADDRESS",
    "0x0000000000000000000000000000000000000001"  # Replace with actual treasury address
)

# Pricing in MON (wei) - 18 decimals
PRICING = {
    "market_data": 1000000000000000,      # 0.001 MON
    "charts": 2000000000000000,           # 0.002 MON
    "sentiment": 3000000000000000,        # 0.003 MON
    "orderbook": 1500000000000000,        # 0.0015 MON
    "calculator": 1000000000000000,       # 0.001 MON
    "activity": 1500000000000000,         # 0.0015 MON
    "social_post": 5000000000000000,      # 0.005 MON
    "social_view": 2000000000000000,      # 0.002 MON
    "social_comment": 1000000000000000,   # 0.001 MON
}

# Server Configuration
HOST = os.getenv("HOST", "0.0.0.0")
PORT = int(os.getenv("PORT", "8990"))
CORS_ORIGINS = ["*"]  # For development; restrict in production

# Job Configuration
MAX_PING_COUNT = 10
PING_TIMEOUT = 5  # seconds per ping

# Aptos transaction confirmation timeout
TRANSACTION_CONFIRMATION_TIMEOUT = 30  # seconds
