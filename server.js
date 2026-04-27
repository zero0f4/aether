require('dotenv').config();
const express = require('express');
const http = require('http');
const path = require('path');
const fs = require('fs');
const os = require('os');
const { WebSocketServer } = require('ws');
const { Agent, fetch: undiciFetch } = require('undici');

// ─── Single-instance lock — voorkomt cookie-kaping door stale processen ───
const PIDFILE = path.join(os.tmpdir(), 'wifi-pulse.pid');
const LOCK_PORT = parseInt(process.env.PORT || '3033', 10);

function killPid(pid, label) {
  if (!Number.isFinite(pid) || pid === process.pid) return;
  try { process.kill(pid, 0); } catch { return; }
  console.log(`[lock] ${label} (pid ${pid}) draait nog → SIGTERM`);
  try { process.kill(pid, 'SIGTERM'); } catch {}
  const start = Date.now();
  while (Date.now() - start < 2000) {
    try { process.kill(pid, 0); } catch { return; }
    require('child_process').execSync('sleep 0.1');
  }
  try { process.kill(pid, 'SIGKILL'); console.log(`[lock] geforceerd gestopt`); } catch {}
}

(function acquireSingleInstance() {
  // 1. Check pidfile
  try {
    const oldPid = parseInt(fs.readFileSync(PIDFILE, 'utf8').trim(), 10);
    killPid(oldPid, 'oude wifi-pulse via pidfile');
  } catch {}
  // 2. Check welk proces poort 3033 bezet (vangt processen zonder pidfile)
  try {
    const out = require('child_process').execSync(`lsof -ti tcp:${LOCK_PORT}`, { encoding:'utf8', stdio:['ignore','pipe','ignore'] }).trim();
    out.split('\n').filter(Boolean).map(s => parseInt(s,10)).forEach(p => killPid(p, `proces op poort ${LOCK_PORT}`));
  } catch { /* lsof retourneert non-zero als niemand luistert */ }
  // 3. Schrijf eigen pidfile
  fs.writeFileSync(PIDFILE, String(process.pid));
  const cleanup = () => {
    try { if (fs.readFileSync(PIDFILE, 'utf8').trim() === String(process.pid)) fs.unlinkSync(PIDFILE); } catch {}
  };
  process.on('exit', cleanup);
  process.on('SIGINT', () => { cleanup(); process.exit(0); });
  process.on('SIGTERM', () => { cleanup(); process.exit(0); });
})();

const {
  UDM_HOST = '',  // verplicht via .env / setup-wizard
  UDM_USER = '',
  UDM_PASS = '',
  UDM_SITE = 'default',
  PORT = 3033,
  POLL_MS = 1500,
} = process.env;
let ACTIVE_SITE = UDM_SITE; // mutable, kan via /api/site geswitched worden

const dispatcher = new Agent({ connect: { rejectUnauthorized: false } });
let cookie = '';
let csrf = '';

async function unifiFetch(pathSuffix, opts = {}) {
  const url = `https://${UDM_HOST}${pathSuffix}`;
  const headers = { 'Content-Type': 'application/json', ...(opts.headers || {}) };
  if (cookie) headers.Cookie = cookie;
  if (csrf) headers['X-CSRF-Token'] = csrf;
  const res = await undiciFetch(url, { ...opts, headers, dispatcher });
  const setCookie = res.headers.get('set-cookie');
  if (setCookie) cookie = setCookie.split(',').map(c => c.split(';')[0]).join('; ');
  const newCsrf = res.headers.get('x-csrf-token') || res.headers.get('x-updated-csrf-token');
  if (newCsrf) csrf = newCsrf;
  return res;
}

async function login() {
  const res = await unifiFetch('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify({ username: UDM_USER, password: UDM_PASS, remember: true }),
  });
  if (!res.ok) throw new Error(`login ${res.status}`);
  console.log('[unifi] logged in');
}

async function getClients() {
  let res = await unifiFetch(`/proxy/network/api/s/${ACTIVE_SITE}/stat/sta`);
  if (res.status === 401) {
    await login();
    res = await unifiFetch(`/proxy/network/api/s/${ACTIVE_SITE}/stat/sta`);
  }
  if (!res.ok) throw new Error(`stat/sta ${res.status}`);
  const json = await res.json();
  return json.data || [];
}

async function getNeighbors() {
  let res = await unifiFetch(`/proxy/network/api/s/${ACTIVE_SITE}/stat/rogueap`);
  if (res.status === 401) { await login(); res = await unifiFetch(`/proxy/network/api/s/${ACTIVE_SITE}/stat/rogueap`); }
  if (!res.ok) return [];
  const json = await res.json();
  return json.data || [];
}

