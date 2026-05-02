const canvas = document.getElementById('stage');
const ctx = canvas.getContext('2d');
const ui = {
  status: document.getElementById('status'),
  tput: document.getElementById('stat-tput'),
  stas: document.getElementById('stat-stas'),
  aps: document.getElementById('stat-aps'),
  wanRx: document.getElementById('stat-wan-rx'),
  wanTx: document.getElementById('stat-wan-tx'),
  isp: document.getElementById('stat-isp'),
  host: document.getElementById('stat-host'),
  uptime: document.getElementById('stat-uptime'),
  latency: document.getElementById('stat-latency'),
  latencyWrap: document.getElementById('stat-latency-wrap'),
  topBody: document.querySelector('#top-table tbody'),
  topHead: document.querySelector('#top-table thead tr'),
};
const sessionStart = Date.now();

const PREFS_KEY = 'wifi-pulse:prefs';
const I18N = {
  nl: {
    'brand.subtitle': 'live unifi netwerk-verkeer',
    'tab.pulse': 'PULSE', 'tab.stats': 'STATS',
    'menu.view': 'WEERGAVE', 'menu.toptalkers': 'TOP TALKERS', 'menu.details': 'DETAILS',
    'group.layers': 'lagen', 'group.analysis': 'analyse',
    'cb.neighbors': 'externe storende AP',
    'cb.passive': 'passieve externe AP (zwak signaal)',
    'cb.streams': 'pulsstromen',
    'cb.udmStream': 'AP ↔ Dream Machine',
    'cb.wanStream': 'WAN ↔ Dream Machine',
    'cb.labels': 'labels', 'cb.guides': 'afstandsringen',
    'cb.channels': 'kanaal-interferentie',
    'cb.airtime': 'airtime % per kanaal',
    'cb.clash': 'frequentie-clash markeren',
    'cb.apLoad': 'AP-load (clients + bps)',
    'cb.latency': 'WAN latency / drops',
    'cb.roaming': 'roaming events',
    'cb.snr': 'signaal: SNR i.p.v. RSSI',
    'cb.deviceInfo': 'OS / fabrikant in top-table',
    'cb.showIps': 'IP-adressen tonen (privacy: standaard uit)',
    'search.ph': '🔍 zoek client/ap…',
    'search.count': '{n} match',
    'search.count_plural': '{n} matches',
    'search.none': 'geen treffer',
    'event.empty': 'nog geen roaming events',
    'card.handover': 'AP HANDOVER · MATRIX',
    'export.json': '📥 JSON', 'export.csv': '📥 CSV', 'export.png': '📷 PNG',
    'speedtest.run': '🚀 Speedtest',
    'tab.alerts': '⚠ ALERTS',
    'alerts.rogue': 'interferentie', 'alerts.disconnected': 'losgekoppeld',
    'alerts.anomaly': 'anomalie', 'alerts.quota': 'over quotum', 'alerts.reboot': 'ap-reboot',
    'alerts.section.rogue': 'overlappende externe APs',
    'alerts.lg.ownap': 'eigen ap', 'alerts.lg.client': 'eigen client',
    'alerts.lg.problem': 'probleem-client', 'alerts.lg.external': 'externe AP',
    'recon.note': 'ⓘ Externe clients (buurman\'s devices) zijn niet beschikbaar via de UniFi-API — alleen externe APs.',
    'spark.live': 'live · ~3 min',
    'spark.h1': 'rx · 1 uur',
    'spark.h24': 'rx · 24 uur',
    'drawer.overview': 'overzicht',
    'drawer.radios': 'radios',
    'drawer.top_clients': 'top clients',
    'drawer.tip': 'shift+klik op een AP voor detail-paneel',
    'stat.download': '↓ download · wan',
    'stat.upload': '↑ upload · wan',
    'stat.throughput': 'wifi doorvoer',
    'stat.stations': 'stations',
    'stat.isp': 'isp · wan ip',
    'stat.latency': 'wan latency / drops',
    'stat.aps': 'access points',
    'stat.controller': 'controller',
    'stat.uptime': 'sessie-uptime',
    'top.station': 'station', 'top.os': 'OS', 'top.band': 'band', 'top.rssi': 'rssi', 'top.kbps': 'kb/s',
    'card.topTalkers': 'TOP TALKERS', 'card.apLoad': 'AP-LOAD · RADAR',
    'card.topology': 'TOPOLOGIE · RADAR',
    'card.bandSplit': 'BAND-VERDELING', 'card.wanFlow': 'WAN-DOORVOER · 60s',
    'card.latency': 'WAN-LATENCY · 60s', 'card.rssiDist': 'RSSI-VERDELING',
    'card.channelOcc': 'KANAAL-BEZETTING', 'card.events': 'ROAMING-EVENTS',
    'spec.title': 'SPECTRUM-ANALYZER',
    'spec.panel24': '2.4 GHz · kanaal-overlap',
    'spec.panel5': '5 GHz · kanalen (DFS gearceerd)',
    'spec.panel6': '6 GHz · WiFi 6E (kanalen 1-233)',
    'spec.legend.own': 'eigen', 'spec.legend.dist': 'storend', 'spec.legend.pass': 'passief',
    'status.connecting': '— verbinden —',
    'status.live': 'live · {n} stations',
    'status.live_ext': 'live · {n} stations · {ext} ext',
    'status.error': 'fout: {msg}',
    'status.lost': '◌ verbinding kwijt — herverbinden…',
    'station.connected_with': 'verbonden met',
    'station.band_channel': 'band · kanaal',
    'station.ssid': 'SSID',
    'station.signal_rssi': 'signaal (rssi)',
    'station.snr': 'SNR',
    'station.noise_floor': 'noise floor',
    'station.download': '↓ download',
    'station.upload': '↑ upload',
    'station.link_rate': 'link rate',
    'station.manufacturer': 'fabrikant',
    'station.os': 'OS',
    'station.mac': 'mac',
    'qual.excellent': 'uitstekend',
    'qual.good': 'goed',
    'qual.medium': 'matig',
    'qual.weak': 'zwak',
    'ap.channel': 'kanaal',
    'ap.airtime': 'airtime',
    'ap.airtime_value': '{total}% totaal · eigen {self}%',
    'ap.width': 'breedte',
    'ap.tx_power': 'tx-power',
    'ap.clients': 'clients',
    'ap.throughput': 'throughput',
    'ap.mac': 'mac',
    'ap.label_prefix': 'AP·',
    'udm.title': 'DREAM·MACHINE',
    'udm.aps': 'access points',
    'udm.stations': 'stations',
    'udm.wifi_tput': 'wifi-doorvoer',
    'wan.title_prefix': 'WAN ·',
    'wan.public_ip': 'publiek IP',
    'wan.status': 'status',
    'wan.latency': 'latency',
    'wan.drops': 'drops',
    'wan.uplink_label': '↓ {dn} mb/s   ↑ {up} mb/s',
    'neigh.title_external': 'externe BSSID',
    'neigh.label': 'externe AP',
    'neigh.signal': 'signaal',
    'neigh.seen_by': 'opgevangen door',
    'neigh.clash_warn': '⚠ frequentie-clash',
    'neigh.advice': 'advies',
    'neigh.move_advice': 'verzet eigen AP naar rustiger kanaal',
    'neigh.conflict': 'conflict eigen netwerk',
    'neigh.none': 'geen',
    'neigh.others_on_channel': 'andere ext. op kanaal {ch}',
    'neigh.bssid': 'BSSID',
    'neigh.last_seen': 'laatst gezien',
    'neigh.ago_seconds': '{n}s geleden',
    'ch.title': 'kanaal {ch}',
    'ch.own': '◉ eigen: {names}',
    'ch.airtime_label': 'airtime:',
    'ch.airtime_value': '{total}% totaal · {self}% eigen',
    'ch.width_label': 'breedte:',
    'ch.width_value': '{ht} MHz',
    'ch.external_label': 'externe:',
    'ch.external_value': '{count} BSSID · {strong} sterk',
    'ch.external_zero': '0',
    'ch.clash_warn': '! frequentie-clash',
    'meta.ext_busiest': '{total} ext · drukst kanaal {ch} ({n})',
    'meta.no_interference': 'geen interferentie',
    'meta.own_prefix': '◉ eigen',
    'load.clients_count': '{n}× · {kbps}',
    'apload.unit_kbps': 'kb/s',
    'apload.unit_mbps': 'mb/s',
    'tt.no_airtime': '— geen airtime data —',
    'tt.bucket_legend': 'clients per signaal-bucket (dBm)',
  },
  en: {
    'brand.subtitle': 'live unifi network traffic',
    'tab.pulse': 'PULSE', 'tab.stats': 'STATS',
    'menu.view': 'VIEW', 'menu.toptalkers': 'TOP TALKERS', 'menu.details': 'DETAILS',
    'group.layers': 'layers', 'group.analysis': 'analysis',
    'cb.neighbors': 'interfering external APs',
    'cb.passive': 'passive external APs (weak)',
    'cb.streams': 'pulse streams',
    'cb.udmStream': 'AP ↔ Dream Machine',
    'cb.wanStream': 'WAN ↔ Dream Machine',
    'cb.labels': 'labels', 'cb.guides': 'distance rings',
    'cb.channels': 'channel interference',
    'cb.airtime': 'airtime % per channel',
    'cb.clash': 'frequency clash flags',
    'cb.apLoad': 'AP load (clients + bps)',
    'cb.latency': 'WAN latency / drops',
    'cb.roaming': 'roaming events',
    'cb.snr': 'signal: SNR instead of RSSI',
    'cb.deviceInfo': 'OS / manufacturer in top-table',
    'cb.showIps': 'show IP addresses (privacy: off by default)',
    'search.ph': '🔍 search client/ap…',
    'search.count': '{n} match',
    'search.count_plural': '{n} matches',
    'search.none': 'no match',
    'event.empty': 'no roaming events yet',
    'card.handover': 'AP HANDOVER · MATRIX',
    'export.json': '📥 JSON', 'export.csv': '📥 CSV', 'export.png': '📷 PNG',
    'speedtest.run': '🚀 Speedtest',
    'tab.alerts': '⚠ ALERTS',
    'alerts.rogue': 'interference', 'alerts.disconnected': 'disconnected',
    'alerts.anomaly': 'anomaly', 'alerts.quota': 'over quota', 'alerts.reboot': 'ap reboot',
    'alerts.section.rogue': 'overlapping external APs',
    'alerts.lg.ownap': 'own ap', 'alerts.lg.client': 'own client',
    'alerts.lg.problem': 'problem client', 'alerts.lg.external': 'external AP',
    'recon.note': 'ⓘ External clients (neighbors\' devices) are not available via the UniFi API — only external APs.',
    'spark.live': 'live · ~3 min',
    'spark.h1': 'rx · 1 hour',
    'spark.h24': 'rx · 24 hours',
    'drawer.overview': 'overview',
    'drawer.radios': 'radios',
    'drawer.top_clients': 'top clients',
    'drawer.tip': 'shift+click an AP for detail panel',
    'stat.download': '↓ download · wan',
    'stat.upload': '↑ upload · wan',
    'stat.throughput': 'wifi throughput',
    'stat.stations': 'stations',
    'stat.isp': 'isp · wan ip',
    'stat.latency': 'wan latency / drops',
    'stat.aps': 'access points',
    'stat.controller': 'controller',
    'stat.uptime': 'session uptime',
    'top.station': 'station', 'top.os': 'OS', 'top.band': 'band', 'top.rssi': 'rssi', 'top.kbps': 'kb/s',
    'card.topTalkers': 'TOP TALKERS', 'card.apLoad': 'AP LOAD · RADAR',
    'card.topology': 'TOPOLOGY · RADAR',
    'card.bandSplit': 'BAND SPLIT', 'card.wanFlow': 'WAN FLOW · 60s',
    'card.latency': 'WAN LATENCY · 60s', 'card.rssiDist': 'RSSI DISTRIBUTION',
    'card.channelOcc': 'CHANNEL OCCUPANCY', 'card.events': 'ROAMING EVENTS',
    'spec.title': 'SPECTRUM ANALYZER',
    'spec.panel24': '2.4 GHz · channel overlap',
    'spec.panel5': '5 GHz · channels (DFS shaded)',
    'spec.panel6': '6 GHz · WiFi 6E (channels 1-233)',
    'spec.legend.own': 'own', 'spec.legend.dist': 'interfering', 'spec.legend.pass': 'passive',
    'status.connecting': '— connecting —',
    'status.live': 'live · {n} stations',
    'status.live_ext': 'live · {n} stations · {ext} ext',
    'status.error': 'error: {msg}',
    'status.lost': '◌ connection lost — reconnecting…',
    'station.connected_with': 'connected to',
    'station.band_channel': 'band · channel',
    'station.ssid': 'SSID',
    'station.signal_rssi': 'signal (rssi)',
    'station.snr': 'SNR',
    'station.noise_floor': 'noise floor',
    'station.download': '↓ download',
    'station.upload': '↑ upload',
    'station.link_rate': 'link rate',
    'station.manufacturer': 'manufacturer',
    'station.os': 'OS',
    'station.mac': 'mac',
    'qual.excellent': 'excellent',
    'qual.good': 'good',
    'qual.medium': 'fair',
    'qual.weak': 'weak',
    'ap.channel': 'channel',
    'ap.airtime': 'airtime',
    'ap.airtime_value': '{total}% total · own {self}%',
    'ap.width': 'width',
    'ap.tx_power': 'tx-power',
    'ap.clients': 'clients',
    'ap.throughput': 'throughput',
    'ap.mac': 'mac',
    'ap.label_prefix': 'AP·',
    'udm.title': 'DREAM·MACHINE',
    'udm.aps': 'access points',
    'udm.stations': 'stations',
    'udm.wifi_tput': 'wifi throughput',
    'wan.title_prefix': 'WAN ·',
    'wan.public_ip': 'public IP',
    'wan.status': 'status',
    'wan.latency': 'latency',
    'wan.drops': 'drops',
    'wan.uplink_label': '↓ {dn} mb/s   ↑ {up} mb/s',
    'neigh.title_external': 'external BSSID',
    'neigh.label': 'external AP',
    'neigh.signal': 'signal',
    'neigh.seen_by': 'detected by',
    'neigh.clash_warn': '⚠ frequency clash',
    'neigh.advice': 'advice',
    'neigh.move_advice': 'move own AP to a quieter channel',
    'neigh.conflict': 'conflict with own network',
    'neigh.none': 'none',
    'neigh.others_on_channel': 'other ext. on channel {ch}',
    'neigh.bssid': 'BSSID',
    'neigh.last_seen': 'last seen',
    'neigh.ago_seconds': '{n}s ago',
    'ch.title': 'channel {ch}',
    'ch.own': '◉ own: {names}',
    'ch.airtime_label': 'airtime:',
    'ch.airtime_value': '{total}% total · {self}% own',
    'ch.width_label': 'width:',
    'ch.width_value': '{ht} MHz',
    'ch.external_label': 'external:',
    'ch.external_value': '{count} BSSID · {strong} strong',
    'ch.external_zero': '0',
    'ch.clash_warn': '! frequency clash',
    'meta.ext_busiest': '{total} ext · busiest channel {ch} ({n})',
    'meta.no_interference': 'no interference',
    'meta.own_prefix': '◉ own',
    'load.clients_count': '{n}× · {kbps}',
    'apload.unit_kbps': 'kb/s',
    'apload.unit_mbps': 'mb/s',
    'tt.no_airtime': '— no airtime data —',
    'tt.bucket_legend': 'clients per signal bucket (dBm)',
  }
};
function t(key, params) {
  const lang = (prefs && prefs.lang) || 'nl';
  let s = (I18N[lang] && I18N[lang][key]) || I18N.nl[key] || key;
  if (params) for (const k in params) s = s.replace('{' + k + '}', params[k]);
  return s;
}
function applyI18n() {
  for (const el of document.querySelectorAll('[data-i18n]')) {
    el.textContent = t(el.dataset.i18n);
  }
  for (const el of document.querySelectorAll('[data-i18n-ph]')) {
    el.placeholder = t(el.dataset.i18nPh);
  }
}

const PREFS_DEFAULTS = {
  lang: 'nl',
  tab: 'pulse',
  showNeighbors: true,
  showPassiveNeighbors: false,
  showStreams: true,
  showUdmStream: true,
  showWanStream: true,
  showLabels: true,
  showGuides: false,
  showChannels: true,
  showAirtime: true,
  showClashFlags: true,
  showApLoad: true,
  showLatency: true,
  showRoaming: true,
  useSnr: false,
  showDeviceInfo: false,
  showIps: false,
  theme: 'dark',
};

// IP-masker: per default verberg IPs (privacy). Toggle via prefs.showIps.
function maskIp(ip) {
  if (!ip || prefs.showIps) return ip || '';
  // Toon alleen netwerk-segment, mask laatste octet: 192.168.1.42 → 192.168.1.•
  const v4 = String(ip).match(/^(\d{1,3}\.\d{1,3}\.\d{1,3}\.)\d{1,3}$/);
  if (v4) return v4[1] + '•';
  // IPv6 of vreemd → volledig maskeren
  if (/[:.]/.test(ip)) return '•••.•••.•••.•';
  return ip;
}
const prefs = Object.assign({}, PREFS_DEFAULTS, (() => {
  try { return JSON.parse(localStorage.getItem(PREFS_KEY) || '{}'); } catch { return {}; }
})());
function savePrefs() { try { localStorage.setItem(PREFS_KEY, JSON.stringify(prefs)); } catch {} }

const channelStrip = document.getElementById('channel-strip');
function applyChannelVisibility() {
  channelStrip.classList.toggle('hidden', !prefs.showChannels);
}
document.querySelectorAll('input[type="checkbox"][data-pref]').forEach(cb => {
  const key = cb.dataset.pref;
  cb.checked = !!prefs[key];
  cb.addEventListener('change', () => {
    prefs[key] = cb.checked;
    savePrefs();
    if (key === 'showChannels') applyChannelVisibility();
  });
});
applyChannelVisibility();

function setLang(lang) {
  prefs.lang = lang; savePrefs();
  document.querySelectorAll('.lang-btn').forEach(b => b.classList.toggle('active', b.dataset.lang === lang));
  applyI18n();
  if (typeof refreshChannels === 'function') { try { refreshChannels(); } catch {} }
  if (typeof refreshUI === 'function') refreshUI();
}
document.querySelectorAll('.lang-btn').forEach(b => {
  b.addEventListener('click', () => setLang(b.dataset.lang));
});
// Initiele setLang aan einde script (na alle const-decls) → zie bottom of file

function setTab(tab) {
  prefs.tab = tab; savePrefs();
  document.querySelectorAll('.tab-btn').forEach(b => b.classList.toggle('active', b.dataset.tab === tab));
  document.body.classList.toggle('stats-mode', tab === 'stats');
  document.body.classList.toggle('alerts-mode', tab === 'alerts');
  document.body.classList.toggle('spectrum-mode', tab === 'spectrum');
  if (tab === 'alerts') refreshAlertsPage();
  if (tab === 'spectrum') resizeSpectrumCanvases();
}

// Maak de spectrum-canvases breder als we in fullscreen-mode staan
function resizeSpectrumCanvases() {
  const c24 = document.getElementById('spec24');
  const c5 = document.getElementById('spec5');
  if (!c24 || !c5) return;
  const isFullscreen = document.body.classList.contains('spectrum-mode');
  if (isFullscreen) {
    const W = Math.max(900, Math.min(window.innerWidth - 160, 1800));
    // beide full-width gestapeld
    c24.width = W; c24.height = 360;
    c5.width  = W; c5.height  = 300;
  } else {
    c24.width = 540; c24.height = 160;
    c5.width  = 700; c5.height  = 160;
  }
}
window.addEventListener('resize', () => {
  if (document.body.classList.contains('spectrum-mode')) resizeSpectrumCanvases();
});
document.querySelectorAll('.tab-btn').forEach(b => {
  b.addEventListener('click', () => setTab(b.dataset.tab));
});
setTab('pulse');

const backBtn = document.getElementById('back-to-pulse');
if (backBtn) backBtn.addEventListener('click', () => setTab('pulse'));
document.addEventListener('keydown', ev => {
  if (ev.key === 'Escape' && prefs.tab === 'stats') setTab('pulse');
  if (ev.key === 's' || ev.key === 'S') {
    if (document.activeElement && /input|textarea/i.test(document.activeElement.tagName)) return;
    setTab(prefs.tab === 'stats' ? 'pulse' : 'stats');
  }
});

document.querySelectorAll('details.dropdown[data-open]').forEach(d => {
  const key = d.dataset.open;
  if (prefs[key]) d.open = true;
  d.addEventListener('toggle', () => { prefs[key] = d.open; savePrefs(); });
});
fetch('/api/health').then(r => r.json()).then(j => { ui.host.textContent = j.host || '—'; }).catch(() => {});

let W = 0, H = 0, DPR = window.devicePixelRatio || 1;
function resize() {
  W = canvas.clientWidth = window.innerWidth;
  H = canvas.clientHeight = window.innerHeight;
  canvas.width = W * DPR;
  canvas.height = H * DPR;
  ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
}
window.addEventListener('resize', resize);
resize();

let drag = null;
let hoverAP = null;
let hoverStation = null;
const HIT_R = 22;
const HIT_R_STA = 18;
const canvasTip = document.getElementById('canvas-tip');

