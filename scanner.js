// ============================================================
// SCANNER — Quagga2 WASM (lector robusto en vivo)
// ============================================================

let scannerActivo = false;
let modoScanner = "simple"; // "simple" o "completo"

// ------------------------------------------------------------
// INICIAR SCANNER
// ------------------------------------------------------------

async function iniciarScanner() {
  const container = document.getElementById("scanner-container");
  if (!container) {
    console.error("No se encontró #scanner-container");
    return;
  }

  if (scannerActivo) {
    cerrarScannerQuagga();
  }

  scannerActivo = true;

  Quagga.init(
    {
      inputStream: {
        name: "Live",
        type: "LiveStream",
        target: container,
        constraints: {
          facingMode: "environment",
          width: { ideal: 1920 },
          height: { ideal: 1080 }
        }
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
          "codabar_reader"
        ]
      },
      locate: true,
      numOfWorkers: 2
    },
    function (err) {
      if (err) {
        console.error("Error iniciando Quagga2:", err);
        scannerActivo = false;
        alert("No se pudo iniciar el scanner.");
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

  const codigoCrudo = result.codeResult.code.trim();
  procesarCodigo(codigoCrudo);

  // Si querés que siga leyendo, comentá estas dos líneas:
  cerrarScannerQuagga();
  document.getElementById("scanner-overlay").style.display = "none";
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
// CAMBIAR MODO
// ------------------------------------------------------------

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
