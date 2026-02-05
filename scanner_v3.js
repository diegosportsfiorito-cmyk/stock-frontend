// ============================================================
// SCANNER V3 — ZXing interno + app externa + selector
// ============================================================

let modoScanner = localStorage.getItem("modoDefecto") || "simple";
let scannerActivo = false;
let zxingReader = null;
let currentDeviceId = null;

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
// OVERLAY DE VIDEO
// ============================================================
function crearOverlayVideo() {
  let overlay = document.getElementById("scanner-overlay");
  if (!overlay) {
    overlay = document.createElement("div");
    overlay.id = "scanner-overlay";
    overlay.style.position = "fixed";
    overlay.style.inset = "0";
    overlay.style.background = "#000";
    overlay.style.zIndex = "9999";
    overlay.style.display = "flex";
    overlay.style.flexDirection = "column";
    overlay.style.alignItems = "center";
    overlay.style.justifyContent = "center";

    const video = document.createElement("video");
    video.id = "scanner-video";
    video.setAttribute("playsinline", true);
    video.style.width = "100%";
    video.style.maxWidth = "480px";
    video.style.height = "auto";

    const btnCerrar = document.createElement("button");
    btnCerrar.textContent = "Cerrar";
    btnCerrar.style.marginTop = "10px";
    btnCerrar.style.padding = "8px 14px";
    btnCerrar.style.borderRadius = "999px";
    btnCerrar.style.border = "none";
    btnCerrar.style.background = "#111827";
    btnCerrar.style.color = "#fff";
    btnCerrar.style.cursor = "pointer";
    btnCerrar.onclick = stopScannerInterno;

    overlay.appendChild(video);
    overlay.appendChild(btnCerrar);
    document.body.appendChild(overlay);
  }
  return document.getElementById("scanner-video");
}

function destruirOverlayVideo() {
  const overlay = document.getElementById("scanner-overlay");
  if (overlay) overlay.remove();
}

// ============================================================
// ZXing INTERNO — lector real
// ============================================================
async function startScannerInterno1() {
  if (scannerActivo) return;
  if (!window.ZXing || !ZXing.BrowserMultiFormatReader) {
    alert("No se pudo cargar el lector interno (ZXing). Verificá la conexión.");
    return;
  }

  scannerActivo = true;

  try {
    if (!zxingReader) {
      zxingReader = new ZXing.BrowserMultiFormatReader();
    }

    const devices = await zxingReader.listVideoInputDevices();
    if (!devices.length) {
      alert("No se encontró cámara en este dispositivo.");
      scannerActivo = false;
      return;
    }

    // Elegimos la trasera si existe
    const backCam =
      devices.find((d) =>
        (d.label || "").toLowerCase().includes("back")
      ) || devices[0];

    currentDeviceId = backCam.deviceId;

    const videoElem = crearOverlayVideo();

    await zxingReader.decodeFromVideoDevice(
      currentDeviceId,
      videoElem,
      (result, err) => {
        if (!scannerActivo) return;
        if (result) {
          const code = result.getText().trim();
          procesarCodigo(code);
          stopScannerInterno();
        }
      }
    );
  } catch (err) {
    console.error("Error ZXing:", err);
    alert("No se pudo iniciar el scanner interno.");
    stopScannerInterno();
  }
}

// Interno 2: dejamos preparado para otro perfil, por ahora reutiliza el mismo
async function startScannerInterno2() {
  await startScannerInterno1();
}

// ------------------------------------------------------------
// STOP ZXing
// ------------------------------------------------------------
function stopScannerInterno() {
  scannerActivo = false;
  if (zxingReader) {
    try {
      zxingReader.reset();
    } catch (e) {}
  }
  destruirOverlayVideo();
}

// ============================================================
// SCANNER EXTERNO — Barcode Scanner+ (intent / deep link)
// ============================================================
function startScannerExternoPreferido() {
  const callbackUrl = `${window.location.origin}${window.location.pathname}?code={CODE}`;
  const url = `zxing://scan/?ret=${encodeURIComponent(
    callbackUrl
  )}&SCAN_FORMATS=EAN_13,EAN_8,UPC_A,CODE_128`;

  window.location.href = url;
}

// ============================================================
// SCANNER EXTERNO — Selector de app del sistema
// ============================================================
function startScannerExternoSelector() {
  const callbackUrl = `${window.location.origin}${window.location.pathname}?code={CODE}`;
  const url = `zxing://scan/?ret=${encodeURIComponent(callbackUrl)}`;

  window.location.href = url;
}

// ------------------------------------------------------------
// PROCESAR RETORNO EXTERNO (?code=...)
// ------------------------------------------------------------
(function procesarRetornoNativo() {
  const params = new URLSearchParams(window.location.search);
  const code = params.get("code");

  if (code) {
    procesarCodigo(code);
    history.replaceState({}, "", window.location.origin + window.location.pathname);
  }
})();
