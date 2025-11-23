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

// --- HELPER: QR GENERATOR ---
function generateQR(elementId, text) {
    document.getElementById(elementId).innerHTML = ""; // Clear previous
    new QRCode(document.getElementById(elementId), {
        text: text,
        width: 128,
        height: 128,
        colorDark : "#000000",
        colorLight : "#ffffff",
        correctLevel : QRCode.CorrectLevel.H
    });
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
        
        const container = document.getElementById('addressesContainer');
        container.innerHTML = ''; // Clear previous results

        // Define address types to display
        const addresses = [
            { title: "Vault Address (Standard P2SH)", val: data.address, id: "qr_p2sh" },
            { title: "P2PKH Format (Compatibility)", val: data.addressP2PKH, id: "qr_p2pkh" },
            { title: "Legacy Format", val: data.legacyAddress, id: "qr_legacy" }
        ];

        // Loop through and create HTML for each
        addresses.forEach(addr => {
            const wrapper = document.createElement('div');
            wrapper.className = 'address-block';
            wrapper.style.marginBottom = "20px";
            wrapper.style.borderBottom = "1px solid #444";
            wrapper.style.paddingBottom = "15px";

            wrapper.innerHTML = `
                <label>${addr.title}:</label>
                <div class="addr">${addr.val}</div>
                <div id="${addr.id}" style="margin-top:10px; background:white; padding:10px; display:inline-block;"></div>
            `;
            container.appendChild(wrapper);
            
            // Generate QR after element is in DOM
            setTimeout(() => generateQR(addr.id, addr.val), 50);
        });

        document.getElementById('vaultSecret').innerText = data.secret;
    } else {
        alert("Error creating vault: " + data.error);
    }

    btn.innerText = originalText;
    btn.disabled = false;
}

// 2. Check Balance 
async function checkBalance() {
    const secret = document.getElementById('sweepSecret').value.trim();
    if (!secret) return alert("Please enter the Vault Secret first.");

    const status = document.getElementById('statusMsg');
    status.innerText = "Checking balance on blockchain...";
    status.style.color = "yellow";

    if (secret.length !== 64) {
        status.innerText = "Invalid Secret Format (Must be 64 hex chars)";
        status.style.color = "#ff5555";
        return;
    }

    // Call the API with the secret
    const data = await apiRequest('/api/balance', 'POST', { secret });

    if (data.success) {
        const bch = data.balance / 100000000;
        status.innerHTML = `
            <strong>Balance Found:</strong> ${data.balance} sats (${bch} BCH)<br>
            <span style="font-size:0.8em; color:#aaa;">Vault Addr: ${data.address}</span>
        `;
        status.style.color = "#0ac18e";
    } else {
        status.innerText = "Error: " + data.error;
        status.style.color = "#ff5555";
    }
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