async function getDevices() {
  let res = await unifiFetch(`/proxy/network/api/s/${ACTIVE_SITE}/stat/device`);
  if (res.status === 401) { await login(); res = await unifiFetch(`/proxy/network/api/s/${ACTIVE_SITE}/stat/device`); }
  if (!res.ok) return [];
  const json = await res.json();
  return json.data || [];
}

function shapeApChannels(devices) {
  const out = {};
  for (const d of devices || []) {
    if (d.type !== 'uap' && d.type !== 'udm' && !(d.radio_table_stats || d.radio_table)) continue;
    const stats = d.radio_table_stats || d.radio_table || [];
    const channels = [];
    for (const r of stats) {
      const ch = r.channel ?? r.user_channel;
      if (ch) channels.push({
        channel: +ch,
        band: r.radio || r.name || '',
        tx_power: r.tx_power,
        ht: r.ht,
        cu_total: r.cu_total ?? null,
        cu_self_tx: r.cu_self_tx ?? null,
        cu_self_rx: r.cu_self_rx ?? null,
        n_users: r.user_num_sta ?? null,
        radio_name: r.name || null,
      });
    }
    if (channels.length) {
      out[d.mac] = {
        name: d.name || d.model || d.mac,
        channels,
        clientCount: d.num_sta ?? null,
        tx: d['tx_bytes-r'] || 0,
        rx: d['rx_bytes-r'] || 0,
        firmware: d.version || null,
        firmwareLatest: d.upgradable && d.upgrade_to_firmware ? d.upgrade_to_firmware : null,
        uptime: d.uptime || null,
        model: d.model || null,
        ip: d.ip || null,
        adopted: d.adopted ?? null,
        state: d.state ?? null,
      };
    }
  }
  return out;
}

async function getWan() {
  let res = await unifiFetch(`/proxy/network/api/s/${ACTIVE_SITE}/stat/health`);
  if (res.status === 401) { await login(); res = await unifiFetch(`/proxy/network/api/s/${ACTIVE_SITE}/stat/health`); }
  if (!res.ok) return null;
  const json = await res.json();
  const wan = (json.data || []).find(s => s.subsystem === 'wan');
  const www = (json.data || []).find(s => s.subsystem === 'www');
  if (!wan) return null;
  return {
    tx: wan['tx_bytes-r'] || 0,
    rx: wan['rx_bytes-r'] || 0,
    ip: wan.wan_ip || wan.ip || null,
    status: wan.status || null,
    isp: wan.isp_name || wan.isp_organization || null,
    uptime: wan.uptime || null,
    latency: www ? (www.latency ?? wan.latency ?? null) : (wan.latency ?? null),
    drops: www ? (www.drops ?? null) : null,
    speedtestPing: www ? www.speedtest_ping : null,
    xputDown: www ? www.xput_down : null,
    xputUp: www ? www.xput_up : null,
  };
}

function shape(clients) {
  return clients
    .filter(c => c.is_wired === false)
    .map(c => ({
      id: c.mac,
      name: c.name || c.hostname || c.oui || c.mac.slice(-5),
      rssi: c.rssi ?? c.signal ?? -90,
      signal: c.signal ?? -90,
      noise: c.noise ?? null,
      tx: c.tx_rate || 0,
      rx: c.rx_rate || 0,
      txBytes: c['tx_bytes-r'] || 0,
      rxBytes: c['rx_bytes-r'] || 0,
      ap: c.ap_mac,
      ssid: c.essid,
      band: c.radio_proto || c.radio,
      channel: c.channel,
      oui: c.oui || null,
      os: c.os_name || c.os || null,
      family: c.dev_family || c.dev_cat || null,
    }));
}

function shapeNeighbors(list) {
  return (list || [])
    .filter(n => (n.age ?? 9999) < 600)
    .map(n => ({
      id: n.bssid,
      ssid: n.essid || '(hidden)',
      rssi: n.rssi ?? n.signal ?? -90,
      channel: n.channel,
      band: n.radio || n.report_radio || 'na',
      age: n.age,
      seenBy: n.ap_mac,
    }));
}

const app = express();

