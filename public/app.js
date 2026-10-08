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
    DEV: 'http://edge-payment-gateway.10.13.134.14.nip.io',
    UAT: 'https://k2.citybankplc.com/merchant-gateway',
    LOCAL: 'http://localhost:9083/merchant-gateway'
};

const envPresets = {
    UAT: {
        loginname: 'SHARETRIP',
        login_password: 'SHTrip#12345678',
        channel: 'MOBILE',
        merchanRefNo: '456327yhewghk',
        txnamount: '23',
        servicetype: 'SHARETRIP',
        serviceid: 'SHARETRIP',
        resendpoint: 'https://merchant-payment-tester.vercel.app/callback'
    },
    DEV: {
        loginname: 'NOV24',
        login_password: 'NOV24Merchant@1234',
        channel: 'MOBILE',
        merchanRefNo: '567q89389',
        txnamount: '23',
        servicetype: 'DARAZ',
        serviceid: 'DARAZ',
        resendpoint: 'http://pgw-client-tester.10.13.134.14.nip.io/callback'
    },
    LOCAL: {
        loginname: 'NOV24',
        login_password: 'NOV24Merchant@1234',
        channel: 'MOBILE',
        merchanRefNo: 'LOCAL',
        txnamount: '23',
        servicetype: 'DARAZ',
        serviceid: 'DARAZ',
        resendpoint: 'http://localhost:8080/callback'
    }
};

const getPaymentUrl = (env) => `${baseUrls[env] || baseUrls.DEV}${CONTEXT_PATH}/userlogin`;

// ===== STATE =====
const isMobileDevice = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
let selectedChannel = 'MOBILE';
let userExplicitChannel = false;
let selectedEnv = 'UAT';
let tokens = [];

const loginnameInput = document.getElementById('loginname');
const loginPasswordInput = document.getElementById('login_password');
const merchanRefNoInput = document.getElementById('merchanRefNo');
const resendpointInput = document.getElementById('resendpoint');
const txnamountInput = document.getElementById('txnamount');
const servicetypeInput = document.getElementById('servicetype');
const serviceidInput = document.getElementById('serviceid');

function getMerchantCallbackUrl(env = selectedEnv) {
    const origin = window.location.origin;
    const pathname = window.location.pathname;
    const basePath = pathname.includes('/pgwtester') ? '/pgwtester' : '';

    if (env === 'DEV') {
        if (origin && origin !== 'null' && !origin.startsWith('file:') && !origin.includes('citybankplc.com') && !origin.includes('vercel.app')) {
            return `${origin}${basePath}/callback`;
        }
        return 'http://pgw-client-tester.10.13.134.14.nip.io/callback';
    }

    // For UAT: use current host callback or default to https://merchant-payment-tester.vercel.app/callback
    if (origin && origin !== 'null' && !origin.startsWith('file:') && !origin.includes('citybankplc.com')) {
        return `${origin}${basePath}/callback`;
    }
    return 'https://merchant-payment-tester.vercel.app/callback';
}

let userExplicitlyClearedResendpoint = false;

if (resendpointInput) {
    resendpointInput.addEventListener('input', () => {
        if (resendpointInput.value.trim() === '') {
            userExplicitlyClearedResendpoint = true;
        } else {
            userExplicitlyClearedResendpoint = false;
        }
    });
}

