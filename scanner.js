// ============================================================
// SCANNER — Versión definitiva con Cámara + Modos
// ============================================================

let scannerActivo = false;
let modoScanner = "simple"; 
// valores posibles: "simple" o "completo"

const soportaBarcode = ("BarcodeDetector" in window);

// ------------------------------------------------------------
// INICIAR SCANNER (abre cámara + detector)
// ------------------------------------------------------------

async function iniciarScanner() {
  if (!soportaBarcode) {
    console.warn("BarcodeDetector no disponible en este navegador.");
    return;
  }

  try {
    const video = document.getElementById("scanner-video");

    // === ACTIVAR CÁMARA ===
    const stream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: "environment" },
    });
    video.srcObject = stream;

    await video.play();

    // Esperar a que el video tenga dimensiones reales
    await new Promise((resolve) => {
      if (video.readyState >= 1 && video.videoWidth > 0) {
        resolve();
      } else {
        video.onloadedmetadata = () => resolve();
      }
    });

    // Ajustar tamaño real del frame
    video.width = video.videoWidth;
    video.height = video.videoHeight;
    // =======================

    const detector = new BarcodeDetector({
      formats: [
        "aztec",
        "code_128",
        "code_39",
        "code_93",
        "codabar",
        "data_matrix",
        "ean_13",
        "ean_8",
        "itf",
        "pdf417",
        "qr_code",
        "upc_a",
        "upc_e",
      ],
    });

    scannerActivo = true;

    async function escanear() {
      if (!scannerActivo) return;

      try {
        const barcodes = await detector.detect(video);

        if (barcodes.length > 0) {
          const codigo = barcodes[0].rawValue.trim();
          procesarCodigo(codigo);
        }
      } catch (err) {
        console.error("Error detectando:", err);
      }

      requestAnimationFrame(escanear);
    }

    escanear();
  } catch (err) {
    console.error("Error iniciando cámara:", err);
  }
}

// ------------------------------------------------------------
// PROCESAR CÓDIGO SEGÚN MODO
// ------------------------------------------------------------

function procesarCodigo(codigo) {
  let resultado = codigo;

  if (modoScanner === "simple") {
    resultado = extraerArticulo(codigo);
  }

  cargarEnInput(resultado);
}

// ------------------------------------------------------------
// EXTRAER SOLO ARTÍCULO (antes de / o !)
// ------------------------------------------------------------

function extraerArticulo(codigo) {
  const separadores = ["/", "!"];
  let corte = codigo.length;

  separadores.forEach((sep) => {
    const pos = codigo.indexOf(sep);
    if (pos !== -1 && pos < corte) corte = pos;
  });

  return codigo.substring(0, corte);
}

// ------------------------------------------------------------
// CARGAR RESULTADO EN EL INPUT PRINCIPAL
// ------------------------------------------------------------

function cargarEnInput(texto) {
  const input = document.getElementById("search-input");
  input.value = texto;
  input.dispatchEvent(new Event("input"));
}

// ------------------------------------------------------------
// CAMBIAR MODO DESDE UI
// ------------------------------------------------------------

function setModoScanner(nuevoModo) {
  modoScanner = nuevoModo;
}
