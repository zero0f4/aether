// intel.js — openbare-bronnen koppeling: OUI-vendor (lokaal),
// RIPEstat WHOIS (WAN-IP intel), NVD CVE-lookup (UniFi firmware).
const fs = require('fs');
const path = require('path');
const { request } = require('undici');

// ─────────────────────────────────────────────────────────────
// 1. OUI-VENDOR LOOKUP (IEEE — lokaal, geen API, geen ratelimit)
// ─────────────────────────────────────────────────────────────
const OUI_FILE = path.join(__dirname, 'oui.txt');
const ouiMap = new Map();
let ouiLoadedAt = 0;

// ─── Provider-detectie via SSID-prefix (Ziggo7..., KPNxxx, Tele2-...). ───
// Combineert met OUI om provider te identificeren.
const PROVIDER_HINTS = [
  { rx: /^ziggo[\-_ ]?\d|^ziggo[A-F0-9]/i, kind: 'isp-ziggo',  label: 'Ziggo modem',     risk: 'low' },
  { rx: /^kpn[\-_ ]?[A-F0-9]/i,           kind: 'isp-kpn',    label: 'KPN ExperiaBox',  risk: 'low' },
  { rx: /^tele2/i,                        kind: 'isp-tele2',  label: 'Tele2',           risk: 'low' },
  { rx: /^odido|^t-mobile/i,              kind: 'isp-odido',  label: 'Odido / T-Mobile',risk: 'low' },
  { rx: /^h369a|^home-/i,                 kind: 'isp-kpn',    label: 'KPN H369A',       risk: 'low' },
  { rx: /^delta\s|^delta_/i,              kind: 'isp-delta',  label: 'DELTA',           risk: 'low' },
  { rx: /^xs4all/i,                       kind: 'isp-xs4all', label: 'XS4ALL',          risk: 'low' },
  { rx: /^caiway/i,                       kind: 'isp-caiway', label: 'Caiway',          risk: 'low' },
  { rx: /^freedom[a-z]/i,                 kind: 'isp-freedom',label: 'Freedom Internet',risk: 'low' },
];

