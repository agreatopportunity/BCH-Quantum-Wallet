const express = require('express');
const bodyParser = require('body-parser');
const crypto = require('crypto');
const path = require('path');

// --- GLOBALS ---
let Wallet;
let Contract; // Defined globally so we can access it in routes

const app = express();
const port = 3000;

app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, 'public')));

// --- INITIALIZATION ---
async function startServer() {
    try {
        const mainnet = await import('mainnet-js');
        Wallet = mainnet.Wallet;
        Contract = mainnet.Contract; // Initialize Contract here
        
        app.listen(port, '0.0.0.0', () => {
            console.log(`BCH Quantum Wallet running!`);
            console.log(`Local:   http://localhost:${port}`);
            console.log(`Network: http://10.0.0.17:${port}`);
        });
    } catch (e) {
        console.error("Failed to load mainnet-js:", e);
    }
}

// --- LEGACY P2SH UTILS (Base58Check) ---

function toLegacyP2SH(hash160Buffer) {
    const version = Buffer.from([0x05]);
    const payload = Buffer.concat([version, hash160Buffer]);
    
    const sha1 = crypto.createHash('sha256').update(payload).digest();
    const sha2 = crypto.createHash('sha256').update(sha1).digest();
    const checksum = sha2.slice(0, 4);
    
    const binary = Buffer.concat([payload, checksum]);
    
    return base58Encode(binary);
}

function base58Encode(buffer) {
    const ALPHABET = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';
    let carry, digits = [0];
    for (let i = 0; i < buffer.length; i++) {
        carry = buffer[i];
        for (let j = 0; j < digits.length; j++) {
            carry += digits[j] << 8;
            digits[j] = carry % 58;
            carry = (carry / 58) | 0;
        }
        while (carry > 0) {
            digits.push(carry % 58);
            carry = (carry / 58) | 0;
        }
    }
    let string = '';
    for (let k = 0; buffer[k] === 0 && k < buffer.length - 1; k++) {
        string += ALPHABET[0];
    }
    for (let q = digits.length - 1; q >= 0; q--) {
        string += ALPHABET[digits[q]];
    }
    return string;
}

// --- CASHADDR UTILS (Manual Implementation) ---

function toCashAddress(hash160Buffer, type = 'p2sh', includePrefix = true) {
    const prefix = 'bitcoincash';
    // 0x00 = P2PKH (starts with q), 0x08 = P2SH (starts with p)
    const typeByte = (type === 'p2sh') ? 0x08 : 0x00;
    
    const payload = Buffer.concat([Buffer.from([typeByte]), hash160Buffer]);
    const payload5Bit = convertBits(payload, 8, 5, true);
    const checksum = calculateChecksum(prefix, payload5Bit);
    const combined = payload5Bit.concat(checksum);
    
    const CHARSET = 'qpzry9x8gf2tvdw0s3jn54khce6mua7l';
    let addr = '';
    if (includePrefix) {
        addr += prefix + ':';
    }
    for (let val of combined) {
        addr += CHARSET[val];
    }
    return addr;
}

function convertBits(data, fromBits, toBits, pad) {
    let acc = 0;
    let bits = 0;
    const ret = [];
    const maxv = (1 << toBits) - 1;
    for (let value of data) {
        if (value < 0 || (value >> fromBits) !== 0) return null;
        acc = (acc << fromBits) | value;
        bits += fromBits;
        while (bits >= toBits) {
            bits -= toBits;
            ret.push((acc >> bits) & maxv);
        }
    }
    if (pad) {
        if (bits > 0) ret.push((acc << (toBits - bits)) & maxv);
    } else if (bits >= fromBits || ((acc << (toBits - bits)) & maxv)) {
        return null;
    }
    return ret;
}

// --- FIX: Use BigInt for Checksum Calculation ---
function calculateChecksum(prefix, payload) {
    function polyMod(data) {
        // We must use BigInt because the coefficients exceed 32 bits
        let c = 1n; 
        for (let d of data) {
            let c0 = c >> 35n;
            c = ((c & 0x07ffffffffn) << 5n) ^ BigInt(d);
            
            if (c0 & 0x01n) c ^= 0x98f2bc8e61n;
            if (c0 & 0x02n) c ^= 0x79b76d99e2n;
            if (c0 & 0x04n) c ^= 0xf33e5fb3c4n;
            if (c0 & 0x08n) c ^= 0xae2eabe2a8n;
            if (c0 & 0x10n) c ^= 0x1e4f43e470n;
        }
        return c ^ 1n;
    }

    const prefixData = [];
    for (let i = 0; i < prefix.length; i++) prefixData.push(prefix.charCodeAt(i) & 0x1f);
    prefixData.push(0);
    
    const checksumData = prefixData.concat(payload).concat([0, 0, 0, 0, 0, 0, 0, 0]);
    const polymod = polyMod(checksumData);
    
    const ret = [];
    for (let i = 0; i < 8; i++) {
        // Convert BigInt back to Number for the result array
        ret.push(Number((polymod >> (5n * BigInt(7 - i))) & 0x1fn));
    }
    return ret;
}

