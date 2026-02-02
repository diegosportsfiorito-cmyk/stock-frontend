// SCANNER.JS — LECTURA DE CÓDIGO CON BARCODEDETECTOR

const scannerOverlay = document.getElementById("scanner-overlay");
const scannerVideo = document.getElementById("scanner-video");
const scannerClose = document.getElementById("scanner-close");

let scannerStream = null;
let scannerRunning = false;
let barcodeDetector = null;

async function iniciarScanner() {
  if (!("BarcodeDetector" in window)) {
    alert("Este dispositivo no soporta BarcodeDetector nativo.");
    return;
  }

  try {
    barcodeDetector = new BarcodeDetector({ formats: ["code_128", "ean_13", "ean_8", "upc_a", "upc_e"] });

    scannerOverlay.classList.add("visible");

    scannerStream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: "environment" },
      audio: false,
    });

    scannerVideo.srcObject = scannerStream;
    scannerRunning = true;
    loopDeteccion();
  } catch (e) {
    console.error(e);
    alert("No se pudo acceder a la cámara.");
    cerrarScanner();
  }
}

async function loopDeteccion() {
  if (!scannerRunning || !barcodeDetector) return;

  try {
    const barcodes = await barcodeDetector.detect(scannerVideo);
    if (barcodes && barcodes.length > 0) {
      const code = barcodes[0].rawValue;
      const input = document.getElementById("search-input");
      if (input) {
        input.value = code;
        const evt = new Event("input");
        input.dispatchEvent(evt);
      }
      cerrarScanner();

      // disparar búsqueda si app.js ya está cargado
      if (typeof window.buscar === "function") {
        window.buscar();
      }
      return;
    }
  } catch (e) {
    console.error("Error detectando código:", e);
  }

  requestAnimationFrame(loopDeteccion);
}

function cerrarScanner() {
  scannerRunning = false;
  if (scannerStream) {
    scannerStream.getTracks().forEach((t) => t.stop());
    scannerStream = null;
  }
  scannerOverlay.classList.remove("visible");
}

if (scannerClose) {
  scannerClose.addEventListener("click", cerrarScanner);
}

// Exponer para app.js
window.iniciarScanner = iniciarScanner;