// ─── Vendor- en hostname-patronen → device-type. Eerste match wint. ───
const RISK_HINTS = [
  // Eigen UniFi
  { rx: /ubiquiti/i, kind: 'unifi', label: 'Ubiquiti AP', risk: 'low' },

  // ISP-modems via OUI
  { rx: /technicolor|arris|sagemcom|commscope|hitron/i, kind: 'isp-cpe', label: 'ISP-modem', risk: 'low' },
  { rx: /huawei.*technologies/i,             kind: 'isp-cpe', label: 'ISP-modem (Huawei)', risk: 'low' },
  { rx: /zte\b/i,                            kind: 'isp-cpe', label: 'ISP-modem (ZTE)', risk: 'low' },

  // Smartphones / tablets / laptops — hostname helpt veel
  { rx: /\biphone|\bipad|\bmacbook|imac|airpods|apple watch/i, kind: 'apple-mobile', label: 'Apple', risk: 'low' },
  { rx: /apple/i, kind: 'apple', label: 'Apple', risk: 'low' },
  { rx: /\bgalaxy|\bsm-[a-z]\d|samsung-galaxy/i, kind: 'samsung-mobile', label: 'Samsung Galaxy', risk: 'low' },
  { rx: /samsung/i, kind: 'samsung', label: 'Samsung', risk: 'low' },
  { rx: /\bxiaomi|redmi|poco/i, kind: 'xiaomi', label: 'Xiaomi', risk: 'low' },
  { rx: /\boneplus/i, kind: 'oneplus', label: 'OnePlus', risk: 'low' },
  { rx: /\bhuawei|\bhonor/i, kind: 'huawei', label: 'Huawei', risk: 'low' },
  { rx: /\bpixel|google,? inc|google llc/i, kind: 'google', label: 'Google', risk: 'low' },
  { rx: /\bnokia\b/i, kind: 'nokia', label: 'Nokia', risk: 'low' },
  { rx: /\boppo|\bvivo|\brealme/i, kind: 'cn-phone', label: 'OPPO/Vivo/Realme', risk: 'low' },

  // Voice / smart speakers
  { rx: /amazon technologies|\bamazon\.com|\balexa|\becho\b/i, kind: 'voice-amazon', label: 'Amazon Alexa/Echo', risk: 'low' },
  { rx: /\bnest\b|google home|chromecast/i, kind: 'voice-google', label: 'Google Nest/Home', risk: 'low' },
  { rx: /\bsonos/i, kind: 'speaker-sonos', label: 'Sonos', risk: 'low' },
  { rx: /\bbose/i, kind: 'speaker-bose', label: 'Bose', risk: 'low' },
  { rx: /denon|marantz|harman|jbl|sennheiser/i, kind: 'speaker', label: 'Audio', risk: 'low' },

  // Smart home / IoT
  { rx: /philips lighting|signify|hue\b/i, kind: 'iot-hue', label: 'Philips Hue', risk: 'low' },
  { rx: /ikea\b|tradfri/i, kind: 'iot-ikea', label: 'IKEA Trådfri', risk: 'low' },
  { rx: /\bring\b|ring\.com|ring,? inc/i, kind: 'doorbell', label: 'Ring deurbel', risk: 'low' },
  { rx: /reolink|hikvision|dahua|hangzhou.*xiongmai|axis communications|amcrest/i, kind: 'cam', label: 'Camera', risk: 'high' },
  { rx: /\bnetatmo/i, kind: 'thermostat', label: 'Netatmo', risk: 'low' },
  { rx: /tado/i, kind: 'thermostat', label: 'Tado° thermostaat', risk: 'low' },
  { rx: /honeywell/i, kind: 'thermostat', label: 'Honeywell', risk: 'low' },
  { rx: /\bnuki|august home|yale\b/i, kind: 'lock', label: 'Slim slot', risk: 'low' },
  { rx: /\broborock|ecovacs|irobot|roomba/i, kind: 'vacuum', label: 'Robot-stofzuiger', risk: 'low' },
  { rx: /\beufy\b/i, kind: 'cam', label: 'Eufy', risk: 'low' },
  { rx: /tuya/i, kind: 'iot-cloud', label: 'Tuya cloud-IoT', risk: 'high' },
  { rx: /\btp-link technolog/i, kind: 'iot-tplink', label: 'TP-Link IoT', risk: 'med' },
  { rx: /\bshelly|allterco/i, kind: 'iot-shelly', label: 'Shelly relais', risk: 'low' },
  { rx: /\bsonoff|itead/i, kind: 'iot-sonoff', label: 'Sonoff', risk: 'med' },

  // Game consoles
  { rx: /nintendo/i, kind: 'console-nintendo', label: 'Nintendo Switch', risk: 'low' },
  { rx: /sony interactive|\bps[345]\b|playstation/i, kind: 'console-playstation', label: 'PlayStation', risk: 'low' },
  { rx: /microsoft.*xbox|\bxbox/i, kind: 'console-xbox', label: 'Xbox', risk: 'low' },

  // Streaming & TVs
  { rx: /\broku|\bvizio/i, kind: 'tv', label: 'Streaming-tv', risk: 'low' },
  { rx: /\bnvidia\b|\bshield\b/i, kind: 'tv-nvidia', label: 'NVIDIA Shield', risk: 'low' },
  { rx: /sony corporation|sony home|bravia/i, kind: 'tv-sony', label: 'Sony', risk: 'low' },

  // LG-specifiek (specialiseert vóór algemeen "lg") — hostname/ssid drives subtype
  { rx: /\bwashtower|\bwm[0-9]|\bwasher\b|\blg.*wash|\bwashing/i, kind: 'appliance-washer', label: 'LG wasmachine', risk: 'low' },
  { rx: /\bdryer\b|\blg.*dry/i,                                  kind: 'appliance-dryer',  label: 'LG droger',     risk: 'low' },
  { rx: /\bdishwash|\blg.*dishw/i,                                kind: 'appliance-dishwasher', label: 'LG vaatwasser', risk: 'low' },
  { rx: /\bfridge|\brefrigerator|\binstaview/i,                  kind: 'appliance-fridge', label: 'LG koelkast',   risk: 'low' },
  { rx: /\boven\b|\brange\b|\bcooktop|\blg.*oven/i,              kind: 'appliance-oven',   label: 'LG oven',       risk: 'low' },
  { rx: /\bsoundbar|\bsl[0-9][a-z]?|\blg.*sound/i,               kind: 'appliance-soundbar', label: 'LG soundbar', risk: 'low' },
  { rx: /\bairco|\bac[0-9]|\bairconditioner|hvac|\bheat.?pump/i, kind: 'appliance-hvac',   label: 'LG airco/HVAC', risk: 'low' },
  { rx: /\bwallmount|\bmount[0-9]/i,                              kind: 'appliance-mount',  label: 'LG wallmount',  risk: 'low' },
  { rx: /\boled|\bnano[0-9]|\blg.*tv|webos|\blg-?tv|\blhd[0-9]/i, kind: 'tv-lg',           label: 'LG TV',         risk: 'low' },
  { rx: /lg electronics|\blg\.\b/i,                              kind: 'lg-generic',       label: 'LG-apparaat',   risk: 'low' },

  // Samsung-specifiek (idem)
  { rx: /\bfamilyhub|samsung.*fridge|\brf[0-9]/i,                kind: 'appliance-fridge', label: 'Samsung koelkast', risk: 'low' },
  { rx: /samsung.*wash|\bww[0-9]/i,                              kind: 'appliance-washer', label: 'Samsung wasmachine', risk: 'low' },
  { rx: /\bhw-[a-z]?[0-9]|samsung.*sound/i,                      kind: 'appliance-soundbar', label: 'Samsung soundbar', risk: 'low' },
  { rx: /\btizen|samsung.*tv|\bqn[0-9]|\bue[0-9]/i,              kind: 'tv', label: 'Samsung TV', risk: 'low' },

  // PC / werk
  { rx: /microsoft corporation/i, kind: 'pc-microsoft', label: 'Microsoft / Surface', risk: 'low' },
  { rx: /\bdell\b/i, kind: 'pc-dell', label: 'Dell', risk: 'low' },
  { rx: /hewlett packard|\bhp\b inc|\bhp enterprise/i, kind: 'pc-hp', label: 'HP', risk: 'low' },
  { rx: /lenovo|thinkpad/i, kind: 'pc-lenovo', label: 'Lenovo', risk: 'low' },
  { rx: /asustek|asus computer/i, kind: 'pc-asus', label: 'ASUS', risk: 'low' },
  { rx: /intel corporate/i, kind: 'pc-intel', label: 'Intel NIC', risk: 'low' },

  // NAS / servers / network gear
  { rx: /synology/i, kind: 'nas-synology', label: 'Synology NAS', risk: 'low' },
  { rx: /qnap/i, kind: 'nas-qnap', label: 'QNAP NAS', risk: 'low' },
  { rx: /\bwestern digital|wd elements/i, kind: 'nas-wd', label: 'WD NAS', risk: 'low' },
  { rx: /netgear/i, kind: 'router-other', label: 'Netgear', risk: 'low' },
  { rx: /\basus\b/i, kind: 'router-other', label: 'ASUS router', risk: 'low' },
  { rx: /mikrotik/i, kind: 'router-other', label: 'MikroTik', risk: 'low' },
  { rx: /eero\b/i, kind: 'router-mesh', label: 'Eero mesh', risk: 'low' },
  { rx: /\btp-link\b|tp-link corporation/i, kind: 'router-tplink', label: 'TP-Link', risk: 'low' },
  { rx: /\bdeco\b/i, kind: 'router-mesh', label: 'TP-Link Deco', risk: 'low' },
  { rx: /netgear orbi|\borbi\b/i, kind: 'router-mesh', label: 'Netgear Orbi', risk: 'low' },

  // Cars / EV
  { rx: /tesla/i, kind: 'car', label: 'Tesla', risk: 'low' },
  { rx: /\bbmw\b|\baudi\b|\bvolkswagen|\bvolvo\b/i, kind: 'car', label: 'Auto', risk: 'low' },

  // Printers
  { rx: /bambu/i, kind: 'printer-3d', label: 'Bambu Lab 3D', risk: 'low' },
  { rx: /prusa|creality|anycubic|ender|elegoo/i, kind: 'printer-3d', label: '3D-printer', risk: 'low' },
  { rx: /brother\b|canon\b|\bepson|kyocera/i, kind: 'printer', label: 'Printer', risk: 'low' },
  { rx: /hp\s+inc/i, kind: 'printer', label: 'HP printer', risk: 'low' },

  // Hobby / dev
  { rx: /raspberry/i, kind: 'pi', label: 'Raspberry Pi', risk: 'low' },
  { rx: /espressif/i, kind: 'iot-mcu', label: 'ESP32/ESP8266', risk: 'med' },
  { rx: /arduino/i, kind: 'iot-mcu', label: 'Arduino', risk: 'low' },

  // Generieke chip-makers (laatste vangnet)
  { rx: /realtek/i, kind: 'iot-chip', label: 'Realtek chipset', risk: 'med' },
  { rx: /mediatek/i, kind: 'iot-chip', label: 'MediaTek chipset', risk: 'low' },
  { rx: /broadcom/i, kind: 'iot-chip', label: 'Broadcom chipset', risk: 'low' },

  // CN-ODM laatste vangnet (alleen als niets anders matcht)
  { rx: /\bshenzhen|\bchongqing|\bguangdong|\bsichuan|\bfujian|hangzhou/i, kind: 'cn-oem', label: 'CN-ODM (mogelijk IoT)', risk: 'med' },
];

