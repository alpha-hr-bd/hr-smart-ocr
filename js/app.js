import { getSession, clearSession } from "./storage.js";
import { runOCR } from "./ocr.js";

const session = getSession();
if (!session) location.replace("activation.html");

const $ = (id) => document.getElementById(id);
$("welcomeName").textContent = `Welcome, ${session.name}!`;
$("logoutBtn").addEventListener("click", () => {
  clearSession();
  location.replace("activation.html");
});

let selectedFile = null;
const imageInput = $("imageInput");
const cameraInput = $("cameraInput");
const dropZone = $("dropZone");
const preview = $("previewImage");
const previewWrap = $("previewWrap");
const scanBtn = $("scanBtn");
const status = $("statusMessage");
const result = $("resultText");

$("browseBtn").addEventListener("click", (e) => { e.stopPropagation(); imageInput.click(); });
dropZone.addEventListener("click", () => imageInput.click());
dropZone.addEventListener("keydown", (e) => { if (e.key === "Enter" || e.key === " ") imageInput.click(); });
$("cameraBtn").addEventListener("click", () => cameraInput.click());
imageInput.addEventListener("change", () => acceptFile(imageInput.files[0]));
cameraInput.addEventListener("change", () => acceptFile(cameraInput.files[0]));

["dragenter", "dragover"].forEach(type => dropZone.addEventListener(type, e => {
  e.preventDefault(); dropZone.classList.add("dragover");
}));
["dragleave", "drop"].forEach(type => dropZone.addEventListener(type, e => {
  e.preventDefault(); dropZone.classList.remove("dragover");
}));
dropZone.addEventListener("drop", e => acceptFile(e.dataTransfer.files[0]));

function acceptFile(file) {
  if (!file) return;
  if (!file.type.startsWith("image/")) return setStatus("Please choose an image file.", true);
  selectedFile = file;
  preview.src = URL.createObjectURL(file);
  previewWrap.classList.remove("hidden");
  scanBtn.disabled = false;
  $("removeBtn").disabled = false;
  setStatus(`${file.name} is ready for OCR.`);
}
$("removeBtn").addEventListener("click", () => {
  selectedFile = null; preview.removeAttribute("src"); previewWrap.classList.add("hidden");
  scanBtn.disabled = true; $("removeBtn").disabled = true; imageInput.value = ""; cameraInput.value = "";
  setStatus("Image removed.");
});

scanBtn.addEventListener("click", async () => {
  if (!selectedFile) return;
  scanBtn.disabled = true;
  $("progressArea").classList.remove("hidden");
  setStatus("Reading image…");
  try {
    const language = $("languageSelect").value;
    const text = await runOCR(selectedFile, language, (progress, label) => {
      $("progressBar").style.width = `${Math.round(progress * 100)}%`;
      $("progressPercent").textContent = `${Math.round(progress * 100)}%`;
      $("progressLabel").textContent = label || "Recognizing text…";
    });
    result.value = text.trim();
    updateCount();
    setStatus(result.value ? "OCR completed successfully." : "No text found. Try a clearer image.", !result.value);
  } catch (error) {
    console.error(error);
    setStatus("OCR failed. Please try another image or check your internet connection.", true);
  } finally {
    scanBtn.disabled = !selectedFile;
  }
});

$("copyBtn").addEventListener("click", async () => {
  if (!result.value) return setStatus("There is no text to copy.", true);
  try { await navigator.clipboard.writeText(result.value); setStatus("Text copied to clipboard."); }
  catch (_) { result.select(); document.execCommand("copy"); setStatus("Text copied."); }
});
$("downloadBtn").addEventListener("click", () => {
  if (!result.value) return setStatus("There is no text to download.", true);
  const blob = new Blob([result.value], {type:"text/plain;charset=utf-8"});
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a"); a.href = url; a.download = "hr-smart-ocr-result.txt"; a.click();
  URL.revokeObjectURL(url);
});
$("clearTextBtn").addEventListener("click", () => { result.value = ""; updateCount(); setStatus("Result cleared."); });
result.addEventListener("input", updateCount);
function updateCount() { $("characterCount").textContent = `${result.value.length} characters`; }
function setStatus(text, error = false) { status.textContent = text; status.className = "status" + (error ? " error" : ""); }