// ─── Optionele auth ─── Bezet AUTH_TOKEN env-var voor full-access; READONLY_TOKEN voor lees-alleen
const AUTH_TOKEN = process.env.AUTH_TOKEN || '';
const READONLY_TOKEN = process.env.READONLY_TOKEN || '';
function isAuthed(req, opts = {}) {
  if (!AUTH_TOKEN && !READONLY_TOKEN) return { ok: true, role: 'open' };
  const hdr = req.get('Authorization') || '';
  const bearerKey = hdr.replace(/^Bearer\s+/, '');
  const queryKey = req.query.key || req.query.token;
  const key = bearerKey || queryKey;
  if (AUTH_TOKEN && key === AUTH_TOKEN) return { ok: true, role: 'admin' };
  if (READONLY_TOKEN && key === READONLY_TOKEN) return { ok: true, role: 'readonly' };
  return { ok: false };
}
app.use((req, res, next) => {
  if (!AUTH_TOKEN && !READONLY_TOKEN) return next();
  // Static files vrij (heeft anders niet zin: index.html laadt JS)
  if (!req.path.startsWith('/api/') && req.method === 'GET') return next();
  const a = isAuthed(req);
  if (!a.ok) return res.status(401).json({ ok: false, error: 'unauthorized' });
  // Read-only mag alleen GET
  if (a.role === 'readonly' && req.method !== 'GET') return res.status(403).json({ ok: false, error: 'read-only' });
  next();
});
if (AUTH_TOKEN || READONLY_TOKEN) {
  console.log('[auth] actief — AUTH_TOKEN' + (READONLY_TOKEN ? ' + READONLY_TOKEN' : ''));
}

// ─── Plugin-architectuur ───
// Elk JS-bestand in ~/.wifi-pulse/plugins/ wordt bij start ingelezen.
// Plugin krijgt object: { app, wss, getPayload, addPanel(name, html, opts) }
const pluginDir = path.join(os.homedir(), '.wifi-pulse', 'plugins');
const loadedPanels = []; // [{ id, name, html }]
function loadPlugins() {
  if (!fs.existsSync(pluginDir)) return;
  for (const f of fs.readdirSync(pluginDir)) {
    if (!f.endsWith('.js')) continue;
    try {
      const plugin = require(path.join(pluginDir, f));
      if (typeof plugin === 'function') {
        plugin({
          app, wss,
          getPayload: () => lastPayload,
          addPanel: (id, name, html) => loadedPanels.push({ id, name, html })
        });
        console.log(`[plugin] loaded: ${f}`);
      }
    } catch (e) { console.error(`[plugin] ${f}: ${e.message}`); }
  }
}
app.get('/api/plugin-panels', (_, res) => res.json({ panels: loadedPanels }));

// First-run redirect: zonder UDM_USER/PASS → /setup
app.get('/', (req, res, next) => {
  if (!UDM_USER || !UDM_PASS) return res.sendFile(path.join(__dirname, 'public', 'setup.html'));
  next();
});
app.get('/setup', (_, res) => res.sendFile(path.join(__dirname, 'public', 'setup.html')));

// Lever huidige config voor het pre-vullen van het setup-formulier (zonder wachtwoord)
app.get('/api/setup/current', (_, res) => {
  res.json({
    ok: true,
    UDM_HOST: process.env.UDM_HOST || '',
    UDM_USER: process.env.UDM_USER || '',
    UDM_SITE: process.env.UDM_SITE || 'default',
    PORT: process.env.PORT || '3033',
    POLL_MS: process.env.POLL_MS || '1500',
    hasPassword: !!process.env.UDM_PASS
  });
});

// Setup endpoints
app.post('/api/setup/test', express.json(), async (req, res) => {
  const { UDM_HOST: host, UDM_USER: user, UDM_PASS: pass } = req.body || {};
  if (!host || !user || !pass) return res.status(400).json({ ok: false, error: 'host, user en pass zijn verplicht' });
  try {
    const r = await undiciFetch(`https://${host}/api/auth/login`, {
      method: 'POST',
      body: JSON.stringify({ username: user, password: pass, remember: true }),
      headers: { 'Content-Type': 'application/json' },
      dispatcher
    });
    if (r.ok) return res.json({ ok: true, message: `controller bereikt op ${host}` });
    if (r.status === 401) return res.json({ ok: false, error: 'gebruiker/wachtwoord klopt niet' });
    return res.json({ ok: false, error: `controller antwoordde ${r.status}` });
  } catch (e) {
    res.json({ ok: false, error: `kan ${host} niet bereiken: ${e.message}` });
  }
});

