// db.js — lichte SQLite-store voor historische radio/band-stats.
// Gebruikt better-sqlite3 (sync API). Bij ontbreken → no-op (log warning).
const path = require('path');
const fs = require('fs');

let Database;
try { Database = require('better-sqlite3'); }
catch (_) { Database = null; }

const DB_PATH = process.env.DB_PATH || path.join(__dirname, 'data.db');
const RETENTION_DAYS = Number(process.env.RETENTION_DAYS || 7);

let db = null;

function init() {
  if (!Database) {
    console.warn('[db] better-sqlite3 niet geïnstalleerd — historie uit. Run: npm install');
    return false;
  }
  db = new Database(DB_PATH);
  db.pragma('journal_mode = WAL');
  db.pragma('synchronous = NORMAL');
  db.exec(`
    CREATE TABLE IF NOT EXISTS radio_stats (
      ts          INTEGER NOT NULL,
      ap_mac      TEXT NOT NULL,
      ap_name     TEXT,
      band        TEXT,        -- '2.4' | '5' | '6'
      channel     INTEGER,
      ht          INTEGER,
      cu_total    INTEGER,
      cu_self_tx  INTEGER,
      cu_self_rx  INTEGER,
      n_users     INTEGER,
      tx_power    INTEGER
    );
    CREATE INDEX IF NOT EXISTS ix_rs_ts        ON radio_stats(ts);
    CREATE INDEX IF NOT EXISTS ix_rs_ap_band   ON radio_stats(ap_mac, band, ts);

    CREATE TABLE IF NOT EXISTS band_snapshot (
      ts        INTEGER NOT NULL PRIMARY KEY,
      c_24      INTEGER NOT NULL DEFAULT 0,
      c_5       INTEGER NOT NULL DEFAULT 0,
      c_6       INTEGER NOT NULL DEFAULT 0,
      total     INTEGER NOT NULL DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS client_snapshot (
      ts        INTEGER NOT NULL,
      mac       TEXT NOT NULL,
      name      TEXT,
      ap_mac    TEXT,
      ssid      TEXT,
      band      TEXT,
      channel   INTEGER,
      rssi      INTEGER,
      tx_rate   INTEGER,
      rx_rate   INTEGER,
      tx_bytes  INTEGER,
      rx_bytes  INTEGER
    );
    CREATE INDEX IF NOT EXISTS ix_cs_ts ON client_snapshot(ts);
  `);
  console.log('[db] history aan — ' + DB_PATH);
  return true;
}

function bandFromRadioName(name) {
  if (!name) return null;
  const n = String(name).toLowerCase();
  if (n === 'wifi0' || n === 'ra0' || n === 'ng' || n === '2g') return '2.4';
  if (n === 'wifi1' || n === 'rai0' || n === 'na' || n === '5g') return '5';
  if (n === 'wifi2' || n === '6e' || n === '6g') return '6';
  return null;
}

const insertRadioStmt = () => db.prepare(`
  INSERT INTO radio_stats (ts, ap_mac, ap_name, band, channel, ht, cu_total, cu_self_tx, cu_self_rx, n_users, tx_power)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
`);
const insertBandStmt = () => db.prepare(`
  INSERT OR REPLACE INTO band_snapshot (ts, c_24, c_5, c_6, total)
  VALUES (?, ?, ?, ?, ?)
`);

/**
 * Schrijf één snapshot weg per AP-radio + één band-aggregatie.
 * @param {object} apChannels  shapeApChannels-output (key=mac, value={name,channels:[]})
 * @param {Array}  clients     shape-output (id,band,...)
 */
