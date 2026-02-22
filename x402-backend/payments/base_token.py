"""
EVM Payment Verifier for Monad Testnet
"""
import asyncio
import aiohttp
from typing import Optional, Tuple
from config import BASE_RPC, PAYMENT_RECIPIENT_ADDRESS, CHAIN_ID
from payments.evm_verify import verify_mon_payment, get_transaction_receipt


class PaymentVerifier:
    """
    Verifies EVM payments on Monad Testnet
    """
    
    def __init__(self):
        self.rpc_url = BASE_RPC
        self.recipient = PAYMENT_RECIPIENT_ADDRESS
        self.chain_id = CHAIN_ID
    
    async def is_connected(self) -> bool:
        """
        Check if connected to Monad Testnet RPC
        """
        payload = {
            "jsonrpc": "2.0",
            "method": "eth_chainId",
            "params": [],
            "id": 1
        }
        
        try:
            async with aiohttp.ClientSession() as session:
                async with session.post(
                    self.rpc_url,
                    json=payload,
                    timeout=aiohttp.ClientTimeout(total=5)
                ) as resp:
                    if resp.status == 200:
                        data = await resp.json()
                        result = data.get("result")
                        if result:
                            chain_id = int(result, 16)
                            return chain_id == self.chain_id
                    return False
        except Exception as e:
            print(f"RPC connection check failed: {e}")
            return False
    
    async def verify_payment(
        self,
        from_address: str,
        expected_amount: int,
        tx_hash: Optional[str] = None,
        timeout: int = 30
    ) -> Tuple[bool, Optional[str]]:
        """
        Verify a payment transaction on Monad Testnet
        
        Args:
            from_address: Sender's EVM address
            expected_amount: Expected amount in wei
            tx_hash: Transaction hash to verify (required for x402 flow)
            timeout: Timeout in seconds to wait for confirmation
            
        Returns:
            Tuple of (success, tx_hash)
        """
        if not tx_hash:
            return False, None
        
        # Wait for transaction to be mined with timeout
        start_time = asyncio.get_event_loop().time()
        
        while (asyncio.get_event_loop().time() - start_time) < timeout:
            is_valid, error = await verify_mon_payment(
                tx_hash=tx_hash,
                expected_sender=from_address,
                expected_amount_wei=expected_amount
            )
            
            if is_valid:
                return True, tx_hash
            
            # If error is "pending", wait and retry
            if error and ("pending" in error.lower() or "not yet mined" in error.lower()):
                await asyncio.sleep(2)
                continue
            
            # If error is something else (e.g., failed, wrong sender), fail immediately
            if error:
                print(f"Payment verification failed: {error}")
                return False, None
        
        print(f"Payment verification timed out after {timeout}s")
        return False, None
    
    async def get_balance(self, address: str) -> Optional[int]:
        """
        Get MON balance for an address
        
        Args:
            address: EVM address to check
            
        Returns:
            Balance in wei, or None if failed
        """
        payload = {
            "jsonrpc": "2.0",
            "method": "eth_getBalance",
            "params": [address, "latest"],
            "id": 1
        }
        
        try:
            async with aiohttp.ClientSession() as session:
                async with session.post(
                    self.rpc_url,
                    json=payload,
                    timeout=aiohttp.ClientTimeout(total=5)
                ) as resp:
                    if resp.status == 200:
                        data = await resp.json()
                        result = data.get("result")
                        if result:
                            return int(result, 16)
                    return None
        except Exception as e:
            print(f"Failed to get balance: {e}")
            return None
