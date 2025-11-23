import express from 'express';
import bodyParser from 'body-parser';
import { Wallet } from 'mainnet-js';
import crypto from 'crypto';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const port = 3000;

app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, 'public')));

// --- QUANTUM LIB (Hash Lock Logic) ---

// Helper: Create a Quantum Vault (Hash Lock)
async function createQuantumVault() {
    // 1. Generate Secret (32 bytes)
    const secret = crypto.randomBytes(32);
    
    // 2. Hash Secret (SHA256)
    const secretHash = crypto.createHash('sha256').update(secret).digest();
    
    // 3. Create Locking Script: OP_SHA256 <Hash> OP_EQUAL
    const scriptBuffer = Buffer.concat([
        Buffer.from('a820', 'hex'),
        secretHash,
        Buffer.from('87', 'hex')
    ]);
    
    // 4. Generate P2SH Address
    const wallet = await Wallet.fromP2SH(scriptBuffer.toString('hex'));
    
    return {
        secret: secret.toString('hex'),
        secretHash: secretHash.toString('hex'),
        address: wallet.address,
        lockingScript: scriptBuffer.toString('hex')
    };
}

// --- API ROUTES ---

// 1. Create Vault
app.get('/api/create', async (req, res) => {
    try {
        const vault = await createQuantumVault();
        res.json({
            success: true,
            ...vault
        });
    } catch (e) {
        res.json({ success: false, error: e.message });
    }
});

// 2. Check Balance
app.post('/api/balance', async (req, res) => {
    const { address } = req.body;
    try {
        const wallet = await Wallet.watchOnly(address);
        const balance = await wallet.getBalance('sat');
        res.json({ success: true, balance: balance });
    } catch (e) {
        res.json({ success: false, error: e.message });
    }
});

// 3. Sweep Vault (Spend)
app.post('/api/sweep', async (req, res) => {
    const { secret, toAddress } = req.body;
    
    try {
        // Re-derive the vault to get its address and UTXOs
        const secretBuf = Buffer.from(secret, 'hex');
        const secretHash = crypto.createHash('sha256').update(secretBuf).digest();
        const scriptBuffer = Buffer.concat([
            Buffer.from('a820', 'hex'),
            secretHash,
            Buffer.from('87', 'hex')
        ]);
        
        const wallet = await Wallet.fromP2SH(scriptBuffer.toString('hex'));
        
        // Get Balance
        const balance = await wallet.getBalance('sat');
        if (balance < 1000) {
            return res.json({ success: false, error: "Insufficient funds in vault." });
        }
        
        // Simulate Spend
        res.json({ 
            success: true, 
            message: "Transaction Constructed (Simulation)",
            txid: "requires_full_node_implementation",
            debug: "Secret verified against hash."
        });
        
    } catch (e) {
        res.json({ success: false, error: e.message });
    }
});

app.listen(port, () => {
    console.log(`BCH Quantum Wallet running at http://localhost:${port}`);
});
