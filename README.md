# HR Smart OCR

A simple GitHub Pages OCR website with:
- Name + 9-character OCR Code login
- Lifetime access flag for each code
- Automatic login on the same browser
- English, Bangla, and mixed OCR
- Upload image, camera capture, drag-and-drop
- Copy result and download TXT

## 1. Create Firebase project
1. Open https://console.firebase.google.com/ and create a project.
2. Add a Web App and copy its Firebase configuration.
3. Open `js/firebase-config.js` and replace all placeholder values.
4. In Firebase Console, create a **Cloud Firestore** database.

## 2. Add OCR Codes
In Firestore, create a collection named `ocrCodes`.
For each code, create a document whose document ID is the exact 9-character code, for example `OUYEC93NR`.
Add these fields:
- `active` — Boolean — `true`

To disable a code later, change `active` to `false`.

## 3. Firestore rules (basic starter)
Open Firestore > Rules and publish:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /ocrCodes/{code} {
      allow get: if true;
      allow list, create, update, delete: if false;
    }
  }
}
```

**Important:** This is a simple starter setup. Because the code check runs in the browser, a technically skilled visitor could inspect the public code documents. For stronger code protection, replace direct Firestore reads with a Firebase Cloud Function/API before selling codes at scale. Never store payment details or private customer data in this collection.

## 4. Publish on GitHub Pages
1. Create a GitHub repository named `HR-SMART-OCR`.
2. Upload all files and folders from this ZIP.
3. Open repository Settings > Pages.
4. Under Build and deployment, choose **Deploy from a branch**.
5. Select `main` and `/ (root)`, then Save.
6. Open the published URL. The first login needs internet access.

## Notes
- OCR uses Tesseract.js from a CDN and downloads language data when needed, so internet is required.
- OCR speed depends on image size, device, and connection. A result within 5 seconds cannot be guaranteed for every image.
- The login name is saved locally in that browser. Clearing browser data or changing browser/device requires logging in again.
- The 9-character format is 3 letters + 3 digits + 3 letters (example: `OUYEC93NR`). If you want a different exact pattern, change the validation in `js/activation.js`.
- This project does not include an admin panel or code generator; add code documents manually in Firestore.
