// firewall.js — UniFi firewall events, IPS-alarms en geo-locatie van remote IPs.
// Werkt op `unifiFetch` van server.js. Geen externe deps behalve undici (al aanwezig).
const { request } = require('undici');

// ─── Geo-lookup cache (ip-api.com — gratis, 45 req/min, geen key) ─────────
const geoCache = new Map(); // ip → { lat, lon, country, city, isp, ts }
const GEO_TTL_MS = 24 * 60 * 60 * 1000;     // 24h
const GEO_NEG_TTL_MS = 30 * 60 * 1000;      // 30 min voor failures (rate-limit etc.)

function isPrivateIp(ip) {
  if (!ip) return true;
  if (/^10\./.test(ip)) return true;
  if (/^192\.168\./.test(ip)) return true;
  if (/^172\.(1[6-9]|2\d|3[01])\./.test(ip)) return true;
  if (/^127\./.test(ip)) return true;
  if (/^169\.254\./.test(ip)) return true;
  if (/^::1$/.test(ip)) return true;
  if (/^fe80:/.test(ip)) return true;
  return false;
}

async function geoLookup(ip) {
  if (!ip || isPrivateIp(ip)) return null;
  const cached = geoCache.get(ip);
  if (cached && (Date.now() - cached.ts) < (cached.ok ? GEO_TTL_MS : GEO_NEG_TTL_MS)) {
    return cached.ok ? cached : null;
  }
  try {
    const ac = new AbortController();
    const t = setTimeout(() => ac.abort(), 5000);
    const r = await request(`http://ip-api.com/json/${encodeURIComponent(ip)}?fields=status,country,countryCode,city,lat,lon,isp,org,as`, {
      signal: ac.signal,
      headers: { 'user-agent': 'aether/1.x (https://github.com/zero0f4/wifi-pulse)' },
    });
    clearTimeout(t);
    const j = await r.body.json();
    if (j.status !== 'success') {
      geoCache.set(ip, { ok: false, ts: Date.now() });
      return null;
    }
    const out = {
      ip, ok: true, ts: Date.now(),
      lat: j.lat, lon: j.lon,
      country: j.country, countryCode: j.countryCode, city: j.city,
      isp: j.isp || j.org || null, asn: j.as || null,
    };
    geoCache.set(ip, out);
    return out;
  } catch (e) {
    geoCache.set(ip, { ok: false, ts: Date.now(), err: e.message });
    return null;
  }
}

// ─── Event-collector ─────────────────────────────────────────────────────
// Een ring-buffer van laatste N firewall-events — gevuld door pollAlarms().
const eventRing = [];
const EVENT_RING_MAX = 500;

function shapeEvent(raw) {
  // UniFi event-shapes verschillen per type. We normaliseren naar:
  //   { ts, severity, category, msg, srcIp, dstIp, srcPort, dstPort, sig, country?, lat?, lon? }
  return {
    id: raw._id || `${raw.time || raw.timestamp}-${Math.random().toString(36).slice(2,8)}`,
    ts: raw.time || raw.timestamp || raw.datetime || Date.now(),
    severity: (raw.severity || raw.level || raw.event_type || 'info').toString().toLowerCase(),
    category: raw.category || raw.event_category || raw.type || 'firewall',
    msg: raw.msg || raw.message || raw.summary || '',
    srcIp:   raw.src_ip || raw.srcip || raw.attacker_ip || raw.from || null,
    dstIp:   raw.dst_ip || raw.dstip || raw.victim_ip   || raw.to   || null,
    srcPort: raw.src_port || raw.srcport || null,
    dstPort: raw.dst_port || raw.dstport || null,
    sig:     raw.signature || raw.sig || raw.signature_id || null,
    raw:     raw,
  };
}

async function pollAlarms(unifiFetch, site) {
  try {
    const r = await unifiFetch(`/proxy/network/api/s/${site}/list/alarm`);
    if (!r.ok) return [];
    const j = await r.json();
    const items = (j.data || []).map(shapeEvent);
    // Dedup en push naar ring
    const seen = new Set(eventRing.map(e => e.id));
    for (const e of items) {
      if (!seen.has(e.id)) {
        eventRing.push(e);
        seen.add(e.id);
      }
    }
    while (eventRing.length > EVENT_RING_MAX) eventRing.shift();
    return items;
  } catch (e) { return []; }
}

async function getFirewallRules(unifiFetch, site) {
  try {
    const r = await unifiFetch(`/proxy/network/api/s/${site}/rest/firewallrule`);
    if (!r.ok) return [];
    const j = await r.json();
    return (j.data || []).map(rule => ({
      id: rule._id,
      name: rule.name,
      ruleset: rule.ruleset,
      action: rule.action,                // accept / drop / reject
      protocol: rule.protocol,
      enabled: rule.enabled,
      logging: rule.logging,
      src: rule.src_address || (rule.src_networkconf_type === 'NETv4' ? 'net' : '?'),
      dst: rule.dst_address || (rule.dst_networkconf_type === 'NETv4' ? 'net' : '?'),
      icmpType: rule.icmp_typename || null,
    }));
  } catch (e) { return []; }
}

