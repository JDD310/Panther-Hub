# Panther Hub

A three-page Campus Life Super App for LaGrange College students: check the weather, see which dining spots are open right now, and find buildings and study spots on an interactive map.

> Student project, not an official LaGrange College site.

**Live site:** _[add GitHub Pages URL after deploy — PH-16]_

## Status: MVP (Unit 12)

| Page | Working now | Coming in the Final release |
| --- | --- | --- |
| **Dashboard** (`index.html`) | Greeting + live clock, Open-Meteo weather with 5-day forecast (loading/error/retry), "Dining right now" with live status, quick links | My saved spots, dark mode |
| **Dining** (`dining.html`) | Location cards with OPEN/CLOSED badge + countdown, weekly hours table with location picker | Search / meal / open-now filters, favorites |
| **Campus Map** (`map.html`) | Leaflet + OpenStreetMap map, numbered pins, clickable results list, detail panel, Directions link | Search + category filtering, Save spot |

The filter bars, star buttons, Save spot button, and dark-mode toggle are already in the markup with placeholder event listeners, so the planned features are visible on the page.

## Tech

- HTML, CSS, JavaScript (no build step)
- [Bootstrap 5.3](https://getbootstrap.com/) + Bootstrap Icons via CDN
- [Open-Meteo](https://open-meteo.com/) weather API (free, no key)
- [Leaflet](https://leafletjs.com/) with [OpenStreetMap](https://www.openstreetmap.org/) tiles (free, no key)

## Project structure

```
index.html          Dashboard
dining.html         Dining
map.html            Campus Map
css/styles.css      theme variables, components, responsive rules
js/common.js        shared fetch, localStorage, and dining hours logic
js/dashboard.js     clock, weather API, dining-now
js/dining.js        dining cards, countdowns, weekly hours table
js/map.js           Leaflet map, markers, list, detail panel
data/dining.json    dining hours (placeholder — verify before submitting)
data/locations.json map places (placeholder — verify before submitting)
docs/wireframes/    wireframe PDF
```

## Run locally

`fetch()` can't load the JSON files over `file://`, so use a local server:

```bash
python3 -m http.server 8000
# then open http://localhost:8000
```

or use the VS Code Live Server extension.

## Known TODOs before MVP submission

- Replace placeholder hours in `data/dining.json` with verified hours (Jira PH-5)
- Replace placeholder places and coordinates in `data/locations.json` (Jira PH-6)
- Set the real quick-link URLs in `index.html` (Jira PH-11)
- Deploy to GitHub Pages and add the live URL above (Jira PH-16)
