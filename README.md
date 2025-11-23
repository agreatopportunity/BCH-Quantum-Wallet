# BCH Quantum Vault

## Merkle Signature Scheme Implementation

This project implements a **Post-Quantum Vault** on the Bitcoin Cash (BCH) network. It uses a **Merkle Signature Scheme (MSS)** to provide quantum-resistant security for your funds.

Unlike traditional ECDSA keys (which are vulnerable to Shor's Algorithm on a quantum computer), this vault relies solely on SHA256 hash functions, which are considered quantum-safe.

## 🔐 Core Concept: The Merkle Tree

Instead of a single private key, this vault uses a **Tree of Keys**.

1. **Leaves (Secrets)**: We generate 4 random secrets (one-time use private keys).
2. **The Tree**: We hash these secrets together in pairs until we get a single top hash.
3. **The Root (Public Key)**: The single top hash is your Quantum Address.

### Process
* **(Merkle Tree)**: One Root = Multiple Secrets. You can reveal one secret to spend, while keeping the others safe. This allows you to "reuse" the vault address (the Root) multiple times.

## 🚀 How to Use

### 1. Create a Vault

Run the script and select **Option 1**.

* It generates 4 random secrets.
* It builds a Merkle Tree.
* It saves the root and secrets to `quantum_vault.json`.
* **Your Address**: The tool gives you a P2SH address (starts with `3...`). Send your BCH here.

### 2. Spend from Vault

Run the script and select **Option 2**.

* The tool automatically picks the next unused secret (e.g., Key Index 0).
* It generates a **Merkle Proof** (the "path" from your secret to the root).
* **The Result**: It prints the Secret and siblings. This is your "signature."

#### On-Chain Verification Logic:

The BCH network script (conceptually) does this math:

```
Hash(Secret) + Sibling1 -> Hash1
Hash(Hash1 + Sibling2) -> Root
Verify(Calculated Root == Locked Root)
```

If the math works, the blockchain knows you own the leaf, which means you own the root!

## ⚠️ Important Safety Warnings

1. **One-Time Signatures**: Each secret can only be used **ONCE**. If you reuse a secret, you compromise the security of that specific branch. The script tracks usage in `quantum_vault.json`.

2. **Don't Lose the JSON**: Your `quantum_vault.json` file contains ALL your private keys. If you lose it, your funds are gone forever. The "Root" address alone cannot recover funds.

3. **Capacity**: This specific demo creates a tree with 4 leaves. This means you can only make 4 transactions before the vault is empty. Real-world implementations (like XMSS) use larger trees (e.g., 256 or 1024 leaves).

## 📚 Technical Specs

* **Hash Function**: Double-SHA256 (Bitcoin standard).
* **Tree Structure**: Binary Merkle Tree.
* **Address Format**: P2SH (Pay to Script Hash).
* **Signature Size**: 32 bytes (Secret) + (32 bytes × Tree Height).

---

### Additional Notes

This is a demonstration implementation for educational purposes. For production use, consider:
- Larger tree sizes for more spending capacity
- Additional backup mechanisms for the vault file
- Integration with hardware security modules
- Implementation of state management for tracking used keys