async function getPortForwards(unifiFetch, site) {
  try {
    const r = await unifiFetch(`/proxy/network/api/s/${site}/rest/portforward`);
    if (!r.ok) return [];
    const j = await r.json();
    return (j.data || []).map(pf => ({
      id: pf._id,
      name: pf.name,
      enabled: pf.enabled,
      proto: pf.proto,
      src: pf.src,
      fwd: pf.fwd,
      dstPort: pf.dst_port,
      fwdPort: pf.fwd_port,
      logging: pf.log,
    }));
  } catch (e) { return []; }
}

// ─── Geo-enrichment van events ───────────────────────────────────────────
async function enrichGeo(events, max = 30) {
  const subset = events.slice(0, max);
  const queue = [...subset];
  await Promise.all(queue.map(async e => {
    if (e.demo || e.geo) return;  // demo-events hebben al hard-coded geo
    if (e.srcIp && !isPrivateIp(e.srcIp)) {
      const g = await geoLookup(e.srcIp);
      if (g) { e.geo = g; e.country = g.country; e.lat = g.lat; e.lon = g.lon; }
    } else if (e.dstIp && !isPrivateIp(e.dstIp)) {
      const g = await geoLookup(e.dstIp);
      if (g) { e.geo = g; e.country = g.country; e.lat = g.lat; e.lon = g.lon; }
    }
  }));
  return events;
}

// ─── Demo-mode (zonder Threat Management aan) ────────────────────────────
// Genereert plausibele firewall-events vanuit bekende attacker-locaties wereldwijd.
const DEMO_HOTSPOTS = [
  { country: 'Russia',         city: 'Moscow',        lat: 55.75, lon: 37.62, asn: 'AS31034',  category: 'brute-force-ssh' },
  { country: 'China',          city: 'Beijing',       lat: 39.90, lon: 116.41, asn: 'AS4134',   category: 'scan' },
  { country: 'Brazil',         city: 'São Paulo',     lat: -23.55, lon: -46.63, asn: 'AS27699', category: 'mirai-iot' },
  { country: 'United States',  city: 'Ashburn',       lat: 39.04, lon: -77.49, asn: 'AS14618',  category: 'scan' },
  { country: 'India',          city: 'Mumbai',        lat: 19.07, lon: 72.87, asn: 'AS9498',   category: 'spam-relay' },
  { country: 'Vietnam',        city: 'Ho Chi Minh',   lat: 10.82, lon: 106.62, asn: 'AS24086', category: 'brute-force-rdp' },
  { country: 'Iran',           city: 'Tehran',        lat: 35.69, lon: 51.39, asn: 'AS39074',  category: 'cve-exploit' },
  { country: 'Netherlands',    city: 'Amsterdam',     lat: 52.37, lon: 4.89,  asn: 'AS16276',  category: 'web-scrape' },
  { country: 'Germany',        city: 'Frankfurt',     lat: 50.11, lon: 8.68,  asn: 'AS24940',  category: 'tor-exit' },
  { country: 'Romania',        city: 'Bucharest',     lat: 44.43, lon: 26.10, asn: 'AS9009',   category: 'scan' },
  { country: 'Singapore',      city: 'Singapore',     lat: 1.35,  lon: 103.82, asn: 'AS133752', category: 'scan' },
  { country: 'Ukraine',        city: 'Kyiv',          lat: 50.45, lon: 30.52, asn: 'AS21219',  category: 'scan' },
];
const DEMO_SEVERITIES = ['low', 'medium', 'high', 'critical'];

let _demoCursor = 0;
function generateDemoEvent() {
  const h = DEMO_HOTSPOTS[_demoCursor++ % DEMO_HOTSPOTS.length];
  const ipOctets = [
    Math.floor(Math.random()*223)+1,
    Math.floor(Math.random()*255),
    Math.floor(Math.random()*255),
    Math.floor(Math.random()*254)+1,
  ].join('.');
  return {
    id: `demo-${Date.now()}-${Math.random().toString(36).slice(2,8)}`,
    ts: Date.now(),
    severity: DEMO_SEVERITIES[Math.floor(Math.random() * DEMO_SEVERITIES.length)],
    category: h.category,
    msg: `Demo: ${h.category} attempt from ${h.country}`,
    srcIp: ipOctets,
    dstIp: '0.0.0.0',
    srcPort: Math.floor(Math.random() * 65000) + 1024,
    dstPort: [22, 23, 80, 443, 3389, 5060, 8080][Math.floor(Math.random() * 7)],
    sig: `${h.category.toUpperCase()}-${Math.floor(Math.random() * 9999)}`,
    geo: { country: h.country, countryCode: '?', city: h.city, lat: h.lat, lon: h.lon, isp: h.asn, asn: h.asn },
    country: h.country,
    lat: h.lat, lon: h.lon,
    demo: true,
  };
}

function getRecentEvents(opts = {}) {
  const { since = 0, limit = 100 } = opts;
  return eventRing.filter(e => e.ts >= since).slice(-limit).reverse();
}

function clearDemoEvents() {
  for (let i = eventRing.length - 1; i >= 0; i--) {
    if (eventRing[i].demo) eventRing.splice(i, 1);
  }
}

function pushDemoEvent() {
  const e = generateDemoEvent();
  eventRing.push(e);
  while (eventRing.length > EVENT_RING_MAX) eventRing.shift();
  return e;
}

module.exports = {
  geoLookup, isPrivateIp,
  pollAlarms, enrichGeo,
  getFirewallRules, getPortForwards,
  getRecentEvents, pushDemoEvent, clearDemoEvents,
};
