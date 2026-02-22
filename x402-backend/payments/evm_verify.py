"""
EVM transaction verification utilities for Monad Testnet payment validation
"""
import aiohttp
from typing import Optional, Dict, Any
from web3 import Web3
from config import (
    BASE_RPC,
    PAYMENT_RECIPIENT_ADDRESS,
    TOKEN_DECIMALS_MULTIPLIER,
    CHAIN_ID,
)


async def get_transaction(tx_hash: str) -> Optional[Dict[str, Any]]:
    """
    Fetch transaction details from Monad RPC (EVM JSON-RPC)
    
    Args:
        tx_hash: Transaction hash to fetch
        
    Returns:
        Transaction object or None if not found
    """
    payload = {
        "jsonrpc": "2.0",
        "method": "eth_getTransactionByHash",
        "params": [tx_hash],
        "id": 1
    }
    
    async with aiohttp.ClientSession() as session:
        try:
            async with session.post(
                BASE_RPC,
                json=payload,
                timeout=aiohttp.ClientTimeout(total=10)
            ) as resp:
                if resp.status == 200:
                    data = await resp.json()
                    return data.get("result")
                return None
        except Exception as e:
            print(f"Error fetching transaction {tx_hash}: {e}")
            return None


async def get_transaction_receipt(tx_hash: str) -> Optional[Dict[str, Any]]:
    """
    Fetch transaction receipt from Monad RPC
    
    Args:
        tx_hash: Transaction hash to fetch receipt for
        
    Returns:
        Transaction receipt or None if not found/pending
    """
    payload = {
        "jsonrpc": "2.0",
        "method": "eth_getTransactionReceipt",
        "params": [tx_hash],
        "id": 1
    }
    
    async with aiohttp.ClientSession() as session:
        try:
            async with session.post(
                BASE_RPC,
                json=payload,
                timeout=aiohttp.ClientTimeout(total=10)
            ) as resp:
                if resp.status == 200:
                    data = await resp.json()
                    return data.get("result")
                return None
        except Exception as e:
            print(f"Error fetching receipt {tx_hash}: {e}")
            return None


async def verify_mon_payment(
    tx_hash: str,
    expected_sender: str,
    expected_amount_wei: int,
) -> tuple[bool, Optional[str]]:
    """
    Verify a MON payment transaction on Monad Testnet
    
    Args:
        tx_hash: Transaction hash to verify
        expected_sender: Expected sender address (EVM 0x address)
        expected_amount_wei: Expected amount in wei
        
    Returns:
        Tuple of (is_valid, error_message)
        - is_valid: True if transaction verified successfully
        - error_message: Error description if verification failed
    """
    # Normalize addresses (checksum format)
    try:
        expected_sender = Web3.to_checksum_address(expected_sender)
        recipient = Web3.to_checksum_address(PAYMENT_RECIPIENT_ADDRESS)
    except Exception as e:
        return False, f"Invalid address format: {e}"
    
    # Fetch transaction
    tx = await get_transaction(tx_hash)
    
    if not tx:
        return False, f"Transaction {tx_hash} not found on chain"
    
    # Fetch receipt to check status
    receipt = await get_transaction_receipt(tx_hash)
    
    if not receipt:
        return False, f"Transaction {tx_hash} pending or not yet mined"
    
    # Check transaction status (0x1 = success, 0x0 = failed)
    status = receipt.get("status")
    if status != "0x1":
        return False, f"Transaction {tx_hash} failed (status: {status})"
    
    # Check sender
    tx_from = Web3.to_checksum_address(tx.get("from", ""))
    if tx_from != expected_sender:
        return False, f"Sender mismatch: expected {expected_sender}, got {tx_from}"
    
    # Check recipient
    tx_to = tx.get("to")
    if tx_to:
        tx_to = Web3.to_checksum_address(tx_to)
        if tx_to != recipient:
            return False, f"Recipient mismatch: expected {recipient}, got {tx_to}"
    else:
        return False, "Transaction has no recipient (contract creation?)"
    
    # Check value (convert hex to int)
    tx_value = int(tx.get("value", "0x0"), 16)
    if tx_value < expected_amount_wei:
        return False, f"Amount too low: expected {expected_amount_wei}, got {tx_value}"
    
    # Check chain ID if present
    tx_chain_id = tx.get("chainId")
    if tx_chain_id:
        tx_chain_id_int = int(tx_chain_id, 16)
        if tx_chain_id_int != CHAIN_ID:
            return False, f"Wrong chain: expected {CHAIN_ID}, got {tx_chain_id_int}"
    
    return True, None


async def verify_payment(
    tx_hash: str,
    sender_address: str,
    amount_wei: int,
) -> Dict[str, Any]:
    """
    Verify a complete x402 payment transaction
    
    Args:
        tx_hash: Transaction hash from payment data
        sender_address: User's wallet address
        amount_wei: Amount transferred in wei
        
    Returns:
        Dictionary with verification result:
        {
            "verified": bool,
            "tx_hash": str,
            "error": Optional[str],
            "tx_info": Optional[Dict] - transaction details if verified
        }
    """
    is_valid, error = await verify_mon_payment(
        tx_hash,
        sender_address,
        amount_wei,
    )
    
    if is_valid:
        tx = await get_transaction(tx_hash)
        return {
            "verified": True,
            "tx_hash": tx_hash,
            "error": None,
            "tx_info": tx
        }
    else:
        return {
            "verified": False,
            "tx_hash": tx_hash,
            "error": error,
            "tx_info": None
        }