function writeSnapshot(apChannels, clients) {
  if (!db) return;
  const ts = Math.floor(Date.now() / 1000);
  const insR = insertRadioStmt();
  const tx = db.transaction(() => {
    for (const [mac, ap] of Object.entries(apChannels || {})) {
      for (const r of (ap.channels || [])) {
        const band = bandFromRadioName(r.radio_name || r.band);
        insR.run(
          ts, mac, ap.name || null, band,
          r.channel ?? null, r.ht ?? null,
          r.cu_total ?? null, r.cu_self_tx ?? null, r.cu_self_rx ?? null,
          r.n_users ?? null, r.tx_power ?? null
        );
      }
    }
  });
  try { tx(); } catch (e) { console.error('[db] write radio:', e.message); }

  // Client-snapshot
  const insC = db.prepare(`
    INSERT INTO client_snapshot (ts, mac, name, ap_mac, ssid, band, channel, rssi, tx_rate, rx_rate, tx_bytes, rx_bytes)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  const tx2 = db.transaction(() => {
    for (const c of clients || []) {
      const radio = String(c.radio || c.band || '').toLowerCase();
      const band = (radio === '6e' || radio === '6g' || radio.includes('_6')) ? '6'
                 : (radio === 'ng' ? '2.4'
                 : (radio === 'na' ? '5' : null));
      insC.run(ts, c.id || '', c.name || null, c.ap || null, c.ssid || null,
        band, c.channel ?? null, c.rssi ?? null,
        c.tx ?? null, c.rx ?? null, c.txBytes ?? null, c.rxBytes ?? null);
    }
  });
  try { tx2(); } catch (e) { console.error('[db] write clients:', e.message); }

  // Band-aggregatie. Voorkeur: het eenduidige `radio`-veld ('ng'/'na'/'6e').
  // Fallback op `band` (radio_proto) voor oudere shape-payloads.
  let c24=0, c5=0, c6=0;
  for (const c of clients || []) {
    const r = String(c.radio || '').toLowerCase();
    const b = String(c.band || '').toLowerCase();
    if (r === '6e' || r === '6g' || /6/.test(r)) c6++;
    else if (r === 'ng') c24++;
    else if (r === 'na') c5++;
    else if (b.includes('_6') || b === '6e' || b === '6g') c6++;
    else if (b === 'ng' || b === 'b' || b === 'g' || b === 'n') c24++;
    else c5++;
  }
  const total = c24 + c5 + c6;
  try { insertBandStmt().run(ts, c24, c5, c6, total); }
  catch (e) { console.error('[db] write band:', e.message); }
}

function pruneOld() {
  if (!db) return;
  const cutoff = Math.floor(Date.now() / 1000) - RETENTION_DAYS * 86400;
  try {
    const r1 = db.prepare('DELETE FROM radio_stats     WHERE ts < ?').run(cutoff);
    const r2 = db.prepare('DELETE FROM band_snapshot   WHERE ts < ?').run(cutoff);
    const r3 = db.prepare('DELETE FROM client_snapshot WHERE ts < ?').run(cutoff);
    if (r1.changes || r2.changes || r3.changes) {
      console.log(`[db] prune: ${r1.changes} radio + ${r2.changes} band + ${r3.changes} client rows ouder dan ${RETENTION_DAYS}d`);
    }
  } catch (e) { console.error('[db] prune:', e.message); }
}

// ── Queries ───────────────────────────────────────────────────────────
function radioTrend({ ap, band, hours = 24 } = {}) {
  if (!db) return [];
  const since = Math.floor(Date.now() / 1000) - hours * 3600;
  const where = ['ts >= ?']; const args = [since];
  if (ap)   { where.push('(ap_name = ? OR ap_mac = ?)'); args.push(ap, ap); }
  if (band) { where.push('band = ?'); args.push(String(band)); }
  return db.prepare(`
    SELECT ts, ap_name, band, channel, cu_total AS util,
           cu_self_tx AS self_tx, cu_self_rx AS self_rx,
           n_users AS clients
    FROM radio_stats
    WHERE ${where.join(' AND ')}
    ORDER BY ts ASC
  `).all(...args);
}

function bandTrend({ hours = 24 } = {}) {
  if (!db) return [];
  const since = Math.floor(Date.now() / 1000) - hours * 3600;
  return db.prepare(`
    SELECT ts, c_24, c_5, c_6, total
    FROM band_snapshot
    WHERE ts >= ?
    ORDER BY ts ASC
  `).all(since);
}

function bandLatest() {
  if (!db) return null;
  return db.prepare(`
    SELECT ts, c_24, c_5, c_6, total
    FROM band_snapshot
    ORDER BY ts DESC LIMIT 1
  `).get() || null;
}

// ── Time Machine: reconstruct full state at given ts ──
function snapshotAt({ ts, windowSec = 90 } = {}) {
  if (!db) return null;
  if (!ts) ts = Math.floor(Date.now() / 1000);
  // Vind dichtstbijzijnde snapshot binnen ±windowSec
  const lo = ts - windowSec, hi = ts + windowSec;
  // Radio stats: voor ELKE AP-radio, kies de rij met ts dichtst bij target
  const radios = db.prepare(`
    SELECT r.* FROM radio_stats r
    INNER JOIN (
      SELECT ap_mac, band, MIN(ABS(ts - ?)) AS dt
      FROM radio_stats
      WHERE ts BETWEEN ? AND ?
      GROUP BY ap_mac, band
    ) m ON m.ap_mac = r.ap_mac AND m.band = r.band AND ABS(r.ts - ?) = m.dt
  `).all(ts, lo, hi, ts);

  const clients = db.prepare(`
    SELECT c.* FROM client_snapshot c
    INNER JOIN (
      SELECT mac, MIN(ABS(ts - ?)) AS dt
      FROM client_snapshot
      WHERE ts BETWEEN ? AND ?
      GROUP BY mac
    ) m ON m.mac = c.mac AND ABS(c.ts - ?) = m.dt
  `).all(ts, lo, hi, ts);

  const band = db.prepare(`
    SELECT * FROM band_snapshot
    WHERE ABS(ts - ?) <= ?
    ORDER BY ABS(ts - ?) ASC
    LIMIT 1
  `).get(ts, windowSec, ts) || null;

  return { ts, radios, clients, band, foundClients: clients.length, foundRadios: radios.length };
}

function snapshotRange({ from, to, stepSec = 300 } = {}) {
  if (!db) return [];
  if (!from || !to) {
    to = Math.floor(Date.now() / 1000);
    from = to - 86400;
  }
  // Per stepSec-bucket de bandsnapshot + totaal aantal clients/aps
  return db.prepare(`
    SELECT
      (ts / ?) * ? AS bucket,
      AVG(c_24) AS c_24, AVG(c_5) AS c_5, AVG(c_6) AS c_6, AVG(total) AS total
    FROM band_snapshot
    WHERE ts BETWEEN ? AND ?
    GROUP BY bucket
    ORDER BY bucket ASC
  `).all(stepSec, stepSec, from, to);
}

module.exports = {
  init, writeSnapshot, pruneOld,
  radioTrend, bandTrend, bandLatest,
  snapshotAt, snapshotRange,
  isReady: () => !!db,
};