function loadOui() {
  try {
    if (!fs.existsSync(OUI_FILE)) {
      console.warn('[intel] oui.txt ontbreekt — vendor-lookup uit. Run: curl -sL https://standards-oui.ieee.org/oui/oui.txt -o oui.txt');
      return;
    }
    const t = fs.readFileSync(OUI_FILE, 'utf8');
    let n = 0;
    for (const rawLine of t.split('\n')) {
      const line = rawLine.replace(/\r$/, ''); // strip Windows CRLF
      // formaat: "784558     (base 16)\t\tUbiquiti Inc"
      const m = line.match(/^([0-9A-F]{6})\s+\(base 16\)\s+(.+)/);
      if (m) {
        ouiMap.set(m[1].toUpperCase(), m[2].trim());
        n++;
      }
    }
    ouiLoadedAt = Date.now();
    console.log(`[intel] OUI geladen — ${n} vendor-prefixes`);
  } catch (e) {
    console.error('[intel] OUI laden mislukt:', e.message);
  }
}

function vendorOf(mac) {
  if (!mac) return null;
  const oui = mac.replace(/[^0-9a-f]/gi, '').slice(0, 6).toUpperCase();
  return ouiMap.get(oui) || null;
}

function classify(mac, hostname = '', ssid = '') {
  const vendor = vendorOf(mac);
  // Eerst: SSID-prefix → provider (werkt ook zónder vendor-match).
  if (ssid) {
    for (const p of PROVIDER_HINTS) {
      if (p.rx.test(ssid)) {
        return { vendor: vendor || null, kind: p.kind, label: p.label, risk: p.risk };
      }
    }
  }
  if (!vendor) return { vendor: null, kind: 'unknown', risk: 'unknown' };
  // Hostname/vendor matchen.
  for (const h of RISK_HINTS) {
    if (h.rx.test(vendor) || h.rx.test(hostname) || h.rx.test(ssid)) {
      return { vendor, kind: h.kind, label: h.label, risk: h.risk };
    }
  }
  return { vendor, kind: 'generic', risk: 'low' };
}