function pickStation(x, y) {
  let best = null, bestD2 = HIT_R_STA * HIT_R_STA;
  for (const s of stations.values()) {
    const dx = x - s.x, dy = y - s.y;
    const d2 = dx * dx + dy * dy;
    if (d2 < bestD2) { bestD2 = d2; best = s; }
  }
  return best;
}

function pickNeighbor(x, y) {
  let best = null, bestD2 = 16 * 16;
  for (const n of neighbors.values()) {
    if (!n.visible) continue;
    const dx = x - n.x, dy = y - n.y;
    const d2 = dx * dx + dy * dy;
    if (d2 < bestD2) { bestD2 = d2; best = n; }
  }
  return best;
}

function renderNeighborTip(n) {
  const seenAp = apsMap.get(n.seenBy);
  const seenName = (seenAp && apChannels[seenAp.mac]) ? apChannels[seenAp.mac].name : (seenAp ? seenAp.label : '—');
  const bandLbl = n.band === 'ng' ? '2.4 GHz' : n.band === 'na' ? '5 GHz' : (n.band || '').toUpperCase();
  const [qual, qualClass] = rssiQualityLabel(n.strength * 50);
  const rows = [
    `<strong>${n.ssid}</strong>`,
    `<div class="row"><span class="lab">${t('neigh.label')}</span><span class="v warm">${t('neigh.title_external')}</span></div>`,
    `<hr>`,
    `<div class="row"><span class="lab">${t('station.band_channel')}</span><span class="v">${bandLbl} · ${n.channel || '—'}</span></div>`,
    `<div class="row"><span class="lab">${t('neigh.signal')}</span><span class="v ${qualClass}">${n.rssi} · ${qual}</span></div>`,
    `<div class="row"><span class="lab">${t('neigh.seen_by')}</span><span class="v ok">${seenName}</span></div>`,
  ];
  const ownOnSameCh = [];
  for (const [mac, info] of Object.entries(apChannels)) {
    for (const c of info.channels || []) {
      if (c.channel === n.channel) ownOnSameCh.push(info.name);
    }
  }
  if (ownOnSameCh.length) {
    rows.push(`<hr>`);
    rows.push(`<div class="row"><span class="lab warm">${t('neigh.clash_warn')}</span><span class="v warm">${ownOnSameCh.join(', ')}</span></div>`);
    rows.push(`<div class="row"><span class="lab">${t('neigh.advice')}</span><span class="v">${t('neigh.move_advice')}</span></div>`);
  } else {
    rows.push(`<div class="row"><span class="lab">${t('neigh.conflict')}</span><span class="v ok">${t('neigh.none')}</span></div>`);
  }
  let coCount = 0;
  for (const o of neighbors.values()) if (o.channel === n.channel) coCount++;
  rows.push(`<div class="row"><span class="lab">${t('neigh.others_on_channel', { ch: n.channel })}</span><span class="v">${coCount - 1}</span></div>`);
  rows.push(`<hr>`);
  rows.push(`<div class="row"><span class="lab">${t('neigh.bssid')}</span><span class="v" style="color: var(--fg-dim)">${n.id}</span></div>`);
  if (n.age != null) rows.push(`<div class="row"><span class="lab">${t('neigh.last_seen')}</span><span class="v">${t('neigh.ago_seconds', { n: n.age })}</span></div>`);
  return rows.join('');
}

function fmtBpsNice(bps) {
  const kbps = (bps * 8) / 1000;
  if (kbps >= 1000) return (kbps / 1000).toFixed(2) + ' mb/s';
  return kbps.toFixed(1) + ' kb/s';
}

function rssiQualityLabel(rssi) {
  if (rssi >= 50) return [t('qual.excellent'), 'ok'];
  if (rssi >= 35) return [t('qual.good'), 'ok'];
  if (rssi >= 20) return [t('qual.medium'), ''];
  return [t('qual.weak'), 'warm'];
}

// Inline-SVG sparkline op basis van history-buffer
function renderSparkline(history, key, opts = {}) {
  if (!history || history.length < 2) return '';
  const values = history.map(h => h[key] || 0);
  const max = Math.max(...values, 1);
  const w = opts.w || 160, h = opts.h || 28;
  const stroke = opts.stroke || '#b8ffd0';
  const fill = opts.fill || 'rgba(184,255,208,0.18)';
  const step = w / (values.length - 1);
  const points = values.map((v, i) => `${(i * step).toFixed(1)},${(h - (v / max) * (h - 4) - 2).toFixed(1)}`);
  const path = `M ${points.join(' L ')}`;
  const area = `M 0,${h} L ${points.join(' L ')} L ${w},${h} Z`;
  return `<svg width="${w}" height="${h}" style="display:block;margin:2px 0">
    <path d="${area}" fill="${fill}" stroke="none"/>
    <path d="${path}" fill="none" stroke="${stroke}" stroke-width="1.2" stroke-linejoin="round"/>
  </svg>`;
}

function renderStationTip(s) {
  const ap = apsMap.get(s.ap);
  const apName = (ap && apChannels[ap.mac]) ? apChannels[ap.mac].name : (ap ? ap.label : '—');
  const [qual, qualClass] = rssiQualityLabel(s.rssi);
  const rows = [
    `<strong>${s.name || '—'}</strong>`,
    `<hr>`,
    `<div class="row"><span class="lab">${t('station.connected_with')}</span><span class="v ok">${apName}</span></div>`,
    `<div class="row"><span class="lab">${t('station.band_channel')}</span><span class="v">${(s.band || '').toUpperCase()} · ${s.channel || '—'}</span></div>`,
    `<div class="row"><span class="lab">${t('station.ssid')}</span><span class="v">${s.ssid || '—'}</span></div>`,
    `<hr>`,
    `<div class="row"><span class="lab">${t('station.signal_rssi')}</span><span class="v ${qualClass}">${s.rssi} · ${qual}</span></div>`,
  ];
  if (s.snr != null) rows.push(`<div class="row"><span class="lab">${t('station.snr')}</span><span class="v">${s.snr} dB</span></div>`);
  if (s.noise != null) rows.push(`<div class="row"><span class="lab">${t('station.noise_floor')}</span><span class="v">${s.noise} dBm</span></div>`);
  rows.push(`<hr>`);
  rows.push(`<div class="row"><span class="lab">${t('station.download')}</span><span class="v">${fmtBpsNice(s.rxBytes || 0)}</span></div>`);
  if (s.history && s.history.length > 2) rows.push(`<div class="row" style="display:block">${renderSparkline(s.history, 'rx', { stroke:'#b8ffd0', fill:'rgba(184,255,208,0.18)' })}<span class="spark-lab">${t('spark.live') || 'live'}</span></div>`);
  rows.push(`<div class="row"><span class="lab">${t('station.upload')}</span><span class="v">${fmtBpsNice(s.txBytes || 0)}</span></div>`);
  if (s.history && s.history.length > 2) rows.push(`<div class="row" style="display:block">${renderSparkline(s.history, 'tx', { stroke:'#7adfa4', fill:'rgba(122,223,164,0.18)' })}<span class="spark-lab">${t('spark.live') || 'live'}</span></div>`);
  if (s.history1h && s.history1h.length > 3) {
    rows.push(`<div class="row" style="display:block;margin-top:6px">${renderSparkline(s.history1h, 'rx', { stroke:'#a8e8c4', fill:'rgba(168,232,196,0.12)', h:22 })}<span class="spark-lab">${t('spark.h1') || 'rx · 1u'}</span></div>`);
  }
  if (s.history24h && s.history24h.length > 3) {
    rows.push(`<div class="row" style="display:block">${renderSparkline(s.history24h, 'rx', { stroke:'#d8f0e2', fill:'rgba(216,240,226,0.10)', h:20 })}<span class="spark-lab">${t('spark.h24') || 'rx · 24u'}</span></div>`);
  }
  if (s.tx || s.rx) rows.push(`<div class="row"><span class="lab">${t('station.link_rate')}</span><span class="v">${Math.round((s.tx || 0) / 1000)} / ${Math.round((s.rx || 0) / 1000)} mbps</span></div>`);
  if (s.os || s.family || s.oui) {
    rows.push(`<hr>`);
    if (s.oui) rows.push(`<div class="row"><span class="lab">${t('station.manufacturer')}</span><span class="v">${s.oui}</span></div>`);
    if (s.os) rows.push(`<div class="row"><span class="lab">${t('station.os')}</span><span class="v">${s.os}</span></div>`);
  }
  rows.push(`<hr>`);
  rows.push(`<div class="row"><span class="lab">${t('station.mac')}</span><span class="v" style="color: var(--fg-dim)">${s.id}</span></div>`);
  return rows.join('');
}

function renderApTip(ap) {
  const info = apChannels[ap.mac];
  const name = info ? info.name : ap.label;
  const rows = [`<strong>${name}</strong>`, `<hr>`];
  if (info) {
    for (const c of info.channels) {
      const band = c.band === 'ng' ? '2.4 GHz' : c.band === 'na' ? '5 GHz' : c.band || '';
      rows.push(`<div class="row"><span class="lab">${band}</span><span class="v ok">${t('ap.channel')} ${c.channel}</span></div>`);
      if (c.cu_total != null) {
        const self = (c.cu_self_tx || 0) + (c.cu_self_rx || 0);
        rows.push(`<div class="row"><span class="lab">${t('ap.airtime')}</span><span class="v">${t('ap.airtime_value', { total: c.cu_total, self })}</span></div>`);
      }
      if (c.ht) rows.push(`<div class="row"><span class="lab">${t('ap.width')}</span><span class="v">${c.ht} MHz</span></div>`);
      if (c.tx_power) rows.push(`<div class="row"><span class="lab">${t('ap.tx_power')}</span><span class="v">${c.tx_power} dBm</span></div>`);
    }
    rows.push(`<hr>`);
  }
  rows.push(`<div class="row"><span class="lab">${t('ap.clients')}</span><span class="v">${ap.clientCount || 0}</span></div>`);
  rows.push(`<div class="row"><span class="lab">${t('ap.throughput')}</span><span class="v">${fmtBpsNice(ap.aggBps || 0)}</span></div>`);
  rows.push(`<hr>`);
  rows.push(`<div class="row"><span class="lab">${t('ap.mac')}</span><span class="v" style="color: var(--fg-dim)">${ap.mac}</span></div>`);
  return rows.join('');
}

function renderUdmTip() {
  const rows = [`<strong>${t('udm.title').replace(/·/g, ' ')}</strong>`, `<hr>`];
  rows.push(`<div class="row"><span class="lab">${t('udm.aps')}</span><span class="v">${apsMap.size}</span></div>`);
  rows.push(`<div class="row"><span class="lab">${t('udm.stations')}</span><span class="v">${stations.size}</span></div>`);
  let total = 0;
  for (const s of stations.values()) total += s.bps || 0;
  rows.push(`<div class="row"><span class="lab">${t('udm.wifi_tput')}</span><span class="v">${fmtBpsNice(total)}</span></div>`);
  return rows.join('');
}

function renderWanTip() {
  const rows = [`<strong>${t('wan.title_prefix')} ${(wan.isp || 'INTERNET').toUpperCase()}</strong>`, `<hr>`];
  if (wan.ip) rows.push(`<div class="row"><span class="lab">${t('wan.public_ip')}</span><span class="v">${maskIp(wan.ip)}</span></div>`);
  if (wan.status) rows.push(`<div class="row"><span class="lab">${t('wan.status')}</span><span class="v ok">${wan.status}</span></div>`);
  rows.push(`<div class="row"><span class="lab">${t('station.download')}</span><span class="v">${fmtBpsNice(wan.rxBps || 0)}</span></div>`);
  rows.push(`<div class="row"><span class="lab">${t('station.upload')}</span><span class="v">${fmtBpsNice(wan.txBps || 0)}</span></div>`);
  if (wan.latency != null) rows.push(`<div class="row"><span class="lab">${t('wan.latency')}</span><span class="v">${wan.latency} ms</span></div>`);
  if (wan.drops != null) rows.push(`<div class="row"><span class="lab">${t('wan.drops')}</span><span class="v">${wan.drops}</span></div>`);
  return rows.join('');
}

function updateTipPosition(x, y) {
  const tipW = canvasTip.offsetWidth;
  const tipH = canvasTip.offsetHeight;
  let tx = x + 14, ty = y + 14;
  if (tx + tipW > window.innerWidth - 8) tx = x - tipW - 14;
  if (ty + tipH > window.innerHeight - 8) ty = y - tipH - 14;
  canvasTip.style.transform = `translate(${tx}px, ${ty}px)`;
}

function pickAP(x, y) {
  let best = null, bestD2 = HIT_R * HIT_R;
  const dux = x - udm.x, duy = y - udm.y;
  const ud2 = dux * dux + duy * duy;
  if (ud2 < bestD2) { bestD2 = ud2; best = udm; }
  const dwx = x - wan.x, dwy = y - wan.y;
  const wd2 = dwx * dwx + dwy * dwy;
  if (wd2 < bestD2) { bestD2 = wd2; best = wan; }
  for (const ap of apsMap.values()) {
    const dx = x - ap.x, dy = y - ap.y;
    const d2 = dx * dx + dy * dy;
    if (d2 < bestD2) { bestD2 = d2; best = ap; }
  }
  return best;
}

function pos(ev) {
  const t = ev.touches && ev.touches[0];
  const r = canvas.getBoundingClientRect();
  return { x: (t ? t.clientX : ev.clientX) - r.left, y: (t ? t.clientY : ev.clientY) - r.top };
}

canvas.addEventListener('mousemove', ev => {
  const p = pos(ev);
  if (drag) {
    drag.ap.tx = p.x - drag.ox;
    drag.ap.ty = p.y - drag.oy;
    canvasTip.classList.remove('show');
    return;
  }
  hoverAP = pickAP(p.x, p.y);
  hoverStation = hoverAP ? null : pickStation(p.x, p.y);
  const hoverNeighbor = (!hoverAP && !hoverStation && prefs.showNeighbors) ? pickNeighbor(p.x, p.y) : null;
  canvas.style.cursor = hoverAP ? 'grab' : (hoverStation || hoverNeighbor ? 'crosshair' : 'default');

  if (hoverNeighbor) {
    canvasTip.innerHTML = renderNeighborTip(hoverNeighbor);
    canvasTip.classList.add('show');
    updateTipPosition(ev.clientX, ev.clientY);
  } else if (hoverStation) {
    canvasTip.innerHTML = renderStationTip(hoverStation);
    canvasTip.classList.add('show');
    updateTipPosition(ev.clientX, ev.clientY);
  } else if (hoverAP === udm) {
    canvasTip.innerHTML = renderUdmTip();
    canvasTip.classList.add('show');
    updateTipPosition(ev.clientX, ev.clientY);
  } else if (hoverAP === wan) {
    canvasTip.innerHTML = renderWanTip();
    canvasTip.classList.add('show');
    updateTipPosition(ev.clientX, ev.clientY);
  } else if (hoverAP) {
    canvasTip.innerHTML = renderApTip(hoverAP);
    canvasTip.classList.add('show');
    updateTipPosition(ev.clientX, ev.clientY);
  } else {
    canvasTip.classList.remove('show');
  }
});
canvas.addEventListener('mouseleave', () => { canvasTip.classList.remove('show'); });
canvas.addEventListener('mousedown', ev => {
  const p = pos(ev);
  const ap = pickAP(p.x, p.y);
  if (ap) {
    if (ev.shiftKey && ap !== udm && ap !== wan) {
      openApDrawer(ap);
      ev.preventDefault();
      return;
    }
    ap.pinned = true;
    drag = { ap, ox: p.x - ap.x, oy: p.y - ap.y };
    canvas.style.cursor = 'grabbing';
    ev.preventDefault();
  }
});
window.addEventListener('mouseup', () => {
  if (drag) {
    drag = null;
    persist();
    canvas.style.cursor = hoverAP ? 'grab' : 'default';
  }
});
canvas.addEventListener('dblclick', ev => {
  const p = pos(ev);
  const ap = pickAP(p.x, p.y);
  if (ap) { ap.pinned = false; persist(); }
});
canvas.addEventListener('touchstart', ev => {
  const p = pos(ev);
  const ap = pickAP(p.x, p.y);
  if (ap) {
    ap.pinned = true;
    drag = { ap, ox: p.x - ap.x, oy: p.y - ap.y };
    ev.preventDefault();
  }
}, { passive: false });
canvas.addEventListener('touchmove', ev => {
  if (!drag) return;
  const p = pos(ev);
  drag.ap.tx = p.x - drag.ox;
  drag.ap.ty = p.y - drag.oy;
  ev.preventDefault();
}, { passive: false });
canvas.addEventListener('touchend', () => { if (drag) { drag = null; persist(); } });

const stations = new Map();
const apsMap = new Map();
const neighbors = new Map();
let apChannels = {};
let wanLatencyHistory = [];

const roamingEvents = [];
const persistentRoamingLog = []; // bewaar voor STATS-pagina, verdwijnt nooit
const anomalies = [];
function recordAnomaly(station, kind, detail) {
  const entry = { ts: Date.now(), id: station.id, name: station.name || station.id.slice(-5), kind, detail };
  anomalies.unshift(entry);
  if (anomalies.length > 200) anomalies.length = 200;
  showAnomalyToast(entry);
}
function showAnomalyToast(entry) {
  let stack = document.getElementById('toast-stack');
  if (!stack) { stack = document.createElement('div'); stack.id = 'toast-stack'; document.body.appendChild(stack); }
  const el = document.createElement('div');
  el.className = 'toast anomaly';
  const ico = entry.kind === 'rssi-drop' ? '⚠' : '⚡';
  const label = entry.kind === 'rssi-drop' ? (prefs.lang === 'en' ? 'signal drop' : 'signaal-daling') : (prefs.lang === 'en' ? 'traffic spike' : 'verkeer-piek');
  el.innerHTML = `<span class="ico">${ico}</span><div class="msg"><strong>${escapeHtml(entry.name)}</strong> · ${label}<br><span class="from">${escapeHtml(entry.detail)}</span></div>`;
  stack.appendChild(el);
  requestAnimationFrame(() => el.classList.add('show'));
  setTimeout(() => { el.classList.remove('show'); setTimeout(() => el.remove(), 300); }, 5000);
}
function registerRoaming(station, fromMac, toMac) {
  roamingEvents.push({ id: station.id, name: station.name, fromMac, toMac, t: 0, ttl: 2.5 });
  if (roamingEvents.length > 80) roamingEvents.shift();
  // Persistent log + toast
  const fromName = (apChannels[fromMac] && apChannels[fromMac].name) || fromMac.slice(-5);
  const toName = (apChannels[toMac] && apChannels[toMac].name) || toMac.slice(-5);
  const entry = { ts: Date.now(), id: station.id, name: station.name || station.id.slice(-5), from: fromName, to: toName, fromMac, toMac };
  persistentRoamingLog.unshift(entry);
  if (persistentRoamingLog.length > 200) persistentRoamingLog.length = 200;
  showRoamingToast(entry);
  refreshEventLogPersistent();
}

