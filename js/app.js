/* HR Smart OCR — Alpha.HR. Firebase-backed access + local Tesseract OCR. */
import { initializeApp } from "https://www.gstatic.com/firebasejs/12.5.0/firebase-app.js";
import {
  getAuth,
  onAuthStateChanged,
  signInAnonymously,
  signInWithCustomToken,
  signInWithEmailAndPassword,
  signOut
} from "https://www.gstatic.com/firebasejs/12.5.0/firebase-auth.js";
import { getFunctions, httpsCallable } from "https://www.gstatic.com/firebasejs/12.5.0/firebase-functions.js";
import { getStorage, ref, uploadBytes } from "https://www.gstatic.com/firebasejs/12.5.0/firebase-storage.js";
import { firebaseConfig } from "./firebase-config.js";

(() => {
  'use strict';

  const $ = id => document.getElementById(id);
  const e = {
    drop: $('drop'),
    empty: $('empty'),
    box: $('previewbox'),
    img: $('preview'),
    info: $('fileinfo'),
    file: $('file'),
    browse: $('browse'),
    remove: $('remove'),
    lang: $('lang'),
    mode: $('mode'),
    scan: $('scan'),
    progress: $('progress'),
    pt: $('progressText'),
    pp: $('progressPct'),
    pb: $('progressBar'),
    pd: $('progressDetail'),
    out: $('result'),
    words: $('words'),
    chars: $('chars'),
    state: $('resultState'),
    copy: $('copy'),
    download: $('download'),
    clear: $('clear'),
    toast: $('toast'),
    engine: $('engineStatus'),
    trialTitle: $('trialTitle'),
    trialInfo: $('trialInfo'),
    quotaCount: $('quotaCount'),
    quotaBar: $('quotaBar'),
    claim: $('claim'),
    accountLabel: $('accountLabel'),
    accountDetail: $('accountDetail'),
    accountBtn: $('accountBtn'),
    logoutBtn: $('logoutBtn')
  };

  const MAX = 15 * 1024 * 1024;
  const TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/bmp'];
  const PACK_PRICE = 20;

  let file = null;
  let url = null;
  let worker = null;
  let workerLang = '';
  let busy = false;
  let timer = null;
  let auth = null;
  let functions = null;
  let storage = null;
  let currentAccess = null;
  let currentUser = null;

  const call = name => httpsCallable(functions, name);

  $('year').textContent = new Date().getFullYear();

  function notify(m) {
    e.toast.textContent = m;
    e.toast.classList.add('show');
    clearTimeout(timer);
    timer = setTimeout(() => e.toast.classList.remove('show'), 3200);
  }

  function openModal(id) {
    $(id).hidden = false;
  }

  function closeModal(id) {
    $(id).hidden = true;
  }

  document.querySelectorAll('[data-close]').forEach(b =>
    b.addEventListener('click', () => closeModal(b.dataset.close))
  );

  document.querySelectorAll('.modal-backdrop').forEach(b =>
    b.addEventListener('click', ev => {
      if (ev.target === b) b.hidden = true;
    })
  );

  function stats() {
    let t = e.out.value.trim();
    e.words.textContent = t ? t.split(/\s+/u).length : 0;
    e.chars.textContent = e.out.value.length;
    e.copy.disabled = e.download.disabled = !t;
  }

  function prog(p, t, d) {
    p = Math.max(0, Math.min(100, Math.round(p || 0)));
    e.progress.hidden = false;
    e.pb.style.width = p + '%';
    e.pp.textContent = p + '%';
    e.pt.textContent = t;
    e.pd.textContent = d || '';
  }

  function busySet(v) {
    busy = v;
    e.scan.disabled = v || !file || !canScan();
    e.browse.disabled = e.remove.disabled = e.lang.disabled = e.mode.disabled = v;
    e.scan.textContent = v ? '◌ Scanning…' : '✦  Start TXT Scan';
  }

  function dayKey() {
    return new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Asia/Dhaka',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    }).format(new Date());
  }

  function active() {
    return !!currentAccess && currentAccess.active === true;
  }

  function canScan() {
    return active() && Number(currentAccess.remaining || 0) > 0;
  }

  function renderAccess() {
    if (!currentUser) {
      e.accountLabel.textContent = 'Guest access';
      e.accountDetail.textContent = 'Claim your 3-day free trial or login with an OCR Code.';
      return;
    }

    const a = currentAccess || {};
    let id = (currentUser.uid || '').replace(/[^a-z0-9]/gi, '').slice(-8).toUpperCase();
    e.accountLabel.textContent = (a.plan === 'pro' ? 'PRO ACCOUNT' : 'FREE TRIAL') + ' · HR-' + (id || 'ACCOUNT');

    if (a.active) {
      e.trialTitle.textContent = a.plan === 'pro' ? 'HR SMART OCR PRO active' : 'Free trial active';
      e.trialInfo.textContent = `${a.remaining} scans remaining today · ${
        a.expiresAt ? `Expires ${new Date(a.expiresAt).toLocaleString()}` : 'Access active'
      }`;
      e.quotaCount.textContent = `${a.usedToday || 0} / ${a.dailyLimit || 0}`;
      e.quotaBar.style.width = ((a.usedToday || 0) / (a.dailyLimit || 1)) * 100 + '%';
      e.accountDetail.textContent = a.plan === 'pro' ? '7-day PRO · 16 images/day' : '3-day trial · 3 images/day';
      e.claim.disabled = true;
      e.claim.textContent = 'Trial / Access Active';
    } else {
      e.trialTitle.textContent = 'Access expired';
      e.trialInfo.textContent = 'Claim trial is one-time. Enter a valid OCR Code for PRO access.';
      e.quotaCount.textContent = '0 / 0';
      e.quotaBar.style.width = '100%';
      e.claim.disabled = true;
      e.claim.textContent = 'Trial Used';
      e.accountDetail.textContent = 'Access expired · Login with an active OCR Code.';
    }

    e.logoutBtn.hidden = a.plan !== 'pro';
    e.scan.disabled = !file || !canScan();
  }

  async function refreshAccess() {
    if (!auth.currentUser) {
      currentUser = null;
      currentAccess = null;
      renderAccess();
      return;
    }
    currentUser = auth.currentUser;
    try {
      const r = await call('getAccess')({});
      currentAccess = r.data;
      renderAccess();
    } catch (err) {
      console.error(err);
      notify(err.message || 'Could not check account access.');
      currentAccess = null;
      renderAccess();
    }
  }

  async function ensureGuest() {
    if (!auth.currentUser) await signInAnonymously(auth);
    currentUser = auth.currentUser;
  }

  function configReady() {
    return (
      firebaseConfig.apiKey &&
      firebaseConfig.apiKey !== 'PASTE_API_KEY_HERE' &&
      firebaseConfig.projectId &&
      firebaseConfig.projectId !== 'YOUR_PROJECT_ID'
    );
  }

  if (!configReady()) {
    e.engine.textContent = 'Firebase setup required';
    notify('Add your Firebase web config in js/firebase-config.js before publishing.');
    e.claim.disabled = true;
    $('accountBtn').disabled = true;
    $('buy7').disabled = true;
    return;
  }

  const app = initializeApp(firebaseConfig);
  auth = getAuth(app);
  functions = getFunctions(app, 'asia-southeast1');
  storage = getStorage(app);

  async function refreshPublicSettings() {
    try {
      const r = await call('getPublicSettings')({});
      const d = r.data || {};
      const n = $('publicBkashNumber');
      if (n) n.textContent = d.bkashNumber || 'Not configured';
      const b = $('bkashPublicInModal');
      if (b) b.textContent = d.bkashNumber || 'Not configured';
      const p = $('paymentPrice');
      if (p) p.textContent = '৳' + (d.price || 20);
      const settings = $('settingBkash');
      if (settings) settings.value = d.bkashNumber || '';
      const lim = $('settingLimit');
      if (lim) lim.value = d.dailyLimit || 16;
      const trial = $('settingTrial');
      if (trial) trial.checked = d.trialEnabled !== false;
      const m = $('maintenanceMessage');
      if (m) m.value = d.maintenance?.message || '';
    } catch (err) {
      console.warn('Could not load public settings', err);
    }
  }

  refreshPublicSettings();

  onAuthStateChanged(auth, async user => {
    currentUser = user;
    if (user) {
      await refreshAccess();
    } else {
      currentAccess = null;
      renderAccess();
    }
  });

  function release() {
    if (url) URL.revokeObjectURL(url);
    url = null;
  }

  function clearImage() {
    release();
    file = null;
    e.file.value = '';
    e.img.removeAttribute('src');
    e.box.style.display = 'none';
    e.empty.style.display = 'flex';
    e.scan.disabled = true;
  }

  function pick(f) {
    if (!f || busy) return;
    if (!TYPES.includes(f.type)) return notify('Choose a JPG, PNG, WEBP or BMP image.');
    if (f.size > MAX) return notify('Image is larger than 15 MB.');
    if (!f.size) return notify('This image file is empty.');

    release();
    file = f;
    url = URL.createObjectURL(f);

    e.img.onload = () => {
      e.empty.style.display = 'none';
      e.box.style.display = 'flex';
      let size = f.size < 1048576 ? (f.size / 1024).toFixed(1) + ' KB' : (f.size / 1048576).toFixed(2) + ' MB';
      e.info.textContent = `${f.name} · ${size} · ${e.img.naturalWidth}×${e.img.naturalHeight}px`;
      e.scan.disabled = !canScan();
      e.state.textContent = 'Image ready';
      e.progress.hidden = true;
    };

    e.img.onerror = () => {
      clearImage();
      notify('Could not open this image.');
    };

    e.img.src = url;
  }

  async function getWorker(lang) {
    if (!window.Tesseract) throw Error('OCR library failed to load. Check your internet connection.');
    if (worker && workerLang === lang) return worker;
    if (worker) {
      await worker.terminate();
      worker = null;
      workerLang = '';
    }

    e.engine.textContent = 'Loading OCR engine…';
    worker = await Tesseract.createWorker(
      lang,
      1,
      {
        logger: m => {
          if (!busy) return;
          if (m.status === 'loading tesseract core') {
            prog(3, 'Loading OCR engine…', 'Preparing recognition engine.');
          } else if (m.status === 'initializing tesseract') {
            prog(8, 'Initializing…', 'Starting OCR.');
          } else if (m.status === 'loading language traineddata') {
            prog(12, 'Downloading language data…', 'First use can take longer; later use may be cached.');
          } else if (m.status === 'initializing api') {
            prog(20, 'Almost ready…', 'Preparing image.');
          } else if (m.status === 'recognizing text') {
            prog(20 + (m.progress || 0) * 78, 'Reading your image…', 'Recognizing text. Keep this tab open.');
          }
        }
      },
      { langPath: 'https://tessdata.projectnaptha.com/4.0.0', gzip: true }
    );

    workerLang = lang;
    e.engine.textContent = 'OCR engine loaded';
    await worker.setParameters({ tessedit_pageseg_mode: Tesseract.PSM.AUTO });
    return worker;
  }

  function imageInput(f, enhance) {
    if (!enhance) return Promise.resolve(f);
    return new Promise((resolve, reject) => {
      let im = new Image();
      let u = URL.createObjectURL(f);

      im.onload = () => {
        URL.revokeObjectURL(u);
        try {
          let c = document.createElement('canvas');
          c.width = im.naturalWidth;
          c.height = im.naturalHeight;
          let x = c.getContext('2d', { willReadFrequently: true });
          x.drawImage(im, 0, 0);
          let d = x.getImageData(0, 0, c.width, c.height);
          let a = d.data;

          for (let i = 0; i < a.length; i += 4) {
            let g = (0.299 * a[i] + 0.587 * a[i + 1] + 0.114 * a[i + 2] - 128) * 1.18 + 128;
            g = Math.max(0, Math.min(255, g));
            a[i] = a[i + 1] = a[i + 2] = g;
          }

          x.putImageData(d, 0, 0);
          resolve(c);
        } catch (err) {
          reject(err);
        }
      };

      im.onerror = () => {
        URL.revokeObjectURL(u);
        reject(Error('Image decode failed.'));
      };

      im.src = u;
    });
  }

  async function scan() {
    if (!file || busy) return;
    if (!canScan()) {
      notify('Claim your free trial or login with a valid OCR Code first.');
      openModal('accountModal');
      return;
    }

    busySet(true);
    e.state.textContent = 'Authorizing scan…';
    prog(1, 'Checking access…', 'Your daily scan allowance is being verified.');
    let authorized = false;

    try {
      const permit = await call('authorizeScan')({});
      currentAccess = permit.data;
      authorized = true;
      renderAccess();

      e.state.textContent = 'Scanning…';
      prog(3, 'Starting OCR…', 'Preparing image and OCR engine.');
      let w = await getWorker(e.lang.value);
      let img = await imageInput(file, e.mode.value === 'contrast');
      let r = await w.recognize(img);
      let txt = r?.data?.text || '';

      e.out.value = txt.trim();
      stats();
      prog(100, 'Scan complete', 'Edit, copy or download your text.');
      e.state.textContent = txt.trim() ? 'Scan complete' : 'No text detected';
      notify(txt.trim() ? 'Text extracted successfully!' : 'No readable text found. Try a clearer image.');
    } catch (err) {
      console.error(err);
      prog(0, 'Scan failed', err.message || 'Unexpected OCR error.');
      e.state.textContent = 'Scan failed';
      notify(err.message || 'OCR failed. Check connection and try again.');
    } finally {
      busySet(false);
      await refreshAccess();
      e.scan.disabled = !file || !canScan();
    }
  }

  e.claim.addEventListener('click', async () => {
    try {
      await ensureGuest();
      const r = await call('claimTrial')({});
      currentAccess = r.data;
      renderAccess();
      notify('Your 3-day free trial is active!');
    } catch (err) {
      notify(err.message || 'Trial could not be activated.');
    }
  });

  e.accountBtn.addEventListener('click', () => {
    openModal('accountModal');
    refreshMyPayments();
  });

  $('trialFromModal').addEventListener('click', () => {
    closeModal('accountModal');
    e.claim.click();
  });

  $('codeLogin').addEventListener('click', async () => {
    const code = $('ocrCodeInput')
      .value.trim()
      .toUpperCase()
      .replace(/[^A-Z0-9]/g, '');

    if (!/^[A-Z0-9]{9}$/.test(code)) return notify('Enter your 9-character OCR Code.');

    try {
      const r = await call('loginWithOcrCode')({ code });
      await signInWithCustomToken(auth, r.data.customToken);
      closeModal('accountModal');
      $('ocrCodeInput').value = '';
      await refreshAccess();
      notify('HR SMART OCR PRO unlocked!');
    } catch (err) {
      notify(err.message || 'Invalid or expired OCR Code.');
    }
  });

  $('buy7').addEventListener('click', async () => {
    try {
      await ensureGuest();
      await refreshAccess();
      openModal('paymentModal');
    } catch (err) {
      notify(err.message || 'Could not start payment request.');
    }
  });

  $('paymentForm').addEventListener('submit', async ev => {
    ev.preventDefault();
    const shot = $('paymentShot').files[0];
    const name = $('payerName').value.trim();
    const sender = $('senderNumber').value.trim();
    const txid = $('txid').value.trim();

    if (!shot || !name || !sender || !txid) return notify('Complete all payment fields.');
    if (!['image/png', 'image/jpeg', 'image/webp'].includes(shot.type) || shot.size > 5 * 1024 * 1024) {
      return notify('Use a PNG/JPG/WEBP screenshot up to 5 MB.');
    }

    const btn = $('submitPayment');
    btn.disabled = true;
    btn.textContent = 'Submitting…';

    try {
      await ensureGuest();
      const requestId = crypto.randomUUID();
      const path = `paymentProof/${auth.currentUser.uid}/${requestId}`;
      await uploadBytes(ref(storage, path), shot, { contentType: shot.type });

      const r = await call('submitPayment')({
        requestId,
        name,
        senderNumber: sender,
        txid,
        screenshotPath: path,
        amount: PACK_PRICE,
        currency: 'BDT',
        plan: '7-Day PRO'
      });

      closeModal('paymentModal');
      refreshMyPayments();

      const msg = `HR SMART OCR — 7-Day PRO Payment\nRequest ID: ${r.data.requestId}\nName: ${name}\nAccount ID: HR-${auth.currentUser.uid
        .slice(-8)
        .toUpperCase()}\nSender Number: ${sender}\nTransaction ID: ${txid}\nAmount: ৳${PACK_PRICE}\nPackage: 7 Days PRO\nScreenshot: Uploaded securely.`;
      notify('Payment request submitted for manual verification.');
    } catch (err) {
      console.error(err);
      notify(err.message || 'Could not submit payment.');
    } finally {
      btn.disabled = false;
      btn.textContent = 'Submit Payment Details';
    }
  });

  async function refreshMyPayments() {
    const host = $('myPayments');
    if (!host || !auth.currentUser) return;
    host.textContent = 'Loading…';

    try {
      const r = await call('getMyPaymentRequests')({});
      const items = r.data.items || [];
      host.replaceChildren();

      if (!items.length) {
        host.textContent = 'No payment requests yet.';
        return;
      }

      for (const x of items) {
        const row = document.createElement('div');
        row.className = 'payment-row';
        const b = document.createElement('b');
        b.textContent = `${x.plan || '7-Day PRO'} · ৳${x.amount || 20} · ${x.status}`;
        const sm = document.createElement('small');
        sm.textContent = `TXID: ${x.txid || '—'} · ${x.createdAt || ''}`;
        row.append(b, sm);

        if (x.rejectionReason) {
          const r = document.createElement('p');
          r.textContent = 'Reason: ' + x.rejectionReason;
          row.append(r);
        }
        host.append(row);
      }
    } catch (e) {
      host.textContent = e.message || 'Unable to load payment history.';
    }
  }

  $('adminOpen').addEventListener('click', () => {
    closeModal('accountModal');
    openModal('adminLoginModal');
  });

  $('adminLogin').addEventListener('click', async () => {
    try {
      await signInWithEmailAndPassword(auth, $('adminEmail').value.trim(), $('adminPassword').value);
      await call('adminListPayments')({});
      closeModal('adminLoginModal');
      openModal('adminModal');
      await loadAdminPayments();
    } catch (err) {
      notify(err.message || 'Admin sign-in failed. Check email and password.');
    }
  });

  async function loadAdminPayments() {
    const host = $('adminPayments');
    host.innerHTML = '<p>Loading…</p>';

    try {
      const r = await call('adminListPayments')({});
      const items = r.data.items || [];

      if (!items.length) {
        host.innerHTML = '<p>No payment requests yet.</p>';
        return;
      }

      host.replaceChildren();
      for (const item of items) {
        const card = document.createElement('article');
        card.className = 'admin-payment';

        const h = document.createElement('h3');
        h.textContent = `${item.name || 'Customer'} · ${item.status}`;

        const p = document.createElement('p');
        p.textContent = `${item.senderNumber || ''} · TXID: ${item.txid || ''} · ৳${item.amount || PACK_PRICE} · ${
          item.requestId
        }`;

        card.append(h, p);

        if (item.screenshotUrl) {
          const a = document.createElement('a');
          a.href = item.screenshotUrl;
          a.target = '_blank';
          a.rel = 'noopener';
          a.textContent = 'View payment screenshot';
          card.append(a);
        }

        if (item.status === 'pending') {
          const b = document.createElement('button');
          b.className = 'primary';
          b.textContent = 'Approve & Generate OCR Code';
          b.addEventListener('click', async () => {
            b.disabled = true;
            try {
              const x = await call('adminApprovePayment')({ requestId: item.requestId });
              $('generatedCode').textContent = x.data.code;
              $('generatedCodeBox').hidden = false;
              await loadAdminPayments();
              notify('Payment approved. Copy the code and send it to the customer.');
            } catch (err) {
              notify(err.message || 'Approval failed.');
              b.disabled = false;
            }
          });
          card.append(b);

          const rb = document.createElement('button');
          rb.className = 'soft';
          rb.textContent = 'Reject';
          rb.addEventListener('click', async () => {
            const reason = prompt('Rejection reason (required):');
            if (!reason || !reason.trim()) return;
            rb.disabled = true;
            try {
              await call('adminRejectPayment')({ requestId: item.requestId, reason: reason.trim() });
              await loadAdminPayments();
              notify('Payment rejected.');
            } catch (err) {
              notify(err.message || 'Rejection failed');
              rb.disabled = false;
            }
          });
          card.append(rb);
        }

        host.append(card);
      }
    } catch (err) {
      host.textContent = err.message || 'Could not load payments.';
    }
  }

  $('saveSettings').addEventListener('click', async () => {
    try {
      await call('adminSetPublicSettings')({
        bkashNumber: $('settingBkash').value.trim(),
        dailyLimit: Number($('settingLimit').value),
        trialEnabled: $('settingTrial').checked
      });
      await refreshPublicSettings();
      notify('Application settings saved.');
    } catch (err) {
      notify(err.message || 'Could not save settings.');
    }
  });

  $('maintenanceOn').addEventListener('click', async () => {
    try {
      await call('adminSetMaintenance')({ enabled: true, message: $('maintenanceMessage').value.trim() });
      notify('Maintenance enabled.');
    } catch (err) {
      notify(err.message || 'Could not enable maintenance.');
    }
  });

  $('maintenanceOff').addEventListener('click', async () => {
    try {
      await call('adminSetMaintenance')({ enabled: false, message: $('maintenanceMessage').value.trim() });
      notify('Maintenance disabled.');
    } catch (err) {
      notify(err.message || 'Could not disable maintenance.');
    }
  });

  $('refreshPayments').addEventListener('click', loadAdminPayments);

  $('adminLogout').addEventListener('click', async () => {
    await signOut(auth);
    closeModal('adminModal');
    notify('Admin signed out.');
  });

  $('copyGeneratedCode').addEventListener('click', async () => {
    try {
      await navigator.clipboard.writeText($('generatedCode').textContent);
      notify('OCR Code copied.');
    } catch (_) {
      notify('Select and copy the code manually.');
    }
  });

  $('logoutBtn').addEventListener('click', async () => {
    await signOut(auth);
    currentAccess = null;
    notify('Logged out.');
  });

  e.browse.addEventListener('click', () => e.file.click());

  e.drop.addEventListener('click', ev => {
    if (!ev.target.closest('button') && !busy) e.file.click();
  });

  e.drop.addEventListener('keydown', ev => {
    if ((ev.key === 'Enter' || ev.key === ' ') && ev.target === e.drop) {
      ev.preventDefault();
      e.file.click();
    }
  });

  e.file.addEventListener('change', ev => pick(ev.target.files[0]));

  ['dragenter', 'dragover'].forEach(t =>
    e.drop.addEventListener(t, ev => {
      ev.preventDefault();
      if (!busy) e.drop.classList.add('dragover');
    })
  );

  ['dragleave', 'drop'].forEach(t =>
    e.drop.addEventListener(t, ev => {
      ev.preventDefault();
      e.drop.classList.remove('dragover');
    })
  );

  e.drop.addEventListener('drop', ev => {
    if (!busy && ev.dataTransfer.files.length) pick(ev.dataTransfer.files[0]);
  });

  e.remove.addEventListener('click', ev => {
    ev.stopPropagation();
    if (!busy) {
      clearImage();
      notify('Image removed.');
    }
  });

  e.scan.addEventListener('click', scan);
  e.out.addEventListener('input', stats);

  e.clear.addEventListener('click', () => {
    if (busy) return;
    clearImage();
    e.out.value = '';
    stats();
    e.progress.hidden = true;
    e.state.textContent = 'Waiting for image';
    notify('Workspace cleared.');
  });

  e.copy.addEventListener('click', async () => {
    try {
      if (navigator.clipboard && isSecureContext) {
        await navigator.clipboard.writeText(e.out.value);
      } else {
        e.out.focus();
        e.out.select();
        if (!document.execCommand('copy')) throw Error('copy unavailable');
      }
      notify('Text copied!');
    } catch (_) {
      notify('Select the text and copy manually.');
    }
  });

  e.download.addEventListener('click', () => {
    let t = e.out.value;
    if (!t.trim()) return;
    let name =
      (file?.name || 'hr-smart-ocr')
        .replace(/\.[^.]+$/, '')
        .replace(/[^\w-]+/g, '_') || 'hr-smart-ocr';
    let blob = new Blob(['\uFEFF', t], { type: 'text/plain;charset=utf-8' });
    let u = URL.createObjectURL(blob);
    let a = document.createElement('a');
    a.href = u;
    a.download = name + '.txt';
    a.click();
    setTimeout(() => URL.revokeObjectURL(u), 1200);
    notify('TXT downloaded.');
  });

  window.addEventListener('beforeunload', () => {
    release();
    if (worker) worker.terminate();
  });

  stats();
  if (!window.Tesseract) e.engine.textContent = 'OCR CDN unavailable — check internet';
})();
```[cite: 1]
