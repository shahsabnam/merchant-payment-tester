// ===== DOM REFERENCES =====
const tokenForm = document.getElementById('tokenForm');
const tokenBtn = document.getElementById('tokenBtn');
const tokenBtnText = document.getElementById('tokenBtnText');
const responseBox = document.getElementById('responseBox');
const responseContent = document.getElementById('responseContent');
const paymentPanel = document.getElementById('paymentPanel');
const transactionIdInput = document.getElementById('transactionId');
const tokenHistory = document.getElementById('tokenHistory');
const tokenHistoryList = document.getElementById('tokenHistoryList');
const toastContainer = document.getElementById('toastContainer');
const step1Indicator = document.getElementById('step1Indicator');
const step2Indicator = document.getElementById('step2Indicator');
const stepConnector = document.getElementById('stepConnector');
const channelBtns = document.querySelectorAll('.channel-btn');
const envTabs = document.querySelectorAll('.env-tab');
const paymentForm = document.getElementById('paymentForm');

// ===== ENVIRONMENTS CONFIG =====
const CONTEXT_PATH = '/CityBank/merchant';

const baseUrls = {
    DEV: 'https://k2prod.citybankplc.com/citytouch/',
    UAT: 'https://k2.citybankplc.com/merchant-gateway',
    LOCAL: 'http://localhost:9083/merchant-gateway'
};

const envPresets = {
    UAT: {
        loginname: 'SHARETRIP',
        login_password: 'SHTrip#12345678',
        channel: 'WEB',
        merchanRefNo: 'UAT',
        resendpoint: 'https://k2.citybankplc.com/pgwtester/callback'
    },
    DEV: {
        loginname: 'NOV24',
        login_password: 'NOV24Merchant@1234',
        channel: 'WEB',
        merchanRefNo: 'DEV',
        resendpoint: null
    },
    LOCAL: {
        loginname: 'daraz',
        login_password: 'Abc@1234',
        channel: 'WEB',
        merchanRefNo: 'LOCAL',
        resendpoint: null
    }
};

const getPaymentUrl = (env) => `${baseUrls[env] || baseUrls.DEV}${CONTEXT_PATH}/userlogin`;

// ===== STATE =====
const isMobileDevice = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
let selectedChannel = 'WEB'; // Default to WEB for seamless merchant payment and return
let userExplicitChannel = false;
let selectedEnv = 'UAT';
let tokens = [];

const loginnameInput = document.getElementById('loginname');
const loginPasswordInput = document.getElementById('login_password');
const merchanRefNoInput = document.getElementById('merchanRefNo');
const resendpointInput = document.getElementById('resendpoint');

function getMerchantCallbackUrl(env = selectedEnv) {
    if (env === 'UAT') {
        return 'https://k2.citybankplc.com/pgwtester/callback';
    }
    // DEV and LOCAL: use current origin callback with basePath if hosted under a sub-path
    const origin = window.location.origin;
    const pathname = window.location.pathname;
    const basePath = pathname.includes('/pgwtester') ? '/pgwtester' : '';
    if (origin && origin !== 'null' && !origin.startsWith('file:') && !origin.includes('k2.citybankplc.com')) {
        return `${origin}${basePath}/callback`;
    }
    return 'http://pgw-client-tester.10.13.134.14.nip.io/callback';
}

function setChannel(channel, isUserAction = false) {
    selectedChannel = channel;
    if (isUserAction) {
        userExplicitChannel = true;
    }
    channelBtns.forEach(b => {
        b.classList.toggle('active', b.dataset.channel === channel);
    });
}

function applyPreset(env) {
    const preset = envPresets[env];
    if (preset) {
        if (loginnameInput && preset.loginname) loginnameInput.value = preset.loginname;
        if (loginPasswordInput && preset.login_password) loginPasswordInput.value = preset.login_password;
        if (merchanRefNoInput && preset.merchanRefNo) merchanRefNoInput.value = preset.merchanRefNo;
        
        // Default to WEB for seamless merchant payment and callback return
        if (!userExplicitChannel) {
            setChannel('WEB');
        }

        if (resendpointInput) {
            resendpointInput.value = preset.resendpoint || getMerchantCallbackUrl(env);
        }
    }
}

if (resendpointInput) {
    resendpointInput.value = getMerchantCallbackUrl(selectedEnv);
}

// Initialize
paymentForm.action = getPaymentUrl(selectedEnv);
applyPreset(selectedEnv);