// Toast-stack rechtsonder
const TOAST_STACK = [];
function showRoamingToast(entry) {
  if (!prefs.showRoaming) return;
  let stack = document.getElementById('toast-stack');
  if (!stack) {
    stack = document.createElement('div');
    stack.id = 'toast-stack';
    document.body.appendChild(stack);
  }
  const el = document.createElement('div');
  el.className = 'toast roaming';
  el.innerHTML = `<span class="ico">↻</span><div class="msg"><strong>${escapeHtml(entry.name)}</strong> roamt<br><span class="from">${escapeHtml(entry.from)}</span> → <span class="to">${escapeHtml(entry.to)}</span></div>`;
  stack.appendChild(el);
  requestAnimationFrame(() => el.classList.add('show'));
  setTimeout(() => { el.classList.remove('show'); setTimeout(() => el.remove(), 300); }, 4500);
}
function escapeHtml(s) { return String(s||'').replace(/[&<>"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c])); }
function formatUptime(s) {
  if (!s || s < 0) return '—';
  const d = Math.floor(s / 86400), h = Math.floor((s % 86400) / 3600), m = Math.floor((s % 3600) / 60);
  if (d > 0) return `${d}d ${h}u`;
  if (h > 0) return `${h}u ${m}m`;
  return `${m}m`;
}

// Reboot-detectie: track per AP de laatste uptime, als die plotsklaps zakt → toast
const apUptimes = {};
function detectApReboots() {
  for (const [mac, info] of Object.entries(apChannels)) {
    const prev = apUptimes[mac];
    const now = info.uptime;
    if (prev != null && now != null && now < prev - 30 && now < 300) {
      // Uptime is gereset (bv. 200000 → 60s) en is laag → reboot
      const stack = document.getElementById('toast-stack') || (() => { const s = document.createElement('div'); s.id = 'toast-stack'; document.body.appendChild(s); return s; })();
      const el = document.createElement('div');
      el.className = 'toast anomaly';
      el.innerHTML = `<span class="ico">⟳</span><div class="msg"><strong>${escapeHtml(info.name)}</strong> · ${prefs.lang==='en'?'rebooted':'rebootte'}<br><span class="from">${prefs.lang==='en'?'now online':'is weer online'}</span></div>`;
      stack.appendChild(el);
      requestAnimationFrame(() => el.classList.add('show'));
      setTimeout(() => { el.classList.remove('show'); setTimeout(() => el.remove(), 300); }, 5000);
    }
    apUptimes[mac] = now;
  }
}
setInterval(detectApReboots, 5000);
function refreshEventLogPersistent() {
  const log = document.getElementById('event-log');
  if (!log) return;
  if (!persistentRoamingLog.length) {
    log.innerHTML = `<div class="event-empty">${t('event.empty') || 'nog geen roaming events'}</div>`;
    return;
  }
  log.innerHTML = persistentRoamingLog.slice(0, 80).map(e => {
    const ago = formatAgo(Date.now() - e.ts);
    return `<div class="event-row"><span class="ev-time">${ago}</span><span class="ev-name">${escapeHtml(e.name)}</span><span class="ev-arrow">${escapeHtml(e.from)} → <strong>${escapeHtml(e.to)}</strong></span></div>`;
  }).join('');
}
function formatAgo(ms) {
  const s = Math.round(ms / 1000);
  if (s < 60) return s + 's';
  const m = Math.round(s / 60);
  if (m < 60) return m + 'm';
  return Math.round(m / 60) + 'h';
}
setInterval(refreshEventLogPersistent, 10_000); // ververs "X minuten geleden" labels

// ─── Alerts dashboard ─────────────────────────────────────────
function collectAlerts() {
  const out = { rogue: [], disconnected: [], anomaly: [], quota: [], reboot: [], firmware: [], airtime: [] };
  // Rogue / disturbing externe APs
  for (const n of neighbors.values()) {
    if (n.disturbing) out.rogue.push({ name: n.ssid || '(hidden)', detail: `kanaal ${n.channel} · ${n.rssi} dBm · ${(n.band||'').toUpperCase()}`, severity: 'rogue', rssi: n.rssi });
  }
  out.rogue.sort((a,b) => (b.rssi||-99) - (a.rssi||-99));
  out.rogue = out.rogue.slice(0, 30);
  // Disconnected: stations met geen ap of zwak signaal
  for (const s of stations.values()) {
    if (!s.ap || s.ap === 'unknown') out.disconnected.push({ name: s.name, detail: 'geen ap-koppeling', severity: 'warning' });
    else if (s.rssi != null && s.rssi < -80) out.disconnected.push({ name: s.name, detail: `zwak signaal · ${s.rssi} dBm`, severity: 'warning' });
  }
  // Recente anomalies (laatste 10 min)
  const cutoff = Date.now() - 10 * 60_000;
  out.anomaly = anomalies.filter(a => a.ts > cutoff).map(a => ({
    name: a.name,
    detail: a.kind === 'rssi-drop' ? 'signaal-daling: ' + a.detail : 'verkeer-piek: ' + a.detail,
    ts: a.ts, severity: 'danger'
  }));
  // Over-quota
  const today = todayKey();
  for (const [mac, lim] of Object.entries(quotas)) {
    const used = quotaUsage[`${mac}|${today}`] || 0;
    if (used > lim) {
      const s = stations.get(mac);
      out.quota.push({ name: s?.name || mac, detail: `${fmtBytes(used)} / ${fmtBytes(lim)}`, severity: 'warning' });
    }
  }
  // AP-uptime laag (recente reboot)
  for (const [mac, info] of Object.entries(apChannels)) {
    if (info.uptime != null && info.uptime < 600) out.reboot.push({ name: info.name, detail: `uptime ${formatUptime(info.uptime)}`, severity: 'warning' });
    if (info.firmwareLatest) out.firmware.push({ name: info.name, detail: `update beschikbaar: ${info.firmwareLatest}`, severity: 'info' });
    for (const r of (info.channels || [])) {
      if (r.cu_total != null && r.cu_total > 80) out.airtime.push({ name: info.name, detail: `airtime ${r.cu_total}% op kanaal ${r.channel}`, severity: 'warning' });
    }
  }
  return out;
}

function refreshAlertsPage() {
  const a = collectAlerts();
  const list = document.getElementById('alerts-list');
  if (!list) return;
  const total = a.rogue.length + a.disconnected.length + a.anomaly.length + a.quota.length + a.reboot.length + a.firmware.length + a.airtime.length;
  if (!total) {
    list.innerHTML = `<div class="alert-empty">${prefs.lang==='en'?'all clear · no items need attention':'alles in orde · niets dat aandacht nodig heeft'}</div>`;
    return;
  }
  let html = '';
  const sections = [
    { key:'rogue', label: prefs.lang==='en'?'overlapping external APs':'overlappende externe APs', ico:'≈', cls:'rogue' },
    { key:'anomaly', label: prefs.lang==='en'?'anomalies (10m)':'anomalieën (10m)', ico:'⚠', cls:'danger' },
    { key:'disconnected', label: prefs.lang==='en'?'disconnected / weak':'losgekoppeld / zwak', ico:'⊘', cls:'warning' },
    { key:'quota', label: prefs.lang==='en'?'over quota':'over quotum', ico:'⏷', cls:'warning' },
    { key:'reboot', label: prefs.lang==='en'?'recent ap reboots':'recente ap-reboots', ico:'⟳', cls:'warning' },
    { key:'firmware', label: prefs.lang==='en'?'firmware updates':'firmware updates', ico:'↑', cls:'warning' },
    { key:'airtime', label: prefs.lang==='en'?'high airtime':'hoge airtime', ico:'≣', cls:'warning' },
  ];
  for (const sec of sections) {
    if (!a[sec.key].length) continue;
    html += `<h3>${sec.label} <span style="color:var(--fg-faint);font-size:9px">(${a[sec.key].length})</span></h3>`;
    for (const item of a[sec.key]) {
      const ago = item.ts ? formatAgo(Date.now() - item.ts) + ' geleden' : '';
      html += `<div class="alert-row"><span class="ico ${sec.cls}">${sec.ico}</span><div><div class="name">${escapeHtml(item.name)}</div><div class="detail">${escapeHtml(item.detail)}</div></div><span class="ts">${ago}</span></div>`;
    }
  }
  list.innerHTML = html;
  drawAlertsRadar(a);
  // Update badge
  const badge = document.getElementById('alerts-badge');
  if (badge) {
    badge.textContent = total;
    badge.style.display = total ? 'inline-flex' : 'none';
  }
}

// Recon-radar: ALLE entities die het systeem ziet, gecategoriseerd
// Zone 1 (kern): eigen APs + APs met issues
// Zone 2: eigen gekoppelde clients (mint per band)
// Zone 3: zwakke / losgekoppelde clients + anomalies
// Zone 4: externe APs (overlap)
let _alertItems = [];
function drawAlertsRadar(a) {
  const items = [];
  // Zone 1: eigen APs (allemaal)
  for (const [mac, info] of Object.entries(apChannels)) {
    const hasIssue = (info.uptime != null && info.uptime < 600) || info.firmwareLatest ||
      (info.channels || []).some(c => c.cu_total > 80);
    items.push({
      name: info.name, detail: info.model || 'AP',
      zone: 1, kind: 'own-ap', issue: hasIssue,
      color: hasIssue ? 'rgba(255,200,100,0.95)' : 'rgba(184,255,208,0.95)',
      glow: hasIssue ? 'rgba(255,200,100,0.55)' : 'rgba(184,255,208,0.55)',
      size: 5.5
    });
  }
  // Zone 2: eigen gekoppelde clients (per band kleur)
  for (const s of stations.values()) {
    if (!s.ap || s.ap === 'unknown') continue;
    if (s.rssi != null && s.rssi < -80) continue; // zwakke gaan naar zone 3
    if (s.anomalyFlash > 0.05) continue; // anomalies naar zone 3
    const bc = BAND_COLOR[s.bandKey] || BAND_COLOR['5'];
    items.push({
      name: s.name, detail: `${(s.band||'').toUpperCase()} · ${s.rssi || '?'} dBm`,
      zone: 2, kind: 'client-ok', band: s.bandKey,
      color: bc.core, glow: bc.glow, size: 3.5
    });
  }
  // Zone 3: probleem-clients (zwak / losgekoppeld / anomaly / quota)
  for (const s of stations.values()) {
    if (!s.ap || s.ap === 'unknown') {
      items.push({ name: s.name, detail: prefs.lang==='en'?'no AP':'geen AP', zone: 3, kind: 'orphan',
        color: 'rgba(255,200,100,0.95)', glow: 'rgba(255,200,100,0.55)', size: 4 });
    } else if (s.rssi != null && s.rssi < -80) {
      items.push({ name: s.name, detail: `${s.rssi} dBm`, zone: 3, kind: 'weak',
        color: 'rgba(255,200,100,0.85)', glow: 'rgba(255,200,100,0.45)', size: 3.5 });
    }
  }
  for (const x of a.anomaly) items.push({ ...x, zone: 3, kind: 'anomaly',
    color: 'rgba(255,90,90,0.95)', glow: 'rgba(255,90,90,0.7)', size: 5 });
  for (const x of a.quota) items.push({ ...x, zone: 3, kind: 'quota',
    color: 'rgba(255,180,80,0.95)', glow: 'rgba(255,180,80,0.5)', size: 3.5 });
  // Zone 4: externe APs (storend op overlap-kanaal) — altijd label
  for (const x of a.rogue) items.push({ ...x, zone: 4, kind: 'external-ap',
    color: 'rgba(255,140,90,0.95)', glow: 'rgba(255,140,90,0.55)', size: 4.5,
    labelAlways: true,
    label: `${(x.name||'').slice(0,16)} · ch${(x.detail||'').match(/kanaal\s+(\d+)/)?.[1] || (x.detail||'').match(/ch\s*(\d+)/)?.[1] || '?'}`
  });
  _alertItems = items;
}

function renderRadarFrame() {
  const canvas = document.getElementById('alerts-radar');
  if (!canvas || !document.body.classList.contains('alerts-mode')) return;
  setupHiDpiCanvas(canvas);
  const c = canvas.getContext('2d');
  const w = canvas.clientWidth, h = canvas.clientHeight;
  if (!w || !h) return;
  c.clearRect(0, 0, w, h);
  const cx = w / 2, cy = h / 2;
  const R = Math.min(w, h) / 2 - 14;

  // Crosshair
  c.strokeStyle = 'rgba(184,255,208,0.05)';
  c.lineWidth = 1;
  c.beginPath(); c.moveTo(cx - R, cy); c.lineTo(cx + R, cy); c.stroke();
  c.beginPath(); c.moveTo(cx, cy - R); c.lineTo(cx, cy + R); c.stroke();

  // 4 zone-ringen met labels
  const zoneR = [R*0.25, R*0.50, R*0.75, R*1.0];
  const zoneLabels = ['EIGEN APs', 'EIGEN CLIENTS', 'PROBLEMEN', 'EXTERN'];
  c.strokeStyle = 'rgba(184,255,208,0.10)';
  for (const r of zoneR) {
    c.beginPath(); c.arc(cx, cy, r, 0, Math.PI*2); c.stroke();
  }
  // Zone labels rechtsonder van elke ring
  c.font = '9px ui-monospace, monospace';
  c.fillStyle = 'rgba(160,200,180,0.4)';
  c.textAlign = 'left';
  for (let i = 0; i < zoneR.length; i++) {
    c.fillText(zoneLabels[i], cx + zoneR[i] - 32, cy - 4);
  }

  // Sweep-arc — dunner (0.14 rad ≈ 8°)
  const sweepAngle = (performance.now() / 5000) * Math.PI * 2;
  const beamWidth = 0.14;
  for (let i = 0; i < 12; i++) {
    const t = i / 12;
    const ang0 = sweepAngle - beamWidth - t * 0.7;
    const ang1 = sweepAngle - beamWidth - (t - 0.07) * 0.7;
    c.fillStyle = `rgba(184,255,208,${0.07 * (1-t)})`;
    c.beginPath(); c.moveTo(cx, cy); c.arc(cx, cy, R, ang0, ang1); c.closePath(); c.fill();
  }
  c.fillStyle = 'rgba(184,255,208,0.18)';
  c.beginPath(); c.moveTo(cx, cy); c.arc(cx, cy, R, sweepAngle - beamWidth, sweepAngle); c.closePath(); c.fill();
  // Beam-lijn
  c.strokeStyle = 'rgba(184,255,208,0.55)';
  c.lineWidth = 1;
  c.beginPath(); c.moveTo(cx, cy); c.lineTo(cx + Math.cos(sweepAngle) * R, cy + Math.sin(sweepAngle) * R); c.stroke();

  // Plot items per zone
  for (const item of _alertItems) {
    const seed = Array.from(String(item.name||'')).reduce((s, ch) => s + ch.charCodeAt(0), 0);
    const angle = ((seed * 137.5) % 360) * Math.PI / 180; // golden-angle
    const zoneIdx = (item.zone || 1) - 1;
    const inner = zoneIdx === 0 ? 16 : zoneR[zoneIdx-1] + 6;
    const outer = zoneR[zoneIdx] - 4;
    const dist = inner + ((seed * 31) % 100) / 100 * Math.max(8, outer - inner);
    const x = cx + Math.cos(angle) * dist;
    const y = cy + Math.sin(angle) * dist;
    const angDiff = ((sweepAngle - angle) % (Math.PI * 2) + Math.PI * 2) % (Math.PI * 2);
    const lit = angDiff < 0.7 ? Math.max(0, 1 - angDiff / 0.7) : 0;
    const baseSize = item.size || 4;
    c.shadowColor = item.glow; c.shadowBlur = 5 + lit * 14;
    c.fillStyle = item.color;
    if (item.kind === 'external-ap') {
      // Vierkantje voor externe APs — duidelijk onderscheid t.o.v. clients
      const sz = baseSize + lit * 1.5;
      c.fillRect(x - sz, y - sz, sz * 2, sz * 2);
      c.shadowBlur = 0;
      // Diamond-rand
      c.strokeStyle = item.color;
      c.lineWidth = 1;
      c.beginPath();
      c.moveTo(x, y - sz - 2); c.lineTo(x + sz + 2, y); c.lineTo(x, y + sz + 2); c.lineTo(x - sz - 2, y); c.closePath();
      c.stroke();
    } else {
      c.beginPath(); c.arc(x, y, baseSize + lit * 2, 0, Math.PI*2); c.fill();
      if (item.kind === 'own-ap') {
        c.shadowBlur = 0;
        c.strokeStyle = item.color;
        c.lineWidth = 1;
        c.beginPath(); c.arc(x, y, baseSize + 4, 0, Math.PI*2); c.stroke();
      }
    }
    c.shadowBlur = 0;
    // Label: APs (eigen + extern) altijd, clients alleen bij sweep-hover
    const showLabel = item.labelAlways || item.kind === 'own-ap' || lit > 0.15 || _alertItems.length < 25;
    if (showLabel) {
      c.fillStyle = item.kind === 'external-ap'
        ? `rgba(255,200,170,${0.7 + lit * 0.3})`
        : `rgba(220,255,235,${0.45 + lit * 0.5})`;
      c.font = (item.kind === 'own-ap' || item.kind === 'external-ap' ? '600 ' : '') + '9px ui-monospace, monospace';
      c.textAlign = 'center';
      c.fillText((item.label || item.name || '').slice(0, 18), x, y + baseSize + 11);
    }
  }
  // Center label
  const apsCount = _alertItems.filter(i => i.kind === 'own-ap').length;
  const clientsCount = _alertItems.filter(i => i.kind === 'client-ok').length;
  const issuesCount = _alertItems.filter(i => i.zone === 3 || i.zone === 4).length;
  c.fillStyle = 'rgba(184,255,208,0.6)';
  c.font = '600 12px ui-monospace, monospace';
  c.textAlign = 'center';
  c.fillText('RECON', cx, cy - 14);
  c.fillStyle = 'rgba(160,200,180,0.55)';
  c.font = '9px ui-monospace, monospace';
  c.fillText(`${apsCount} AP · ${clientsCount} CLIENT · ${issuesCount} ISSUE`, cx, cy + 2);
  c.fillStyle = 'rgba(160,200,180,0.35)';
  c.font = '8px ui-monospace, monospace';
  c.fillText(prefs.lang==='en'?'live network reconnaissance':'live netwerk-reconnaissance', cx, cy + 16);
}

function radarLoop() {
  renderRadarFrame();
  if (document.body.classList.contains('alerts-mode')) requestAnimationFrame(radarLoop);
}
// Wanneer alerts-tab actief wordt → start de loop
const _origSetTab = setTab;
setTab = function(tab) {
  _origSetTab(tab);
  if (tab === 'alerts') requestAnimationFrame(radarLoop);
};

setInterval(() => { if (prefs.tab === 'alerts') refreshAlertsPage(); else { /* update badge alleen */
  const a = collectAlerts();
  const total = a.rogue.length + a.disconnected.length + a.anomaly.length + a.quota.length;
  const badge = document.getElementById('alerts-badge');
  if (badge) { badge.textContent = total; badge.style.display = total ? 'inline-flex' : 'none'; }
}}, 3000);

// ─── Bandwidth-quota alerts (per MAC, per dag) ─────────────────────────
const QUOTA_KEY = 'wifi-pulse:quotas';
const QUOTA_USAGE_KEY = 'wifi-pulse:quotaUsage';
let quotas = {}; let quotaUsage = {};
try { quotas = JSON.parse(localStorage.getItem(QUOTA_KEY) || '{}'); } catch {}
try { quotaUsage = JSON.parse(localStorage.getItem(QUOTA_USAGE_KEY) || '{}'); } catch {}
function saveQuotas() { try { localStorage.setItem(QUOTA_KEY, JSON.stringify(quotas)); } catch {} }
function saveQuotaUsage() { try { localStorage.setItem(QUOTA_USAGE_KEY, JSON.stringify(quotaUsage)); } catch {} }
function todayKey() { return new Date().toISOString().slice(0, 10); }
const quotaAlerted = new Set();
function checkQuotas() {
  const today = todayKey();
  for (const s of stations.values()) {
    const limit = quotas[s.id]; // in bytes/dag
    if (!limit) continue;
    const usageKey = `${s.id}|${today}`;
    quotaUsage[usageKey] = (quotaUsage[usageKey] || 0) + ((s.rxBytes || 0) + (s.txBytes || 0)) * (POLL_MS_FRONT / 1000);
    if (quotaUsage[usageKey] > limit && !quotaAlerted.has(usageKey)) {
      quotaAlerted.add(usageKey);
      const stack = document.getElementById('toast-stack') || (() => { const x = document.createElement('div'); x.id = 'toast-stack'; document.body.appendChild(x); return x; })();
      const el = document.createElement('div');
      el.className = 'toast anomaly';
      el.innerHTML = `<span class="ico">⚠</span><div class="msg"><strong>${escapeHtml(s.name||s.id)}</strong> ${prefs.lang==='en'?'over quota':'over quotum'}<br><span class="from">${fmtBytes(quotaUsage[usageKey])} / ${fmtBytes(limit)}</span></div>`;
      stack.appendChild(el);
      requestAnimationFrame(() => el.classList.add('show'));
      setTimeout(() => { el.classList.remove('show'); setTimeout(() => el.remove(), 300); }, 6000);
    }
  }
  saveQuotaUsage();
}
const POLL_MS_FRONT = 1.5; // benadering, gebruik bij usage-aggregatie
function fmtBytes(b) {
  if (b > 1e9) return (b/1e9).toFixed(2) + ' GB';
  if (b > 1e6) return (b/1e6).toFixed(1) + ' MB';
  if (b > 1e3) return (b/1e3).toFixed(0) + ' KB';
  return b + ' B';
}
setInterval(checkQuotas, 5000);

// API om quotum te zetten via drawer
window.setStationQuota = function(mac, gbPerDay) {
  if (gbPerDay <= 0) { delete quotas[mac]; }
  else { quotas[mac] = gbPerDay * 1e9; }
  saveQuotas();
  if (drawerAp) renderDrawer();
};

// ─── Channel-aanbeveling: vind minst-overlappende kanaal per band ─────────
function recommendChannel(currentChannel, band) {
  const candidates = band === 'ng' ? [1, 6, 11] : (band === 'na' ? [36, 40, 44, 48, 149, 153, 157, 161] : []);
  if (!candidates.length) return null;
  // Score = optelsom van neighbor-RSSIs op overlappende kanalen (lager = beter)
  const score = ch => {
    let s = 0;
    for (const n of neighbors.values()) {
      if (n.band !== band || !n.channel) continue;
      const diff = Math.abs(n.channel - ch);
      // 2.4 GHz: ±4 kanalen = 20 MHz overlap; 5 GHz: zelfde kanaal
      const overlap = band === 'ng' ? Math.max(0, 1 - diff / 5) : (diff === 0 ? 1 : 0);
      if (overlap > 0) s += Math.max(0, 100 + (n.rssi || -90)) * overlap;
    }
    return s;
  };
  let best = candidates[0]; let bestScore = Infinity;
  for (const c of candidates) {
    const sc = score(c);
    if (sc < bestScore) { bestScore = sc; best = c; }
  }
  if (best === currentChannel) return null;
  return { current: currentChannel, recommended: best, scoreCurrent: score(currentChannel), scoreRecommended: bestScore };
}
// Toon recommendation in drawer (al via renderDrawer aanroepen kan dat)

// ─── Handover heatmap (per AP-paar transitie-count) ─────────
function refreshHandoverMatrix() {
  const el = document.getElementById('handover-matrix');
  if (!el) return;
  if (!persistentRoamingLog.length) {
    el.innerHTML = `<div class="event-empty">${prefs.lang==='en'?'no handovers yet':'nog geen handovers'}</div>`;
    return;
  }
  const counts = {};
  const apsSet = new Set();
  for (const e of persistentRoamingLog) {
    const key = `${e.from}→${e.to}`;
    counts[key] = (counts[key] || 0) + 1;
    apsSet.add(e.from); apsSet.add(e.to);
  }
  const aps = Array.from(apsSet);
  const max = Math.max(1, ...Object.values(counts));
  let html = `<table class="handover-table"><thead><tr><th></th>${aps.map(a=>`<th title="${escapeHtml(a)}">${escapeHtml(a.slice(0,8))}</th>`).join('')}</tr></thead><tbody>`;
  for (const from of aps) {
    html += `<tr><th title="${escapeHtml(from)}">${escapeHtml(from.slice(0,8))}</th>`;
    for (const to of aps) {
      const c = counts[`${from}→${to}`] || 0;
      const a = c ? Math.min(0.85, 0.18 + (c / max) * 0.7) : 0;
      html += `<td style="background:rgba(184,255,208,${a.toFixed(2)})" title="${escapeHtml(from)} → ${escapeHtml(to)}: ${c}">${c || ''}</td>`;
    }
    html += '</tr>';
  }
  html += '</tbody></table>';
  el.innerHTML = html;
}
setInterval(refreshHandoverMatrix, 5_000);
const udm = { x: 0, y: 0, tx: 0, ty: 0, glow: 0, pinned: false, particles: [], emitAcc: 0, label: 'UDM' };
const wan = {
  x: 0, y: 0, tx: 0, ty: 0, glow: 0, pinned: false,
  particles: [], emitAcc: 0,
  txBps: 0, rxBps: 0, txBusy: 0, rxBusy: 0, busy: 0,
  isp: '', ip: '', status: '',
  label: 'WAN',
};

const STORAGE_KEY = 'wifi-pulse:positions';
function loadPositions() {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}'); }
  catch { return {}; }
}
function savePositions(state) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); } catch {}
}
const positions = loadPositions();
if (positions.udm) {
  udm.x = udm.tx = positions.udm.x;
  udm.y = udm.ty = positions.udm.y;
  udm.pinned = true;
}
if (positions.wan) {
  wan.x = wan.tx = positions.wan.x;
  wan.y = wan.ty = positions.wan.y;
  wan.pinned = true;
}
function persist() {
  const state = {
    udm: udm.pinned ? { x: udm.tx, y: udm.ty } : null,
    wan: wan.pinned ? { x: wan.tx, y: wan.ty } : null,
    aps: {},
  };
  for (const ap of apsMap.values()) {
    if (ap.pinned) state.aps[ap.mac] = { x: ap.tx, y: ap.ty };
  }
  savePositions(state);
}