function buildDeeplink(env = selectedEnv, pgwtoken = '') {
    const txnId = transactionIdInput ? transactionIdInput.value.trim() : '';
    const refNo = (merchanRefNoInput && merchanRefNoInput.value.trim()) ? merchanRefNoInput.value.trim() : (env === 'UAT' ? 'UAT' : 'DEV');
    const amount = (txnamountInput && txnamountInput.value.trim()) ? txnamountInput.value.trim() : '23';
    const sType = (servicetypeInput && servicetypeInput.value.trim()) ? servicetypeInput.value.trim() : 'DARAZ';
    const sId = (serviceidInput && serviceidInput.value.trim()) ? serviceidInput.value.trim() : 'DARAZ';

    // resendpoint is optional: if user left it empty, keep it empty!
    let resUrl = (resendpointInput && resendpointInput.value !== undefined)
        ? resendpointInput.value.trim()
        : '';

    // If user put CityBank gateway domain as callback, clear it
    if (resUrl.includes('k2prod.citybankplc.com') || resUrl.includes('k2.citybankplc.com')) {
        resUrl = '';
    }

    const qs = `pgwtoken=${encodeURIComponent(pgwtoken)}&transactionId=${encodeURIComponent(txnId)}&merchanRefNo=${encodeURIComponent(refNo)}&txnamount=${encodeURIComponent(amount)}&servicetype=${encodeURIComponent(sType)}&serviceid=${encodeURIComponent(sId)}&resendpoint=${encodeURIComponent(resUrl)}`;

    if (env === 'DEV') {
        return `citybank://citybank.com/merchant-gateway/signin?${qs}`;
    } else {
        // UAT and default HTTPS App Link
        return `https://k2.citybankplc.com/merchant-gateway/signin?${qs}`;
    }   
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
        if (txnamountInput && preset.txnamount) txnamountInput.value = preset.txnamount;
        if (servicetypeInput && preset.servicetype) servicetypeInput.value = preset.servicetype;
        if (serviceidInput && preset.serviceid) serviceidInput.value = preset.serviceid;

        if (!userExplicitChannel) {
            setChannel('MOBILE');
        }

        // Only set preset resendpoint if user hasn't explicitly cleared it
        if (resendpointInput && !userExplicitlyClearedResendpoint) {
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
            showToast('Channel set to MOBILE (Triggers Citytouch App)', 'info');
        } else {
            showToast('Channel set to WEB (Opens Browser Portal)', 'info');
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
        <div><strong>Status:</strong> ${data.status} - ${data.message}</div>
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

            // Cache credentials and start 5-minute session countdown
            saveSessionCredentials(selectedEnv, loginname, login_password);
            startSessionTimer(selectedEnv, loginname, login_password);

            showToast('Token generated successfully!', 'success');
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
        showToast('Network error - is the server running?', 'error');
    } finally {
        tokenBtn.disabled = false;
        tokenBtnText.innerHTML = 'Generate Token';
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

function getUserloginUrl() {
    return window.location.pathname.includes('/pgwtester')
        ? '/pgwtester/api/userlogin'
        : '/api/userlogin';
}

// ===== PAYMENT FORM SUBMISSION & INTERNAL APP REDIRECTION =====
paymentForm.addEventListener('submit', async (e) => {
    let resVal = (resendpointInput.value || '').trim();

    // resendpoint is optional: only clear if user accidentally put CityBank's own domain
    // NEVER autofill if empty! Respect user's explicit clearing.
    if (resVal.includes('k2prod.citybankplc.com') || resVal.includes('k2.citybankplc.com')) {
        resendpointInput.value = '';
    }

    // Always update paymentForm.action right before submit
    paymentForm.action = getPaymentUrl(selectedEnv);

    // When channel is MOBILE, launch Citytouch app internally via deeplink
    if (selectedChannel === 'MOBILE') {
        e.preventDefault();

        const paymentBtn = document.getElementById('paymentBtn');
        const originalBtnText = paymentBtn.innerHTML;
        paymentBtn.disabled = true;
        paymentBtn.innerHTML = '<div class="spinner"></div> Processing...';

        try {
            showToast(`Connecting to ${selectedEnv}...`, 'info');

            const payload = {
                transactionId: transactionIdInput.value.trim(),
                merchanRefNo: (merchanRefNoInput?.value || selectedEnv).trim(),
                txnamount: (txnamountInput?.value || '23').trim(),
                servicetype: (servicetypeInput?.value || 'DARAZ').trim(),
                serviceid: (serviceidInput?.value || 'DARAZ').trim(),
                resendpoint: resendpointInput.value.trim(),
                env: selectedEnv
            };

            let targetDeeplink = buildDeeplink(selectedEnv, '');
            let webFallbackUrl = null;

            try {
                const res = await fetch(getUserloginUrl(), {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload)
                });

                const data = await res.json();
                if (data.targetDeeplink) {
                    targetDeeplink = data.targetDeeplink;
                } else if (data.pgwtoken) {
                    // Pass decodeURIComponent to ensure buildDeeplink does not double-encode
                    let cleanToken = data.pgwtoken;
                    try {
                        cleanToken = decodeURIComponent(cleanToken);
                    } catch (e) {}
                    targetDeeplink = buildDeeplink(selectedEnv, cleanToken);
                }
                // Capture the web URL for fallback (CityBank web portal redirect)
                if (data.webUrl) {
                    webFallbackUrl = data.webUrl;
                }
            } catch (proxyErr) {
                console.warn(`${selectedEnv} proxy call warning, launching deeplink:`, proxyErr);
            }

            console.log(`[MOBILE] Launching deeplink:`, targetDeeplink);
            console.log(`[MOBILE] Web fallback URL:`, webFallbackUrl || getPaymentUrl(selectedEnv));

            // Fire the deeplink
            window.location.href = targetDeeplink;

            // Fallback: if app is not installed or deeplink didn't open,
            // the page stays visible. After 2.5s redirect to web payment portal.
            const fallbackTimer = setTimeout(() => {
                if (!document.hidden) {
                    console.log('[MOBILE] App did not open — falling back to web portal');
                    showToast('App not detected. Opening web payment portal...', 'info');

                    if (webFallbackUrl) {
                        // Direct redirect to CityBank web URL returned by server
                        window.location.href = webFallbackUrl;
                    } else {
                        // Fallback: POST the payment form to the web gateway
                        paymentForm.action = getPaymentUrl(selectedEnv);
                        paymentForm.submit();
                    }
                }
            }, 2500);

            // If the user does leave (app opened), cancel the fallback
            const cancelFallback = () => {
                if (document.hidden) {
                    clearTimeout(fallbackTimer);
                    document.removeEventListener('visibilitychange', cancelFallback);
                }
            };
            document.addEventListener('visibilitychange', cancelFallback);

        } catch (err) {
            console.error('Payment launch error:', err);
            // Hard fallback — just submit as web
            paymentForm.action = getPaymentUrl(selectedEnv);
            paymentForm.submit();
        } finally {
            setTimeout(() => {
                paymentBtn.disabled = false;
                paymentBtn.innerHTML = originalBtnText;
            }, 1000);
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

// ===== SESSION MANAGEMENT =====

const SESSION_DURATION_MS = 2 * 60 * 1000; // 2 minutes
const SESSION_KEY = 'pgw_session_creds';

let sessionTimer = null;
let sessionCountdownInterval = null;
let sessionExpiresAt = null;

/**
 * Save credentials to localStorage keyed by environment.
 */
function saveSessionCredentials(env, loginname, login_password) {
    try {
        const stored = JSON.parse(localStorage.getItem(SESSION_KEY) || '{}');
        stored[env] = { loginname, login_password, savedAt: new Date().toISOString() };
        localStorage.setItem(SESSION_KEY, JSON.stringify(stored));
    } catch (e) {
        console.warn('Could not save session credentials:', e);
    }
}

/**
 * Load cached credentials for a given environment.
 */
function loadSessionCredentials(env) {
    try {
        const stored = JSON.parse(localStorage.getItem(SESSION_KEY) || '{}');
        return stored[env] || null;
    } catch (e) {
        return null;
    }
}

/**
 * Clear any running session timer and countdown badge.
 */
function clearSessionTimer() {
    if (sessionTimer) { clearTimeout(sessionTimer); sessionTimer = null; }
    if (sessionCountdownInterval) { clearInterval(sessionCountdownInterval); sessionCountdownInterval = null; }
    sessionExpiresAt = null;
    const badge = document.getElementById('sessionCountdownBadge');
    if (badge) badge.remove();
}

/**
 * Render / update the live countdown badge in the header.
 */
function updateCountdownBadge() {
    const remaining = sessionExpiresAt - Date.now();
    if (remaining <= 0) return;

    const mins = Math.floor(remaining / 60000);
    const secs = Math.floor((remaining % 60000) / 1000);
    const label = `${mins}:${String(secs).padStart(2, '0')}`;

    let badge = document.getElementById('sessionCountdownBadge');
    if (!badge) {
        badge = document.createElement('div');
        badge.id = 'sessionCountdownBadge';
        badge.title = 'Session expires in';
        badge.style.cssText = `
            display:inline-flex;align-items:center;gap:5px;
            background:rgba(34,197,94,0.15);border:1px solid rgba(34,197,94,0.35);
            color:#4ade80;border-radius:20px;padding:4px 12px;font-size:12px;
            font-weight:600;cursor:default;transition:background .3s,color .3s,border-color .3s;
        `;
        const headerRight = document.querySelector('.header-badge')?.parentElement;
        if (headerRight) headerRight.insertBefore(badge, headerRight.querySelector('.header-badge'));
        else document.querySelector('.app-header')?.appendChild(badge);
    }

    // Turn orange when < 60s remaining
    if (remaining < 60000) {
        badge.style.background = 'rgba(251,146,60,0.15)';
        badge.style.borderColor = 'rgba(251,146,60,0.4)';
        badge.style.color = '#fb923c';
    } else {
        badge.style.background = 'rgba(34,197,94,0.15)';
        badge.style.borderColor = 'rgba(34,197,94,0.35)';
        badge.style.color = '#4ade80';
    }

    badge.innerHTML = `Session: ${label}`;
}

/**
 * Start the 5-minute session countdown.
 * Call immediately after a successful token generation.
 */
function startSessionTimer(env, loginname, login_password) {
    clearSessionTimer();

    sessionExpiresAt = Date.now() + SESSION_DURATION_MS;
    console.log(`[Session] 5-min timer started for ${env}. Expires at ${new Date(sessionExpiresAt).toLocaleTimeString()}`);

    updateCountdownBadge();
    sessionCountdownInterval = setInterval(updateCountdownBadge, 1000);

    sessionTimer = setTimeout(() => {
        clearSessionTimer();
        console.log(`[Session] Session expired for ${env}`);
        showSessionExpiredModal(env, { loginname, login_password });
    }, SESSION_DURATION_MS);
}

/**
 * Show the session-expired modal with pre-filled credentials.
 * Re-Login generates a fresh token and restarts the 5-minute timer.
 */
function showSessionExpiredModal(env, creds) {
    const existing = document.getElementById('sessionExpiredModal');
    if (existing) existing.remove();

    const modal = document.createElement('div');
    modal.id = 'sessionExpiredModal';
    modal.style.cssText = `
        position:fixed;inset:0;z-index:9999;
        background:rgba(0,0,0,0.75);backdrop-filter:blur(4px);
        display:flex;align-items:center;justify-content:center;padding:16px;
    `;

    const loginname = creds?.loginname || '';
    const login_password = creds?.login_password || '';

    modal.innerHTML = `
        <div style="
            background: linear-gradient(135deg, #1e293b, #0f172a);
            border: 1px solid rgba(239,68,68,0.4);
            border-radius: 16px;
            padding: 32px;
            max-width: 420px;
            width: 100%;
            box-shadow: 0 25px 60px rgba(0,0,0,0.6);
            font-family: inherit;
            color: #e2e8f0;
        ">
            <div style="text-align:center;margin-bottom:24px;">
                <div style="font-size:48px;margin-bottom:12px;"></div>
                <h2 style="margin:0 0 8px;font-size:20px;font-weight:700;color:#f87171;">Session Expired</h2>
                <p style="margin:0;font-size:14px;color:#94a3b8;">
                    Your <strong>${env}</strong> session expired after 2 minutes.<br>Please re-authenticate to continue.
                </p>
            </div>

            <div style="margin-bottom:16px;">
                <label style="display:block;font-size:12px;font-weight:600;color:#94a3b8;margin-bottom:6px;text-transform:uppercase;letter-spacing:.05em;">
                    Merchant Username
                </label>
                <input id="modalLoginname" type="text" value="${loginname}"
                    style="width:100%;box-sizing:border-box;padding:10px 12px;border-radius:8px;border:1px solid rgba(255,255,255,0.15);background:rgba(255,255,255,0.07);color:#e2e8f0;font-size:14px;outline:none;"
                    placeholder="Merchant username" autocomplete="off">
            </div>

            <div style="margin-bottom:24px;">
                <label style="display:block;font-size:12px;font-weight:600;color:#94a3b8;margin-bottom:6px;text-transform:uppercase;letter-spacing:.05em;">
                    Password
                </label>
                <input id="modalPassword" type="password" value="${login_password}"
                    style="width:100%;box-sizing:border-box;padding:10px 12px;border-radius:8px;border:1px solid rgba(255,255,255,0.15);background:rgba(255,255,255,0.07);color:#e2e8f0;font-size:14px;outline:none;"
                    placeholder="Merchant password" autocomplete="off">
            </div>

            <div id="modalError" style="display:none;margin-bottom:16px;padding:10px 12px;border-radius:8px;background:rgba(239,68,68,0.15);border:1px solid rgba(239,68,68,0.3);color:#f87171;font-size:13px;"></div>

            <div style="display:flex;gap:10px;">
                <button id="modalReloginBtn" style="
                    flex:1;padding:12px;border:none;border-radius:10px;
                    background:linear-gradient(135deg,#3b82f6,#6366f1);
                    color:#fff;font-size:14px;font-weight:700;cursor:pointer;
                ">Re-Login</button>
                <button id="modalDismissBtn" style="
                    padding:12px 18px;border:1px solid rgba(255,255,255,0.15);border-radius:10px;
                    background:transparent;color:#94a3b8;font-size:14px;cursor:pointer;
                ">Dismiss</button>
            </div>

            <p style="text-align:center;margin:16px 0 0;font-size:11px;color:#475569;">
                Sessions auto-expire after 2 minutes. Credentials saved per environment.
            </p>
        </div>
    `;

    document.body.appendChild(modal);

    document.getElementById('modalDismissBtn').addEventListener('click', () => modal.remove());
    modal.addEventListener('click', (e) => { if (e.target === modal) modal.remove(); });

    document.getElementById('modalReloginBtn').addEventListener('click', async () => {
        const name = document.getElementById('modalLoginname').value.trim();
        const pass = document.getElementById('modalPassword').value.trim();
        const errorEl = document.getElementById('modalError');
        const btn = document.getElementById('modalReloginBtn');

        if (!name || !pass) {
            errorEl.textContent = 'Please enter your username and password.';
            errorEl.style.display = 'block';
            return;
        }

        btn.disabled = true;
        btn.textContent = 'Logging in...';
        errorEl.style.display = 'none';

        try {
            const tokenApiEndpoint = window.location.pathname.includes('/pgwtester')
                ? '/pgwtester/api/gettoken'
                : '/api/gettoken';

            const res = await fetch(tokenApiEndpoint, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ loginname: name, login_password: pass, channel: selectedChannel, env })
            });

            const data = await res.json();

            if (data.status === '100' && data.transactionId) {
                if (loginnameInput) loginnameInput.value = name;
                if (loginPasswordInput) loginPasswordInput.value = pass;
                transactionIdInput.value = data.transactionId;
                paymentPanel.classList.remove('disabled');
                step1Indicator.classList.remove('active');
                step1Indicator.classList.add('completed');
                step2Indicator.classList.add('active');
                stepConnector.classList.add('active');

                saveSessionCredentials(env, name, pass);
                addTokenToHistory(data.transactionId, name);

                // Restart the 5-minute timer fresh
                startSessionTimer(env, name, pass);

                modal.remove();
                showToast('Re-logged in! Session reset to 2 minutes.', 'success');
            } else {
                errorEl.textContent = data.message || 'Login failed. Please check your credentials.';
                errorEl.style.display = 'block';
            }
        } catch (err) {
            errorEl.textContent = 'Network error: ' + err.message;
            errorEl.style.display = 'block';
        } finally {
            btn.disabled = false;
            btn.textContent = 'Re-Login';
        }
    });

    setTimeout(() => {
        const nameInput = document.getElementById('modalLoginname');
        const passInput = document.getElementById('modalPassword');
        if (nameInput && !nameInput.value) nameInput.focus();
        else if (passInput) passInput.focus();
    }, 100);
}
