[README.md](https://github.com/user-attachments/files/34803819/README.md)
# HR SMART OCR — Alpha.HR (Firebase Access Edition)

This version preserves the existing Liquid Glass OCR workspace and Tesseract.js English/Bangla scanning, and adds Firebase-backed trial access, OCR-code login, manual bKash payment requests, and an admin approval panel.

## Confirmed product rules
- Free trial: 3 days, 3 images/day, claim once per Firebase anonymous account.
- PRO: 7 days starting at the first successful OCR Code redemption, 16 scan authorizations per Bangladesh calendar day.
- OCR Code: 9 uppercase alphanumeric characters. The code is a reusable login credential for the same PRO account until expiry/revocation. Keep it private.
- bKash Personal: 01607400190. WhatsApp Admin: 01812478792.
- Suggested pack price in `js/app.js`: ৳49 (change `PACK_PRICE` and the displayed HTML price before publishing if you choose another price).
- Payment screenshot is uploaded privately to Firebase Storage. WhatsApp message includes the payment request ID and transaction details; it cannot automatically attach a local screenshot. Admin opens the screenshot securely in the admin dashboard.

## Important security notes
- GitHub Pages is only the frontend host. Never put Firebase Admin SDK credentials or secrets in frontend files.
- Entitlements, code redemption, payment approval and scan authorization are checked by Cloud Functions. Do not replace these with localStorage.
- OCR itself still runs locally in the visitor's browser for privacy. The app calls `authorizeScan` before each scan; a technically advanced user can still modify client-side OCR code, so this is not equivalent to server-side OCR enforcement. For strict metering, OCR processing must move to a trusted backend.
- Anonymous free trials are tied to a Firebase anonymous UID. Clearing browser data or using another browser/device can create a new anonymous account; this starter does not guarantee one-trial-per-human or IP blocking. App Check and additional abuse controls are recommended.
- Each scan authorization is counted before OCR begins. If the OCR engine fails after authorization, that attempt still consumes one daily scan.
- Cloud Functions deployment generally requires the Firebase project to be on the Blaze plan. Check current Firebase billing/pricing before enabling it.

## 1. Create / configure Firebase
1. The frontend is already configured for Firebase project `hr-smart-ocr` and `.firebaserc` already selects that project. Do not overwrite `js/firebase-config.js` unless you intentionally change projects.
2. In Firebase Console, confirm that the Web App shown under Project settings → General → Your apps matches project `hr-smart-ocr`.
3. Authentication → Sign-in method → enable **Anonymous** and **Email/Password**. Anonymous is for the free trial/payment guest session; Email/Password is only for the Admin panel.
4. Create a Firestore database.
5. Enable Firebase Storage.
6. `.firebaserc` is already set to `hr-smart-ocr`.
7. Create your admin user in Firebase Authentication with Email/Password.
8. Copy `functions/.env.example` to `functions/.env.hr-smart-ocr` and set `ADMIN_EMAILS` to the exact admin email (comma-separated if needed). This is required for the Admin panel to authorize your account.

## 2. Install and deploy backend
Install Node.js 20+ and Firebase CLI, then run from this project folder:

```bash
npm install -g firebase-tools
firebase login
cd functions && npm install && cd ..
firebase use hr-smart-ocr
firebase deploy --only firestore:rules,storage,functions
```

Deploy the frontend folder to the GitHub Pages repository root. Keep `index.html`, `css/`, and `js/` paths as they are. Cloud Functions region is `asia-southeast1`; the frontend calls the same region.

## 3. Admin workflow
1. Admin opens Account / Login → Open Admin Login.
2. Sign in with the verified email/password configured in Firebase Auth and listed in `ADMIN_EMAILS`.
3. View pending payment details and screenshot.
4. Verify bKash TXID in the bKash app/account before approving.
5. Click **Approve & Generate OCR Code**. Copy the generated 9-character code and send it to the customer manually (for example through WhatsApp).
6. The code's 7-day countdown starts only when the customer first logs in with it.

## 4. User workflow
- First visit: Account / Login → Claim 3-Day Free Trial, or click Claim Free Trial.
- Paid: Get 7-Day PRO → pay bKash 01607400190 → submit sender number, TXID and screenshot → WhatsApp opens with details → wait for Admin approval and code.
- After receiving code: Account / Login → enter OCR Code → Login.

## 5. Before production
- Change `PACK_PRICE` in `js/app.js` and the `৳49` text in `index.html` and the server-side `amount:49` in `functions/index.js` to your final chosen price. Keep these three values in sync (frontend `PACK_PRICE`, Cloud Function amount, and displayed price). The current ৳49 is a suggested placeholder, not a payment gateway amount.
- Test trial, code activation, expiry, daily reset (Bangladesh time), payment screenshot, admin approval and revoke flows with test accounts.
- Consider enabling Firebase App Check (reCAPTCHA Enterprise or supported provider) and rate limiting.
- Set an explicit Firebase budget alert.
