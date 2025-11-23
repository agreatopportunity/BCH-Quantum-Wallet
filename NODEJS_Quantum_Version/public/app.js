// BCH Quantum Wallet Frontend Logic

// --- API HELPER ---
async function apiRequest(endpoint, method = 'GET', body = null) {
    const options = {
        method,
        headers: { 'Content-Type': 'application/json' }
    };
    if (body) options.body = JSON.stringify(body);

    try {
        const res = await fetch(endpoint, options);
        return await res.json();
    } catch (e) {
        return { success: false, error: "Network Error: " + e.message };
    }
}

// --- CORE FUNCTIONS ---

// 1. Create New Vault
async function createVault() {
    const btn = document.querySelector('button[onclick="createVault()"]');
    const originalText = btn.innerText;
    btn.innerText = "Generating...";
    btn.disabled = true;

    const data = await apiRequest('/api/create');

    if (data.success) {
        document.getElementById('result').style.display = 'block';
        
        // Show CashAddr
        document.getElementById('vaultAddr').innerText = data.address;
        
        // Show Legacy Address (Add this line if you have an element for it, 
        // or append it to the existing one for now)
        document.getElementById('vaultAddr').innerHTML = 
            `<div><strong>CashAddr:</strong> ${data.address}</div>
             <div style="margin-top:5px; font-size:0.9em; color:#aaa;"><strong>Legacy:</strong> ${data.legacyAddress}</div>`;
             
        document.getElementById('vaultSecret').innerText = data.secret;
    } else {
        alert("Error creating vault: " + data.error);
    }

    btn.innerText = originalText;
    btn.disabled = false;
}

// 2. Check Balance (Simulation / Helper)
async function checkBalance() {
    // In a real app, we might derive the address from the secret client-side
    // or ask the user to paste the address.
    // For this demo, we'll ask the user to ensure the address field is populated
    // or just alert them about the flow.
    
    // Ideally, we would have an input for "Vault Address" in the sweep section too,
    // or derive it. Here we mock the check based on the secret.
    
    const secret = document.getElementById('sweepSecret').value.trim();
    if (!secret) return alert("Please enter the Vault Secret first.");

    const status = document.getElementById('statusMsg');
    status.innerText = "Checking balance...";
    status.style.color = "yellow";

    // Note: This endpoint is a placeholder in server.js logic unless we send address
    // We will assume for this UX that we just want to Validate the secret format first
    if (secret.length !== 64) {
        status.innerText = "Invalid Secret Format (Must be 64 hex chars)";
        status.style.color = "#ff5555";
        return;
    }

    // If we had the address, we'd call /api/balance
    status.innerText = "Secret format looks valid. Ready to sweep.";
    status.style.color = "#0ac18e";
}

// 3. Sweep Vault
async function sweepVault() {
    const secret = document.getElementById('sweepSecret').value.trim();
    const toAddress = document.getElementById('recipientAddr').value.trim();
    const status = document.getElementById('statusMsg');

    if (!secret || !toAddress) {
        alert("Please enter both Secret and Recipient Address.");
        return;
    }

    status.innerText = "Broadcasting Transaction...";
    status.style.color = "yellow";

    const data = await apiRequest('/api/sweep', 'POST', { secret, toAddress });

    if (data.success) {
        status.innerHTML = `<strong>Success!</strong><br>${data.message}<br><span style="font-size:0.8em; color:#aaa;">${data.txid}</span>`;
        status.style.color = "#0ac18e";
    } else {
        status.innerText = "Error: " + data.error;
        status.style.color = "#ff5555";
    }
}

// --- UTILS ---

function copySecret() {
    const text = document.getElementById('vaultSecret').innerText;
    if (text === "..." || !text) return;
    
    navigator.clipboard.writeText(text).then(() => {
        const btn = document.querySelector('.copy-btn');
        const originalText = btn.innerText;
        btn.innerText = "Copied!";
        setTimeout(() => btn.innerText = originalText, 2000);
    });
}

// Attach functions to window so HTML onclick can see them
window.createVault = createVault;
window.checkBalance = checkBalance;
window.sweepVault = sweepVault;
window.copySecret = copySecret;
