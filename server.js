const express = require('express');
const path = require('path');
const fs = require('fs');
const os = require('os');

// Disable strict TLS rejection for bank UAT / test environments with self-signed / internal certs
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

const app = express();
const PORT = process.env.PORT || 8080;

// When packaged with pkg, __dirname is a snapshot path.
// Static assets (public/) must live next to the .exe,
// so resolve them from the real executable directory.
const isPackaged = typeof process.pkg !== 'undefined';
const PUBLIC_DIR = isPackaged
  ? path.join(path.dirname(process.execPath), 'public')
  : path.join(__dirname, 'public');

app.use(express.json());
app.use(express.static(PUBLIC_DIR));
app.use('/pgwtester', express.static(PUBLIC_DIR));

const CONTEXT_PATH = '/CityBank/merchant';

const environments = {
  DEV: 'http://edge-payment-gateway.10.13.134.14.nip.io',
  UAT: 'https://k2.citybankplc.com/merchant-gateway',
  LOCAL: 'http://localhost:9083/merchant-gateway'
};

// Proxy endpoint for gettoken API (supports both root and /pgwtester context path)
app.post(['/api/gettoken', '/pgwtester/api/gettoken'], async (req, res) => {
  const { loginname, login_password, channel, env = 'DEV' } = req.body;

  if (!loginname || !login_password) {
    return res.status(400).json({
      status: 'error',
      message: 'loginname and login_password are required'
    });
  }

  const baseUrl = environments[env] || environments.DEV;
  const tokenUrl = `${baseUrl}${CONTEXT_PATH}/gettoken`;
  const targetChannel = channel || 'MOBILE';

  console.log(`[${env}] Requesting token: user="${loginname}", channel="${targetChannel}"`);

  const headers = {
    'x-request-channel': targetChannel,
    'Content-Type': 'application/json'
  };

  // Inject JSESSIONID specifically for LOCAL as requested
  if (env === 'LOCAL') {
    headers['Cookie'] = 'JSESSIONID=81C02F40AD1040FBBADC25156E655D38';
  }

  try {
    const response = await fetch(tokenUrl, {
      method: 'POST',
      headers,
      body: JSON.stringify({ loginname, login_password })
    });

    const contentType = response.headers.get('content-type') || '';

    // If gateway returns JSON (success or structured error)
    if (contentType.includes('application/json')) {
      const data = await response.json();
      return res.status(response.status).json(data);
    }

    // If gateway returns HTML or other format (e.g. HTTP 500 error page from CityBank)
    const rawText = await response.text();
    console.error(`[${env}] Gateway returned HTTP ${response.status} (${contentType}):`, rawText.slice(0, 300));

    let cleanMsg = `CityBank ${env} gateway returned HTTP ${response.status}`;
    if (rawText.includes('unable to fetch this page') || response.status === 500) {
      cleanMsg = `CityBank ${env} server error (HTTP 500): "Unable to fetch this page right now. Please try again later." (Bank gateway is temporarily down)`;
    }

    return res.status(response.status >= 400 ? response.status : 502).json({
      status: 'error',
      httpStatus: response.status,
      message: cleanMsg
    });

  } catch (error) {
    const causeMsg = error.cause ? ` (${error.cause.code || error.cause.message || error.cause})` : '';
    console.error(`[${env}] Token API network error:`, error.message, error.cause);

    res.status(502).json({
      status: 'error',
      message: `Failed to reach CityBank API (${env}): ${error.message}${causeMsg}`,
      hint: `Target URL: ${tokenUrl}. If running inside Kubernetes pod, check that the pod has egress/internet access or check bank gateway status.`
    });
  }
});