// --- QUANTUM LIB (Hash Lock Logic) ---

async function createQuantumVault() {
    const secret = crypto.randomBytes(32);
    const secretHash = crypto.createHash('sha256').update(secret).digest();
    
    const scriptBuffer = Buffer.concat([
        Buffer.from('a820', 'hex'),
        secretHash,
        Buffer.from('87', 'hex')
    ]);
    
    const s256 = crypto.createHash('sha256').update(scriptBuffer).digest();
    const h160 = crypto.createHash('ripemd160').update(s256).digest();
    
    // GENERATE ALL ADDRESS FORMATS
    const cashAddrP2SH = toCashAddress(h160, 'p2sh', true);
    const cashAddrP2PKH = toCashAddress(h160, 'p2pkh', true); 
    const legacyAddr = toLegacyP2SH(h160);

    return {
        secret: secret.toString('hex'),
        secretHash: secretHash.toString('hex'),
        address: cashAddrP2SH,
        addressP2PKH: cashAddrP2PKH, 
        legacyAddress: legacyAddr,
        lockingScript: scriptBuffer.toString('hex')
    };
}

// --- API ROUTES ---

app.get('/api/create', async (req, res) => {
    try {
        const vault = await createQuantumVault();
        res.json({ success: true, ...vault });
    } catch (e) {
        console.error(e);
        res.json({ success: false, error: e.message });
    }
});

// Updated Balance Check (supports secret-only lookup)
app.post('/api/balance', async (req, res) => {
    let { address, secret } = req.body;
    
    try {
        // If user provided Secret but no Address, derive the address first
        if (!address && secret) {
            const secretBuf = Buffer.from(secret, 'hex');
            const secretHash = crypto.createHash('sha256').update(secretBuf).digest();
            const scriptBuffer = Buffer.concat([Buffer.from('a820', 'hex'), secretHash, Buffer.from('87', 'hex')]);
            const s256 = crypto.createHash('sha256').update(scriptBuffer).digest();
            const h160 = crypto.createHash('ripemd160').update(s256).digest();
            address = toCashAddress(h160, 'p2sh', true);
        }

        if (!address) throw new Error("Missing Address or Secret");

        const wallet = await Wallet.watchOnly(address);
        const balance = await wallet.getBalance('sat');
        
        res.json({ 
            success: true, 
            balance: balance,
            address: address
        });
    } catch (e) {
        res.json({ success: false, error: e.message });
    }
});

app.post('/api/sweep', async (req, res) => {
    const { secret, toAddress } = req.body;
    
    try {
        if (!Contract) throw new Error("mainnet-js Contract module not loaded");

        const secretBuf = Buffer.from(secret, 'hex');
        const secretHash = crypto.createHash('sha256').update(secretBuf).digest('hex');
        
        const scriptText = `
            contract QuantumVault(bytes32 hash) {
                function spend(bytes secret) {
                    require(sha256(secret) == hash);
                }
            }
        `;
        
        const contract = new Contract(scriptText, [secretHash], 'mainnet');
        console.log(`Sweeping from Contract Address: ${contract.address}`);
        
        const balance = await contract.getBalance('sat');
        console.log(`Vault Balance: ${balance} sats`);
        
        if (balance < 2000) { 
            return res.json({ success: false, error: `Insufficient funds (${balance} sats). Send more BCH to test.` });
        }
        
        const tx = await contract.functions.spend(secret)
            .to(toAddress, balance - 1000) 
            .send();

        res.json({ 
            success: true, 
            message: "Transaction Broadcasted Successfully!",
            txid: tx.txid,
            explorerLink: `https://blockchair.com/bitcoin-cash/transaction/${tx.txid}`
        });
        
    } catch (e) {
        console.error(e);
        res.json({ success: false, error: e.message || "Transaction Failed" });
    }
});

startServer();