// ─────────────────────────────────────────────────────────────
// 2. RIPESTAT WHOIS — WAN-IP intel (ASN, route, abuse-contact, geo)
// ─────────────────────────────────────────────────────────────
let wanIntelCache = { ip: null, ts: 0, data: null };
const WAN_TTL_MS = 15 * 60 * 1000; // 15 min

async function fetchJson(url, timeoutMs = 8000) {
  const ac = new AbortController();
  const t = setTimeout(() => ac.abort(), timeoutMs);
  try {
    const r = await request(url, { signal: ac.signal, headers: { 'user-agent': 'aether/1.x (https://github.com/zero0f4/aether)' } });
    if (r.statusCode >= 400) throw new Error('http ' + r.statusCode);
    return await r.body.json();
  } finally {
    clearTimeout(t);
  }
}

async function wanIntel(ip) {
  if (!ip) return { ok: false, error: 'no-ip' };
  if (wanIntelCache.ip === ip && (Date.now() - wanIntelCache.ts) < WAN_TTL_MS) {
    return { ok: true, cached: true, ...wanIntelCache.data };
  }
  try {
    const [whois, geo, abuse, network] = await Promise.allSettled([
      fetchJson(`https://stat.ripe.net/data/whois/data.json?resource=${ip}`),
      fetchJson(`https://stat.ripe.net/data/maxmind-geo-lite/data.json?resource=${ip}`),
      fetchJson(`https://stat.ripe.net/data/abuse-contact-finder/data.json?resource=${ip}`),
      fetchJson(`https://stat.ripe.net/data/network-info/data.json?resource=${ip}`),
    ]);

    const out = { ip, fetchedAt: Date.now() };

    if (network.status === 'fulfilled') {
      const d = network.value?.data || {};
      out.asns = d.asns || [];
      out.prefix = d.prefix || null;
    }
    if (geo.status === 'fulfilled') {
      const d = geo.value?.data?.located_resources?.[0]?.locations?.[0];
      if (d) out.geo = { country: d.country, city: d.city, latitude: d.latitude, longitude: d.longitude };
    }
    if (abuse.status === 'fulfilled') {
      out.abuse = abuse.value?.data?.abuse_contacts || [];
    }
    if (whois.status === 'fulfilled') {
      const records = whois.value?.data?.records || [];
      const flat = records.flat();
      const pick = k => flat.find(r => r.key && r.key.toLowerCase() === k)?.value || null;
      out.whois = {
        netname: pick('netname'),
        descr: pick('descr'),
        org: pick('org-name') || pick('organisation'),
        country: pick('country'),
        source: pick('source'),
      };
    }

    wanIntelCache = { ip, ts: Date.now(), data: out };
    return { ok: true, ...out };
  } catch (e) {
    return { ok: false, error: 'ripe-failed', msg: e.message };
  }
}

