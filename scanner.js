// ============================================================
// SCANNER EN VIVO — BarcodeDetector nativo
// ============================================================

let modoScanner = "simple";
let stream = null;

// ------------------------------------------------------------
// INICIAR SCANNER
// ------------------------------------------------------------

async function iniciarScanner() {
  const video = document.getElementById("scanner-video");

  try {
    stream = await navigator.mediaDevices.getUserMedia({
      video: {
        facingMode: "environment",
        width: { ideal: 1920 },
        height: { ideal: 1080 },
        advanced: [
          { focusMode: "continuous" }
        ]
      }
    });

    video.srcObject = stream;
    await video.play();

    detectarLoop(video);

  } catch (err) {
    console.error("Error cámara:", err);
    alert("No se pudo acceder a la cámara.");
  }
}

// ------------------------------------------------------------
// LOOP DE DETECCIÓN
// ------------------------------------------------------------

async function detectarLoop(video) {
  if (!("BarcodeDetector" in window)) {
    alert("BarcodeDetector no está soportado en este navegador.");
    return;
  }

  const detector = new BarcodeDetector({
    formats: ["ean_13", "ean_8", "code_128", "code_39", "upc_a", "upc_e"]
  });

  async function loop() {
    if (!video.srcObject) return;

    try {
      const codes = await detector.detect(video);

      if (codes.length > 0) {
        let codigo = codes[0].rawValue.trim();

        if (modoScanner === "simple") {
          codigo = extraerArticulo(codigo);
        }

        cargarEnInput(codigo);
        cerrarScanner();
        return;
      }
    } catch (e) {
      console.warn("Error detectando:", e);
    }

    requestAnimationFrame(loop);
  }

  loop();
}

// ------------------------------------------------------------
// PROCESAR CÓDIGO
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

function cargarEnInput(texto) {
  const input = document.getElementById("search-input");
  if (!input) return;
  input.value = texto;
  input.dispatchEvent(new Event("input"));
}

// ------------------------------------------------------------
// CERRAR SCANNER
// ------------------------------------------------------------

function cerrarScanner() {
  const video = document.getElementById("scanner-video");
  const overlay = document.getElementById("scanner-overlay");

  if (stream) {
    stream.getTracks().forEach((t) => t.stop());
  }

  video.srcObject = null;
  overlay.style.display = "none";
}
