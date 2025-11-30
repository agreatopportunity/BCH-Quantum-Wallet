#!/usr/bin/env python3
"""
BCH Wallet - FINAL VERSION (Deep Patched & Fixed)
Features:
- Fixes 'unsupported hash type ripemd160' on Linux/OpenSSL 3.0
- Fixes 'Colors has no attribute PURPLE' crash
- Generate New Keys (Private/Public/Legacy/CashAddr)
- Send MAX
- OP_RETURN Data
- CashAddress Support
"""

import sys
import hashlib
from decimal import Decimal, getcontext

# Set decimal precision
getcontext().prec = 8

# ==========================================================
# CRITICAL COMPATIBILITY PATCH (OpenSSL 3.0+)
# ==========================================================
try:
    hashlib.new('ripemd160')
except ValueError:
    try:
        from Crypto.Hash import RIPEMD160
        
        _original_hashlib_new = hashlib.new

        def _patched_hashlib_new(name, data=b'', **kwargs):
            if name.lower() in ('ripemd160', 'ripemd-160'):
                h = RIPEMD160.new()
                h.update(data)
                return h
            return _original_hashlib_new(name, data, **kwargs)

        hashlib.new = _patched_hashlib_new
        
    except ImportError:
        print("CRITICAL ERROR: System OpenSSL disables RIPEMD160.")
        print("Please run: pip install pycryptodome")
        sys.exit(1)

# ==========================================================
# IMPORTS
# ==========================================================
try:
    import requests
    import qrcode
    from bitcash import Key
    from bitcash.network import NetworkAPI
    BITCASH_AVAILABLE = True
except ImportError as e:
    print(f"CRITICAL ERROR: Library error: {e}")
    print("Please run: pip install -r requirements_bch.txt")
    sys.exit(1)

# ==========================================================
# UTILITIES
# ==========================================================

class Colors:
    RED = "\033[91m"
    GREEN = "\033[92m"
    YELLOW = "\033[93m"
    BLUE = "\033[94m"
    PURPLE = "\033[95m"  # Fixed: Added missing PURPLE
    CYAN = "\033[96m"
    END = "\033[0m"

    @staticmethod
    def print(color, text):
        print(f"{color}{text}{Colors.END}")

class NetworkProvider:
    @staticmethod
    def get_price():
        try:
            r = requests.get("https://api.coingecko.com/api/v3/simple/price?ids=bitcoin-cash&vs_currencies=usd", timeout=5)
            data = r.json()
            return float(data['bitcoin-cash']['usd'])
        except:
            return 0.00

# ==========================================================
# WALLET APP
# ==========================================================

class WalletApp:
    def __init__(self, private_key_wif=None):
        try:
            if private_key_wif:
                self.key = Key(private_key_wif)
            else:
                self.key = Key() # Generate new random key
                
            self.address = self.key.address
            self.network = NetworkProvider()
        except Exception as e:
            Colors.print(Colors.RED, f"Key Error: {e}")
            raise e

    def get_balance_sats(self):
        return int(self.key.get_balance('satoshi'))

    def show_new_identity(self):
        """Displays secrets for a newly generated wallet"""
        print("\n" + "*"*50)
        Colors.print(Colors.GREEN, "   NEW WALLET GENERATED - SAVE IMMEDIATELY")
        print("*"*50)
        print(f"CashAddr:     {self.address}")
        try:
            print(f"Legacy Addr:  {self.key.to_legacy_address()}")
        except: pass
        Colors.print(Colors.RED, f"Private Key:  {self.key.to_wif()}")
        print(f"Public Key:   {self.key.public_key.hex()}")
        print("*"*50 + "\n")

    def show_status(self):
        print("\n" + "-"*40)
        Colors.print(Colors.GREEN, f"BCH Wallet: {self.address}")
        
        try:
            bal_sats = self.get_balance_sats()
            bal_bch = Decimal(bal_sats) / 100_000_000
            price = self.network.get_price()
            usd_val = float(bal_bch) * price
            
            print(f"Balance:   {bal_bch:.8f} BCH")
            Colors.print(Colors.CYAN, f"USD Value:   ${usd_val:,.2f} (@ ${price:,.2f}/BCH)")
            
            try:
                unspents = self.key.get_unspents()
                print(f"Unspents:  {len(unspents)}")
            except:
                print("Unspents:  (Connection Error)")
                
        except Exception as e:
            Colors.print(Colors.RED, f"Error fetching balance: {e}")
        print("-"*40)

    def show_details(self):
        print("\n" + "="*40)
        print("ADDRESS TECHNICAL DETAILS")
        print("="*40)
        print(f"CashAddr:   {self.address}")
        try:
            print(f"Legacy:     {self.key.to_legacy_address()}") 
            print(f"Public Key: {self.key.public_key.hex()}")
        except: pass
        print("="*40)

    def send_op_return(self, data_string):
        """Send a data-only transaction"""
        print("\n" + "="*40)
        Colors.print(Colors.YELLOW, "PREPARING DATA TRANSACTION (OP_RETURN)...")
        
        try:
            # BCH fees are low (~500 sats is safe)
            bal = self.get_balance_sats()
            if bal < 600:
                Colors.print(Colors.RED, "Insufficient funds for fee.")
                return

            print(f"Data: {data_string}")
            
            confirm = input("Broadcast Data? (yes/no): ").lower()
            if confirm == "yes":
                txid = self.key.send([], message=data_string)
                Colors.print(Colors.GREEN, "\n✅ Data Written Successfully!")
                print(f"TXID: {txid}")
                print(f"Link: https://blockchair.com/bitcoin-cash/transaction/{txid}")
            else:
                Colors.print(Colors.YELLOW, "Cancelled.")

        except Exception as e:
            Colors.print(Colors.RED, f"Data Error: {e}")

    def build_and_send(self, to_address, amount_str):
        print("\n" + "="*40)
        Colors.print(Colors.YELLOW, "PREPARING TRANSACTION...")
        
        try:
            total_sats = self.get_balance_sats()
            fee_estimate = 500 # Standard low fee for BCH
            
            if amount_str.lower() in ['max', 'all']:
                send_sats = total_sats - fee_estimate
                if send_sats <= 0:
                    Colors.print(Colors.RED, "Balance too low for fees.")
                    return
                print(f"Calculating MAX send (Total - {fee_estimate} sats)")
            else:
                send_sats = int(Decimal(amount_str) * 100_000_000)

            if send_sats > total_sats:
                Colors.print(Colors.RED, f"Insufficient funds.")
                return

            print("="*40)
            print(f"To:      {to_address}")
            print(f"Amount:  {Decimal(send_sats)/100_000_000} BCH")
            print(f"Fee:     ~{fee_estimate} sats")
            print("="*40)

            confirm = input("Broadcast? (yes/no): ").lower()
            if confirm == "yes":
                # BCH standard tx
                txid = self.key.send([(to_address, send_sats, 'satoshi')])
                Colors.print(Colors.GREEN, "\n✅ Transaction Successful!")
                print(f"TXID: {txid}")
                print(f"Link: https://blockchair.com/bitcoin-cash/transaction/{txid}")
            else:
                Colors.print(Colors.YELLOW, "Cancelled.")

        except Exception as e:
            Colors.print(Colors.RED, f"Transaction Failed: {e}")

