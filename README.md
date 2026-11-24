# StaffClock · NYEWASCO

## Run
1. Put all files in this folder structure.
2. Start a local server in the folder:
   `npx serve .`   (or `python3 -m http.server 8080`)
3. Open the printed URL (e.g. http://localhost:3000) in Chrome/Edge.

Works instantly in Demo mode. To go live:
1. Create a Supabase project → SQL Editor → paste `SQL_SCHEMA` from js/data.js and run it.
2. Settings (gear icon) → paste Project URL + anon key → Connect & sync.
3. Push demo data → the supervisor dashboard streams punches in realtime.

## Files
- `index.html` — shell + vendor libraries (React, Leaflet, Chart.js, QRCode, Supabase)
- `css/styles.css` — full design system
- `js/utils.js` — helpers (time, geo, storage, CSV download)
- `js/sound.js` — WebAudio chimes
- `js/data.js` — seed employees, punches, SQL schema
- `js/store.js` — shared React context
- `js/components/*` — UI modules (maps, charts, station, supervisor, drawers, modals)
- `js/App.jsx` — state, geolocation, punch engine, Supabase sync
- `js/main.jsx` — bootstrap