// ─────────────────────────────────────────────────────────────
// 3. CVE-LOOKUP — UniFi-firmware tegen NVD (api.nvd.nist.gov)
// ─────────────────────────────────────────────────────────────
const cveCache = new Map(); // key = vendor:product:version → { ts, cves }
const CVE_TTL_MS = 24 * 60 * 60 * 1000; // 24h

// Mapping: UniFi model-codes → CPE (NVD common-platform-enumeration) products.
// UniFi-firmware staat als "ubiquiti:unifi" / "ubiquiti:unifi_network_application" / per-AP firmware.
// We zoeken breed: keyword=ubiquiti + version filter client-side.
async function cveLookup({ vendor = 'ubiquiti', product = '', version = '' }) {
  const key = `${vendor}:${product}:${version}`;
  const cached = cveCache.get(key);
  if (cached && (Date.now() - cached.ts) < CVE_TTL_MS) return { ok: true, cached: true, ...cached.data };

  try {
    // NVD 2.0 API — keyword-search; geen API-key nodig (lager rate-limit, ok voor 1x/dag/firmware)
    const q = encodeURIComponent(`${vendor} ${product}`.trim());
    const url = `https://services.nvd.nist.gov/rest/json/cves/2.0?keywordSearch=${q}&resultsPerPage=50`;
    const j = await fetchJson(url, 12000);
    const items = j.vulnerabilities || [];
    const matched = [];
    for (const it of items) {
      const c = it.cve;
      if (!c) continue;
      const desc = (c.descriptions || []).find(d => d.lang === 'en')?.value || '';
      const score = c.metrics?.cvssMetricV31?.[0]?.cvssData?.baseScore
                  || c.metrics?.cvssMetricV30?.[0]?.cvssData?.baseScore
                  || c.metrics?.cvssMetricV2?.[0]?.cvssData?.baseScore
                  || null;
      const sev = c.metrics?.cvssMetricV31?.[0]?.cvssData?.baseSeverity
                || c.metrics?.cvssMetricV30?.[0]?.cvssData?.baseSeverity
                || (score >= 9 ? 'CRITICAL' : score >= 7 ? 'HIGH' : score >= 4 ? 'MEDIUM' : score ? 'LOW' : null);

      // Filter: alleen CVEs die UniFi/AP-context vermelden (filtert bv. EdgeRouter eruit).
      // Versie-filter is te strikt (NVD beschrijft vaak "before X.Y.Z" niet exact-match) —
      // dus we includen alle relevante items en laten de gebruiker beslissen.
      const descLow = desc.toLowerCase();
      const isApContext = /unifi|airmax|access point|\baccess.?point|ap firmware|wireless/i.test(desc);
      if (!isApContext) continue;
      const verStr = String(version).toLowerCase();
      const versionInDesc = verStr && descLow.includes(verStr);
      // "Mogelijk geraakt" = description noemt 'before' / 'prior to' / 'through' versie-bereik.
      const hasVersionRange = /before\s+\d|prior\s+to\s+\d|through\s+\d|version[s]?\s+\d/i.test(desc);

      matched.push({
        id: c.id,
        published: c.published,
        severity: sev,
        score,
        summary: desc.length > 240 ? desc.slice(0, 240) + '…' : desc,
        url: `https://nvd.nist.gov/vuln/detail/${c.id}`,
        versionConfirmed: versionInDesc,
        versionRange: hasVersionRange,
      });
    }
    matched.sort((a, b) => (b.score || 0) - (a.score || 0));
    const data = { vendor, product, version, total: matched.length, cves: matched.slice(0, 10) };
    cveCache.set(key, { ts: Date.now(), data });
    return { ok: true, ...data };
  } catch (e) {
    return { ok: false, error: 'nvd-failed', msg: e.message };
  }
}

// Bulk-lookup voor alle eigen APs in één call (rate-limit vriendelijk).
async function cveLookupAll(devices) {
  const out = {};
  // Groepeer per (model, version) zodat 4 APs op zelfde firmware = 1 NVD-call.
  const groups = new Map();
  for (const d of devices || []) {
    const ver = d.version || '';
    const model = d.model || 'unifi';
    const k = `${model}:${ver}`;
    if (!groups.has(k)) groups.set(k, { model, version: ver, macs: [] });
    groups.get(k).macs.push(d.mac);
  }
  for (const [k, g] of groups) {
    const r = await cveLookup({ vendor: 'ubiquiti', product: 'unifi', version: g.version });
    for (const mac of g.macs) {
      out[mac] = r.ok ? { count: r.total, top: r.cves?.[0] || null, all: r.cves || [] } : { error: r.error };
    }
  }
  return out;
}

module.exports = {
  loadOui,
  vendorOf,
  classify,
  wanIntel,
  cveLookup,
  cveLookupAll,
};
