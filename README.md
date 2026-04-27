# 🌊 WiFi-pulse

**Live UniFi netwerk-visualisatie — organische deeltjeswolk per device, lokaal.**

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)
[![Node](https://img.shields.io/badge/node-%E2%89%A518-green)](https://nodejs.org)
[![Built with Claude Code](https://img.shields.io/badge/built%20with-Claude%20Code-bc8cff.svg)](https://claude.com/claude-code)

> Built by [zero0f4](https://github.com/zero0f4) with [Claude Code](https://claude.com/claude-code).

WiFi-pulse leest realtime data uit je UniFi Dream Machine en tekent een sleepbare topology met TorFlow-stijl streams, een 2.4/5 GHz spectrum-analyzer en een uitgebreide stats-pagina. Geen externe diensten, alles lokaal.

## Features

- **Sleepbare topology** met UDM, WAN, AP's en clients
- **TorFlow-stijl streams** (deeltjes-flow per band, throughput-gestuurd)
- **Spectrum-analyzer** 2.4 GHz (bel-curves) + 5 GHz (DFS-zone gemarkeerd)
- **Hover-tooltips** met SSID, RSSI, kanaal, OS, OUI, throughput
- **Roaming detection** met visuele arc tussen oude en nieuwe AP
- **STATS-tab**: top talkers, AP-load radar, band-split donut, WAN sparklines, kanaal-bezetting, RSSI-histogram, roaming log
- **NL/EN UI** + posities/prefs in localStorage
- **Single-instance lock** — voorkomt cookie-kaping door stale processen
- **Sharp HiDPI rendering** op Retina-displays

## Installatie

```bash
git clone https://github.com/<your-username>/wifi-pulse.git
cd wifi-pulse
npm install
cp .env.example .env
# Vul UDM_HOST/UDM_USER/UDM_PASS in (lokale UniFi user, read-only is genoeg)
npm start
```

Open <http://localhost:3033>.

## Configuratie (.env)

| Var | Default | Doel |
|---|---|---|
| `UDM_HOST` | — | IP van je UniFi controller (verplicht) |
| `UDM_USER` | — | UniFi local user (read-only ok) |
| `UDM_PASS` | — | Wachtwoord |
| `UDM_SITE` | `default` | Site-naam |
| `PORT` | `3033` | HTTP-poort |
| `POLL_MS` | `3000` | Poll-frequentie in ms |

## UniFi-endpoints (read-only)

- `/api/auth/login`
- `/proxy/network/api/s/{site}/stat/sta` — clients
- `/proxy/network/api/s/{site}/stat/rogueap` — externe APs
- `/proxy/network/api/s/{site}/stat/health` — WAN
- `/proxy/network/api/s/{site}/stat/device` — eigen APs (radio_table_stats)

## Toetsen

- `S` — toggle PULSE/STATS
- `Esc` — terug naar PULSE
- Klik+sleep AP/UDM/WAN — verplaatsen
- Dubbelklik gepinde node — unpin

## Privacy

- Alles draait lokaal. Niets verlaat je netwerk.
- `.env` met UDM-credentials staat in `.gitignore` — niet commiten.
- Geen telemetrie.

## Licentie

MIT. Zie [LICENSE](LICENSE).

---

🤖 Built with [Claude Code](https://claude.com/claude-code) by [zero0f4](https://github.com/zero0f4).
