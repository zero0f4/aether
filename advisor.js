// advisor.js — analyse van huidige UniFi-state en concrete aanbevelingen.
// Pure functie op `lastPayload` van server.js. Geen externe calls; alle data
// komt uit `apChannels` (eigen APs incl. radios), `devices` (clients),
// `neighbors` (vreemde APs) en `wan`.

// 2.4 GHz: alleen 1, 6, 11 zijn niet-overlappend.
const NON_OVERLAP_24 = [1, 6, 11];

// 5 GHz UNII-banden:
//   UNII-1 : 36-48     (geen DFS)
//   UNII-2 : 52-64     (DFS, kan radar-interrupt)
//   UNII-2e: 100-144   (DFS, kan radar-interrupt)
//   UNII-3 : 149-165   (geen DFS)
const DFS_5GHZ = (ch) => (ch >= 52 && ch <= 144);

function bandFromRadio(r) {
  if (!r) return null;
  const v = String(r.radio || r.band || r.radio_name || '').toLowerCase();
  if (v === 'wifi0' || v === 'ng' || v === '2g')   return '2.4';
  if (v === 'wifi1' || v === 'na' || v === '5g')   return '5';
  if (v === 'wifi2' || v === '6e' || v === '6g')   return '6';
  return null;
}

function pushAdv(out, sev, cat, title, desc, recommend, affected = []) {
  out.push({ severity: sev, category: cat, title, description: desc, recommend, affected });
}

