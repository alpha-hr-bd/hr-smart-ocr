[README.md](https://github.com/user-attachments/files/34802582/README.md)[Uploading REA# HR Smart OCR — Liquid Glass Edition
Created by Alpha.HR.

## Project files
- `index.html` — page structure and Tesseract.js v5 CDN loader
- `css/style.css` — responsive Liquid Glass UI
- `js/app.js` — OCR worker reuse, upload, progress, copy/download, trial UI and plan buttons

## Publish on GitHub Pages
Upload `index.html`, `css/`, and `js/` to the repository root. Then open Settings → Pages → Deploy from a branch → `main` → `/ (root)` → Save.

## Performance
The app reuses a Tesseract worker for repeated scans in the same language. Browser caching may speed up later scans. A 4–5 second result cannot be guaranteed; OCR time depends on image dimensions, device CPU, amount of text, language data download and cache state. The first scan can take significantly longer.

## Trial and IP limits — important
The 3-day / 3-images-per-day trial is implemented as a frontend demo counter using localStorage. It is NOT secure and does NOT block an IP. Users can reset it by clearing site data, switching browsers/devices, or changing client-side storage. GitHub Pages cannot enforce IP bans, paid entitlements or secure quotas. For real IP/device limits, subscriptions, payment and account activation, add a backend and validate every scan server-side (for example Firebase/Supabase with server-side functions).

## Displayed plans
Free trial: 3 days, 3 scans/day
21 days: ৳79, 30 scans/day
45 days: ৳149, 60 scans/day
60 days: ৳190, 90 scans/day
90-day Master: ৳222, 90 scans/day
Renewal: ৳100/month, 150 scans/day
Purchase buttons currently only show a coming-soon message. No payment is taken or plan activated.
Payment software target date shown: 27/12/2026.

## OCR library
Tesseract.js v5 is loaded from jsDelivr CDN. English and Bengali traineddata are fetched from the Tesseract traineddata CDN when needed.
DME.md…]()
