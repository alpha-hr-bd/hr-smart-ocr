[Uploading README.md…]()
# HR Smart OCR — Alpha.HR

Bangla ও English image-to-text OCR web app. Legacy Tesseract.js v5 browser OCR engine সংরক্ষিত। Firebase Authentication, Cloud Functions, Firestore ও Storage দিয়ে account access এবং manual bKash payment workflow পরিচালিত হয়।

## Features
- JPG / PNG / WEBP / BMP, drag-drop, preview, remove, clear; max 15 MB
- English, Bangla, English + Bangla OCR; Original / Contrast Boost
- Progress, editable output, word/character count, copy, UTF-8 TXT download
- Legacy guest trial: 3 days, 3 scans/day
- 9-character OCR code; first redemption থেকে 7-day PRO starts
- ৳20 manual bKash payment request; screenshot upload; duplicate TXID lock
- Admin allowlist-based payment review and approve/reject
- Maintenance callable and public settings backend

## Known boundaries
- Tesseract.js core and trained language files load from CDN. Internet is required; this is not an offline app.
- Live Firebase deployment and live payment verification were not performed from this environment.
- Legacy trial remains enabled by default (3 days / 3 scans/day); confirm this business policy before launch.
- PRO daily limit defaults to 16. bKash number is intentionally blank until configured.
- Admin email allowlist is checked in Cloud Functions. Admin account must exist in Firebase Authentication.
- This delivery upgrades OCR, access, payment submit/history, approve/reject and maintenance backend. A full customer CRUD, notice/announcement visual manager, analytics dashboard and security-log UI are not yet implemented; do not advertise those as live features.

## Setup (বাংলা)
1. Firebase Console-এ project তৈরি করুন। Authentication-এ Anonymous এবং Email/Password enable করুন। Firestore ও Storage চালু করুন।
2. Project Settings → Web App থেকে config নিয়ে `js/firebase-config.js`-এ বসান। Web config public; private service-account key কখনো frontend-এ দেবেন না।
3. Node.js 20 install করে Firebase CLI দিন:
```bash
npm install -g firebase-tools
firebase login
firebase use --add
```
4. `functions/.env.<PROJECT_ID>` তৈরি করুন:
```env
ADMIN_EMAILS=admin@example.com
```
এই email Firebase Authentication-এর admin account-এর email হতে হবে। `.env` GitHub-এ push করবেন না।
5. Deploy:
```bash
cd functions && npm install && cd ..
firebase deploy --only functions,firestore:rules,firestore:indexes,storage
```
6. GitHub repository root-এ `index.html`, `css/`, `js/` push করুন। GitHub → Settings → Pages → Deploy from branch → `main` / root। GitHub Pages domain Firebase Authentication authorized domains-এ যোগ করুন। Firebase Functions GitHub Pages-এ host হয় না; Firebase-এ আলাদা deploy হয়।
7. bKash number set না করা পর্যন্ত payment নেওয়া যাবে না। `adminSetPublicSettings` trusted admin callable দিয়ে `bkashNumber`, `dailyLimit`, `trialEnabled` সেট করুন।
8. Payment approve করার আগে bKash statement-এ TXID verify করুন। কোনো অবস্থায় PIN/OTP চাইবেন না।

## Local preview
```bash
npx serve .
```

## Test before launch
- OCR: Bangla/English/combined, formats, 15 MB, contrast, copy, Bangla TXT
- Firebase: guest trial once, OCR code redeem, expiry, daily quota
- Payment: screenshot path/type/size, duplicate TXID, pending, approve, reject
- Security: customer cannot write Firestore privileged collections; Storage proof files not publicly readable
- Emulator Suite দিয়ে rules ও callable functions test করুন।

**Developed & Managed by Alpha.HR**
