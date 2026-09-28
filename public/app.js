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
    UAT: 'https://k2prod.citybankplc.com/merchant-gateway',
    LOCAL: 'http://localhost:9083/merchant-gateway'
};

const envPresets = {
    UAT: {
        loginname: 'SHARETRIP',
        login_password: 'SHTrip#12345678',
        channel: 'WEB',
        merchanRefNo: 'UAT',
        txnamount: '23',
        servicetype: 'DARAZ',
        serviceid: 'DARAZ',
        resendpoint: 'https://k2prod.citybankplc.com/pgwtester/callback'
    },
    DEV: {
        loginname: 'NOV24',
        login_password: 'NOV24Merchant@1234',
        channel: 'WEB',
        merchanRefNo: 'DEV',
        txnamount: '23',
        servicetype: 'DARAZ',
        serviceid: 'DARAZ',
        resendpoint: 'http://pgw-client-tester.10.13.134.14.nip.io/callback'
    },
    LOCAL: {
        loginname: 'daraz',
        login_password: 'Abc@1234',
        channel: 'WEB',
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
let selectedChannel = 'WEB'; // Default to WEB for seamless merchant payment and return
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
    if (env === 'UAT') {
        return 'https://k2prod.citybankplc.com/pgwtester/callback';
    }
    if (env === 'DEV') {
        return 'http://pgw-client-tester.10.13.134.14.nip.io/callback';
    }
    const origin = window.location.origin;
    const pathname = window.location.pathname;
    const basePath = pathname.includes('/pgwtester') ? '/pgwtester' : '';
    if (origin && origin !== 'null' && !origin.startsWith('file:') && !origin.includes('k2.citybankplc.com') && !origin.includes('k2prod.citybankplc.com')) {
        return `${origin}${basePath}/callback`;
    }
    return 'http://pgw-client-tester.10.13.134.14.nip.io/callback';
}

function buildDeeplink(env = selectedEnv, pgwtoken = '') {
    const txnId = transactionIdInput ? transactionIdInput.value.trim() : '';
    const refNo = (merchanRefNoInput && merchanRefNoInput.value.trim()) ? merchanRefNoInput.value.trim() : (env === 'UAT' ? 'UAT' : 'DEV');
    const amount = (txnamountInput && txnamountInput.value.trim()) ? txnamountInput.value.trim() : '23';
    const sType = (servicetypeInput && servicetypeInput.value.trim()) ? servicetypeInput.value.trim() : 'DARAZ';
    const sId = (serviceidInput && serviceidInput.value.trim()) ? serviceidInput.value.trim() : 'DARAZ';
    const resUrl = (resendpointInput && resendpointInput.value.trim())
        ? resendpointInput.value.trim()
        : getMerchantCallbackUrl(env);

    const qs = `pgwtoken=${encodeURIComponent(pgwtoken)}&transactionId=${encodeURIComponent(txnId)}&merchanRefNo=${encodeURIComponent(refNo)}&txnamount=${encodeURIComponent(amount)}&servicetype=${encodeURIComponent(sType)}&serviceid=${encodeURIComponent(sId)}&resendpoint=${encodeURIComponent(resUrl)}`;

    if (env === 'DEV') {
        return `citybank://citybank.com/merchant-gateway/signin?${qs}`;
    } else {
        // UAT and default HTTPS App Link
        return `https://k2prod.citybankplc.com/merchant-gateway/signin?${qs}`;
    }
}

function updateDeeplinkPreview(customLink = null) {
    const link = customLink || buildDeeplink(selectedEnv);
    const deeplinkText = document.getElementById('deeplinkText');
    const btnDirectDeeplink = document.getElementById('btnDirectDeeplink');
    const deeplinkEnvBadge = document.getElementById('deeplinkEnvBadge');

    if (deeplinkText) deeplinkText.textContent = link;
    if (btnDirectDeeplink) btnDirectDeeplink.href = link;
    if (deeplinkEnvBadge) deeplinkEnvBadge.textContent = selectedEnv;

    const modalPrimary = document.getElementById('btnPrimaryDeeplink');
    const modalPrimaryLabel = document.getElementById('modalPrimaryEnvLabel');
    if (modalPrimary) modalPrimary.href = link;
    if (modalPrimaryLabel) modalPrimaryLabel.textContent = `${selectedEnv} Default`;
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
            setChannel('WEB');
        }

        if (resendpointInput) {
            resendpointInput.value = preset.resendpoint || getMerchantCallbackUrl(env);
        }
    }
    updateDeeplinkPreview();
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
            updateDeeplinkPreview();

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
        updateDeeplinkPreview();
        paymentPanel.classList.remove('disabled');
        step1Indicator.classList.remove('active');
        step1Indicator.classList.add('completed');
        step2Indicator.classList.add('active');
        stepConnector.classList.add('active');
        showToast('Token loaded into payment form', 'info');
    }
}

