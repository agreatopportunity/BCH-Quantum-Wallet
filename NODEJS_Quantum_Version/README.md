# **BCH Quantum Vault — Quantum-Safe Bitcoin Cash Web Wallet**

### **A Node.js-powered web application for generating and managing quantum-resistant BCH vaults.**

This project provides a secure and user-friendly interface for creating **Quantum-Safe Hash-Locked Bitcoin Cash (BCH) wallets**, managing addresses, scanning QR codes, and sweeping funds using P2SH contract logic.

Hash-locked vaults use **SHA-256 preimage locks** instead of ECDSA signatures, making them resistant to potential **future quantum attacks** on elliptic-curve cryptography.

---

## 🚀 **Features**

### ✅ **Generate Quantum-Safe Vaults**

* Creates a random 32-byte secret.
* Builds a **P2SH address** locked by `OP_SHA256 <hash> OP_EQUAL`.
* Immune to quantum attacks targeting ECDSA.

### ✅ **Multiple Address Formats**

The interface displays:

* **Standard P2SH CashAddr**
* **P2PKH CashAddr (compatibility format)**
* **Legacy (3-address)**

### ✅ **QR Code Integration**

* Automatic QR generation for mobile wallet scanning.

### ✅ **Sweep Funds (Recover via Secret)**

* Enter the original secret.
* App constructs a contract-unlocking transaction.
* Sends BCH to any provided destination address.

---

## 📦 **Installation**

### **Prerequisites**

Make sure you have:

* **Node.js v16+**
* **npm** (bundled with Node)
  
---

## 1️⃣ **Project Structure**

Your folder should look like this:

```
bch-quantum-web/
├── package.json
├── server.js
└── public/
    ├── index.html
    ├── style.css
    └── app.js
```

If you haven't created these files yet, set them up before running the server.

---

## 2️⃣ **Install Dependencies**

From the project root, run:

```bash
npm install
```

If you don't have a package.json, run:

```bash
npm install express mainnet-js@1.0.0 body-parser cors
```

This installs:

* **Express.js** (web server)
* **mainnet-js** (Bitcoin Cash JavaScript SDK)
* **body-parser, cors** (routing utilities)

---

## 🏃 **Running the App**

Start the server:

```bash
node server.js
```

Expected output:

```
BCH Quantum Wallet running!
Local:   http://localhost:3000
Network: http://192.168.1.15:3000
```

Use the **Network IP** to access the wallet from other devices on your LAN.

---

## 📖 **Usage Guide**

### 1. **Open the Wallet Interface**

Visit:

```
http://localhost:3000
```

(or your LAN IP)

---

### 2. **Generate a Quantum Vault**

Click **Generate Vault**.

The system will:

* Generate a new secret
* Display the SHA256 hash
* Build the P2SH vault address
* Show QR codes for scanning

⚠️ **Save the Secret Immediately!**
If you lose the secret, **funds cannot be recovered**.

---

### 3. **Fund the Vault**

Send BCH to the **P2SH CashAddr** shown on the screen.

Recommended wallets:

* Bitcoin.com Wallet
* Electron Cash
* Paytaca
* Zelly

---

### 4. **Check Balance & Sweep Funds**

To withdraw:

1. Paste your **secret** into the “Vault Secret” field.
2. Click **Check Balance First**.
3. Enter a destination address.
4. Click **Sweep Funds**.

The server:

* Builds a contract-solving transaction
* Unlocks the P2SH vault using your secret
* Sends BCH to your address

---

## ⚠️ **Security Notes**

### 🔐 **Quantum Safe?**

Yes — the locking mechanism uses **SHA256**, which is not vulnerable to Shor’s algorithm.

### ❌ **Do NOT Reuse Vaults**

Once a vault is swept:

* Your secret becomes public in the blockchain.
* It is no longer quantum-secure.
* Always generate a new vault for new funds.

### 🌐 **LAN Exposure Warning**

Your server listens on **0.0.0.0**, meaning:

* Anyone on your network can access the wallet UI.
* Only run this on **trusted networks**.

---

## 🛠 **Troubleshooting**


### **❌ mainnet-js: Wallet.fromP2SH is not a function**

Use the latest version of `server.js` that manually constructs the script.

### **⚠ Browser console shows: "Sensilet" or "ZilPay" errors**

These are caused by wallet extensions. Safe to ignore.

### **❌ 404 or server not loading**

Ensure you ran:

```bash
node server.js
```

and that the `public/` folder exists.

---

## 🎉 **You Now Have a Quantum-Safe BCH Vault!**



