// ============================================================
// SCANNER AVANZADO — Barcode Scanner+
// ============================================================

let modoScanner = "simple";
let scannerActivo = false;
let streamActual = null;

// ------------------------------------------------------------
// PROCESAR CÓDIGO
// ------------------------------------------------------------
function procesarCodigo(codigo) {
  let resultado = codigo;

  if (modoScanner === "simple") {
    resultado = extraerArticulo(codigo);
  }

  cargarEnInput(resultado);
}

// ------------------------------------------------------------
// EXTRAER ARTÍCULO (modo simple)
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
// CARGAR EN INPUT
// ------------------------------------------------------------
function cargarEnInput(texto) {
  const input = document.getElementById("search-input");
  if (!input) return;
  input.value = texto;
  input.dispatchEvent(new Event("input"));
}

// ------------------------------------------------------------
// START SCANNER (BOTÓN PRINCIPAL)
// ------------------------------------------------------------
async function startScanner() {
  if (scannerActivo) return;

  if (!("BarcodeDetector" in window)) {
    alert("Tu dispositivo no soporta BarcodeDetector.");
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
      video: { facingMode: "environment" }
    });

    video.srcObject = streamActual;
    await video.play();

    const detector = new BarcodeDetector({ formats: ["ean_13", "code_128", "ean_8", "upc_a"] });

    const loop = async () => {
      if (!scannerActivo) return;

      try {
        const barcodes = await detector.detect(video);

        if (barcodes.length > 0) {
          const code = barcodes[0].rawValue;
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

  } catch (err) {
    console.error("Error al iniciar cámara:", err);
    alert("No se pudo acceder a la cámara.");
    stopScanner();
  }
}

// ------------------------------------------------------------
// STOP SCANNER
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
// PROCESAR RETORNO DEL SCANNER NATIVO (ANDROID)
// ------------------------------------------------------------
(function procesarRetornoNativo() {
  const params = new URLSearchParams(window.location.search);
  const code = params.get("code");

  if (code) {
    procesarCodigo(code);

    // Limpiar la URL para evitar re-procesar
    history.replaceState({}, "", window.location.origin + window.location.pathname);
  }
})();