# ==========================================================
# MAIN MENU
# ==========================================================

def main():
    print(r"""
  ____   _____ _    _ 
 |  _ \ / ____| |  | |
 | |_) | |    | |__| |
 |  _ <| |    |  __  |
 | |_) | |____| |  | |
 |____/ \_____|_|  |_|
    """)
    Colors.print(Colors.PURPLE, "   BCH Wallet - CashAddr & OP_RETURN")

    while True:
        try:
            # --- STARTUP MENU ---
            print("\n" + "="*30)
            print("1. Login with Private Key")
            print("2. Generate NEW Wallet")
            print("3. Exit")
            print("="*30)
            
            start_choice = input("Select Option: ").strip()

            wallet = None

            if start_choice == "1":
                pk = input("\nEnter Private Key (WIF): ").strip()
                if not pk: continue
                wallet = WalletApp(pk)
                Colors.print(Colors.GREEN, "\n✅ Wallet Loaded")

            elif start_choice == "2":
                Colors.print(Colors.YELLOW, "\nGenerating new keys...")
                wallet = WalletApp() # No arg = generate new
                wallet.show_new_identity()
                input("Press Enter after saving your key to continue...")

            elif start_choice == "3":
                sys.exit(0)
            
            else:
                continue

            # --- WALLET LOOP ---
            while wallet:
                print("\n" + "="*50)
                print("1. Wallet Status (Balance)")
                print("2. Send BCH")
                print("3. Send Data (OP_RETURN)")
                print("4. Transaction History")
                print("5. Address Details")
                print("6. Generate QR Code")
                print("7. Switch Wallet / Logout")
                print("8. Exit")
                print("="*50)
                
                choice = input("Select Option: ")

                if choice == "1":
                    wallet.show_status()

                elif choice == "2":
                    dest = input("Recipient Address: ").strip()
                    print("Type 'MAX' to send entire balance.")
                    amt = input("Amount BCH: ").strip()
                    try:
                        wallet.build_and_send(dest, amt)
                    except ValueError:
                        Colors.print(Colors.RED, "Invalid amount")

                elif choice == "3":
                    data = input("Enter Data (Text): ").strip()
                    if data: wallet.send_op_return(data)

                elif choice == "4":
                    print("\n--- History ---")
                    try:
                        txs = wallet.key.get_transactions()
                        if txs:
                            for tx in txs[:5]:
                                print(f"TX: {tx}")
                        else:
                            print("No history found.")
                    except:
                        print("Could not fetch history.")

                elif choice == "5":
                    wallet.show_details()

                elif choice == "6":
                    try:
                        img = qrcode.make(wallet.address)
                        fn = f"bch_{wallet.address[:6]}.png"
                        img.save(fn)
                        Colors.print(Colors.GREEN, f"QR Code saved to {fn}")
                    except Exception as e:
                        print(f"Error: {e}")

                elif choice == "7":
                    wallet = None # Break inner loop
                    Colors.print(Colors.YELLOW, "Logged out.")

                elif choice == "8":
                    sys.exit(0)

        except Exception as e:
            Colors.print(Colors.RED, f"Error: {e}")

if __name__ == "__main__":
    main()
