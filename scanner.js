// ============================================================
// SCANNER — Apertura, cámara, lectura y cierre
// ============================================================

let stream = null;
let barcodeDetector = null;

const overlay = document.getElementById("scanner-overlay");
const video = document.getElementById("scanner-video");
const btnClose = document.getElementById("scanner-close");

// ------------------------------------------------------------
// Inicializar BarcodeDetector (si está disponible)
// ------------------------------------------------------------

if ("BarcodeDetector" in window) {
  try {
    barcodeDetector = new BarcodeDetector({
      formats: ["ean_13", "ean_8", "code_128", "code_39", "upc_a", "upc_e"],
    });
  } catch (e) {
    console.warn("BarcodeDetector no soportado:", e);
    barcodeDetector = null;
  }
} else {
  console.warn("BarcodeDetector no disponible en este navegador.");
  barcodeDetector = null;
}

// ------------------------------------------------------------
// ABRIR SCANNER
// ------------------------------------------------------------

window.abrirScanner = async function (modo = "solo_articulo") {
  try {
    overlay.style.display = "flex";

    stream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: "environment" },
    });

    video.srcObject = stream;
    video.play();

    escanearLoop(modo);
  } catch (e) {
    console.error("Error al abrir cámara:", e);
    showToast("No se pudo acceder a la cámara");
    cerrarScanner();
  }
};

// ------------------------------------------------------------
// LOOP DE ESCANEO
// ------------------------------------------------------------

async function escanearLoop(modo) {
  if (!barcodeDetector) return;

  try {
    const barcodes = await barcodeDetector.detect(video);

    if (barcodes.length > 0) {
      const code = barcodes[0].rawValue.trim();
      procesarCodigo(code, modo);
      return; // Detener loop al detectar
    }
  } catch (e) {
    console.warn("Error detectando código:", e);
  }

  requestAnimationFrame(() => escanearLoop(modo));
}

// ------------------------------------------------------------
// PROCESAR CÓDIGO DETECTADO
// ------------------------------------------------------------

function procesarCodigo(code, modo) {
  cerrarScanner();

  els.searchInput.value = code;
  orbSetReady(true);

  if (modo === "solo_articulo") {
    buscar(false);
  } else if (modo === "completo") {
    buscar(false);
  }
}

// ------------------------------------------------------------
// CERRAR SCANNER
// ------------------------------------------------------------

function cerrarScanner() {
  overlay.style.display = "none";

  if (stream) {
    stream.getTracks().forEach((t) => t.stop());
    stream = null;
  }

  video.pause();
  video.srcObject = null;
}

// ------------------------------------------------------------
// BOTÓN CERRAR
// ------------------------------------------------------------

btnClose.addEventListener("click", cerrarScanner);

// ------------------------------------------------------------
// FIN DEL ARCHIVO SCANNER
// ============================================================
