import { initializeApp } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-app.js";
import { getFirestore, doc, getDoc } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js";
import { firebaseConfig } from "./firebase-config.js";
import { getSession, saveSession } from "./storage.js";

const form = document.getElementById("loginForm");
const nameInput = document.getElementById("customerName");
const codeInput = document.getElementById("ocrCode");
const message = document.getElementById("loginMessage");
const loginBtn = document.getElementById("loginBtn");

const existing = getSession();
if (existing) location.replace("index.html");

codeInput.addEventListener("input", () => {
  codeInput.value = codeInput.value.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 9);
});

form.addEventListener("submit", async (event) => {
  event.preventDefault();
  const name = nameInput.value.trim();
  const code = codeInput.value.trim().toUpperCase();
  if (!name) return show("Please enter your name.", true);
  if (!/^[A-Z0-9]{9}$/.test(code)) return show("Enter a valid 9-character OCR Code.", true);
  if (firebaseConfig.apiKey === "YOUR_API_KEY" || firebaseConfig.projectId === "YOUR_PROJECT_ID") {
    return show("Firebase setup is not complete. Follow the README setup steps first.", true);
  }

  loginBtn.disabled = true;
  loginBtn.textContent = "Checking code…";
  show("Checking your OCR Code…");
  try {
    const app = initializeApp(firebaseConfig);
    const db = getFirestore(app);
    const snapshot = await getDoc(doc(db, "ocrCodes", code));
    if (!snapshot.exists() || snapshot.data().active !== true) {
      show("This OCR Code is invalid or inactive. Please check your code.", true);
    } else {
      saveSession(name, code);
      show("Login successful. Opening OCR…");
      location.replace("index.html");
    }
  } catch (error) {
    console.error(error);
    show("Could not verify the code. Check your internet and Firebase settings.", true);
  } finally {
    loginBtn.disabled = false;
    loginBtn.innerHTML = 'Login <span>→</span>';
  }
});

function show(text, error = false) {
  message.textContent = text;
  message.className = "status" + (error ? " error" : "");
}