app.post('/api/setup/save', express.json(), async (req, res) => {
  const v = req.body || {};
  if (!v.UDM_HOST || !v.UDM_USER) return res.status(400).json({ ok: false, error: 'host/user verplicht' });
  // Wachtwoord leeg → bestaande behouden (alleen zinvol als er al een .env is)
  if (!v.UDM_PASS) {
    if (process.env.UDM_PASS) v.UDM_PASS = process.env.UDM_PASS;
    else return res.status(400).json({ ok: false, error: 'wachtwoord verplicht bij eerste setup' });
  }
  // Sanity-escape: geen newlines in waarden
  const clean = (s) => String(s).replace(/[\r\n]/g, '');
  const lines = [
    `UDM_HOST=${clean(v.UDM_HOST)}`,
    `UDM_USER=${clean(v.UDM_USER)}`,
    `UDM_PASS=${clean(v.UDM_PASS)}`,
    `UDM_SITE=${clean(v.UDM_SITE || 'default')}`,
    `PORT=${clean(v.PORT || '3033')}`,
    `POLL_MS=${clean(v.POLL_MS || '1500')}`
  ];
  try {
    fs.writeFileSync(path.join(__dirname, '.env'), lines.join('\n') + '\n');
    fs.chmodSync(path.join(__dirname, '.env'), 0o600);
    res.json({ ok: true, message: 'opgeslagen — server herstart' });
    // Self-restart na 1s
    setTimeout(() => process.exit(0), 1000);
  } catch (e) { res.status(500).json({ ok: false, error: e.message }); }
});

app.use(express.static(path.join(__dirname, 'public')));
app.get('/api/health', (_, res) => res.json({ ok: true, host: UDM_HOST, site: ACTIVE_SITE }));

app.get('/api/sites', async (_, res) => {
  try {
    const r = await unifiFetch('/proxy/network/api/self/sites');
    const j = await r.json();
    res.json({ ok: true, sites: (j.data || []).map(s => ({ name: s.name, desc: s.desc })) });
  } catch (e) { res.status(500).json({ ok: false, error: e.message }); }
});

app.post('/api/site', express.json(), (req, res) => {
  const name = (req.body?.name || '').replace(/[^\w-]/g, '');
  if (!name) return res.status(400).json({ ok: false, error: 'no site' });
  ACTIVE_SITE = name;
  res.json({ ok: true, site: ACTIVE_SITE });
});

app.post('/api/speedtest', async (_, res) => {
  try {
    const r = await unifiFetch(`/proxy/network/api/s/${ACTIVE_SITE}/cmd/devmgr`, {
      method: 'POST',
      body: JSON.stringify({ cmd: 'speedtest' })
    });
    if (!r.ok) throw new Error(`speedtest ${r.status}`);
    res.json({ ok: true, started: true });
  } catch (e) { res.status(500).json({ ok: false, error: e.message }); }
});

const server = http.createServer(app);
const wss = new WebSocketServer({ server });

let lastPayload = { devices: [], neighbors: [], wan: null, apChannels: {}, ts: 0, error: null };

async function tick() {
  try {
    const [clients, neighbors, wan, devices] = await Promise.all([getClients(), getNeighbors(), getWan(), getDevices()]);
    lastPayload = {
      devices: shape(clients),
      neighbors: shapeNeighbors(neighbors),
      wan,
      apChannels: shapeApChannels(devices),
      ts: Date.now(),
      error: null,
    };
  } catch (e) {
    lastPayload = { ...lastPayload, ts: Date.now(), error: String(e.message || e) };
    console.error('[poll]', e.message);
  }
  const msg = JSON.stringify(lastPayload);
  wss.clients.forEach(ws => ws.readyState === 1 && ws.send(msg));
}

wss.on('connection', (ws, req) => {
  if (AUTH_TOKEN || READONLY_TOKEN) {
    const url = new URL(req.url, `http://${req.headers.host}`);
    const key = url.searchParams.get('key') || url.searchParams.get('token') || '';
    if (key !== AUTH_TOKEN && key !== READONLY_TOKEN) {
      ws.close(1008, 'unauthorized');
      return;
    }
  }
  if (lastPayload.ts) ws.send(JSON.stringify(lastPayload));
});

server.listen(PORT, () => {
  console.log(`[wifi-pulse] http://localhost:${PORT}`);
  loadPlugins();
  if (!UDM_USER || !UDM_PASS) {
    console.warn('[wifi-pulse] UDM_USER/UDM_PASS niet gezet — vul .env');
    return;
  }
  login().catch(e => console.error('[login]', e.message));
  setInterval(tick, Number(POLL_MS));
});