function rssiNorm(rssi) { return Math.max(0, Math.min(1, (rssi + 90) / 60)); }
function bandKey(band) {
  const b = (band || '').toString().toLowerCase();
  if (b.includes('6')) return '6';
  if (b.includes('5') || b.includes('a') || b.includes('ac') || b.includes('ax5')) return '5';
  return '2';
}
// Mint-paletvarianten per band — alleen helderheid varieert, hue blijft mint
const BAND_COLOR = {
  '2': { core: 'rgba(140,220,180,1)',  glow: 'rgba(140,220,180,0.55)', label: '2.4G' },  // doffer mint
  '5': { core: 'rgba(184,255,208,1)',  glow: 'rgba(184,255,208,0.65)', label: '5G'   },  // primair mint
  '6': { core: 'rgba(216,255,232,1)',  glow: 'rgba(216,255,232,0.75)', label: '6G'   },  // helderst
};
const BAND_PROFILE = {
  '2': { speedMul: 0.85, drift: 1.0,  bow: 0.20 },
  '5': { speedMul: 1.0,  drift: 0.7,  bow: 0.14 },
  '6': { speedMul: 1.20, drift: 0.45, bow: 0.10 },
};

class Station {
  constructor(d) {
    this.id = d.id;
    this.particles = [];
    this.emitAcc = 0;
    this.tx = W * 0.5; this.ty = H * 0.5;
    this.x = W * 0.5 + (Math.random() - 0.5) * 200;
    this.y = H * 0.5 + (Math.random() - 0.5) * 200;
    this.update(d);
  }
  update(d) {
    this.name = d.name;
    this.rssi = d.rssi;
    this.noise = d.noise;
    const snr = (d.noise != null) ? Math.max(0, d.signal != null ? (d.signal - d.noise) : (d.rssi - d.noise)) : null;
    this.snr = snr;
    this.strengthRssi = rssiNorm(d.rssi);
    this.strengthSnr = snr != null ? Math.max(0, Math.min(1, snr / 50)) : null;
    this.strength = (prefs.useSnr && this.strengthSnr != null) ? this.strengthSnr : this.strengthRssi;
    const tput = (d.txBytes || 0) + (d.rxBytes || 0);
    this.bps = tput;
    this.rxBytes = d.rxBytes || 0;
    this.txBytes = d.txBytes || 0;
    this.busy = Math.min(1, Math.pow(tput / 60000, 0.7));
    this.txBusy = Math.min(1, Math.pow((d.txBytes || 0) / 40000, 0.7));
    this.rxBusy = Math.min(1, Math.pow((d.rxBytes || 0) / 40000, 0.7));
    // Ringbuffers voor sparklines
    const now = Date.now();
    if (!this.history) this.history = [];
    this.history.push({ rx: this.rxBytes, tx: this.txBytes, rssi: this.rssi, ts: now });
    if (this.history.length > 60) this.history.shift();
    // 1u-buffer (1 sample/min, 60 samples)
    if (!this.history1h) this.history1h = [];
    if (!this.history1h.length || now - this.history1h[this.history1h.length-1].ts >= 60_000) {
      this.history1h.push({ rx: this.rxBytes, tx: this.txBytes, rssi: this.rssi, ts: now });
      if (this.history1h.length > 60) this.history1h.shift();
    }
    // 24u-buffer (1 sample/15min, 96 samples)
    if (!this.history24h) this.history24h = [];
    if (!this.history24h.length || now - this.history24h[this.history24h.length-1].ts >= 15 * 60_000) {
      this.history24h.push({ rx: this.rxBytes, tx: this.txBytes, rssi: this.rssi, ts: now });
      if (this.history24h.length > 96) this.history24h.shift();
    }
    // Anomaly-detectie: RSSI-drop > 10 dB binnen 60s of throughput-spike > 3x baseline
    if (this.history.length >= 5) {
      const recent = this.history.slice(-5);
      const oldRssi = recent[0].rssi;
      if (oldRssi != null && this.rssi != null && (oldRssi - this.rssi) >= 10 && (now - this.lastAnomalyTs > 60_000)) {
        this.lastAnomalyTs = now;
        this.anomalyFlash = 1.0;
        recordAnomaly(this, 'rssi-drop', `${oldRssi} → ${this.rssi} dBm`);
      }
      const baselineBps = recent.slice(0, 4).reduce((s, h) => s + (h.rx + h.tx), 0) / 4;
      const currentBps = this.rxBytes + this.txBytes;
      if (baselineBps > 5_000 && currentBps > baselineBps * 3 && (now - this.lastAnomalyTs > 60_000)) {
        this.lastAnomalyTs = now;
        this.anomalyFlash = 1.0;
        recordAnomaly(this, 'throughput-spike', `${fmtBpsNice(baselineBps)} → ${fmtBpsNice(currentBps)}`);
      }
    }
    if (this.anomalyFlash) this.anomalyFlash = Math.max(0, this.anomalyFlash - 0.05);
    const prevAp = this.ap;
    this.ap = d.ap || 'unknown';
    this.band = d.band;
    this.channel = d.channel;
    this.bandKey = bandKey(d.band);
    this.profile = BAND_PROFILE[this.bandKey];
    this.os = d.os;
    this.oui = d.oui;
    this.family = d.family;
    this.subrouter = !!d.subrouter;
    if (this.phase === undefined) {
      this.phase = Math.random() * Math.PI * 2;
      this.angVel = (Math.random() - 0.5) * 0.05;
      this.angle = Math.random() * Math.PI * 2;
    }
    if (prevAp && prevAp !== this.ap && prefs.showRoaming) {
      registerRoaming(this, prevAp, this.ap);
    }
  }
}

class Neighbor {
  constructor(d) {
    this.id = d.id;
    this.x = W * 0.5; this.y = H * 0.5;
    this.tx = this.x; this.ty = this.y;
    this.phase = Math.random() * Math.PI * 2;
    this.flicker = Math.random();
    this.update(d);
  }
  update(d) {
    this.ssid = (d.ssid || '(hidden)').slice(0, 18);
    this.rssi = d.rssi;
    const r = d.rssi >= 0 ? d.rssi : (d.rssi + 90);
    this.strength = Math.max(0, Math.min(1, r / 50));
    this.channel = d.channel;
    this.band = d.band;
    this.seenBy = d.seenBy;
  }
}

class AP {
  constructor(mac) {
    this.mac = mac;
    this.x = W * 0.5; this.y = H * 0.5;
    this.tx = this.x; this.ty = this.y;
    this.label = mac.slice(-5);
    this.glow = 0;
    this.pinned = false;
    this.particles = [];
    this.emitAcc = 0;
    this.aggBps = 0;
    this.aggBusy = 0;
    const saved = positions.aps && positions.aps[mac];
    if (saved) {
      this.x = this.tx = saved.x;
      this.y = this.ty = saved.y;
      this.pinned = true;
    }
  }
}

function layout() {
  const groups = new Map();
  for (const s of stations.values()) {
    if (!groups.has(s.ap)) groups.set(s.ap, []);
    groups.get(s.ap).push(s);
  }
  for (const mac of groups.keys()) if (!apsMap.has(mac)) apsMap.set(mac, new AP(mac));
  // Ook AP's zonder clients tonen — ze staan wel in apChannels (UDM rapporteert ze).
  // Skip 'unknown' bucket en eigen UDM mac (die heeft eigen UDM-node).
  for (const mac of Object.keys(apChannels)) {
    if (mac === 'unknown') continue;
    if (mac === udm.mac) continue;
    if (!apsMap.has(mac)) apsMap.set(mac, new AP(mac));
  }
  for (const mac of [...apsMap.keys()]) {
    if (!groups.has(mac) && !apChannels[mac]) apsMap.delete(mac);
  }

  const apList = [...apsMap.values()];
  const cx = W / 2, cy = H / 2;
  if (!udm.pinned) { udm.tx = cx; udm.ty = cy; }
  if (!wan.pinned) { wan.tx = cx; wan.ty = Math.max(60, cy - Math.min(W, H) * 0.42); }
  const rApRing = Math.min(W, H) * (apList.length === 1 ? 0.18 : 0.26);
  apList.forEach((ap, i) => {
    if (ap.pinned) return;
    const idx = apList.indexOf(ap);
    const a = (idx / Math.max(1, apList.length)) * Math.PI * 2 - Math.PI / 2;
    ap.tx = udm.tx + Math.cos(a) * rApRing;
    ap.ty = udm.ty + Math.sin(a) * rApRing;
  });

  const now = performance.now() * 0.001;
  const minDim = Math.min(W, H);
  const baseR = 130;
  const reach = minDim * (apList.length === 1 ? 0.55 : 0.38);
  const golden = Math.PI * (3 - Math.sqrt(5));

  for (const [mac, list] of groups) {
    const ap = apsMap.get(mac);
    list.sort((a, b) => b.strength - a.strength);
    const apSeed = (mac.charCodeAt(0) || 0) * 0.21;
    list.forEach((s, i) => {
      s.angle += s.angVel * 0.004;
      const baseAngle = i * golden + apSeed + now * 0.015 * s.profile.speedMul;
      const wander = Math.sin(now * 0.45 * s.profile.speedMul + s.phase) * 0.20 * s.profile.drift;
      const a = baseAngle + wander + s.angle * 0.10;
      const distFactor = baseR + Math.pow(1 - s.strength, 1.4) * reach;
      const breathe = Math.sin(now * 0.9 * s.profile.speedMul + s.phase * 1.7) * 12 * s.profile.drift;
      const dist = distFactor + breathe;
      s.tx = ap.tx + Math.cos(a) * dist;
      s.ty = ap.ty + Math.sin(a) * dist;
    });
  }

  const all = [...stations.values()];
  for (let pass = 0; pass < 2; pass++) {
    for (let i = 0; i < all.length; i++) {
      for (let j = i + 1; j < all.length; j++) {
        const a = all[i], b = all[j];
        const dx = b.tx - a.tx, dy = b.ty - a.ty;
        const d2 = dx * dx + dy * dy;
        const minD = 70;
        if (d2 < minD * minD && d2 > 0.01) {
          const d = Math.sqrt(d2);
          const push = (minD - d) * 0.4;
          const ux = dx / d, uy = dy / d;
          a.tx -= ux * push; a.ty -= uy * push;
          b.tx += ux * push; b.ty += uy * push;
        }
      }
    }
  }
  for (const s of stations.values()) {
    s.tx = Math.max(50, Math.min(W - 50, s.tx));
    s.ty = Math.max(70, Math.min(H - 60, s.ty));
  }

  const allN = [...neighbors.values()].sort((a, b) => b.strength - a.strength);
  const STRONG_THRESHOLD = 0.40;
  const TOP_STRONG = 24;
  for (const n of allN) {
    n.disturbing = n.strength >= STRONG_THRESHOLD;
    n.visible = false;
  }
  const strong = allN.filter(n => n.disturbing).slice(0, TOP_STRONG);
  for (const n of strong) n.visible = true;
  const passive = prefs.showPassiveNeighbors ? allN.filter(n => !n.disturbing) : [];
  for (const n of passive) n.visible = true;

  const byAPstrong = new Map();
  for (const n of strong) {
    const k = n.seenBy || '__floating__';
    if (!byAPstrong.has(k)) byAPstrong.set(k, []);
    byAPstrong.get(k).push(n);
  }
  const byAPweak = new Map();
  for (const n of passive) {
    const k = n.seenBy || '__floating__';
    if (!byAPweak.has(k)) byAPweak.set(k, []);
    byAPweak.get(k).push(n);
  }
  const nowN = performance.now() * 0.001;
  for (const [mac, list] of byAPstrong) {
    const ap = apsMap.get(mac) || udm;
    list.sort((a, b) => b.strength - a.strength);
    list.forEach((n, i) => {
      const a = (i / list.length) * Math.PI * 2 + (mac.charCodeAt ? mac.charCodeAt(0) * 0.13 : 0) + nowN * 0.04;
      const r = (apsMap.size === 0 ? 280 : 220) + (1 - n.strength) * 80 + Math.sin(nowN * 0.5 + n.phase) * 10;
      n.tx = ap.x + Math.cos(a) * r;
      n.ty = ap.y + Math.sin(a) * r;
      n.tx = Math.max(40, Math.min(W - 40, n.tx));
      n.ty = Math.max(60, Math.min(H - 40, n.ty));
    });
  }
  for (const [mac, list] of byAPweak) {
    const ap = apsMap.get(mac) || udm;
    list.sort((a, b) => b.strength - a.strength);
    list.forEach((n, i) => {
      const a = (i / list.length) * Math.PI * 2 + (mac.charCodeAt ? mac.charCodeAt(0) * 0.21 : 0) + nowN * 0.02;
      const r = (apsMap.size === 0 ? 380 : 320) + (1 - n.strength) * 60 + Math.sin(nowN * 0.3 + n.phase) * 6;
      n.tx = ap.x + Math.cos(a) * r;
      n.ty = ap.y + Math.sin(a) * r;
      n.tx = Math.max(30, Math.min(W - 30, n.tx));
      n.ty = Math.max(50, Math.min(H - 30, n.ty));
    });
  }
}

function bezier(p0, p1, t, bow) {
  const dx = p1.x - p0.x, dy = p1.y - p0.y;
  const len = Math.hypot(dx, dy) || 1;
  const nx = -dy / len, ny = dx / len;
  const cx = (p0.x + p1.x) / 2 + nx * len * bow;
  const cy = (p0.y + p1.y) / 2 + ny * len * bow;
  const u = 1 - t;
  return { x: u * u * p0.x + 2 * u * t * cx + t * t * p1.x, y: u * u * p0.y + 2 * u * t * cy + t * t * p1.y };
}

function step(dt) {
  if (udm.pinned && drag && drag.ap === udm) {
    udm.x = udm.tx; udm.y = udm.ty;
  } else {
    udm.x += (udm.tx - udm.x) * (udm.pinned ? 0.18 : 0.04);
    udm.y += (udm.ty - udm.y) * (udm.pinned ? 0.18 : 0.04);
  }
  udm.glow *= 0.93;

  if (wan.pinned && drag && drag.ap === wan) {
    wan.x = wan.tx; wan.y = wan.ty;
  } else {
    wan.x += (wan.tx - wan.x) * (wan.pinned ? 0.18 : 0.04);
    wan.y += (wan.ty - wan.y) * (wan.pinned ? 0.18 : 0.04);
  }
  wan.glow *= 0.93;

  {
    const baseRate = 1;
    const trafficRate = wan.busy * 240;
    const rate = baseRate + trafficRate;
    wan.emitAcc += rate * dt;
    while (wan.emitAcc >= 1) {
      wan.emitAcc -= 1;
      const txWeight = wan.txBusy + 0.15;
      const rxWeight = wan.rxBusy + 0.15;
      const dir = Math.random() * (txWeight + rxWeight) < txWeight ? 1 : 0;
      const speed = 0.32 + Math.random() * 0.18 + wan.busy * 0.30;
      const lateral = (Math.random() - 0.5) * 8;
      const bowJ = (Math.random() - 0.5) * 0.04;
      wan.particles.push({ t: 0, speed, dir, lateral, bowJ });
    }
    for (const p of wan.particles) p.t += p.speed * dt;
    wan.particles = wan.particles.filter(p => p.t < 1.04);
    for (const p of wan.particles) {
      if (p.t > 0.96 && p.t < 1.02) {
        const target = p.dir === 1 ? wan : udm;
        target.glow = Math.min(1, (target.glow || 0) + 0.10);
      }
    }
  }

  for (const ap of apsMap.values()) {
    if (ap.pinned && drag && drag.ap === ap) {
      ap.x = ap.tx;
      ap.y = ap.ty;
    } else {
      ap.x += (ap.tx - ap.x) * (ap.pinned ? 0.18 : 0.04);
      ap.y += (ap.ty - ap.y) * (ap.pinned ? 0.18 : 0.04);
    }
    ap.glow *= 0.93;
    ap.aggBps = 0;
    ap.clientCount = 0;
  }
  for (const s of stations.values()) {
    const ap = apsMap.get(s.ap);
    if (ap) { ap.aggBps += s.bps || 0; ap.clientCount++; }
  }
  for (const ev of roamingEvents) ev.t += dt;
  for (let i = roamingEvents.length - 1; i >= 0; i--) {
    if (roamingEvents[i].t > roamingEvents[i].ttl) roamingEvents.splice(i, 1);
  }
  for (const ap of apsMap.values()) {
    ap.aggBusy = Math.min(1, Math.pow(ap.aggBps / 200000, 0.7));
    const baseRate = 0.8;
    const trafficRate = ap.aggBusy * 200;
    const rate = baseRate + trafficRate;
    ap.emitAcc += rate * dt;
    while (ap.emitAcc >= 1) {
      ap.emitAcc -= 1;
      const dir = Math.random() < 0.5 ? 0 : 1;
      const speed = 0.30 + Math.random() * 0.18 + ap.aggBusy * 0.30;
      const lateral = (Math.random() - 0.5) * 7;
      const bowJ = (Math.random() - 0.5) * 0.04;
      ap.particles.push({ t: 0, speed, dir, lateral, bowJ });
    }
    for (const p of ap.particles) p.t += p.speed * dt;
    ap.particles = ap.particles.filter(p => p.t < 1.04);
  }
  for (const n of neighbors.values()) {
    n.x += (n.tx - n.x) * 0.03;
    n.y += (n.ty - n.y) * 0.03;
    n.flicker = (n.flicker + dt * (0.6 + (1 - n.strength) * 1.5)) % 1;
  }

  for (const s of stations.values()) {
    s.x += (s.tx - s.x) * 0.04;
    s.y += (s.ty - s.y) * 0.04;
    s.glow = (s.glow || 0) * 0.93;

    const baseRate = 0.5;
    const trafficRate = s.busy * 140;
    const rate = baseRate + trafficRate;
    s.emitAcc += rate * dt;
    while (s.emitAcc >= 1) {
      s.emitAcc -= 1;
      const txWeight = s.txBusy + 0.25;
      const rxWeight = s.rxBusy + 0.25;
      const dir = Math.random() * (txWeight + rxWeight) < txWeight ? 1 : 0;
      const speed = 0.32 + Math.random() * 0.18 + s.busy * 0.25;
      const lateral = (Math.random() - 0.5) * 6;
      const bowJ = (Math.random() - 0.5) * 0.04;
      s.particles.push({ t: 0, speed, dir, lateral, bowJ });
    }
    for (const p of s.particles) p.t += p.speed * dt;
    s.particles = s.particles.filter(p => p.t < 1.04);
  }
}

