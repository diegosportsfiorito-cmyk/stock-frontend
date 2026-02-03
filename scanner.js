// ============================================================
// SCANNER — Quagga (lector robusto multi-formato)
// ============================================================

let scannerActivo = false;
let modoScanner = "simple"; // "simple" o "completo"

// ------------------------------------------------------------
// INICIAR SCANNER
// ------------------------------------------------------------

async function iniciarScanner() {
  const videoEl = document.getElementById("scanner-video");
  if (!videoEl) {
    console.error("No se encontró #scanner-video");
    return;
  }

  if (scannerActivo) cerrarScannerQuagga();
  scannerActivo = true;

  Quagga.init(
    {
      inputStream: {
        name: "Live",
        type: "LiveStream",
        target: videoEl,
        constraints: {
          facingMode: "user",
        },
      },
      decoder: {
        readers: [
          "ean_reader",
          "ean_8_reader",
          "upc_reader",
          "upc_e_reader",
          "code_128_reader",
          "code_39_reader",
          "code_93_reader",
          "itf_reader",
          "codabar_reader",
        ],
      },
      locate: true,
    },
    function (err) {
      if (err) {
        console.error("Error iniciando Quagga:", err);
        scannerActivo = false;
        return;
      }
      Quagga.start();
    }
  );

  Quagga.offDetected(onDetectedHandler);
  Quagga.onDetected(onDetectedHandler);
}

// ------------------------------------------------------------
// HANDLER DE DETECCIÓN
// ------------------------------------------------------------

function onDetectedHandler(result) {
  if (!scannerActivo) return;
  if (!result || !result.codeResult || !result.codeResult.code) return;

  const codigo = result.codeResult.code.trim();
  procesarCodigo(codigo);

  // Si querés que cierre después de leer uno:
  // cerrarScannerQuagga();
  // document.getElementById("scanner-overlay").classList.remove("visible");
}

// ------------------------------------------------------------
// PROCESAR CÓDIGO
// ------------------------------------------------------------

function procesarCodigo(codigo) {
  let resultado = codigo;
  if (modoScanner === "simple") resultado = extraerArticulo(codigo);
  cargarEnInput(resultado);
}

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

function setModoScanner(nuevoModo) {
  modoScanner = nuevoModo;
}

// ------------------------------------------------------------
// CERRAR SCANNER
// ------------------------------------------------------------

function cerrarScannerQuagga() {
  scannerActivo = false;
  try {
    Quagga.stop();
  } catch (e) {
    console.warn("Quagga ya estaba detenido:", e);
  }
}