// ===== REAL-TIME INPUT LISTENERS FOR DEEPLINK =====
['txnamount', 'servicetype', 'serviceid', 'merchanRefNo', 'resendpoint', 'transactionId'].forEach(id => {
    const el = document.getElementById(id);
    if (el) {
        el.addEventListener('input', () => updateDeeplinkPreview());
    }
});

const btnCopyDeeplink = document.getElementById('btnCopyDeeplink');
if (btnCopyDeeplink) {
    btnCopyDeeplink.addEventListener('click', () => {
        const link = document.getElementById('deeplinkText')?.textContent || '';
        if (navigator.clipboard && navigator.clipboard.writeText) {
            navigator.clipboard.writeText(link).then(() => {
                showToast('📋 Copied deep link to clipboard!', 'success');
            }).catch(() => {
                prompt('Copy this deep link:', link);
            });
        } else {
            prompt('Copy this deep link:', link);
        }
    });
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
        if (!resVal || !resVal.includes('callback')) {
            resendpointInput.value = 'https://k2prod.citybankplc.com/pgwtester/callback';
        }
    } else if (selectedEnv === 'DEV') {
        if (!resVal || !resVal.includes('callback')) {
            resendpointInput.value = 'http://pgw-client-tester.10.13.134.14.nip.io/callback';
        }
    }

    // On mobile or when channel is MOBILE, handle Citytouch app payment launching
    if (isMobileDevice || selectedChannel === 'MOBILE') {
        e.preventDefault();

        const paymentBtn = document.getElementById('paymentBtn');
        const originalBtnText = paymentBtn.innerHTML;
        paymentBtn.disabled = true;
        paymentBtn.innerHTML = '<div class="spinner"></div> Opening Citytouch...';

        const staticDeeplink = buildDeeplink(selectedEnv);
        updateDeeplinkPreview(staticDeeplink);

        let finalDeeplink = staticDeeplink;

        try {
            const payload = {
                transactionId: transactionIdInput.value.trim(),
                merchanRefNo: merchanRefNoInput.value.trim(),
                txnamount: (document.getElementById('txnamount')?.value || '23').trim(),
                servicetype: (document.getElementById('servicetype')?.value || 'DARAZ').trim(),
                serviceid: (document.getElementById('serviceid')?.value || 'DARAZ').trim(),
                resendpoint: resendpointInput.value.trim(),
                env: selectedEnv
            };

            // Call proxy to obtain pgwtoken and server-built deeplinks
            try {
                const res = await fetch(getUserloginUrl(), {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload)
                });

                const data = await res.json();

                if (data.status === 'success' || data.status === 'warning') {
                    if (data.targetDeeplink) {
                        finalDeeplink = data.targetDeeplink;
                    } else if (data.pgwtoken) {
                        finalDeeplink = buildDeeplink(selectedEnv, data.pgwtoken);
                    }

                    if (data.appLinks) {
                        const btnPrimary = document.getElementById('btnPrimaryDeeplink');
                        if (btnPrimary) btnPrimary.href = finalDeeplink;

                        const btnK2 = document.getElementById('btnK2ProdIntent');
                        if (btnK2) btnK2.href = data.appLinks.androidIntentK2;

                        const btnScheme = document.getElementById('btnSchemePath');
                        if (btnScheme) btnScheme.href = data.appLinks.schemePath || data.appLinks.devDeeplink;

                        const btnLink = document.getElementById('btnSchemeLink');
                        if (btnLink) btnLink.href = data.appLinks.schemeLink;

                        const btnK2Url = document.getElementById('btnK2ProdUrl');
                        if (btnK2Url) btnK2Url.href = data.appLinks.k2prod || data.appLinks.uatDeeplink;

                        const btnProd = document.getElementById('btnProdIntent');
                        if (btnProd) btnProd.href = data.appLinks.citytouch;

                        const btnWeb = document.getElementById('btnWebPortal');
                        if (btnWeb) btnWeb.href = data.webUrl || '#';
                    }
                }
            } catch (proxyErr) {
                console.warn('Proxy call warning, proceeding with static link:', proxyErr);
            }

            updateDeeplinkPreview(finalDeeplink);

            // Display modal with all link options
            const modal = document.getElementById('deepLinkModal');
            if (modal) modal.style.display = 'flex';
            showToast(`🚀 Opening Citytouch (${selectedEnv})...`, 'info');

            // Trigger app navigation directly
            setTimeout(() => {
                window.location.href = finalDeeplink;
            }, 250);

        } catch (err) {
            console.error('Payment launch error:', err);
            showToast('Opening default deep link...', 'info');
            window.location.href = staticDeeplink;
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