function drawParticleStream(p0, p1, particles, baseBow) {
  const dx = p1.x - p0.x, dy = p1.y - p0.y;
  const len = Math.hypot(dx, dy) || 1;
  const nx = -dy / len, ny = dx / len;
  for (const p of particles) {
    const tt = p.dir === 1 ? p.t : 1 - p.t;
    const pos = bezier(p0, p1, tt, baseBow + p.bowJ);
    const sweep = Math.sin(p.t * Math.PI);
    const px = pos.x + nx * p.lateral * sweep;
    const py = pos.y + ny * p.lateral * sweep;
    const edge = p.t < 0.12 ? p.t / 0.12 : p.t > 0.88 ? (1 - p.t) / 0.12 : 1;
    const a = 0.7 * edge;
    ctx.fillStyle = `rgba(190,250,215,${a * 0.16})`;
    ctx.beginPath();
    ctx.arc(px, py, 0.85, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = `rgba(255,255,255,${a})`;
    ctx.fillRect(px - 0.25, py - 0.25, 0.5, 0.5);
  }
}

function drawHairline(ax, ay, bx, by, color, dashed = false) {
  const dx = bx - ax, dy = by - ay;
  const len = Math.hypot(dx, dy);
  if (len < 1) return;
  const bow = 0.06;
  const mx = (ax + bx) / 2 + (-dy / len) * len * bow;
  const my = (ay + by) / 2 + (dx / len) * len * bow;
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  ctx.strokeStyle = color;
  ctx.lineWidth = 0.6;
  if (dashed) ctx.setLineDash([4, 4]);
  ctx.beginPath();
  ctx.moveTo(ax, ay);
  ctx.quadraticCurveTo(mx, my, bx, by);
  ctx.stroke();
  ctx.setLineDash([]);
  ctx.restore();
}

function drawWanLine() {
  drawHairline(wan.x, wan.y, udm.x, udm.y, 'rgba(184,255,208,0.28)');
}

function drawMeshLines() {
  // Voor elke AP die wireless-meshed is, lijn van parent AP → deze AP.
  // Dashed zodat je ziet dat het een wireless mesh-hop is (i.p.v. wired).
  for (const [mac, info] of Object.entries(apChannels)) {
    const up = info.uplink;
    if (!up || up.type !== 'wireless' || !up.parentMac) continue;
    const child = apsMap.get(mac);
    const parent = apsMap.get(up.parentMac);
    if (!child || !parent) continue;
    drawHairline(parent.x, parent.y, child.x, child.y,
                 'rgba(255,200,140,0.35)', /*dashed=*/true);
  }
}

function drawStreams() {
  ctx.globalCompositeOperation = 'lighter';
  if (prefs.showWanStream) {
    drawWanLine();
  }
  drawMeshLines();
  if (prefs.showUdmStream) {
    for (const ap of apsMap.values()) {
      // Skip particles voor wireless-meshed APs — die hebben hun mesh-lijn al
      const info = apChannels[ap.mac];
      if (info && info.uplink && info.uplink.type === 'wireless') continue;
      drawParticleStream(udm, ap, ap.particles, 0.08);
      for (const p of ap.particles) {
        if (p.t > 0.96 && p.t < 1.02) {
          const target = p.dir === 1 ? ap : udm;
          target.glow = Math.min(1, (target.glow || 0) + 0.08);
        }
      }
    }
  }
  for (const s of stations.values()) {
    const ap = apsMap.get(s.ap);
    if (!ap) continue;
    drawParticleStream(ap, s, s.particles, s.profile.bow || 0.16);
    for (const p of s.particles) {
      if (p.t > 0.96 && p.t < 1.02) {
        const target = p.dir === 1 ? ap : s;
        target.glow = Math.min(1, (target.glow || 0) + 0.08);
      }
    }
  }
  ctx.globalCompositeOperation = 'source-over';
}

function drawGuides() {
  ctx.strokeStyle = 'rgba(184,255,208,0.07)';
  ctx.lineWidth = 1;
  ctx.setLineDash([2, 6]);
  for (const ap of apsMap.values()) {
    for (const r of [140, 240, 340, 440]) {
      ctx.beginPath();
      ctx.arc(ap.x, ap.y, r, 0, Math.PI * 2);
      ctx.stroke();
    }
  }
  ctx.setLineDash([]);
}

function drawNeighbors() {
  ctx.globalCompositeOperation = 'lighter';
  for (const n of neighbors.values()) {
    if (!n.visible) continue;
    const flick = 0.55 + 0.45 * Math.sin(n.flicker * Math.PI * 2);
    if (n.disturbing) {
      const a = (0.18 + n.strength * 0.5) * flick;
      const r = 10 + n.strength * 8;
      const grad = ctx.createRadialGradient(n.x, n.y, 0, n.x, n.y, r);
      grad.addColorStop(0, `rgba(255,140,90,${a * 0.55})`);
      grad.addColorStop(0.5, `rgba(220,90,80,${a * 0.22})`);
      grad.addColorStop(1, `rgba(220,90,80,0)`);
      ctx.fillStyle = grad;
      ctx.fillRect(n.x - r, n.y - r, r * 2, r * 2);
    } else {
      const a = 0.10 * flick;
      const r = 5;
      const grad = ctx.createRadialGradient(n.x, n.y, 0, n.x, n.y, r);
      grad.addColorStop(0, `rgba(180,180,200,${a * 0.5})`);
      grad.addColorStop(1, 'rgba(180,180,200,0)');
      ctx.fillStyle = grad;
      ctx.fillRect(n.x - r, n.y - r, r * 2, r * 2);
    }
  }
  ctx.globalCompositeOperation = 'source-over';
  for (const n of neighbors.values()) {
    if (!n.visible) continue;
    if (n.disturbing) {
      const ap = apsMap.get(n.seenBy);
      if (ap) {
        ctx.strokeStyle = `rgba(255,140,90,${0.07 + n.strength * 0.10})`;
        ctx.lineWidth = 0.6;
        ctx.setLineDash([2, 5]);
        ctx.beginPath();
        ctx.moveTo(ap.x, ap.y);
        ctx.lineTo(n.x, n.y);
        ctx.stroke();
        ctx.setLineDash([]);
      }
      const flick = 0.65 + 0.35 * Math.sin(n.flicker * Math.PI * 2);
      ctx.strokeStyle = `rgba(255,160,110,${(0.35 + n.strength * 0.4) * flick})`;
      ctx.lineWidth = 0.8;
      ctx.setLineDash([1.5, 2]);
      ctx.beginPath();
      ctx.arc(n.x, n.y, 3 + n.strength * 1.4, 0, Math.PI * 2);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.fillStyle = `rgba(255,200,170,${0.5 + n.strength * 0.3})`;
      ctx.font = '8px ui-monospace, "SF Mono", Menlo, monospace';
      ctx.textAlign = 'center';
      const lbl = n.ssid + (n.channel ? ' · ch' + n.channel : '');
      ctx.fillText(lbl, n.x, n.y + 11);
    } else {
      ctx.fillStyle = `rgba(170,180,200,0.45)`;
      ctx.beginPath();
      ctx.arc(n.x, n.y, 1.1, 0, Math.PI * 2);
      ctx.fill();
    }
  }
}

function drawWAN() {
  const hover = hoverAP === wan;
  const dragging = drag && drag.ap === wan;
  const accent = hover || dragging ? 1 : 0;
  const dn = wan.rxBusy, up = wan.txBusy;
  ctx.strokeStyle = `rgba(184,255,208,${0.55 + wan.glow * 0.3 + accent * 0.2})`;
  ctx.lineWidth = 1.2 + accent * 0.6;
  ctx.beginPath();
  ctx.arc(wan.x, wan.y, 9 + wan.glow * 1.5 + accent * 2, 0, Math.PI * 2);
  ctx.stroke();
  ctx.strokeStyle = `rgba(184,255,208,${0.20 + wan.glow * 0.15})`;
  ctx.setLineDash([3, 5]);
  ctx.beginPath();
  ctx.arc(wan.x, wan.y, 16, 0, Math.PI * 2);
  ctx.stroke();
  ctx.setLineDash([]);
  if (hover || dragging) {
    ctx.strokeStyle = 'rgba(255,255,255,0.4)';
    ctx.setLineDash([2, 3]);
    ctx.beginPath();
    ctx.arc(wan.x, wan.y, 24, 0, Math.PI * 2);
    ctx.stroke();
    ctx.setLineDash([]);
  }
  ctx.fillStyle = 'rgba(255,255,255,0.95)';
  ctx.beginPath();
  ctx.arc(wan.x, wan.y, 2.4, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = 'rgba(220,255,235,0.85)';
  ctx.font = '600 10px ui-monospace, "SF Mono", Menlo, monospace';
  ctx.textAlign = 'center';
  ctx.fillText(t('wan.title_prefix') + ' ' + (wan.isp || 'INTERNET').toUpperCase() + (wan.pinned ? ' ◎' : ''), wan.x, wan.y - 22);
  if (wan.ip) {
    ctx.fillStyle = 'rgba(184,255,208,0.55)';
    ctx.font = '9px ui-monospace, "SF Mono", Menlo, monospace';
    ctx.fillText(maskIp(wan.ip), wan.x, wan.y - 10);
  }
  ctx.fillStyle = 'rgba(184,255,208,0.7)';
  ctx.font = '9px ui-monospace, "SF Mono", Menlo, monospace';
  ctx.fillText(t('wan.uplink_label', { dn: (wan.rxBps * 8 / 1e6).toFixed(2), up: (wan.txBps * 8 / 1e6).toFixed(2) }), wan.x, wan.y + 22);
}

function drawUDM() {
  const hover = hoverAP === udm;
  const dragging = drag && drag.ap === udm;
  const accent = hover || dragging ? 1 : 0;
  ctx.strokeStyle = `rgba(184,255,208,${0.85 + udm.glow * 0.15})`;
  ctx.lineWidth = 1.6;
  ctx.beginPath();
  ctx.arc(udm.x, udm.y, 11 + udm.glow * 2 + accent * 2, 0, Math.PI * 2);
  ctx.stroke();
  ctx.strokeStyle = `rgba(184,255,208,${0.35 + udm.glow * 0.25})`;
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.arc(udm.x, udm.y, 18 + udm.glow * 3, 0, Math.PI * 2);
  ctx.stroke();
  if (hover || dragging) {
    ctx.strokeStyle = 'rgba(255,255,255,0.4)';
    ctx.setLineDash([2, 3]);
    ctx.beginPath();
    ctx.arc(udm.x, udm.y, 26, 0, Math.PI * 2);
    ctx.stroke();
    ctx.setLineDash([]);
  }
  ctx.fillStyle = 'rgba(255,255,255,0.95)';
  ctx.beginPath();
  ctx.arc(udm.x, udm.y, 2.6, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = 'rgba(220,255,235,0.85)';
  ctx.font = '600 10px ui-monospace, "SF Mono", Menlo, monospace';
  ctx.textAlign = 'center';
  ctx.fillText(t('udm.title') + (udm.pinned ? ' ◎' : ''), udm.x, udm.y - 24);
}

function drawRoaming() {
  ctx.globalCompositeOperation = 'lighter';
  for (const ev of roamingEvents) {
    const from = apsMap.get(ev.fromMac);
    const to = apsMap.get(ev.toMac);
    if (!from || !to) continue;
    const u = ev.t / ev.ttl;
    const alphaFade = 1 - u;
    const head = Math.min(1, u * 1.4);
    const dx = to.x - from.x, dy = to.y - from.y;
    const len = Math.hypot(dx, dy) || 1;
    const nx = -dy / len, ny = dx / len;
    const cx = (from.x + to.x) / 2 + nx * len * 0.18;
    const cy = (from.y + to.y) / 2 + ny * len * 0.18;
    const grad = ctx.createLinearGradient(from.x, from.y, to.x, to.y);
    grad.addColorStop(0, `rgba(120,200,255,${0.05 * alphaFade})`);
    grad.addColorStop(head, `rgba(180,235,255,${0.85 * alphaFade})`);
    grad.addColorStop(Math.min(1, head + 0.04), `rgba(255,255,255,${0.95 * alphaFade})`);
    grad.addColorStop(Math.min(1, head + 0.18), `rgba(120,200,255,${0.0})`);
    grad.addColorStop(1, 'rgba(120,200,255,0)');
    ctx.strokeStyle = grad;
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    const steps = 20;
    for (let i = 0; i <= steps; i++) {
      const t = i / steps;
      const ux = 1 - t;
      const px = ux * ux * from.x + 2 * ux * t * cx + t * t * to.x;
      const py = ux * ux * from.y + 2 * ux * t * cy + t * t * to.y;
      if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
    }
    ctx.stroke();
  }
  ctx.globalCompositeOperation = 'source-over';
}

function drawAPs() {
  for (const ap of apsMap.values()) {
    const hover = hoverAP === ap;
    const dragging = drag && drag.ap === ap;
    const accent = hover || dragging ? 1 : 0;
    ctx.strokeStyle = `rgba(184,255,208,${0.55 + ap.glow * 0.35 + accent * 0.4})`;
    ctx.lineWidth = 1 + accent * 0.8;
    ctx.beginPath();
    ctx.arc(ap.x, ap.y, 5 + ap.glow * 1.2 + accent * 2, 0, Math.PI * 2);
    ctx.stroke();
    if (hover || dragging) {
      ctx.strokeStyle = 'rgba(255,255,255,0.35)';
      ctx.setLineDash([2, 3]);
      ctx.beginPath();
      ctx.arc(ap.x, ap.y, 14, 0, Math.PI * 2);
      ctx.stroke();
      ctx.setLineDash([]);
    }
    ctx.fillStyle = 'rgba(255,255,255,0.85)';
    ctx.beginPath();
    ctx.arc(ap.x, ap.y, 1.6, 0, Math.PI * 2);
    ctx.fill();
    const named = apChannels[ap.mac] && apChannels[ap.mac].name ? apChannels[ap.mac].name : ('AP·' + ap.label.toUpperCase());
    ctx.fillStyle = 'rgba(220,255,235,0.85)';
    ctx.font = '600 10px ui-monospace, "SF Mono", Menlo, monospace';
    ctx.textAlign = 'center';
    ctx.fillText(named.toUpperCase() + (ap.pinned ? ' ◎' : ''), ap.x, ap.y - 14);

    if (prefs.showApLoad) {
      const kbps = ((ap.aggBps || 0) * 8 / 1000);
      const kbpsTxt = kbps >= 1000 ? (kbps / 1000).toFixed(2) + ' mb/s' : kbps.toFixed(0) + ' kb/s';
      ctx.fillStyle = 'rgba(184,255,208,0.7)';
      ctx.font = '500 9px ui-monospace, "SF Mono", Menlo, monospace';
      ctx.fillText(`${ap.clientCount || 0}× · ${kbpsTxt}`, ap.x, ap.y + 16);
    }
  }
}

function drawStations() {
  const dim = !!SEARCH_QUERY;
  for (const s of stations.values()) {
    const matches = !dim || s.searchMatch;
    const a = matches ? 1 : 0.18;
    const g = s.glow || 0;
    // Anomaly-flash: rood-oranje halo
    if (s.anomalyFlash > 0) {
      ctx.strokeStyle = `rgba(255,140,90,${s.anomalyFlash})`;
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(s.x, s.y, 9 + (1 - s.anomalyFlash) * 12, 0, Math.PI * 2);
      ctx.stroke();
    }
    // Subrouter (Google/Eero/Deco-achtig device als WiFi-client) krijgt
    // duidelijk paarse marker zodat 't opvalt — zelfde rendering als eigen AP-stijl
    if (s.subrouter) {
      // Glow halo
      ctx.fillStyle = `rgba(180,140,255,${0.30 * a})`;
      ctx.beginPath();
      ctx.arc(s.x, s.y, 9, 0, Math.PI * 2);
      ctx.fill();
      // Solid core
      ctx.fillStyle = `rgba(180,140,255,${0.95 * a})`;
      ctx.beginPath();
      ctx.arc(s.x, s.y, 4, 0, Math.PI * 2);
      ctx.fill();
      // Ring rondom (signature: ≠ gewone client)
      ctx.strokeStyle = `rgba(220,200,255,${0.95 * a})`;
      ctx.lineWidth = 1.4;
      ctx.beginPath();
      ctx.arc(s.x, s.y, 7, 0, Math.PI * 2);
      ctx.stroke();
      // Label er altijd onder zodat je weet wélke subrouter
      if (prefs.showLabels !== false) {
        ctx.fillStyle = `rgba(220,200,255,${0.9 * a})`;
        ctx.font = '600 10px ui-monospace, "SF Mono", Menlo, monospace';
        ctx.textAlign = 'center';
        ctx.fillText(s.name || s.id.slice(-5), s.x, s.y + 18);
      }
      continue; // geen normale band-rendering eroverheen
    }
    // Band-kleur voor reguliere clients
    const bc = BAND_COLOR[s.bandKey] || BAND_COLOR['5'];
    const alpha = (0.55 + s.strength * 0.3 + g * 0.2) * a;
    if (s.strength > 0.4 && matches) {
      ctx.fillStyle = bc.glow.replace(/[\d.]+\)$/, (alpha * 0.35) + ')');
      ctx.beginPath();
      ctx.arc(s.x, s.y, 3.5 + s.strength * 1.5, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.fillStyle = bc.core.replace(/1\)$/, alpha + ')');
    ctx.beginPath();
    ctx.arc(s.x, s.y, (1.2 + s.strength * 0.8) * (matches ? (dim ? 1.4 : 1) : 1), 0, Math.PI * 2);
    ctx.fill();
    if (matches && dim) {
      // hightlight ring rond match
      ctx.strokeStyle = 'rgba(184,255,208,0.75)';
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.arc(s.x, s.y, 7, 0, Math.PI * 2);
      ctx.stroke();
    }
    if (prefs.showLabels && (s.strength > 0.6 || s.busy > 0.15 || (dim && matches))) {
      ctx.fillStyle = `rgba(210,250,225,${(0.45 + s.strength * 0.3) * a + (matches && dim ? 0.4 : 0)})`;
      ctx.font = '9px ui-monospace, "SF Mono", Menlo, monospace';
      ctx.textAlign = 'center';
      ctx.fillText((s.name || '').slice(0, 16).toLowerCase(), s.x, s.y + 12);
    }
  }
}

let last = performance.now();
function frame(now) {
  try {
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    ctx.fillStyle = 'rgba(2,8,6,0.32)';
    ctx.fillRect(0, 0, W, H);
    layout();
    step(dt);
    if (prefs.showGuides) drawGuides();
    if (prefs.showNeighbors) drawNeighbors();
    if (prefs.showStreams) drawStreams();
    if (prefs.showWanStream) drawWAN();
    drawUDM();
    drawAPs();
    drawStations();
    if (prefs.showRoaming) drawRoaming();
  } catch (e) { console.error('frame:', e); }
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);

function fmtKbps(bytesPerSec) {
  const kbps = (bytesPerSec * 8) / 1000;
  if (kbps >= 1000) return (kbps / 1000).toFixed(2) + ' <span class="u">mb/s</span>';
  return kbps.toFixed(1) + ' <span class="u">kb/s</span>';
}
function fmtUptime(ms) {
  const s = Math.floor(ms / 1000);
  const hh = String(Math.floor(s / 3600)).padStart(2, '0');
  const mm = String(Math.floor((s % 3600) / 60)).padStart(2, '0');
  const ss = String(s % 60).padStart(2, '0');
  return `${hh}:${mm}:${ss}`;
}

let lastDevices = [];

function refreshUISafe() { try { refreshUI(); } catch (e) { console.error('refreshUI:', e); } }
function refreshUI() {
  let totalBps = 0, particleCount = 0;
  for (const s of stations.values()) particleCount += s.particles.length;
  for (const d of lastDevices) totalBps += (d.txBytes || 0) + (d.rxBytes || 0);
  ui.tput.innerHTML = fmtKbps(totalBps);
  ui.stas.textContent = stations.size;
  ui.aps.textContent = apsMap.size;
  ui.uptime.textContent = fmtUptime(Date.now() - sessionStart);
  ui.wanRx.innerHTML = fmtKbps(wan.rxBps || 0);
  ui.wanTx.innerHTML = fmtKbps(wan.txBps || 0);
  ui.isp.textContent = (wan.isp || '—') + (wan.ip ? ' · ' + maskIp(wan.ip) : '');
  if (ui.latency) {
    ui.latencyWrap.style.display = prefs.showLatency ? '' : 'none';
    if (wan.latency != null) {
      const drops = wan.drops != null ? ` · ${wan.drops} drops` : '';
      ui.latency.textContent = `${wan.latency} ms${drops}`;
    } else {
      ui.latency.textContent = '— ms';
    }
  }

  const top = [...lastDevices]
    .map(d => ({ d, bps: (d.txBytes || 0) + (d.rxBytes || 0) }))
    .sort((a, b) => b.bps - a.bps)
    .slice(0, 8);
  if (ui.topHead) {
    const showOs = prefs.showDeviceInfo;
    const headHtml = `<th>${t('top.station')}</th>${showOs ? `<th>${t('top.os')}</th>` : ''}<th>${t('top.band')}</th><th class="r">${t('top.rssi')}</th><th class="r">${t('top.kbps')}</th>`;
    if (ui.topHead.innerHTML !== headHtml) ui.topHead.innerHTML = headHtml;
  }
  ui.topBody.innerHTML = top.map(({ d, bps }) => {
    const kbps = ((bps * 8) / 1000).toFixed(1);
    const band = (d.band || '').toString().toUpperCase().slice(0, 5);
    const osCell = prefs.showDeviceInfo
      ? `<td>${(d.os || d.family || d.oui || '—').toString().slice(0, 12)}</td>`
      : '';
    return `<tr><td class="name">${(d.name || '—').slice(0, 22)}</td>${osCell}<td>${band}</td><td class="r">${d.rssi}</td><td class="r kbps">${kbps}</td></tr>`;
  }).join('');
}
setInterval(refreshUISafe, 500);

const stripGrid = document.getElementById('strip-grid');
const stripMeta = document.getElementById('strip-meta');
const TWO_FOUR = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13];
const FIVE = [36, 40, 44, 48, 52, 56, 60, 64, 100, 104, 108, 112, 116, 120, 124, 128, 132, 136, 140, 144, 149, 153, 157, 161, 165];

const spec24 = document.getElementById('spec24');
const spec5 = document.getElementById('spec5');
const spec6 = document.getElementById('spec6');
const ctx24 = spec24 ? spec24.getContext('2d') : null;
const ctx5 = spec5 ? spec5.getContext('2d') : null;
const ctx6 = spec6 ? spec6.getContext('2d') : null;
// 6 GHz kanaal-set (20 MHz), kanaal-nr × 5 + 5950 = freq MHz; we tonen primary 20 MHz channels
const SIX = [1,5,9,13,17,21,25,29,33,37,41,45,49,53,57,61,65,69,73,77,81,85,89,93,97,101,105,109,113,117,121,125,129,133,137,141,145,149,153,157,161,165,169,173,177,181,185,189,193,197,201,205,209,213,217,221,225,229,233];
const spec6Hits = [];

// Stelt een canvas in voor scherpe rendering op Retina/HiDPI displays.
// Buffer = CSS-grootte × devicePixelRatio. Tekenfuncties gebruiken CSS-pixels
// (canvas.clientWidth/clientHeight) zodat geen extra schaling nodig is.
function setupHiDpiCanvas(canvas) {
  if (!canvas) return false;
  const rect = canvas.getBoundingClientRect();
  if (!rect.width || !rect.height) return false;
  const dpr = Math.max(1, window.devicePixelRatio || 1);
  const wantW = Math.round(rect.width * dpr);
  const wantH = Math.round(rect.height * dpr);
  if (canvas.width !== wantW || canvas.height !== wantH) {
    canvas.width = wantW;
    canvas.height = wantH;
  }
  const ctx = canvas.getContext('2d');
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  return true;
}
function setupAllStatsCanvases() {
  try { setupHiDpiCanvas(spec24); } catch {}
  try { setupHiDpiCanvas(spec5); } catch {}
  try { setupHiDpiCanvas(spec6); } catch {}
  document.querySelectorAll('canvas[data-hidpi]').forEach(c => { try { setupHiDpiCanvas(c); } catch {} });
}
const FIVE_CHANNELS = [36, 40, 44, 48, 52, 56, 60, 64, 100, 104, 108, 112, 116, 120, 124, 128, 132, 136, 140, 144, 149, 153, 157, 161, 165];
const spec24Hits = [];
const spec5Hits = [];

function dbmFromRssi(rssi) {
  if (rssi == null) return -90;
  if (rssi < 0) return Math.max(-95, Math.min(-25, rssi));
  return Math.max(-95, Math.min(-25, -90 + Math.min(70, rssi)));
}
function specY(dbm, h, padTop, padBot) {
  const t = (-25 - dbm) / 70;
  return padTop + t * (h - padTop - padBot);
}
function spec24X(ch, w, padL, padR) {
  return padL + ((ch + 1) / 16) * (w - padL - padR);
}
function spec5X(ch, w, padL, padR) {
  const idx = FIVE_CHANNELS.indexOf(ch);
  if (idx < 0) return -100;
  return padL + (idx / (FIVE_CHANNELS.length - 1)) * (w - padL - padR);
}
function spec6X(ch, w, padL, padR) {
  // Lineair tussen kanaal 1 en 233 — robuust ook als ch geen "primary"-kanaal is
  if (ch < 1 || ch > 233) return -100;
  return padL + ((ch - 1) / 232) * (w - padL - padR);
}

function setupSpectrumHover(canvas, hits) {
  if (!canvas) return;
  canvas.addEventListener('mousemove', ev => {
    const r = canvas.getBoundingClientRect();
    const mx = (ev.clientX - r.left) * (canvas.width / r.width);
    const my = (ev.clientY - r.top) * (canvas.height / r.height);
    let best = null, bestD = Infinity;
    for (const h of hits) {
      const dx = mx - h.x, dy = my - h.y;
      const d = Math.hypot(dx, dy);
      const tol = h.r ? h.r + 4 : 18;
      if (d < tol && d < bestD) { bestD = d; best = h; }
    }
    if (best) {
      const it = best.item;
      if (it.kind === 'own') {
        const ap = [...apsMap.values()].find(a => a.mac === it.mac);
        if (ap) canvasTip.innerHTML = renderApTip(ap);
        else canvasTip.innerHTML = `<strong>${it.label}</strong><div class="row"><span class="lab">kanaal</span><span class="v ok">${it.ch}</span></div>`;
      } else if (it.n) {
        canvasTip.innerHTML = renderNeighborTip(it.n);
      }
      canvasTip.classList.add('show');
      updateTipPosition(ev.clientX, ev.clientY);
    } else {
      canvasTip.classList.remove('show');
    }
  });
  canvas.addEventListener('mouseleave', () => canvasTip.classList.remove('show'));
}
setupSpectrumHover(spec24, spec24Hits);
setupSpectrumHover(spec5, spec5Hits);
setupSpectrumHover(spec6, spec6Hits);

function animateChannelOscillators() {
  if (true) { requestAnimationFrame(animateChannelOscillators); return; }
  if (!prefs.showChannels) {
    requestAnimationFrame(animateChannelOscillators);
    return;
  }
  const t = performance.now() * 0.001;
  for (const cell of stripGrid.querySelectorAll('.ch')) {
    const cv = cell.querySelector('canvas.bar-osc');
    if (!cv) continue;
    const ch = +cell.dataset.ch;
    const bar = cell.querySelector('.bar');
    const heightPct = parseFloat(bar.style.height) || 0;
    const c = cv.getContext('2d');
    const w = cv.width, h = cv.height;
    c.clearRect(0, 0, w, h);

    const intensity = Math.min(1, heightPct / 100);
    const baseY = Math.max(10, h - (heightPct / 100) * h - 4);
    const amp = 4 + intensity * 9;
    const isClash = cell.classList.contains('clash');
    const isOwn = cell.classList.contains('own');

    let baseHue, sat, light;
    if (isClash)       { baseHue = 0;   sat = 95; light = 70; }
    else if (isOwn)    { baseHue = 145; sat = 85; light = 72; }
    else if (intensity > 0.05) { baseHue = 30;  sat = 95; light = 70; }
    else               { baseHue = 200; sat = 60; light = 65; }

    c.globalCompositeOperation = 'lighter';
    for (let layer = 0; layer < 3; layer++) {
      const speed = 1.6 + layer * 0.7 + intensity * 1.6;
      const freq = 0.40 + layer * 0.22 + ch * 0.010;
      const phase = t * speed + ch * 0.35 + layer * 1.4;
      const layerAlpha = (0.95 - layer * 0.25) * (0.55 + intensity * 0.45);
      const layerWidth = 1.6 - layer * 0.45;
      c.lineWidth = Math.max(0.7, layerWidth);
      c.strokeStyle = `hsla(${baseHue + layer * 6}, ${sat}%, ${light + layer * 4}%, ${layerAlpha})`;
      c.shadowColor = `hsla(${baseHue}, ${sat}%, 75%, ${0.6 + intensity * 0.3})`;
      c.shadowBlur = 4 + intensity * 6;
      c.beginPath();
      for (let x = 0; x <= w; x += 1) {
        const y = baseY
          + Math.sin(x * freq + phase) * amp * (1 - layer * 0.22)
          + Math.sin(x * freq * 2.4 + phase * 1.7) * amp * 0.45 * (1 - layer * 0.28)
          + Math.sin(x * freq * 0.6 - phase * 0.5) * amp * 0.25;
        if (x === 0) c.moveTo(x, y); else c.lineTo(x, y);
      }
      c.stroke();
    }
    c.shadowBlur = 0;
    c.globalCompositeOperation = 'source-over';
  }
  requestAnimationFrame(animateChannelOscillators);
}
requestAnimationFrame(animateChannelOscillators);

function drawSpec24() {
  if (!ctx24) return;
  setupHiDpiCanvas(spec24);
  const c = ctx24, w = spec24.clientWidth, h = spec24.clientHeight;
  if (!w || !h) return;
  const padL = 32, padR = 12, padT = 10, padB = 18;
  const tNow = performance.now() * 0.001;
  c.clearRect(0, 0, w, h);

  c.strokeStyle = 'rgba(184,255,208,0.06)';
  c.lineWidth = 1;
  for (const dbm of [-30, -45, -60, -75, -90]) {
    const y = specY(dbm, h, padT, padB);
    c.beginPath(); c.moveTo(padL, y); c.lineTo(w - padR, y); c.stroke();
    c.fillStyle = 'rgba(160,200,180,0.55)';
    c.font = '8px ui-monospace, monospace';
    c.textAlign = 'right';
    c.fillText(dbm, padL - 4, y + 3);
  }
  c.fillStyle = 'rgba(160,200,180,0.45)';
  c.textAlign = 'right';
  c.fillText('dBm', padL - 4, padT + 8);

  for (let ch = 1; ch <= 13; ch++) {
    const x = spec24X(ch, w, padL, padR);
    c.strokeStyle = ch === 1 || ch === 6 || ch === 11 ? 'rgba(184,255,208,0.16)' : 'rgba(184,255,208,0.06)';
    c.beginPath(); c.moveTo(x, padT); c.lineTo(x, h - padB); c.stroke();
    c.fillStyle = ch === 1 || ch === 6 || ch === 11 ? 'rgba(184,255,208,0.85)' : 'rgba(220,240,230,0.55)';
    c.font = (ch === 1 || ch === 6 || ch === 11 ? '600 ' : '') + '9px ui-monospace, monospace';
    c.textAlign = 'center';
    c.fillText(ch, x, h - 5);
  }

  spec24Hits.length = 0;
  const bells = [];
  for (const n of neighbors.values()) {
    if (n.band !== 'ng' || !n.channel) continue;
    if (!n.disturbing) { /* passive: altijd in spectrum */ }
    bells.push({ ch: n.channel, dbm: dbmFromRssi(n.rssi), label: n.ssid, kind: n.disturbing ? 'disturbing' : 'passive', n });
  }
  for (const [mac, info] of Object.entries(apChannels)) {
    for (const r of info.channels || []) {
      if (r.band !== 'ng') continue;
      bells.push({ ch: r.channel, dbm: -32, label: info.name, kind: 'own', radio: r, mac });
    }
  }
  const order = { passive: 0, disturbing: 1, own: 2 };
  bells.sort((a, b) => order[a.kind] - order[b.kind]);

  // Geef elk label binnen hetzelfde kanaal een unieke stack-index
  // zodat labels niet overlappen. Eigen AP's krijgen index 0 (dichtst bij top).
  const stackByCh = new Map();
  // Bouw eerst per kanaal in display-volgorde: own → disturbing → passive
  const orderedForLabels = [...bells].sort((a, b) => order[b.kind] - order[a.kind]); // own first
  for (const b of orderedForLabels) {
    const key = b.ch;
    const idx = stackByCh.get(key) || 0;
    b.stackIdx = idx;
    stackByCh.set(key, idx + 1);
  }

  const baseY = h - padB;
  const hwMhz = 11;
  const pxPerCh = (w - padL - padR) / 16;
  const halfPx = (hwMhz / 5) * pxPerCh;

  for (const b of bells) {
    const cx = spec24X(b.ch, w, padL, padR);
    let breath = 0;
    if (b.kind === 'own' && b.radio && b.radio.cu_total != null) {
      const cu = b.radio.cu_total / 100;
      breath = Math.sin(tNow * 1.4 + b.ch * 0.3) * cu * 6;
    } else if (b.kind === 'disturbing' && b.n) {
      breath = Math.sin(tNow * 0.9 + b.ch * 0.5) * b.n.strength * 3;
    }
    const cy = specY(b.dbm, h, padT, padB) - breath;
    let strokeC, fillC, lw, labelC, glowC;
    if (b.kind === 'own') {
      strokeC = 'rgba(184,255,208,0.95)'; fillC = 'rgba(140,230,180,0.20)'; lw = 1.8;
      labelC = 'rgba(220,255,235,1)'; glowC = 'rgba(184,255,208,0.7)';
    } else if (b.kind === 'disturbing') {
      strokeC = 'rgba(255,160,110,0.85)'; fillC = 'rgba(255,140,90,0.10)'; lw = 1.0;
      labelC = 'rgba(255,200,170,0.85)'; glowC = 'rgba(255,160,110,0.5)';
    } else {
      strokeC = 'rgba(170,180,200,0.5)'; fillC = 'rgba(170,180,200,0.05)'; lw = 0.7;
      labelC = 'rgba(180,190,210,0.6)'; glowC = 'rgba(170,180,200,0)';
    }
    c.fillStyle = fillC;
    c.strokeStyle = strokeC;
    c.lineWidth = lw;
    if (b.kind !== 'passive') {
      c.shadowColor = glowC;
      c.shadowBlur = b.kind === 'own' ? 14 : 8;
    }
    c.beginPath();
    c.moveTo(cx - halfPx, baseY);
    const steps = 48;
    for (let i = 0; i <= steps; i++) {
      const tt = -1 + (2 * i) / steps;
      const factor = Math.cos(tt * Math.PI / 2) ** 2;
      const wobble = b.kind === 'own'
        ? Math.sin(tt * Math.PI * 3 + tNow * 2 + b.ch * 0.4) * 1.5 * factor
        : 0;
      const x = cx + tt * halfPx;
      const y = baseY - (baseY - cy) * factor + wobble;
      c.lineTo(x, y);
    }
    c.lineTo(cx + halfPx, baseY);
    c.closePath();
    c.fill();
    c.stroke();
    c.shadowBlur = 0;

    if (b.kind === 'own') {
      const sparkle = (Math.sin(tNow * 4 + b.ch * 1.7) + 1) * 0.5;
      c.fillStyle = `rgba(255,255,255,${0.55 + sparkle * 0.35})`;
      c.beginPath();
      c.arc(cx, cy, 2.2 + sparkle * 1.4, 0, Math.PI * 2);
      c.fill();
    }

    if (b.kind !== 'passive') {
      c.fillStyle = labelC;
      c.font = (b.kind === 'own' ? '600 ' : '') + '9px ui-monospace, monospace';
      c.textAlign = 'center';
      const label = (b.label || '').slice(0, 14);
      // Stack: own boven (kleinste idx → dichtst bij top), volgende eronder
      const stackOffset = (b.stackIdx || 0) * 12;
      const labelY = Math.max(padT + 9, cy - 4 - stackOffset);
      c.fillText(label, cx, labelY);
    }
    spec24Hits.push({ x: cx, y: cy, halfPx, baseY, item: b });
  }
}

function drawSpec5() {
  if (!ctx5) return;
  setupHiDpiCanvas(spec5);
  const c = ctx5, w = spec5.clientWidth, h = spec5.clientHeight;
  if (!w || !h) return;
  const padL = 32, padR = 12, padT = 10, padB = 18;
  c.clearRect(0, 0, w, h);

  const xDfsStart = spec5X(52, w, padL, padR);
  const xDfsEnd = spec5X(144, w, padL, padR);
  c.fillStyle = 'rgba(255,200,100,0.05)';
  c.fillRect(xDfsStart, padT, xDfsEnd - xDfsStart, h - padT - padB);
  c.fillStyle = 'rgba(255,200,100,0.4)';
  c.font = '8px ui-monospace, monospace';
  c.textAlign = 'left';
  c.fillText('DFS', xDfsStart + 4, padT + 9);

  c.strokeStyle = 'rgba(184,255,208,0.06)';
  for (const dbm of [-30, -45, -60, -75, -90]) {
    const y = specY(dbm, h, padT, padB);
    c.beginPath(); c.moveTo(padL, y); c.lineTo(w - padR, y); c.stroke();
    c.fillStyle = 'rgba(160,200,180,0.55)';
    c.font = '8px ui-monospace, monospace';
    c.textAlign = 'right';
    c.fillText(dbm, padL - 4, y + 3);
  }

  c.font = '9px ui-monospace, monospace';
  c.textAlign = 'center';
  for (let i = 0; i < FIVE_CHANNELS.length; i++) {
    const ch = FIVE_CHANNELS[i];
    const x = spec5X(ch, w, padL, padR);
    c.strokeStyle = 'rgba(184,255,208,0.04)';
    c.beginPath(); c.moveTo(x, padT); c.lineTo(x, h - padB); c.stroke();
    if (i % 2 === 0) {
      c.fillStyle = 'rgba(220,240,230,0.55)';
      c.fillText(ch, x, h - 5);
    }
  }

  spec5Hits.length = 0;
  // Verzamel alles + stack-index per kanaal (own first, dan disturbing).
  const items = [];
  for (const [mac, info] of Object.entries(apChannels)) {
    for (const r of info.channels || []) {
      if (r.band !== 'na') continue;
      items.push({ ch: r.channel, kind: 'own', label: info.name, radio: r, mac });
    }
  }
  for (const n of neighbors.values()) {
    if (n.band !== 'na' || !n.channel) continue;
    items.push({ ch: n.channel, kind: n.disturbing ? 'disturbing' : 'passive',
                 label: n.ssid, dbm: dbmFromRssi(n.rssi), n });
  }
  const ord5 = { own: 0, disturbing: 1, passive: 2 };
  items.sort((a, b) => ord5[a.kind] - ord5[b.kind] || a.ch - b.ch);
  const stack5 = new Map();
  for (const it of items) {
    const idx = stack5.get(it.ch) || 0;
    it.stackIdx = idx;
    stack5.set(it.ch, idx + 1);
  }

  for (const it of items) {
    const x = spec5X(it.ch, w, padL, padR);
    if (x < 0) continue;
    if (it.kind === 'own') {
      c.strokeStyle = 'rgba(184,255,208,0.35)';
      c.lineWidth = 1.2;
      c.beginPath(); c.moveTo(x, padT); c.lineTo(x, h - padB); c.stroke();
      const y = specY(-32, h, padT, padB);
      c.shadowColor = 'rgba(184,255,208,0.8)';
      c.shadowBlur = 8;
      c.fillStyle = 'rgba(220,255,235,1)';
      c.beginPath(); c.arc(x, y, 5.5, 0, Math.PI * 2); c.fill();
      c.shadowBlur = 0;
      c.fillStyle = 'rgba(220,255,235,1)';
      c.font = '600 9px ui-monospace, monospace';
      c.textAlign = 'center';
      const labelY = Math.max(padT + 9, y - 8 - it.stackIdx * 12);
      c.fillText((it.label || '').slice(0, 14), x, labelY);
      spec5Hits.push({ x, y, r: 9, item: it });
    } else if (it.kind === 'disturbing') {
      const y = specY(it.dbm, h, padT, padB);
      c.fillStyle = 'rgba(255,160,110,0.9)';
      c.beginPath(); c.arc(x, y, 4, 0, Math.PI * 2); c.fill();
      c.fillStyle = 'rgba(255,200,170,0.8)';
      c.font = '8px ui-monospace, monospace';
      c.textAlign = 'left';
      // Wissel afwisselend links/rechts om overlap te voorkomen
      const side = it.stackIdx % 2 === 0 ? 1 : -1;
      const offX = side * 6;
      c.textAlign = side === 1 ? 'left' : 'right';
      c.fillText((it.label || '').slice(0, 10), x + offX, y + 3);
      spec5Hits.push({ x, y, r: 6, item: it });
    } else {
      const y = specY(it.dbm, h, padT, padB);
      c.fillStyle = 'rgba(170,180,200,0.5)';
      c.beginPath(); c.arc(x, y, 1.8, 0, Math.PI * 2); c.fill();
      spec5Hits.push({ x, y, r: 6, item: it });
    }
  }
}

function drawSpec6() {
  if (!ctx6) return;
  setupHiDpiCanvas(spec6);
  const c = ctx6, w = spec6.clientWidth, h = spec6.clientHeight;
  if (!w || !h) return;
  const padL = 32, padR = 12, padT = 10, padB = 18;
  c.clearRect(0, 0, w, h);

  // PSC (Preferred Scanning Channels) op 5, 21, 37, 53, 69, 85, 101, 117, 133, 149, 165, 181, 197, 213, 229
  const PSC = [5,21,37,53,69,85,101,117,133,149,165,181,197,213,229];
  c.fillStyle = 'rgba(140,220,180,0.04)';
  for (const psc of PSC) {
    const x = spec6X(psc, w, padL, padR);
    c.fillRect(x - 4, padT, 8, h - padT - padB);
  }

  // dBm-grid + labels
  c.strokeStyle = 'rgba(184,255,208,0.06)';
  for (const dbm of [-30, -45, -60, -75, -90]) {
    const y = specY(dbm, h, padT, padB);
    c.beginPath(); c.moveTo(padL, y); c.lineTo(w - padR, y); c.stroke();
    c.fillStyle = 'rgba(160,200,180,0.55)';
    c.font = '8px ui-monospace, monospace';
    c.textAlign = 'right';
    c.fillText(dbm, padL - 4, y + 3);
  }

  // X-as: kanaalnummers (alleen even labels om geen overlap)
  c.font = '9px ui-monospace, monospace';
  c.textAlign = 'center';
  c.fillStyle = 'rgba(220,240,230,0.55)';
  const labels = [1, 33, 65, 97, 129, 161, 193, 225];
  for (const ch of labels) {
    const x = spec6X(ch, w, padL, padR);
    c.fillText(ch, x, h - 5);
  }
  // PSC-label
  c.fillStyle = 'rgba(140,220,180,0.4)';
  c.font = '8px ui-monospace, monospace';
  c.textAlign = 'left';
  c.fillText('PSC', padL + 4, padT + 9);

  spec6Hits.length = 0;
  let plotted = 0;
  // Eigen APs op 6 GHz (band 6e of 6g)
  for (const [mac, info] of Object.entries(apChannels)) {
    for (const r of info.channels || []) {
      if (r.band !== '6e' && r.band !== '6g' && r.band !== 'ng') continue;
      const x = spec6X(r.channel, w, padL, padR);
      if (x < 0) continue;
      c.strokeStyle = 'rgba(140,220,180,0.45)';
      c.lineWidth = 1.2;
      c.beginPath(); c.moveTo(x, padT); c.lineTo(x, h - padB); c.stroke();
      const y = specY(-32, h, padT, padB);
      c.shadowColor = 'rgba(140,220,180,0.8)';
      c.shadowBlur = 8;
      c.fillStyle = 'rgba(200,240,220,1)';
      c.beginPath(); c.arc(x, y, 5.5, 0, Math.PI * 2); c.fill();
      c.shadowBlur = 0;
      c.fillStyle = 'rgba(200,240,220,1)';
      c.font = '600 9px ui-monospace, monospace';
      c.textAlign = 'center';
      c.fillText(info.name.slice(0, 14), x, y - 8);
      spec6Hits.push({ x, y, r: 9, item: { ch: r.channel, kind: 'own', label: info.name, radio: r, mac } });
      plotted++;
    }
  }
  // Externe 6 GHz APs
  for (const n of neighbors.values()) {
    if (n.band !== '6e' && n.band !== '6g') continue;
    if (!n.channel) continue;
    if (!n.disturbing) { /* passive: altijd in spectrum */ }
    const x = spec6X(n.channel, w, padL, padR);
    if (x < 0) continue;
    const y = specY(dbmFromRssi(n.rssi), h, padT, padB);
    if (n.disturbing) {
      c.fillStyle = 'rgba(255,160,110,0.85)';
      c.beginPath(); c.arc(x, y, 4, 0, Math.PI * 2); c.fill();
    } else {
      c.fillStyle = 'rgba(170,180,200,0.5)';
      c.beginPath(); c.arc(x, y, 1.8, 0, Math.PI * 2); c.fill();
    }
    spec6Hits.push({ x, y, r: 6, item: { ch: n.channel, kind: n.disturbing ? 'disturbing' : 'passive', label: n.ssid, n } });
    plotted++;
  }
  // Geen 6 GHz signalen → toon hint
  if (!plotted) {
    c.fillStyle = 'rgba(160,200,180,0.4)';
    c.font = 'italic 11px ui-monospace, monospace';
    c.textAlign = 'center';
    c.fillText((prefs.lang === 'en' ? 'no 6 GHz signals detected' : 'geen 6 GHz signalen gedetecteerd'), w / 2, h / 2);
  }
}

function refreshChannels() {
  try {
  if (!prefs.showChannels) return;
  drawSpec24();
  drawSpec5();
  drawSpec6();

  const agg = new Map();
  for (const n of neighbors.values()) {
    if (!n.channel) continue;
    const v = agg.get(n.channel) || { count: 0, str: 0, strong: 0 };
    v.count++; v.str += n.strength;
    if (n.strength >= 0.5) v.strong++;
    agg.set(n.channel, v);
  }

  const ownChannels = new Map();
  for (const [mac, info] of Object.entries(apChannels)) {
    for (const c of info.channels || []) {
      if (!ownChannels.has(c.channel)) ownChannels.set(c.channel, []);
      ownChannels.get(c.channel).push({ name: info.name, ...c });
    }
  }

  if (false) {
  let max = 0;
  for (const v of agg.values()) max = Math.max(max, v.str);
  if (max < 0.6) max = 0.6;

  for (const cell of stripGrid.querySelectorAll('.ch')) {
    const ch = +cell.dataset.ch;
    const v = agg.get(ch);
    const own = ownChannels.get(ch);
    const bar = cell.querySelector('.bar');
    const airbar = cell.querySelector('.airbar');
    const cnt = cell.querySelector('.count');
    const tip = cell.querySelector('.ch-tip');

    if (v) {
      const h = Math.min(100, Math.round((v.str / max) * 100));
      bar.style.height = h + '%';
      cnt.textContent = v.count;
      cell.classList.toggle('hot', v.count >= 3);
    } else {
      bar.style.height = '0%';
      cnt.textContent = '';
      cell.classList.remove('hot');
    }

    let airTotal = 0, airSelf = 0, airSamples = 0;
    if (prefs.showAirtime && own) {
      for (const o of own) {
        if (o.cu_total != null) { airTotal += o.cu_total; airSamples++; }
        if (o.cu_self_tx != null) airSelf += (o.cu_self_tx || 0) + (o.cu_self_rx || 0);
      }
      if (airSamples > 0) {
        const avg = Math.min(100, airTotal / airSamples);
        airbar.style.height = Math.round(avg) + '%';
      } else {
        airbar.style.height = '0%';
      }
    } else {
      airbar.style.height = '0%';
    }

    cell.classList.toggle('own', !!own);
    let clash = false;
    if (prefs.showClashFlags && own && v && v.strong >= 3) clash = true;
    cell.classList.toggle('clash', clash);

    if (own) cnt.textContent = (cnt.textContent ? cnt.textContent + ' · ' : '') + own.length + '×';

    const lines = [`<strong>kanaal ${ch}</strong>`];
    if (own) {
      const ownNames = own.map(o => o.name).join(', ');
      lines.push(`<span class="ok">◉ eigen: ${ownNames}</span>`);
      const cu = own.find(o => o.cu_total != null);
      if (cu) {
        lines.push(`<span class="lab">airtime:</span> ${cu.cu_total}% totaal · ${(cu.cu_self_tx || 0) + (cu.cu_self_rx || 0)}% eigen`);
      }
      const ht = own.find(o => o.ht);
      if (ht) lines.push(`<span class="lab">breedte:</span> ${ht.ht} MHz`);
    }
    if (v) {
      lines.push(`<span class="lab">externe:</span> ${v.count} BSSID · ${v.strong} sterk`);
    } else {
      lines.push(`<span class="lab">externe:</span> 0`);
    }
    if (clash) lines.push(`<span class="warn">! frequentie-clash</span>`);
    tip.innerHTML = lines.join('<br>');
  }
  }

  let total = 0;
  for (const v of agg.values()) total += v.count;
  const peak = [...agg.entries()].sort((a, b) => b[1].str - a[1].str)[0];
  const ownList = [...ownChannels.entries()].sort((a, b) => a[0] - b[0]).map(([c, list]) => `${c} (${list.map(l => l.name).join('+')})`).join(' · ');
  if (stripMeta) {
    stripMeta.textContent = (peak
      ? t('meta.ext_busiest', { total, ch: peak[0], n: peak[1].count })
      : t('meta.no_interference')) + (ownList ? `   ${t('meta.own_prefix')}: ${ownList}` : '');
  }
  } catch (e) { console.error('refreshChannels:', e); }
}
setInterval(refreshChannels, 800);
function specAnim() {
  try {
    if (prefs.showChannels && prefs.tab === 'pulse') {
      drawSpec24();
      drawSpec5();
    }
  } catch (e) { console.error('specAnim:', e); }
  requestAnimationFrame(specAnim);
}
requestAnimationFrame(specAnim);

function connect() {
  const proto = location.protocol === 'https:' ? 'wss' : 'ws';
  const ws = new WebSocket(`${proto}://${location.host}`);
  ws.onopen = () => { ui.status.textContent = '◉ ' + t('status.live', { n: stations.size }); };
  ws.onmessage = ev => {
    try {
      const { devices, neighbors: nbs = [], wan: wanData, apChannels: apCh = {}, error } = JSON.parse(ev.data);
      apChannels = apCh;
      if (wanData) {
        wan.txBps = wanData.tx || 0;
        wan.rxBps = wanData.rx || 0;
        wan.txBusy = Math.min(1, Math.pow(wan.txBps / 200000, 0.7));
        wan.rxBusy = Math.min(1, Math.pow(wan.rxBps / 800000, 0.7));
        wan.busy = Math.min(1, Math.pow((wan.txBps + wan.rxBps) / 1000000, 0.7));
        wan.isp = wanData.isp || '';
        wan.ip = wanData.ip || '';
        wan.status = wanData.status || '';
        wan.latency = wanData.latency;
        wan.drops = wanData.drops;
        if (wanData.latency != null) {
          wanLatencyHistory.push({ t: Date.now(), v: wanData.latency });
          if (wanLatencyHistory.length > 60) wanLatencyHistory.shift();
        }
      }
      if (error) ui.status.textContent = '⚠ ' + t('status.error', { msg: error });
      else ui.status.textContent = '◉ ' + t('status.live_ext', { n: devices.length, ext: nbs.length });
      lastDevices = devices;
      const seen = new Set();
      for (const d of devices) {
        seen.add(d.id);
        const s = stations.get(d.id);
        if (s) s.update(d); else stations.set(d.id, new Station(d));
      }
      for (const id of stations.keys()) if (!seen.has(id)) stations.delete(id);

      const seenN = new Set();
      for (const n of nbs) {
        seenN.add(n.id);
        const ex = neighbors.get(n.id);
        if (ex) ex.update(n); else neighbors.set(n.id, new Neighbor(n));
      }
      for (const id of neighbors.keys()) if (!seenN.has(id)) neighbors.delete(id);
    } catch (e) { console.error(e); }
  };
  ws.onclose = () => { ui.status.textContent = t('status.lost'); setTimeout(connect, 2000); };
  ws.onerror = () => ws.close();
}
connect();

const radTopo = document.getElementById('rad-topo');
const radAp = document.getElementById('rad-ap');
const radBand = document.getElementById('rad-band');
const radWan = document.getElementById('rad-wan');
const radLat = document.getElementById('rad-lat');
const radRssi = document.getElementById('rad-rssi');
const radCu = document.getElementById('rad-cu');
const eventLog = document.getElementById('event-log');

const wanRxHistory = [];
const wanTxHistory = [];

function pushHistory(arr, v) { arr.push(v); if (arr.length > 60) arr.shift(); }

function drawApRadar() {
  if (!radAp) return;
  const c = radAp.getContext('2d'), W = radAp.width, H = radAp.height;
  c.clearRect(0, 0, W, H);
  const cx = W / 2, cy = H / 2;
  const R = Math.min(W, H) / 2 - 30;
  c.strokeStyle = 'rgba(184,255,208,0.10)';
  c.lineWidth = 1;
  for (let i = 1; i <= 4; i++) {
    c.beginPath(); c.arc(cx, cy, R * i / 4, 0, Math.PI * 2); c.stroke();
  }
  const aps = [...apsMap.values()].filter(a => apChannels[a.mac]);
  if (aps.length === 0) return;
  let maxBps = 1;
  for (const ap of aps) maxBps = Math.max(maxBps, ap.aggBps || 0);
  c.fillStyle = 'rgba(184,255,208,0.12)';
  c.strokeStyle = 'rgba(184,255,208,0.85)';
  c.lineWidth = 1.4;
  c.beginPath();
  aps.forEach((ap, i) => {
    const a = (i / aps.length) * Math.PI * 2 - Math.PI / 2;
    const v = (ap.aggBps || 0) / maxBps;
    const x = cx + Math.cos(a) * R * v;
    const y = cy + Math.sin(a) * R * v;
    if (i === 0) c.moveTo(x, y); else c.lineTo(x, y);
  });
  c.closePath();
  c.fill();
  c.stroke();
  aps.forEach((ap, i) => {
    const a = (i / aps.length) * Math.PI * 2 - Math.PI / 2;
    const v = (ap.aggBps || 0) / maxBps;
    const x = cx + Math.cos(a) * R * v;
    const y = cy + Math.sin(a) * R * v;
    c.fillStyle = 'rgba(255,255,255,0.95)';
    c.beginPath(); c.arc(x, y, 3, 0, Math.PI * 2); c.fill();
    const lx = cx + Math.cos(a) * (R + 14);
    const ly = cy + Math.sin(a) * (R + 14);
    const name = apChannels[ap.mac]?.name || ap.label;
    c.fillStyle = 'rgba(220,255,235,0.9)';
    c.font = '600 10px ui-monospace, monospace';
    c.textAlign = 'center';
    c.fillText(name, lx, ly);
    c.fillStyle = 'rgba(184,255,208,0.7)';
    c.font = '9px ui-monospace, monospace';
    c.fillText(`${ap.clientCount || 0}× · ${(((ap.aggBps || 0) * 8) / 1000).toFixed(0)} kb/s`, lx, ly + 11);
  });
  c.fillStyle = 'rgba(184,255,208,0.45)';
  c.font = '9px ui-monospace, monospace';
  c.textAlign = 'center';
  c.fillText('throughput', cx, cy + 4);
}

function drawBandSplit() {
  if (!radBand) return;
  const c = radBand.getContext('2d'), W = radBand.width, H = radBand.height;
  c.clearRect(0, 0, W, H);
  const cx = W / 2, cy = H / 2;
  const R = Math.min(W, H) / 2 - 30;
  const counts = { '2': 0, '5': 0, '6': 0 };
  const bps = { '2': 0, '5': 0, '6': 0 };
  for (const s of stations.values()) {
    const k = s.bandKey;
    counts[k] = (counts[k] || 0) + 1;
    bps[k] = (bps[k] || 0) + (s.bps || 0);
  }
  const total = counts['2'] + counts['5'] + counts['6'];
  if (total === 0) return;
  const colors = { '2': 'rgba(255,180,90,0.85)', '5': 'rgba(120,200,255,0.85)', '6': 'rgba(220,140,255,0.85)' };
  const labels = { '2': '2.4 GHz', '5': '5 GHz', '6': '6 GHz' };
  let start = -Math.PI / 2;
  for (const k of ['2', '5', '6']) {
    if (!counts[k]) continue;
    const slice = (counts[k] / total) * Math.PI * 2;
    c.fillStyle = colors[k];
    c.beginPath();
    c.moveTo(cx, cy);
    c.arc(cx, cy, R, start, start + slice);
    c.closePath();
    c.fill();
    const mid = start + slice / 2;
    const lx = cx + Math.cos(mid) * (R + 18);
    const ly = cy + Math.sin(mid) * (R + 18);
    c.fillStyle = colors[k];
    c.font = '600 10px ui-monospace, monospace';
    c.textAlign = 'center';
    c.fillText(labels[k], lx, ly);
    c.fillStyle = 'rgba(220,240,235,0.8)';
    c.font = '9px ui-monospace, monospace';
    c.fillText(`${counts[k]}× · ${((bps[k] * 8) / 1000).toFixed(0)} kb/s`, lx, ly + 11);
    start += slice;
  }
  c.fillStyle = 'rgba(2,8,6,0.95)';
  c.beginPath(); c.arc(cx, cy, R * 0.45, 0, Math.PI * 2); c.fill();
  c.fillStyle = 'rgba(220,255,235,0.95)';
  c.font = '600 18px ui-monospace, monospace';
  c.textAlign = 'center';
  c.fillText(total, cx, cy + 2);
  c.fillStyle = 'rgba(184,255,208,0.6)';
  c.font = '9px ui-monospace, monospace';
  c.fillText('clients', cx, cy + 16);
}

function drawSparkline(canvas, dataRx, dataTx, label) {
  if (!canvas) return;
  const c = canvas.getContext('2d'), W = canvas.width, H = canvas.height;
  c.clearRect(0, 0, W, H);
  const padL = 30, padR = 10, padT = 14, padB = 16;
  let max = 1;
  for (const v of dataRx) max = Math.max(max, v);
  if (dataTx) for (const v of dataTx) max = Math.max(max, v);
  c.strokeStyle = 'rgba(184,255,208,0.08)';
  for (let i = 0; i <= 3; i++) {
    const y = padT + (i / 3) * (H - padT - padB);
    c.beginPath(); c.moveTo(padL, y); c.lineTo(W - padR, y); c.stroke();
  }
  c.fillStyle = 'rgba(160,200,180,0.55)';
  c.font = '8px ui-monospace, monospace';
  c.textAlign = 'right';
  c.fillText(label, padL - 4, padT + 6);
  function plot(arr, color, fill) {
    if (!arr.length) return;
    c.strokeStyle = color;
    c.fillStyle = fill;
    c.lineWidth = 1.4;
    c.beginPath();
    arr.forEach((v, i) => {
      const x = padL + (i / Math.max(1, arr.length - 1)) * (W - padL - padR);
      const y = padT + (1 - v / max) * (H - padT - padB);
      if (i === 0) c.moveTo(x, y); else c.lineTo(x, y);
    });
    c.stroke();
    c.lineTo(W - padR, H - padB);
    c.lineTo(padL, H - padB);
    c.closePath();
    c.fill();
  }
  if (dataTx) plot(dataTx, 'rgba(255,180,130,0.85)', 'rgba(255,140,90,0.10)');
  plot(dataRx, 'rgba(184,255,208,0.95)', 'rgba(120,220,180,0.10)');
  if (dataRx.length) {
    const lastRx = dataRx[dataRx.length - 1];
    c.fillStyle = 'rgba(184,255,208,1)';
    c.font = '600 11px ui-monospace, monospace';
    c.textAlign = 'right';
    c.fillText(`↓ ${((lastRx * 8) / 1000).toFixed(0)}`, W - padR, padT + 10);
    if (dataTx && dataTx.length) {
      const lastTx = dataTx[dataTx.length - 1];
      c.fillStyle = 'rgba(255,180,130,1)';
      c.fillText(`↑ ${((lastTx * 8) / 1000).toFixed(0)}`, W - padR, padT + 22);
    }
  }
}

function drawLatencySpark() {
  if (!radLat) return;
  const c = radLat.getContext('2d'), W = radLat.width, H = radLat.height;
  c.clearRect(0, 0, W, H);
  const padL = 30, padR = 10, padT = 14, padB = 16;
  const arr = wanLatencyHistory.map(h => h.v);
  let max = Math.max(50, ...arr);
  c.strokeStyle = 'rgba(184,255,208,0.08)';
  for (let i = 0; i <= 3; i++) {
    const y = padT + (i / 3) * (H - padT - padB);
    c.beginPath(); c.moveTo(padL, y); c.lineTo(W - padR, y); c.stroke();
    c.fillStyle = 'rgba(160,200,180,0.55)';
    c.font = '8px ui-monospace, monospace';
    c.textAlign = 'right';
    c.fillText(Math.round(max * (1 - i / 3)) + 'ms', padL - 4, y + 3);
  }
  if (!arr.length) return;
  c.strokeStyle = 'rgba(184,255,208,0.95)';
  c.lineWidth = 1.4;
  c.beginPath();
  arr.forEach((v, i) => {
    const x = padL + (i / Math.max(1, arr.length - 1)) * (W - padL - padR);
    const y = padT + (1 - v / max) * (H - padT - padB);
    if (i === 0) c.moveTo(x, y); else c.lineTo(x, y);
  });
  c.stroke();
  const last = arr[arr.length - 1];
  c.fillStyle = 'rgba(184,255,208,1)';
  c.font = '600 14px ui-monospace, monospace';
  c.textAlign = 'right';
  c.fillText(`${last} ms`, W - padR, padT + 14);
}

function drawRssiDist() {
  if (!radRssi) return;
  const c = radRssi.getContext('2d'), W = radRssi.width, H = radRssi.height;
  c.clearRect(0, 0, W, H);
  const buckets = [0, 0, 0, 0, 0];
  const ranges = ['<-80', '-80..-70', '-70..-60', '-60..-50', '>=-50'];
  for (const s of stations.values()) {
    const dbm = s.signal != null ? s.signal : (s.rssi - 90);
    if (dbm < -80) buckets[0]++;
    else if (dbm < -70) buckets[1]++;
    else if (dbm < -60) buckets[2]++;
    else if (dbm < -50) buckets[3]++;
    else buckets[4]++;
  }
  const max = Math.max(1, ...buckets);
  const padL = 18, padR = 18, padT = 16, padB = 28;
  const bw = (W - padL - padR) / buckets.length;
  const colors = ['rgba(255,90,90,0.85)', 'rgba(255,160,90,0.85)', 'rgba(255,220,120,0.85)', 'rgba(140,230,180,0.85)', 'rgba(120,200,255,0.85)'];
  buckets.forEach((v, i) => {
    const x = padL + i * bw + 4;
    const h = (v / max) * (H - padT - padB);
    const y = H - padB - h;
    c.fillStyle = colors[i];
    c.fillRect(x, y, bw - 8, h);
    c.fillStyle = 'rgba(255,255,255,0.95)';
    c.font = '600 11px ui-monospace, monospace';
    c.textAlign = 'center';
    c.fillText(v, x + (bw - 8) / 2, y - 4);
    c.fillStyle = 'rgba(220,240,230,0.7)';
    c.font = '9px ui-monospace, monospace';
    c.fillText(ranges[i], x + (bw - 8) / 2, H - 8);
  });
  c.fillStyle = 'rgba(184,255,208,0.55)';
  c.font = '9px ui-monospace, monospace';
  c.textAlign = 'left';
  c.fillText('clients per signaal-bucket (dBm)', padL, padT - 2);
}

function drawChannelOcc() {
  if (!radCu) return;
  const c = radCu.getContext('2d'), W = radCu.width, H = radCu.height;
  c.clearRect(0, 0, W, H);
  const radios = [];
  for (const [mac, info] of Object.entries(apChannels)) {
    for (const r of info.channels || []) {
      if (r.cu_total != null) radios.push({ ap: info.name, ch: r.channel, cu: r.cu_total, self: (r.cu_self_tx || 0) + (r.cu_self_rx || 0), band: r.band });
    }
  }
  if (!radios.length) {
    c.fillStyle = 'rgba(220,240,230,0.5)';
    c.font = '11px ui-monospace, monospace';
    c.textAlign = 'center';
    c.fillText('— geen airtime data —', W / 2, H / 2);
    return;
  }
  const padL = 80, padR = 50, padT = 14, padB = 14;
  const rowH = (H - padT - padB) / radios.length;
  radios.forEach((r, i) => {
    const y = padT + i * rowH + rowH / 2;
    c.fillStyle = 'rgba(220,240,230,0.85)';
    c.font = '600 10px ui-monospace, monospace';
    c.textAlign = 'right';
    c.fillText(`${r.ap} ch${r.ch}`, padL - 6, y + 3);
    const totalW = (W - padL - padR);
    c.fillStyle = 'rgba(184,255,208,0.10)';
    c.fillRect(padL, y - 6, totalW, 12);
    const totalBarW = totalW * (r.cu / 100);
    c.fillStyle = r.cu >= 70 ? 'rgba(255,120,90,0.8)' : r.cu >= 40 ? 'rgba(255,200,120,0.8)' : 'rgba(140,230,180,0.8)';
    c.fillRect(padL, y - 6, totalBarW, 12);
    const selfW = totalW * (r.self / 100);
    c.fillStyle = 'rgba(184,255,208,0.95)';
    c.fillRect(padL, y - 6, selfW, 12);
    c.fillStyle = 'rgba(255,255,255,0.95)';
    c.font = '600 10px ui-monospace, monospace';
    c.textAlign = 'left';
    c.fillText(`${r.cu}%`, padL + totalW + 6, y + 3);
  });
}

const seenRoamingIds = new Set();
function refreshEventLog() {
  if (!eventLog) return;
  for (const ev of roamingEvents) {
    const evid = `${ev.id}-${ev.t.toFixed(0)}-${ev.fromMac}-${ev.toMac}`;
    if (seenRoamingIds.has(evid)) continue;
    seenRoamingIds.add(evid);
    const fromName = (apChannels[ev.fromMac] || {}).name || ev.fromMac.slice(-5);
    const toName = (apChannels[ev.toMac] || {}).name || ev.toMac.slice(-5);
    const time = new Date().toLocaleTimeString();
    const div = document.createElement('div');
    div.className = 'ev';
    div.innerHTML = `<span class="t">${time}</span><strong>${ev.name}</strong> ${fromName}<span class="arrow">→</span>${toName}`;
    eventLog.prepend(div);
    while (eventLog.children.length > 40) eventLog.lastChild.remove();
  }
}

function drawTopologyRadar() {
  if (!radTopo) return;
  const c = radTopo.getContext('2d'), W = radTopo.width, H = radTopo.height;
  c.clearRect(0, 0, W, H);

  const all = [];
  if (udm.x) all.push({ x: udm.x, y: udm.y });
  for (const ap of apsMap.values()) all.push({ x: ap.x, y: ap.y });
  for (const s of stations.values()) all.push({ x: s.x, y: s.y });
  if (!all.length) return;
  let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
  for (const p of all) { minX = Math.min(minX, p.x); maxX = Math.max(maxX, p.x); minY = Math.min(minY, p.y); maxY = Math.max(maxY, p.y); }
  const pad = 28;
  const sX = (maxX - minX) > 0 ? (W - pad * 2) / (maxX - minX) : 1;
  const sY = (maxY - minY) > 0 ? (H - pad * 2) / (maxY - minY) : 1;
  const scale = Math.min(sX, sY);
  const tx = pad - minX * scale + ((W - pad * 2) - (maxX - minX) * scale) / 2;
  const ty = pad - minY * scale + ((H - pad * 2) - (maxY - minY) * scale) / 2;
  const M = (p) => ({ x: p.x * scale + tx, y: p.y * scale + ty });

  const sweepT = (performance.now() % 4000) / 4000;
  const sweepAngle = sweepT * Math.PI * 2;
  const cx = W / 2, cy = H / 2;
  const sweepR = Math.max(W, H);
  const grad = c.createConicGradient(sweepAngle - Math.PI / 2, cx, cy);
  grad.addColorStop(0, 'rgba(184,255,208,0.18)');
  grad.addColorStop(0.05, 'rgba(184,255,208,0.0)');
  grad.addColorStop(1, 'rgba(184,255,208,0.0)');
  c.fillStyle = grad;
  c.beginPath(); c.arc(cx, cy, sweepR, 0, Math.PI * 2); c.fill();

  c.strokeStyle = 'rgba(184,255,208,0.10)';
  c.lineWidth = 1;
  for (let r = 1; r <= 4; r++) {
    c.beginPath(); c.arc(cx, cy, (Math.min(W, H) / 2 - pad) * r / 4, 0, Math.PI * 2); c.stroke();
  }
  c.beginPath(); c.moveTo(pad, cy); c.lineTo(W - pad, cy); c.stroke();
  c.beginPath(); c.moveTo(cx, pad); c.lineTo(cx, H - pad); c.stroke();

  for (const ap of apsMap.values()) {
    const ump = M(udm), pp = M(ap);
    c.strokeStyle = 'rgba(184,255,208,0.18)';
    c.lineWidth = 0.8;
    c.beginPath(); c.moveTo(ump.x, ump.y); c.lineTo(pp.x, pp.y); c.stroke();
  }
  for (const s of stations.values()) {
    const ap = apsMap.get(s.ap);
    if (!ap) continue;
    const a = M(ap), b = M(s);
    c.strokeStyle = 'rgba(184,255,208,0.07)';
    c.lineWidth = 0.5;
    c.beginPath(); c.moveTo(a.x, a.y); c.lineTo(b.x, b.y); c.stroke();
  }

  for (const s of stations.values()) {
    const p = M(s);
    const flick = 0.6 + 0.4 * Math.sin((performance.now() * 0.001 + s.phase) * 1.5);
    c.fillStyle = `rgba(255,255,255,${0.55 + s.strength * 0.4})`;
    c.fillRect(p.x - 0.8, p.y - 0.8, 1.6, 1.6);
    if (s.busy > 0.05) {
      c.fillStyle = `rgba(184,255,208,${0.4 * flick})`;
      c.beginPath(); c.arc(p.x, p.y, 2.4, 0, Math.PI * 2); c.fill();
    }
  }
  for (const n of neighbors.values()) {
    if (!n.disturbing) continue;
    const seen = apsMap.get(n.seenBy);
    if (!seen) continue;
    const sp = M(seen);
    const a = (n.id.charCodeAt(0) || 0) * 0.21 + (performance.now() * 0.0005);
    const r = 30 + (1 - n.strength) * 30;
    const px = sp.x + Math.cos(a) * r;
    const py = sp.y + Math.sin(a) * r;
    c.fillStyle = `rgba(255,160,110,${0.55 + n.strength * 0.3})`;
    c.fillRect(px - 0.7, py - 0.7, 1.4, 1.4);
  }

  const up = M(udm);
  c.fillStyle = 'rgba(184,255,208,0.95)';
  c.beginPath(); c.arc(up.x, up.y, 4, 0, Math.PI * 2); c.fill();
  c.strokeStyle = 'rgba(184,255,208,0.5)';
  c.lineWidth = 1;
  c.beginPath(); c.arc(up.x, up.y, 8, 0, Math.PI * 2); c.stroke();
  c.fillStyle = 'rgba(220,255,235,0.95)';
  c.font = '600 9px ui-monospace, monospace';
  c.textAlign = 'center';
  c.fillText(t('udm.title'), up.x, up.y - 12);

  for (const ap of apsMap.values()) {
    const p = M(ap);
    const name = (apChannels[ap.mac] || {}).name || ap.label;
    c.fillStyle = 'rgba(255,255,255,0.95)';
    c.beginPath(); c.arc(p.x, p.y, 3, 0, Math.PI * 2); c.fill();
    c.strokeStyle = 'rgba(184,255,208,0.7)';
    c.lineWidth = 1;
    c.beginPath(); c.arc(p.x, p.y, 6, 0, Math.PI * 2); c.stroke();
    c.fillStyle = 'rgba(220,255,235,0.85)';
    c.font = '600 9px ui-monospace, monospace';
    c.textAlign = 'center';
    c.fillText(name, p.x, p.y - 9);
  }
}

function refreshStatsPage() {
  if (prefs.tab !== 'stats') return;
  drawTopologyRadar();
  drawApRadar();
  drawBandSplit();
  drawSparkline(radWan, wanRxHistory, wanTxHistory, 'kb/s');
  drawLatencySpark();
  drawRssiDist();
  drawChannelOcc();
  refreshEventLog();
}
function statsTopoLoop() {
  try { if (prefs.tab === 'stats') drawTopologyRadar(); } catch (e) { console.error('topo:', e); }
  requestAnimationFrame(statsTopoLoop);
}
requestAnimationFrame(statsTopoLoop);
setInterval(refreshStatsPage, 1000);
setInterval(() => {
  pushHistory(wanRxHistory, wan.rxBps || 0);
  pushHistory(wanTxHistory, wan.txBps || 0);
}, 1000);
window.addEventListener('resize', () => {
  setTimeout(refreshStatsPage, 100);
  try { setupAllStatsCanvases(); } catch {}
});

// ─── Search / filter ─────────────────────────────────────────────
let SEARCH_QUERY = '';
function stationMatchesSearch(s) {
  if (!SEARCH_QUERY) return true;
  const q = SEARCH_QUERY.toLowerCase();
  const fields = [s.name, s.hostname, s.ip, s.mac, s.os_name, s.dev_family, s.oui, s.essid, s.ap_name].filter(Boolean);
  return fields.some(f => String(f).toLowerCase().includes(q));
}
function apMatchesSearch(ap) {
  if (!SEARCH_QUERY) return true;
  const q = SEARCH_QUERY.toLowerCase();
  return [ap.name, ap.mac, ap.model, ap.ip].filter(Boolean).some(f => String(f).toLowerCase().includes(q));
}
function applySearch() {
  const q = SEARCH_QUERY.trim();
  document.body.classList.toggle('has-search-active', !!q);
  let count = 0;
  if (typeof stations !== 'undefined' && stations.values) {
    for (const s of stations.values()) {
      const m = stationMatchesSearch(s);
      s.searchMatch = m;
      if (m && q) count++;
    }
  }
  // AP's worden gerenderd via DOM/canvas; updaten gebeurt in render-loop via s.searchMatch / ap.searchMatch
  const cnt = document.getElementById('search-count');
  if (cnt) cnt.textContent = q ? (count === 0 ? t('search.none') : t(count===1?'search.count':'search.count_plural', { n: count })) : '';
}
const _searchBox = document.getElementById('search-box');
if (_searchBox) {
  _searchBox.addEventListener('input', e => {
    SEARCH_QUERY = e.target.value;
    applySearch();
  });
  _searchBox.addEventListener('keydown', e => {
    if (e.key === 'Escape') { _searchBox.value = ''; SEARCH_QUERY = ''; applySearch(); _searchBox.blur(); }
  });
}

// ─── AP Detail Drawer ────────────────────────────────────────
let drawerAp = null;
let drawerInterval = null;
function openApDrawer(ap) {
  drawerAp = ap;
  const drawer = document.getElementById('ap-drawer');
  if (!drawer) return;
  drawer.classList.add('show');
  renderDrawer();
  if (drawerInterval) clearInterval(drawerInterval);
  drawerInterval = setInterval(renderDrawer, 1000);
}
function closeApDrawer() {
  drawerAp = null;
  document.getElementById('ap-drawer')?.classList.remove('show');
  if (drawerInterval) { clearInterval(drawerInterval); drawerInterval = null; }
}
const _drawerClose = document.getElementById('drawer-close');
if (_drawerClose) _drawerClose.addEventListener('click', closeApDrawer);
document.addEventListener('keydown', e => { if (e.key === 'Escape' && drawerAp) closeApDrawer(); });
function renderDrawer() {
  if (!drawerAp) return;
  const ap = drawerAp;
  const info = apChannels[ap.mac];
  const name = info ? info.name : ap.label;
  document.querySelector('#ap-drawer .drawer-title').textContent = name;
  const clientsHere = Array.from(stations.values()).filter(s => s.ap === ap.mac);
  const total = clientsHere.reduce((sum, s) => sum + (s.bps || 0), 0);
  const top3 = clientsHere.sort((a,b) => (b.bps||0) - (a.bps||0)).slice(0, 5);
  const body = document.getElementById('drawer-body');
  const uptime = info?.uptime ? formatUptime(info.uptime) : '—';
  const fw = info?.firmware || '—';
  const fwUpgrade = info?.firmwareLatest ? ` <span class="upgrade-badge">↑ ${escapeHtml(info.firmwareLatest)}</span>` : '';
  let html = `<h4>${t('drawer.overview') || 'overzicht'}</h4>
    <div class="kv">
      <span class="k">${t('ap.mac')}</span><span class="v">${escapeHtml(ap.mac)}</span>
      ${info?.model ? `<span class="k">model</span><span class="v">${escapeHtml(info.model)}</span>` : ''}
      ${info?.ip ? `<span class="k">ip</span><span class="v">${escapeHtml(maskIp(info.ip))}</span>` : ''}
      <span class="k">firmware</span><span class="v">${escapeHtml(fw)}${fwUpgrade}</span>
      <span class="k">uptime</span><span class="v">${uptime}</span>
      <span class="k">${t('ap.clients')}</span><span class="v">${clientsHere.length}</span>
      <span class="k">${t('ap.throughput')}</span><span class="v">${fmtBpsNice(total)}</span>
    </div>`;
  if (info && info.channels && info.channels.length) {
    html += `<h4>${t('drawer.radios') || 'radios'}</h4>`;
    for (const r of info.channels) {
      const band = r.band === 'ng' ? '2.4 GHz' : r.band === 'na' ? '5 GHz' : (r.band || '').toUpperCase();
      const bandClass = (r.band === '6e' || r.band === '6g') ? 'b6' : '';
      const self = (r.cu_self_tx || 0) + (r.cu_self_rx || 0);
      const rec = recommendChannel(r.channel, r.band);
      html += `<div class="radio-card">
        <span class="band-tag ${bandClass}">${band}</span>
        <div class="kv">
          <span class="k">${t('ap.channel')}</span><span class="v">${r.channel || '—'}</span>
          ${r.ht ? `<span class="k">${t('ap.width')}</span><span class="v">${r.ht} MHz</span>` : ''}
          ${r.tx_power != null ? `<span class="k">${t('ap.tx_power')}</span><span class="v">${r.tx_power} dBm</span>` : ''}
          ${r.cu_total != null ? `<span class="k">${t('ap.airtime')}</span><span class="v">${r.cu_total}% (eigen ${self}%)</span>` : ''}
          ${r.num_sta != null ? `<span class="k">stations</span><span class="v">${r.num_sta}</span>` : ''}
        </div>
        ${rec ? `<div class="rec-tip">💡 ${t('rec.suggest') || 'overweeg'}: <strong>kanaal ${rec.recommended}</strong> (huidig score ${rec.scoreCurrent.toFixed(0)} → ${rec.scoreRecommended.toFixed(0)})</div>` : ''}
      </div>`;
    }
  }
  if (top3.length) {
    html += `<h4>${t('drawer.top_clients') || 'top clients'}</h4><div class="top-clients">` +
      top3.map(s => {
        const today = todayKey();
        const used = quotaUsage[`${s.id}|${today}`] || 0;
        const lim = quotas[s.id] || 0;
        const quotaBadge = lim ? ` <span class="quota-badge ${used>lim?'over':''}">${fmtBytes(used)}/${fmtBytes(lim)}</span>` : '';
        return `<div class="row"><span>${escapeHtml(s.name||s.id.slice(-5))}${quotaBadge}</span><span class="mono">${fmtBpsNice(s.bps||0)} <button class="quota-set" onclick="const v=prompt('GB per dag (0=uit)','${(lim/1e9)||''}');if(v!==null)setStationQuota('${s.id}',parseFloat(v)||0)">⚙</button></span></div>`;
      }).join('') + `</div>`;
  }
  body.innerHTML = html;
}

// ─── Snapshot export (JSON / CSV) ─────────────────────────────
window.exportSnapshot = function(format) {
  const ts = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
  const stationsArr = Array.from(stations.values()).map(s => ({
    name: s.name, mac: s.id, ip: s.ip || '', ssid: s.ssid || '',
    band: s.band, channel: s.channel, ap: (apsMap.get(s.ap) && apChannels[apsMap.get(s.ap).mac]?.name) || s.ap,
    rssi: s.rssi, snr: s.snr, noise: s.noise,
    rxBps: s.rxBytes || 0, txBps: s.txBytes || 0,
    txRate: s.tx, rxRate: s.rx,
    os: s.os, family: s.family, oui: s.oui
  }));
  const apsArr = Object.entries(apChannels).map(([mac, info]) => ({
    mac, name: info.name,
    channels: (info.channels || []).map(c => ({ band: c.band, channel: c.channel, ht: c.ht, cu_total: c.cu_total, cu_self_tx: c.cu_self_tx, cu_self_rx: c.cu_self_rx, tx_power: c.tx_power, num_sta: c.num_sta }))
  }));
  const neighborsArr = Array.from(neighbors.values()).map(n => ({
    bssid: n.bssid, ssid: n.ssid, channel: n.channel, band: n.band, rssi: n.rssi, disturbing: n.disturbing
  }));
  if (format === 'json') {
    const blob = new Blob([JSON.stringify({ ts, stations: stationsArr, aps: apsArr, neighbors: neighborsArr, wan }, null, 2)], { type: 'application/json' });
    triggerDownload(blob, `wifi-pulse-${ts}.json`);
  } else {
    // CSV — alleen stations, meest gevraagd
    const cols = ['name','mac','ip','ssid','band','channel','ap','rssi','snr','noise','rxBps','txBps','txRate','rxRate','os','family','oui'];
    const esc = v => `"${String(v ?? '').replace(/"/g, '""')}"`;
    const csv = [cols.join(',')].concat(stationsArr.map(r => cols.map(c => esc(r[c])).join(','))).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    triggerDownload(blob, `wifi-pulse-stations-${ts}.csv`);
  }
};
window.runSpeedtest = async function(btn) {
  const original = btn.textContent;
  btn.disabled = true; btn.textContent = '⏳ ...';
  try {
    const r = await fetch('/api/speedtest', { method: 'POST' });
    const j = await r.json();
    if (j.ok) {
      btn.textContent = '✓ ' + (prefs.lang==='en' ? 'started' : 'gestart');
      // Resultaat verschijnt over ~30s in WAN-stats
    } else {
      btn.textContent = '✗ ' + (j.error || 'error');
    }
  } catch (e) { btn.textContent = '✗ ' + e.message; }
  setTimeout(() => { btn.disabled = false; btn.textContent = original; }, 3000);
};

window.exportTopology = function() {
  const ts = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
  // Wacht 1 frame, capture canvas (incl. spectrum) als PNG
  canvas.toBlob(blob => {
    if (blob) triggerDownload(blob, `wifi-pulse-topology-${ts}.png`);
  }, 'image/png');
};

function triggerDownload(blob, name) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = name;
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

// ─── Theme toggle ─────────────────────────────────────────────
function applyTheme() {
  document.body.classList.toggle('theme-light', prefs.theme === 'light');
  const btn = document.getElementById('theme-toggle');
  if (btn) btn.textContent = prefs.theme === 'light' ? '☀️' : '🌙';
}
const _themeBtn = document.getElementById('theme-toggle');
if (_themeBtn) {
  _themeBtn.addEventListener('click', () => {
    prefs.theme = prefs.theme === 'light' ? 'dark' : 'light';
    savePrefs();
    applyTheme();
  });
}

// ─── Veilige init aan eind van script (alle const-decls staan) ───
try { applyTheme(); } catch {}
try { setupAllStatsCanvases(); } catch (e) { console.error('hidpi init:', e); }
try { setLang(prefs.lang || 'nl'); } catch (e) { console.error('setLang init:', e); }
try { setTab(prefs.tab || 'pulse'); } catch (e) { console.error('setTab init:', e); }
try { refreshChannels(); } catch (e) { console.error('refreshChannels init:', e); }