function analyse(payload) {
  const out = [];
  const apChannels = payload.apChannels || {};
  const devices    = payload.devices || [];
  const neighbors  = payload.neighbors || [];

  const ownEntries = Object.entries(apChannels);
  const ownAps = ownEntries.map(([mac, v]) => ({ mac, ...v }));
  const ownClients = devices.filter(d => !d.subrouter); // includeer alle eindclients

  // ─── 1. CHANNEL PLAN per band ──────────────────────────────────
  // Verzamel kanalen per band (eigen + extern).
  const ownByBand = { '2.4': [], '5': [], '6': [] };
  for (const ap of ownAps) {
    for (const r of (ap.channels || [])) {
      const b = bandFromRadio(r);
      if (!b) continue;
      ownByBand[b].push({ ap: ap.name || ap.mac, mac: ap.mac, channel: r.channel, ht: r.ht, cu: r.cu_total ?? null });
    }
  }
  const neighByBand = { '2.4': [], '5': [], '6': [] };
  for (const n of neighbors) {
    const b = bandFromRadio(n);
    if (!b || !n.channel) continue;
    neighByBand[b].push({ ssid: n.ssid, channel: n.channel, rssi: n.rssi });
  }

  // 1a. 2.4 GHz: niet-1/6/11 → groot probleem
  for (const r of ownByBand['2.4']) {
    if (!NON_OVERLAP_24.includes(r.channel)) {
      pushAdv(out, 'crit', 'channel-plan',
        `${r.ap} draait op 2.4 GHz kanaal ${r.channel}`,
        `Op 2.4 GHz overlappen kanalen elkaar. Alleen 1, 6 en 11 zijn niet-overlappend in Europa. Kanaal ${r.channel} interfereert met buren én met je eigen AP's op aangrenzende kanalen.`,
        `Zet ${r.ap} 2.4 GHz radio op kanaal 1, 6 of 11 (kies de minst-bezette via spectrum-tab).`,
        [r.ap]);
    }
  }
  // 1b. 2.4 GHz: co-channel met eigen AP
  const c24map = new Map();
  for (const r of ownByBand['2.4']) {
    if (!c24map.has(r.channel)) c24map.set(r.channel, []);
    c24map.get(r.channel).push(r.ap);
  }
  for (const [ch, aps] of c24map) {
    if (aps.length > 1) {
      pushAdv(out, 'warn', 'channel-plan',
        `Eigen 2.4 GHz APs delen kanaal ${ch}`,
        `${aps.join(', ')} zenden op hetzelfde 2.4 GHz kanaal. Dit veroorzaakt co-channel interference (CCI) — clients die roaming doen krijgen verminderde throughput.`,
        `Spreid je APs over 1, 6 en 11.`,
        aps);
    }
  }
  // 1c. 5 GHz: co-channel
  const c5map = new Map();
  for (const r of ownByBand['5']) {
    if (!c5map.has(r.channel)) c5map.set(r.channel, []);
    c5map.get(r.channel).push(r.ap);
  }
  for (const [ch, aps] of c5map) {
    if (aps.length > 1) {
      pushAdv(out, 'warn', 'channel-plan',
        `Eigen 5 GHz APs delen kanaal ${ch}`,
        `${aps.join(', ')} zenden op kanaal ${ch}. Op 5 GHz heb je voldoende ruimte; co-channel is hier vermijdbaar.`,
        `Spreid over UNII-1 (36/40/44/48) + UNII-2/2e (DFS) + UNII-3 (149/153/157/161/165).`,
        aps);
    }
  }
  // 1d. 6 GHz: bestaat, maar wordt niet gebruikt? Check of er een 6E-capabele AP is zonder 6 GHz radio actief.
  const has6Radio = ownByBand['6'].length > 0;
  const has6CapableAp = ownAps.some(ap => /U7|U6.*EXT|UAP-AC.*HD|U6E|U7PRO|HALO|wifi7/i.test(ap.model || ''));
  if (!has6Radio && has6CapableAp) {
    pushAdv(out, 'info', 'channel-plan',
      '6 GHz band niet in gebruik',
      'Je hebt minstens één Wi-Fi 6E/7 capabele AP, maar geen 6 GHz SSID actief. 6 GHz biedt 160 MHz kanalen zonder DFS-onderbrekingen — significante doorvoer-winst voor moderne clients.',
      'Activeer een 6 GHz SSID (WPA3-required). Begin met kanaal 37 of 53 (160 MHz blokken).',
      ownAps.filter(a => /U7|U6E|HALO/i.test(a.model || '')).map(a => a.name || a.mac));
  }
  // 1e. Neighbor-druk per eigen kanaal
  for (const r of ownByBand['2.4']) {
    const competing = neighByBand['2.4'].filter(n => Math.abs((n.channel||0) - r.channel) <= 2);
    const strong = competing.filter(n => (n.rssi||-99) > -70).length;
    if (strong >= 3) {
      pushAdv(out, 'warn', 'channel-plan',
        `${r.ap} 2.4 GHz: ${strong} sterke buren op of nabij kanaal ${r.channel}`,
        `Buurt-APs op kanaal ${r.channel}±2 met RSSI > -70 dBm zijn ${strong} stuks. Dit duwt je ruisvloer omhoog en je uplink-rate omlaag.`,
        `Overweeg te wisselen naar het minst-drukke 1/6/11-kanaal — gebruik de SPECTRUM-tab.`,
        [r.ap]);
    }
  }

  // ─── 2. CHANNEL WIDTH (HT) ─────────────────────────────────────
  for (const r of ownByBand['2.4']) {
    if ((r.ht || 20) > 20) {
      pushAdv(out, 'warn', 'channel-width',
        `${r.ap} 2.4 GHz op ${r.ht} MHz`,
        `Kanaal-bonding (40 MHz) op 2.4 GHz pakt twee van de drie niet-overlappende kanalen, wat de hele band lamlegt.`,
        `Forceer 20 MHz op 2.4 GHz — UniFi: Settings → Wi-Fi → Advanced → Channel Width.`,
        [r.ap]);
    }
  }
  for (const r of ownByBand['5']) {
    if ((r.ht || 0) >= 160) {
      pushAdv(out, 'info', 'channel-width',
        `${r.ap} 5 GHz op 160 MHz`,
        `160 MHz op 5 GHz haakt aan op DFS-kanalen. Bij radar-detectie val je tijdelijk uit.`,
        `Voor stabiliteit liever 80 MHz op 5 GHz; 160 MHz reserveer je voor 6 GHz.`,
        [r.ap]);
    }
  }

  // ─── 3. DFS-gebruik ────────────────────────────────────────────
  for (const r of ownByBand['5']) {
    if (DFS_5GHZ(r.channel)) {
      pushAdv(out, 'info', 'dfs',
        `${r.ap} draait op DFS-kanaal ${r.channel}`,
        `Op DFS-kanalen (52-144) kan een radar-detectie (weer/luchtvaart) je AP tot 30 minuten van het kanaal duwen.`,
        `Acceptabel voor een AP die meerdere radios heeft of redundantie. Vermijd DFS op je drukste AP.`,
        [r.ap]);
    }
  }

  // ─── 4. FIRMWARE-updates ───────────────────────────────────────
  for (const ap of ownAps) {
    if (ap.firmwareLatest && ap.firmwareLatest !== ap.firmware) {
      pushAdv(out, 'warn', 'firmware',
        `${ap.name || ap.mac} firmware-update beschikbaar`,
        `Huidig: ${ap.firmware || '?'} → beschikbaar: ${ap.firmwareLatest}`,
        `Update via UniFi-controller (Devices → klik AP → Upgrade).`,
        [ap.name || ap.mac]);
    }
  }

  // ─── 5. MESH-kwaliteit (wireless uplinks) ──────────────────────
  for (const ap of ownAps) {
    const up = ap.uplink;
    if (up && up.type === 'wireless') {
      const rssi = up.rssi ?? up.signal ?? null;
      if (rssi != null && rssi < -68) {
        pushAdv(out, 'warn', 'mesh',
          `${ap.name} wireless mesh-uplink zwak (${rssi} dBm)`,
          `Mesh via ${up.parentName || up.parentMac}. RSSI < -68 dBm kost je ruwweg de helft van je uplink-snelheid en stijgt op piek-momenten verder.`,
          `Verplaats de AP dichter bij de parent, of leg een ethernet-kabel.`,
          [ap.name || ap.mac]);
      } else if (rssi != null && rssi < -75) {
        pushAdv(out, 'crit', 'mesh',
          `${ap.name} mesh-uplink kritiek zwak (${rssi} dBm)`,
          `Onder -75 dBm wordt mesh onbetrouwbaar.`,
          `Bekabel deze AP, of plaats een tussenliggende mesh-AP.`,
          [ap.name || ap.mac]);
      }
    }
  }

  // ─── 6. Dekking (clients met slechte RSSI) ─────────────────────
  const weakClients = devices.filter(d => d.rssi != null && d.rssi < -75 && !d.is_wired);
  if (weakClients.length >= 3) {
    pushAdv(out, 'warn', 'coverage',
      `${weakClients.length} clients met RSSI < -75 dBm`,
      `Deze clients zitten op de rand van bereik. Throughput is laag en roaming gaat slecht.`,
      `Plaats een extra AP nabij de "dode zone", of verhoog tx-power lokaal.`,
      weakClients.slice(0, 5).map(c => c.name || c.id));
  }

  // ─── 7. Band-steering (2.4 GHz clients die 5 GHz aankunnen) ────
  const on24 = devices.filter(d => {
    const r = String(d.radio || d.band || '').toLowerCase();
    return r === 'ng' || r === '2g' || d.channel === 1 || d.channel === 6 || d.channel === 11;
  }).filter(d => !d.is_wired);
  if (on24.length >= 5 && ownByBand['5'].length > 0) {
    pushAdv(out, 'info', 'band-steering',
      `${on24.length} clients op 2.4 GHz`,
      `Veel clients hangen op de tragere band. Moderne phones/laptops kunnen 5 GHz aan, maar kiezen 2.4 vanwege beter bereik.`,
      `Schakel "Prefer 5 GHz" + "Minimum RSSI" (rond -75 dBm) in op je SSID's. UniFi: Settings → Wi-Fi → SSID → Advanced.`,
      on24.slice(0, 5).map(c => c.name || c.id));
  }

  // ─── 8. Subrouters in netwerk ──────────────────────────────────
  const subrouters = devices.filter(d => d.subrouter);
  if (subrouters.length) {
    pushAdv(out, 'info', 'topology',
      `${subrouters.length} subrouter(s) gedetecteerd`,
      `Apparaten die zelf een eigen WiFi uitzenden: ${subrouters.slice(0,4).map(s => s.name || s.id).join(', ')}. Dit creëert vaak een "double NAT" en verstoort je dekkings-plan.`,
      `Schakel WiFi op deze subrouters uit (gebruik bridge/AP-mode), of integreer ze in UniFi.`,
      subrouters.map(s => s.name || s.id));
  }

  // ─── 9. WAN-status ─────────────────────────────────────────────
  if (payload.wan) {
    const w = payload.wan;
    if (w.uptime != null && w.uptime < 3600) {
      pushAdv(out, 'info', 'wan',
        `WAN-uptime kort: ${Math.round(w.uptime/60)} min`,
        `Je internetverbinding is recent herstart of had een onderbreking.`,
        `Check ISP-status als dit vaker voorkomt.`,
        []);
    }
  }

  // Sorteer: crit eerst, dan warn, dan info
  const order = { crit: 0, warn: 1, info: 2 };
  out.sort((a, b) => (order[a.severity] - order[b.severity]) || a.category.localeCompare(b.category));

  // Score berekenen (0-100): 100 - 25*crit - 8*warn - 1*info
  const counts = { crit: 0, warn: 0, info: 0 };
  for (const a of out) counts[a.severity]++;
  const score = Math.max(0, Math.min(100, 100 - 25 * counts.crit - 8 * counts.warn - 1 * counts.info));

  return { advice: out, counts, score, generatedAt: Date.now() };
}

module.exports = { analyse };
