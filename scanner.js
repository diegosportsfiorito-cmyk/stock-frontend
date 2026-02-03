// ============================================================
// SCANNER ZXING — LECTOR ROBUSTO MULTI-FORMATO
// ============================================================

let scannerActivo = false;
let modoScanner = "simple"; // "simple" o "completo"
let zxingReader = null;
let currentStream = null;

// ------------------------------------------------------------
// INICIAR SCANNER (ZXing)
// ------------------------------------------------------------

async function iniciarScanner() {
  const video = document.getElementById("scanner-video");
  if (!video) {
    console.error("No se encontró #scanner-video");
    return;
  }

  // Si ya hay un stream viejo, lo cortamos
  if (currentStream) {
    currentStream.getTracks().forEach((t) => t.stop());
    currentStream = null;
  }

  try {
    // Pedir cámara trasera
    const stream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: "environment" },
      audio: false,
    });

    currentStream = stream;
    video.srcObject = stream;
    await video.play();

    // Crear lector ZXing si no existe
    if (!zxingReader) {
      zxingReader = new ZXing.BrowserMultiFormatReader();
    }

    scannerActivo = true;

    // Loop de lectura
    leerLoopZXing(video);
  } catch (err) {
    console.error("Error iniciando cámara ZXing:", err);
  }
}

// ------------------------------------------------------------
// LOOP DE LECTURA ZXING
// ------------------------------------------------------------

async function leerLoopZXing(video) {
  if (!scannerActivo || !zxingReader) return;

  try {
    const result = await zxingReader.decodeOnceFromVideoElement(video);
    if (result && result.text) {
      const codigo = result.text.trim();
      procesarCodigo(codigo);
    }
  } catch (err) {
    // ZXing tira error cuando no encuentra nada en un frame, es normal.
    // No lo logueamos para no ensuciar la consola.
  }

  if (scannerActivo) {
    // Volvemos a intentar
    leerLoopZXing(video);
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
  if (!input) return;
  input.value = texto;
  input.dispatchEvent(new Event("input"));
}

// ------------------------------------------------------------
// CAMBIAR MODO DESDE UI
// ------------------------------------------------------------

function setModoScanner(nuevoModo) {
  modoScanner = nuevoModo;
}

// ------------------------------------------------------------
// CERRAR SCANNER (lo llama ui.js al cerrar overlay)
// ------------------------------------------------------------

function cerrarScannerZXing() {
  scannerActivo = false;
  if (currentStream) {
    currentStream.getTracks().forEach((t) => t.stop());
    currentStream = null;
  }
}
