// ============================================================
// SCANNER V3 — Múltiples lectores + procesarCodigo()
// ============================================================

let modoScanner = localStorage.getItem("modoDefecto") || "simple";
let scannerActivo = false;
let streamActual = null;

window.setModoScanner = function (modo) {
  modoScanner = modo === "completo" ? "completo" : "simple";
};

// ------------------------------------------------------------
// PROCESAR CÓDIGO
// ------------------------------------------------------------
function procesarCodigo(codigo) {
  let resultado = codigo;

  if (modoScanner === "simple") {
    resultado = extraerArticulo(codigo);
  }

  cargarEnInput(resultado);
  if (window.AppCore) {
    AppCore.buscar(true);
  }
}

// ------------------------------------------------------------
// EXTRAER ARTÍCULO (modo simple)
// ------------------------------------------------------------
function extraerArticulo(codigo) {
  const separadores = ["/", "!", " "];
  let corte = codigo.length;

  separadores.forEach((sep) => {
    const pos = codigo.indexOf(sep);
    if (pos !== -1 && pos < corte) corte = pos;
  });

  return codigo.substring(0, corte);
}

// ------------------------------------------------------------
// CARGAR EN INPUT
// ------------------------------------------------------------
function cargarEnInput(texto) {
  const input = document.getElementById("search-input");
  if (!input) return;
  input.value = texto;
  input.dispatchEvent(new Event("input"));
}

// ============================================================
// SCANNER INTERNO 1 — BarcodeDetector (nativo)
// ============================================================
async function startScannerInterno1() {
  if (scannerActivo) return;

  if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
    alert("Este dispositivo no permite acceso a la cámara.");
    return;
  }

  scannerActivo = true;

  const video = document.createElement("video");
  video.setAttribute("playsinline", true);
  video.style.position = "fixed";
  video.style.top = "0";
  video.style.left = "0";
  video.style.width = "100%";
  video.style.height = "100%";
  video.style.zIndex = "9999";
  video.style.background = "#000";
  document.body.appendChild(video);

  try {
    streamActual = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: "environment" },
    });

    video.srcObject = streamActual;
    await video.play();

    if ("BarcodeDetector" in window) {
      const detector = new BarcodeDetector({
        formats: ["ean_13", "code_128", "ean_8", "upc_a"],
      });

      const loop = async () => {
        if (!scannerActivo) return;

        try {
          const barcodes = await detector.detect(video);

          if (barcodes.length > 0) {
            const code = barcodes[0].rawValue.trim();
            procesarCodigo(code);
            stopScanner();
            return;
          }
        } catch (err) {
          console.error("Error detectando código:", err);
        }

        requestAnimationFrame(loop);
      };

      loop();
    } else {
      alert("Este navegador no soporta el scanner nativo.");
      stopScanner();
    }
  } catch (err) {
    console.error("Error al iniciar cámara:", err);
    alert("No se pudo acceder a la cámara.");
    stopScanner();
  }
}

// ============================================================
// SCANNER INTERNO 2 — Alternativo (mismo flujo, otro detector futuro)
// ============================================================
async function startScannerInterno2() {
  // Por ahora reutilizamos el mismo flujo de BarcodeDetector,
  // pero queda listo para integrar ZXing/Quagga2 en el futuro.
  await startScannerInterno1();
}

// ============================================================
// SCANNER EXTERNO — Barcode Scanner+ (intent / deep link)
// ============================================================
function startScannerExternoPreferido() {
  // Intento usar esquema ZXing con retorno a esta app vía ?code=
  const callbackUrl = `${window.location.origin}${window.location.pathname}?code={CODE}`;
  const url = `zxing://scan/?ret=${encodeURIComponent(callbackUrl)}&SCAN_FORMATS=EAN_13,EAN_8,UPC_A,CODE_128`;

  window.location.href = url;
}

// ============================================================
// SCANNER EXTERNO — Selector de app del sistema
// ============================================================
function startScannerExternoSelector() {
  // Fallback genérico: abrimos un enlace que la mayoría de apps de scanner pueden manejar.
  // Si el sistema pregunta con qué app abrir, el usuario elige.
  const callbackUrl = `${window.location.origin}${window.location.pathname}?code={CODE}`;
  const url = `zxing://scan/?ret=${encodeURIComponent(callbackUrl)}`;

  window.location.href = url;
}

// ------------------------------------------------------------
// STOP SCANNER INTERNO
// ------------------------------------------------------------
function stopScanner() {
  scannerActivo = false;

  if (streamActual) {
    streamActual.getTracks().forEach((t) => t.stop());
    streamActual = null;
  }

  const video = document.querySelector("video[playsinline]");
  if (video) video.remove();
}

// ------------------------------------------------------------
// PROCESAR RETORNO NATIVO (?code=...)
// ------------------------------------------------------------
(function procesarRetornoNativo() {
  const params = new URLSearchParams(window.location.search);
  const code = params.get("code");

  if (code) {
    procesarCodigo(code);
    history.replaceState({}, "", window.location.origin + window.location.pathname);
  }
})();