// Proxy endpoint for userlogin API (to extract pgwtoken and generate deep links)
app.post(['/api/userlogin', '/pgwtester/api/userlogin'], express.urlencoded({ extended: true }), express.json(), async (req, res) => {
  const { transactionId, merchanRefNo, txnamount, servicetype, serviceid, resendpoint, env = 'DEV' } = req.body;

  if (!transactionId) {
    return res.status(400).json({ status: 'error', message: 'transactionId is required' });
  }

  const baseUrl = environments[env] || environments.DEV;
  const loginUrl = `${baseUrl}${CONTEXT_PATH}/userlogin`;

  const params = new URLSearchParams({
    transactionId,
    merchanRefNo: merchanRefNo || env,
    txnamount: String(txnamount || '10'),
    servicetype: servicetype || 'PAYMENT',
    serviceid: serviceid || '67',
    resendpoint: resendpoint || 'https://k2.citybankplc.com/pgwtester/callback'
  });

  const headers = {
    'Content-Type': 'application/x-www-form-urlencoded',
    'x-request-channel': 'MOBILE'
  };

  if (env === 'LOCAL') {
    headers['Cookie'] = 'JSESSIONID=81C02F40AD1040FBBADC25156E655D38';
  }

  try {
    const response = await fetch(loginUrl, {
      method: 'POST',
      headers,
      body: params.toString(),
      redirect: 'manual'
    });

    const location = response.headers.get('location') || '';
    const match = location.match(/[?&]pgwtoken=([^&]+)/);
    const pgwtoken = match ? decodeURIComponent(match[1]) : '';
    const encodedToken = match ? match[1] : '';

    console.log(`[${env}] userlogin proxy called. Location: ${location.slice(0, 100)}, pgwtoken extracted: ${pgwtoken ? 'YES' : 'NO'}`);

    return res.json({
      status: 'success',
      pgwtoken,
      webUrl: location,
      appLinks: {
        scheme: `citybank://citybank.com?pgwtoken=${encodedToken}`,
        schemePath: `citybank://citybank.com/merchant-gateway/signin?pgwtoken=${encodedToken}`,
        androidIntentScheme: `intent://citybank.com?pgwtoken=${encodedToken}#Intent;scheme=citybank;package=com.thecitybank.citytouch;end`,
        androidIntentK2: `intent://k2prod.citybankplc.com/merchant-gateway/signin?pgwtoken=${encodedToken}#Intent;scheme=https;package=com.thecitybank.citytouch;end`,
        k2prod: `https://k2prod.citybankplc.com/merchant-gateway/signin?pgwtoken=${encodedToken}`,
        citytouch: `https://citytouch.com.bd/merchant-gateway/signin?pgwtoken=${encodedToken}`,
        cityRedirect: `https://city.redirect.com?pgwtoken=${encodedToken}`
      }
    });
  } catch (error) {
    console.error(`[${env}] userlogin proxy error:`, error.message);
    return res.status(502).json({
      status: 'error',
      message: `Failed to connect to gateway: ${error.message}`
    });
  }
});

// =============================================================================
// MERCHANT CALLBACK — Citytouch POSTs payment result here after user pays
//
// Flow: User pays via Citytouch mobile/web
//       → Citytouch browser-POSTs form data to this endpoint (the merchant's resendpoint)
//       → We read the POST body and inject it into callback.html as a JS variable
//       → User sees the payment result on our merchant page
//
// POST body from CityBank gateway:
//   txnStatus=1 (1=success, 0=failed)
//   merchanRefNo=DEV
//   transactionId=NOV24-39220b63-5409-445d-8b51-016693cfb635
//   txnamount=23
// POST callback from CityBank gateway (supports both /callback for DEV and /pgwtester/callback for UAT)
app.post(['/callback', '/pgwtester/callback'], express.urlencoded({ extended: true }), (req, res) => {
  const payload = req.body;                  // parsed form data from Citytouch
  const receivedAt = new Date().toISOString();

  console.log(`\n[CALLBACK] Payment result received at ${receivedAt} on ${req.originalUrl}`);
  console.log('[CALLBACK] Payload:', payload);

  // Read the static callback.html and inject the payload as a JS variable
  // so the page can render immediately without a redirect
  const htmlPath = path.join(PUBLIC_DIR, 'callback.html');
  let html = fs.readFileSync(htmlPath, 'utf8');

  // Inject the server-received payload just before </head>
  const injection = `
  <script>
    // Payload injected server-side from CityBank POST callback
    window.__CALLBACK_PAYLOAD__ = ${JSON.stringify(payload)};
    window.__CALLBACK_RECEIVED_AT__ = ${JSON.stringify(receivedAt)};
    window.__CALLBACK_SOURCE__ = 'POST';
  </script>`;

  html = html.replace('</head>', injection + '\n</head>');
  res.send(html);
});

// GET /callback or /pgwtester/callback — for direct browser testing via URL query params
app.get(['/callback', '/pgwtester/callback'], (req, res) => {
  res.sendFile(path.join(PUBLIC_DIR, 'callback.html'));
});

// GET /pgwtester or /pgwtester/ — serves main page when accessed under /pgwtester context path
app.get('/pgwtester', (req, res) => {
  res.redirect(301, '/pgwtester/');
});
app.get('/pgwtester/', (req, res) => {
  res.sendFile(path.join(PUBLIC_DIR, 'index.html'));
});

if (!process.env.VERCEL) {
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`\n  🏦 Merchant Payment Tester running`);
    console.log(`     Listening on : 0.0.0.0:${PORT}`);
    console.log(`     Pod / Host   : ${os.hostname()}`);
    console.log(`     Environment  : ${process.env.NODE_ENV || 'production'}\n`);
  });
}

module.exports = app;