// ===== ENVIRONMENT SELECTOR =====
envTabs.forEach(tab => {
    tab.addEventListener('click', () => {
        envTabs.forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
        selectedEnv = tab.dataset.env;

        // Update payment form action
        paymentForm.action = getPaymentUrl(selectedEnv);

        // Apply environment credentials and channel preset
        applyPreset(selectedEnv);

        showToast(`Environment switched to ${selectedEnv}`, 'info');
    });
});

// ===== CHANNEL SELECTOR =====
channelBtns.forEach(btn => {
    btn.addEventListener('click', () => {
        const channel = btn.dataset.channel;
        setChannel(channel, true);
        if (channel === 'MOBILE') {
            showToast('📱 Channel set to MOBILE (Triggers Citytouch App)', 'info');
        } else {
            showToast('🌐 Channel set to WEB (Opens Browser Portal)', 'info');
        }
    });
});

// ===== TOAST NOTIFICATIONS =====
function showToast(message, type = 'info') {
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.textContent = message;
    toastContainer.appendChild(toast);
    setTimeout(() => {
        if (toast.parentNode) toast.remove();
    }, 3500);
}

// ===== TOKEN GENERATION =====
tokenForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    const loginname = document.getElementById('loginname').value.trim();
    const login_password = document.getElementById('login_password').value.trim();

    if (!loginname || !login_password) {
        showToast('Please fill in both username and password', 'error');
        return;
    }

    // Set loading state
    tokenBtn.disabled = true;
    tokenBtnText.innerHTML = '<div class="spinner"></div> Generating...';

    // Reset response
    responseBox.className = 'response-box';
    responseBox.style.display = 'none';

    try {
        const tokenApiEndpoint = window.location.pathname.includes('/pgwtester')
            ? '/pgwtester/api/gettoken'
            : '/api/gettoken';

        const res = await fetch(tokenApiEndpoint, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ loginname, login_password, channel: selectedChannel, env: selectedEnv })
        });

        const data = await res.json();

        if (data.status === '100' && data.transactionId) {
            // Success
            responseBox.className = 'response-box success';
            responseContent.innerHTML = `
        <div><strong>Status:</strong> ${data.status} — ${data.message}</div>
        <div><strong>Transaction ID:</strong> ${data.transactionId}</div>
      `;

            // Fill payment form
            transactionIdInput.value = data.transactionId;

            // Enable payment panel
            paymentPanel.classList.remove('disabled');

            // Update step indicators
            step1Indicator.classList.remove('active');
            step1Indicator.classList.add('completed');
            step2Indicator.classList.add('active');
            stepConnector.classList.add('active');

            // Add to history
            addTokenToHistory(data.transactionId, loginname);

            showToast('✅ Token generated successfully!', 'success');
        } else {
            // API returned an error
            responseBox.className = 'response-box error';
            responseContent.innerHTML = `
        <div><strong>Status:</strong> ${data.status || 'N/A'}</div>
        <div><strong>Message:</strong> ${data.message || 'Unknown error'}</div>
      `;
            showToast('Token generation failed: ' + (data.message || 'Unknown error'), 'error');
        }
    } catch (error) {
        responseBox.className = 'response-box error';
        responseContent.innerHTML = `<div><strong>Error:</strong> ${error.message}</div>`;
        showToast('Network error — is the server running?', 'error');
    } finally {
        tokenBtn.disabled = false;
        tokenBtnText.innerHTML = '🔐 Generate Token';
    }
});

// ===== TOKEN HISTORY =====
function addTokenToHistory(txnId, merchant) {
    const now = new Date();
    const timeStr = now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });

    tokens.unshift({ id: txnId, merchant, time: timeStr });
    if (tokens.length > 5) tokens.pop();

    renderTokenHistory();
}

function renderTokenHistory() {
    if (tokens.length === 0) {
        tokenHistory.style.display = 'none';
        return;
    }

    tokenHistory.style.display = 'block';
    tokenHistoryList.innerHTML = tokens.map((t, i) => `
    <div class="token-item" title="${t.id}">
      <span class="token-id">${t.merchant}: ${t.id}</span>
      <span class="token-time">${t.time}</span>
      <button type="button" class="use-btn" onclick="useToken(${i})">Use</button>
    </div>
  `).join('');
}

function useToken(index) {
    const token = tokens[index];
    if (token) {
        transactionIdInput.value = token.id;
        paymentPanel.classList.remove('disabled');
        step1Indicator.classList.remove('active');
        step1Indicator.classList.add('completed');
        step2Indicator.classList.add('active');
        stepConnector.classList.add('active');
        showToast('Token loaded into payment form', 'info');
    }
}

