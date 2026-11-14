import { createWorker } from "https://cdn.jsdelivr.net/npm/tesseract.js@5/dist/tesseract.esm.min.js";

export async function runOCR(imageFile, languages, onProgress = () => {}) {
  const worker = await createWorker(languages, 1, {
    logger: (message) => {
      if (message.status === "recognizing text") onProgress(message.progress || 0, "Recognizing text…");
      else if (message.status) onProgress(message.progress || 0, message.status);
    }
  });
  try {
    const result = await worker.recognize(imageFile);
    onProgress(1, "Done");
    return result.data.text || "";
  } finally {
    await worker.terminate();
  }
}
