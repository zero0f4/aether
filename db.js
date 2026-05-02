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
    const r1 = db.prepare('DELETE FROM radio_stats   WHERE ts < ?').run(cutoff);
    const r2 = db.prepare('DELETE FROM band_snapshot WHERE ts < ?').run(cutoff);
    if (r1.changes || r2.changes) {
      console.log(`[db] prune: ${r1.changes} radio + ${r2.changes} band rows ouder dan ${RETENTION_DAYS}d`);
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

module.exports = {
  init, writeSnapshot, pruneOld,
  radioTrend, bandTrend, bandLatest,
  isReady: () => !!db,
};