// ===== STEP NAVIGATION =====
step1Indicator.addEventListener('click', () => {
    step1Indicator.classList.add('active');
    step1Indicator.classList.remove('completed');
    document.querySelector('.panel-token').scrollIntoView({ behavior: 'smooth', block: 'start' });
});

step2Indicator.addEventListener('click', () => {
    if (!paymentPanel.classList.contains('disabled')) {
        document.querySelector('.panel-payment').scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
});

// ===== DEEP LINK MODAL =====
function closeDeepLinkModal() {
    const modal = document.getElementById('deepLinkModal');
    if (modal) modal.style.display = 'none';
}

function getUserloginUrl() {
    return window.location.pathname.includes('/pgwtester')
        ? '/pgwtester/api/userlogin'
        : '/api/userlogin';
}

// ===== PAYMENT FORM SUBMISSION GUARD & APP LAUNCHER =====
paymentForm.addEventListener('submit', async (e) => {
    let resVal = (resendpointInput.value || '').trim();

    if (selectedEnv === 'UAT') {
        // For UAT: ensure callback points to https://k2.citybankplc.com/pgwtester/callback
        if (!resVal || resVal === 'https://k2.citybankplc.com/callback' || resVal === '/callback' || !resVal.includes('/pgwtester/callback')) {
            resendpointInput.value = 'https://k2.citybankplc.com/pgwtester/callback';
            console.log('[PaymentForm] Set UAT resendpoint to https://k2.citybankplc.com/pgwtester/callback');
        }
    } else {
        // For DEV: keep same mechanism as it was for DEV
        if (!resVal || resVal.startsWith('/') || !resVal.startsWith('http')) {
            const correctUrl = getMerchantCallbackUrl(selectedEnv);
            resendpointInput.value = correctUrl;
            console.log(`[PaymentForm] Set DEV resendpoint to ${correctUrl}`);
        }
    }

    // If channel is MOBILE, handle deep link app launching
    if (selectedChannel === 'MOBILE') {
        e.preventDefault();

        const paymentBtn = document.getElementById('paymentBtn');
        const originalBtnText = paymentBtn.innerHTML;
        paymentBtn.disabled = true;
        paymentBtn.innerHTML = '<div class="spinner"></div> Connecting to Gateway...';

        try {
            const payload = {
                transactionId: transactionIdInput.value.trim(),
                merchanRefNo: merchanRefNoInput.value.trim(),
                txnamount: document.getElementById('txnamount').value.trim(),
                servicetype: document.getElementById('servicetype').value.trim(),
                serviceid: document.getElementById('serviceid').value.trim(),
                resendpoint: resendpointInput.value.trim(),
                env: selectedEnv
            };

            const res = await fetch(getUserloginUrl(), {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            const data = await res.json();

            if (data.status === 'success' && data.appLinks) {
                // Populate deep link modal buttons
                document.getElementById('btnScheme').href = data.appLinks.scheme;
                document.getElementById('btnIntent').href = data.appLinks.androidIntentK2;
                document.getElementById('btnK2Prod').href = data.appLinks.k2prod;
                document.getElementById('btnCitytouch').href = data.appLinks.citytouch;
                document.getElementById('btnWebPortal').href = data.webUrl || '#';

                // Display modal
                document.getElementById('deepLinkModal').style.display = 'flex';
                showToast('🚀 Launching Citytouch App...', 'info');

                // Attempt auto-launch via custom scheme
                setTimeout(() => {
                    window.location.href = data.appLinks.scheme;
                }, 300);
            } else {
                showToast('Gateway error: ' + (data.message || 'Unknown error'), 'error');
                // Fallback to standard form submit
                paymentForm.submit();
            }
        } catch (err) {
            console.error('Payment launch error:', err);
            showToast('Network error — opening in browser...', 'info');
            paymentForm.submit();
        } finally {
            paymentBtn.disabled = false;
            paymentBtn.innerHTML = originalBtnText;
        }
    }
});

// ===== KEYBOARD SHORTCUT =====
document.addEventListener('keydown', (e) => {
    // Ctrl/Cmd + Enter to submit the active form
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
        if (paymentPanel.classList.contains('disabled')) {
            tokenForm.requestSubmit();
        } else {
            paymentForm.requestSubmit();
        }
    }
});
