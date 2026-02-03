// ============================================================
// SCANNER — Quagga2 WASM (lector robusto en vivo)
// ============================================================

let scannerActivo = false;
let modoScanner = "simple";

// ------------------------------------------------------------
// INICIAR SCANNER WEB
// ------------------------------------------------------------

async function iniciarScanner() {
  const container = document.getElementById("scanner-container");
  if (!container) return;

  if (scannerActivo) cerrarScannerQuagga();
  scannerActivo = true;

  Quagga.init(
    {
      inputStream: {
        name: "Live",
        type: "LiveStream",
        target: container,
        constraints: { 
          facingMode: "environment",
          width: { ideal: 1280 },
          height: { ideal: 720 }
        }   // ⭐ ESTA LLAVE FALTABA
      },    // ⭐ ESTA LLAVE TAMBIÉN FALTABA
      decoder: {
        readers: [
          "ean_reader",
          "ean_8_reader",
          "upc_reader",
          "upc_e_reader",
          "code_128_reader",
          "code_39_reader"
        ]
      },
      locate: true
    },
    function (err) {
      if (err) {
        console.error("Error iniciando Quagga2:", err);
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
// DETECCIÓN WEB
// ------------------------------------------------------------

function onDetectedHandler(result) {
  if (!scannerActivo) return;
  if (!result?.codeResult?.code) return;

  const codigo = result.codeResult.code.trim();
  procesarCodigo(codigo);

  cerrarScannerQuagga();
  document.getElementById("scanner-overlay").style.display = "none";
}

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
// CERRAR SCANNER WEB
// ------------------------------------------------------------

function cerrarScannerQuagga() {
  scannerActivo = false;
  try {
    Quagga.stop();
  } catch (e) {}
}

// ------------------------------------------------------------
// PROCESAR RETORNO DE BARCODE SCANNER+
// ------------------------------------------------------------

(function procesarRetornoNativo() {
  const params = new URLSearchParams(window.location.search);
  const code = params.get("code");

  if (code) {
    procesarCodigo(code);
    history.replaceState({}, "", window.location.origin + window.location.pathname);
  }
})();
