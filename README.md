# AETHER

**Wireless Network Intelligence Console** for UniFi controllers.

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)
[![Node](https://img.shields.io/badge/node-%E2%89%A518-green)](https://nodejs.org)
[![Built with Claude Code](https://img.shields.io/badge/built%20with-Claude%20Code-bc8cff.svg)](https://claude.com/claude-code)
[![Status](https://img.shields.io/badge/status-beta-orange.svg)](#disclaimer)

> Built by [zero0f4](https://github.com/zero0f4) with [Claude Code](https://claude.com/claude-code).

AETHER reads live data from a UniFi Dream Machine / Cloud Key / Network Application and renders a complete RF observability surface: a particle-flow topology, a 2.4/5/6 GHz spectrum analyzer, internal/external network reconnaissance, an RF advisor, and a tagged-clients store. Everything runs locally; no telemetry, no external services unless you explicitly enable WiGLE lookups.

---

## ⚠ Disclaimer

**AETHER is in active beta. Bugs, breaking changes, and unfinished features are expected.** Do not use it as your sole monitoring tool. Built primarily for personal/lab use; not security-audited for hostile environments.

The repository deliberately ships **without screenshots**. AETHER's UI exposes BSSIDs, MAC addresses, neighbor SSIDs, WAN IPs and other data that is sensitive when published. To preview the console, run it locally against your own controller — there is no hosted demo.

---

## Features

### Core observability
- **PULSE** — live topology with draggable APs/UDM/WAN, particle streams per device colored by band (2.4 / 5 / 6 GHz), mesh-uplink visualization, sub-router detection.
- **INTERN** — own APs (with firmware/IP/uptime/CVE-status placeholder), AP Activity DNA (24h utilization heatmap per AP/band), live + offline clients, roaming events, KPIs (top talkers, AP load, band split, RSSI distribution, channel utilization, handover matrix, WAN flow/latency).
- **EXTERN** — neighborhood APs (rogue/disturbing detection), transient stations (privacy-MAC / unknown-vendor / short-session passers).
- **SPECTRUM** — fullscreen analyzer for 2.4 GHz (bell-curves), 5 GHz (DFS marked), 6 GHz.
- **EVENTS** — radar-style alerts view (anomalies, weak clients, rogue APs, firmware updates, reboots).

### Intelligence
- **ADVISOR** — analyzes live state and produces concrete recommendations across nine categories: channel plan (1/6/11 on 2.4, co-channel detection, 6 GHz adoption), channel width (HT 20/40/80/160), DFS usage, firmware updates, mesh uplink quality, coverage gaps, band-steering effectiveness, topology (sub-routers), WAN. Health-score 0–100.
- **OUI vendor lookup** — local IEEE database (~6 MB, 39 000 prefixes); identifies device type and provider.
- **Provider detection by SSID** — Ziggo / KPN / Tele2 / Odido / DELTA / XS4ALL / Caiway / Freedom Internet (NL providers) with branded SVG logos.
- **Device classification** — 60+ device types: smartphones (Apple / Samsung / Xiaomi / OnePlus / Huawei / Pixel), TVs (LG / Sony / NVIDIA Shield / Roku), consoles (PS / Xbox / Switch), NAS (Synology / QNAP), printers, smart-home (Hue / IKEA Trådfri / Ring / tado° / Sonos / Shelly / Sonoff), white goods (LG/Samsung washers, dryers, fridges, ovens, soundbars).
- **WiGLE wardrive lookup** — optional global BSSID lookup against [wigle.net](https://wigle.net). Bring your own API token.

### Forensic & history
- **Time Machine** — slide through network history (radio stats, client snapshots; 7-day retention by default in local SQLite).
- **Notes** — tag and annotate any BSSID or client MAC (`buurman`, `kantoor`, `verdacht`, custom text). Persisted in SQLite.

### Privacy & security
- All UniFi traffic stays on your LAN.
- Optional `AUTH_TOKEN` / `READONLY_TOKEN` to gate the API/UI when reverse-proxying.
- `.env` is mode 0600 and `.gitignore`d.
- Local OUI database — no external API calls for vendor lookup.

---

## Quick start

```bash
git clone https://github.com/zero0f4/aether.git
cd aether
npm install

# Optional but recommended: download the IEEE OUI database for vendor lookup
curl -sL https://standards-oui.ieee.org/oui/oui.txt -o oui.txt

npm start
```

Open <http://localhost:3033>. The first run redirects you to `/setup` to configure the UniFi controller.

### Setup wizard

The setup page (`/setup`) is sectioned into:

1. **UniFi controller** (required) — host, username, password, site. Use a **read-only local admin** in the UniFi controller (`Settings → Admins & Users → Create New Admin → Restrict to local access only → View Only`). AETHER never needs write access.
2. **Server & data retention** (optional) — HTTP port, poll interval, retention days for historical SQLite data.
3. **WiGLE.net wardrive lookup** (optional) — paste your userId/token from <https://wigle.net/account>.
4. **Access control** (optional) — generate full-access / read-only API tokens.

---

## Configuration

All configuration lives in `.env` (chmod 0600). The setup wizard writes this file for you.

| Variable | Default | Purpose |
|---|---|---|
| `UDM_HOST` | — | IP/hostname of UniFi controller (required) |
| `UDM_USER` | — | UniFi local read-only admin (required) |
| `UDM_PASS` | — | Password (required) |
| `UDM_SITE` | `default` | Site name |
| `PORT` | `3033` | HTTP port |
| `POLL_MS` | `1500` | Poll frequency in ms |
| `RETENTION_DAYS` | `7` | Days of history kept in `data.db` |
| `WIGLE_USER` | — | WiGLE userId (optional) |
| `WIGLE_KEY` | — | WiGLE API token (optional) |
| `AUTH_TOKEN` | — | Bearer token for full API access (optional) |
| `READONLY_TOKEN` | — | Bearer token for read-only access (optional) |

---

## API

| Endpoint | Method | Purpose |
|---|---|---|
| `/api/state` (WebSocket) | WS | Live network state stream |
| `/api/health` | GET | Health/status |
| `/api/setup/current` | GET | Current settings (no secrets) |
| `/api/setup/test` | POST | Test UniFi credentials |
| `/api/setup/save` | POST | Persist `.env` and restart |
| `/api/clients/all` | GET | All clients (incl. offline last-24h) |
| `/api/clients/transient` | GET | Privacy-MAC / unknown-vendor / short-session clients |
| `/api/trends/radio` | GET | Radio utilization history |
| `/api/trends/bands/now` | GET | Current band split |
| `/api/timetravel?ts=...` | GET | Snapshot at timestamp |
| `/api/intel/vendor?mac=...` | GET | OUI vendor lookup |
| `/api/intel/classify` | POST | Bulk vendor + kind classification |
| `/api/wigle/bssid?bssid=...` | GET | WiGLE wardrive lookup (requires creds) |
| `/api/notes/:key` | GET/PUT/DELETE | Notes/tags on BSSID/MAC |
| `/api/advisor` | GET | RF & config recommendations |

---

## UniFi endpoints used (read-only)

- `/api/auth/login`
- `/proxy/network/api/s/{site}/stat/sta` — connected stations
- `/proxy/network/api/s/{site}/stat/alluser` — historical clients
- `/proxy/network/api/s/{site}/stat/rogueap` — neighbor APs
- `/proxy/network/api/s/{site}/stat/health` — WAN/system
- `/proxy/network/api/s/{site}/stat/device` — own APs incl. `radio_table_stats`

---

## Architecture

- **Backend** Node 18+, Express, `ws`, `undici`, `better-sqlite3`.
- **Frontend** vanilla Canvas + DOM. No bundler, no framework.
- **Storage** Local SQLite (`data.db`, WAL mode) for history; localStorage for UI prefs/positions.
- **Auth** optional bearer-token middleware on the API.

```
                ┌────────────────────────┐
                │  UniFi Controller      │
                │  (UDM / UDR / UCK)     │
                └──────────┬─────────────┘
                  REST + login (HTTPS)
                           │
            ┌──────────────▼──────────────┐
            │  AETHER server (Node)        │
            │  ─ poll loop (1.5 s default) │
            │  ─ SQLite history            │
            │  ─ intel.js (OUI / classify) │
            │  ─ advisor.js                │
            └──────────────┬──────────────┘
                           │  WebSocket
            ┌──────────────▼──────────────┐
            │  Browser console (Canvas)    │
            │  PULSE / INTERN / EXTERN /   │
            │  SPECTRUM / ADVISOR / EVENTS │
            └──────────────────────────────┘
```

---

## Roadmap

- CPE-based CVE matching for AP firmware (current keyword-based scanner is too noisy)
- Optional monitor-mode sensor input (Pi + Alfa USB) for *real* foreign-AP client detection
- Theme tokens beyond the current dark RF-green palette

---

## Privacy

- All traffic between AETHER and your UniFi controller stays on your LAN.
- WiGLE lookups (if you enable them) send only the BSSID being looked up — nothing else.
- No telemetry, no analytics, no external assets at runtime (logos are bundled SVG).

---

## License

[MIT](LICENSE).

---

Built with [Claude Code](https://claude.com/claude-code) by [zero0f4](https://github.com/zero0f4).
