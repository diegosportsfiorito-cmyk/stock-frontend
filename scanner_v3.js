// ============================================================
// SCANNER V3 — PREMIUM (Google Lens Style)
// ZXing interno + app externa + selector + robustez total
// ============================================================

let modoScanner = localStorage.getItem("modoDefecto") || "simple";
let scannerActivo = false;
let zxingReader = null;
let currentDeviceId = null;
let availableDevices = [];
let scannerTimeout = null;
let linternaActiva = false;
let currentTrack = null;

// ============================================================
// SET MODO SCANNER
// ============================================================
window.setModoScanner = function (modo) {
  modoScanner = modo === "completo" ? "completo" : "simple";
};

// ============================================================
// PROCESAR CÓDIGO
// ============================================================
function procesarCodigo(codigo) {
  let resultado = codigo.trim();

  // Normalización inteligente
  if (/^T\d+$/i.test(resultado)) {
    resultado = resultado.replace("T", "");
  }

  if (/^P\d+$/i.test(resultado)) {
    resultado = "precio " + resultado.replace("P", "");
  }

  if (/^\d{2,3}$/.test(resultado)) {
    resultado = "talle " + resultado;
  }

  if (/^T\d+\s*A\s*T\d+$/i.test(resultado)) {
    resultado = resultado.replace(/T/gi, "").replace(/A/gi, " a ");
  }

  if (modoScanner === "simple") {
    resultado = extraerArticulo(resultado);
  }

  cargarEnInput(resultado);

  if (window.AppCore) {
    AppCore.buscar(true);
  }

  if (window.modoVozActivo === true && window.enviarVozAI) {
    enviarVozAI(resultado);
  }
}

// ============================================================
// EXTRAER ARTÍCULO (modo simple)
// ============================================================
function extraerArticulo(codigo) {
  const separadores = ["/", "!", " "];
  let corte = codigo.length;

  separadores.forEach((sep) => {
    const pos = codigo.indexOf(sep);
    if (pos !== -1 && pos < corte) corte = pos;
  });

  return codigo.substring(0, corte);
}

// ============================================================
// CARGAR EN INPUT
// ============================================================
function cargarEnInput(texto) {
  const input = document.getElementById("search-input");
  if (!input) return;
  input.value = texto;
  input.dispatchEvent(new Event("input"));
}

// ============================================================
// OVERLAY PREMIUM (Google Lens Style)
// ============================================================
function crearOverlayVideo() {
  let overlay = document.getElementById("scanner-overlay");
  if (overlay) return document.getElementById("scanner-video");

  overlay = document.createElement("div");
  overlay.id = "scanner-overlay";
  overlay.style.position = "fixed";
  overlay.style.inset = "0";
  overlay.style.background = "rgba(0,0,0,0.85)";
  overlay.style.zIndex = "99999";
  overlay.style.display = "flex";
  overlay.style.flexDirection = "column";
  overlay.style.alignItems = "center";
  overlay.style.justifyContent = "center";
  overlay.style.backdropFilter = "blur(4px)";

  const video = document.createElement("video");
  video.id = "scanner-video";
  video.setAttribute("playsinline", true);
  video.style.width = "100%";
  video.style.maxWidth = "480px";
  video.style.borderRadius = "12px";

  const marco = document.createElement("div");
  marco.style.position = "absolute";
  marco.style.width = "240px";
  marco.style.height = "240px";
  marco.style.border = "3px solid #00ff88";
  marco.style.borderRadius = "18px";
  marco.style.boxShadow = "0 0 18px #00ff88";
  marco.style.animation = "pulse 1.4s infinite ease-in-out";

  const texto = document.createElement("div");
  texto.textContent = "Apuntá al código";
  texto.style.marginTop = "14px";
  texto.style.color = "#fff";
  texto.style.fontSize = "1rem";
  texto.style.opacity = "0.8";

  const botones = document.createElement("div");
  botones.style.display = "flex";
  botones.style.gap = "12px";
  botones.style.marginTop = "18px";

  const btnCerrar = document.createElement("button");
  btnCerrar.textContent = "✖";
  btnCerrar.style.padding = "10px 14px";
  btnCerrar.style.borderRadius = "999px";
  btnCerrar.style.border = "none";
  btnCerrar.style.background = "#ff4f6a";
  btnCerrar.style.color = "#fff";
  btnCerrar.style.cursor = "pointer";
  btnCerrar.onclick = stopScannerInterno;

  const btnLinterna = document.createElement("button");
  btnLinterna.textContent = "🔦";
  btnLinterna.style.padding = "10px 14px";
  btnLinterna.style.borderRadius = "999px";
  btnLinterna.style.border = "none";
  btnLinterna.style.background = "#111827";
  btnLinterna.style.color = "#fff";
  btnLinterna.style.cursor = "pointer";
  btnLinterna.onclick = toggleLinterna;

  const btnCambiarCam = document.createElement("button");
  btnCambiarCam.textContent = "🔄";
  btnCambiarCam.style.padding = "10px 14px";
  btnCambiarCam.style.borderRadius = "999px";
  btnCambiarCam.style.border = "none";
  btnCambiarCam.style.background = "#111827";
  btnCambiarCam.style.color = "#fff";
  btnCambiarCam.style.cursor = "pointer";
  btnCambiarCam.onclick = cambiarCamara;

  botones.appendChild(btnCerrar);
  botones.appendChild(btnLinterna);
  botones.appendChild(btnCambiarCam);

  overlay.appendChild(video);
  overlay.appendChild(marco);
  overlay.appendChild(texto);
  overlay.appendChild(botones);

  document.body.appendChild(overlay);

  return video;
}

function destruirOverlayVideo() {
  const overlay = document.getElementById("scanner-overlay");
  if (overlay) overlay.remove();
}

// ============================================================
// LINTERNAS
// ============================================================
async function toggleLinterna() {
  if (!currentTrack) return;

  const capabilities = currentTrack.getCapabilities();
  if (!capabilities.torch) {
    alert("Este dispositivo no soporta linterna.");
    return;
  }

  linternaActiva = !linternaActiva;

  try {
    await currentTrack.applyConstraints({
      advanced: [{ torch: linternaActiva }],
    });
  } catch (e) {
    console.warn("No se pudo activar linterna:", e);
  }
}

// ============================================================
// CAMBIAR CÁMARA
// ============================================================
async function cambiarCamara() {
  if (!availableDevices.length) return;

  const index = availableDevices.findIndex((d) => d.deviceId === currentDeviceId);
  const nextIndex = (index + 1) % availableDevices.length;
  currentDeviceId = availableDevices[nextIndex].deviceId;

  stopScannerInterno();
  await startScannerInterno1();
}

// ============================================================
// ZXing INTERNO — lector real
// ============================================================
async function startScannerInterno1() {
  if (scannerActivo) return;
  if (!window.ZXing || !ZXing.BrowserMultiFormatReader) {
    alert("No se pudo cargar el lector interno (ZXing).");
    return;
  }

  scannerActivo = true;

  try {
    if (!zxingReader) {
      zxingReader = new ZXing.BrowserMultiFormatReader();
    }

    availableDevices = await zxingReader.listVideoInputDevices();
    if (!availableDevices.length) {
      alert("No se encontró cámara.");
      scannerActivo = false;
      return;
    }

    const backCam =
      availableDevices.find((d) =>
        (d.label || "").toLowerCase().includes("back")
      ) || availableDevices[0];

    currentDeviceId = backCam.deviceId;

    const videoElem = crearOverlayVideo();

    const stream = await navigator.mediaDevices.getUserMedia({
      video: { deviceId: currentDeviceId },
    });

    videoElem.srcObject = stream;
    currentTrack = stream.getVideoTracks()[0];
    await videoElem.play();

    scannerTimeout = setTimeout(() => {
      stopScannerInterno();
      alert("No se detectó ningún código.");
    }, 12000);

    await zxingReader.decodeFromVideoDevice(
      currentDeviceId,
      videoElem,
      (result, err) => {
        if (!scannerActivo) return;
        if (result) {
          const code = result.getText().trim();
          navigator.vibrate?.(80);
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

async function startScannerInterno2() {
  await startScannerInterno1();
}

// ============================================================
// STOP ZXing
// ============================================================
function stopScannerInterno() {
  scannerActivo = false;

  if (scannerTimeout) {
    clearTimeout(scannerTimeout);
    scannerTimeout = null;
  }

  if (zxingReader) {
    try {
      zxingReader.reset();
    } catch (e) {}
  }

  if (currentTrack) {
    currentTrack.stop();
    currentTrack = null;
  }

  destruirOverlayVideo();
}

// ============================================================
// SCANNER EXTERNO — Barcode Scanner+
// ============================================================
function startScannerExternoPreferido() {
  const callbackUrl = `${window.location.origin}${window.location.pathname}?code={CODE}`;
  const url = `zxing://scan/?ret=${encodeURIComponent(
    callbackUrl
  )}&SCAN_FORMATS=EAN_13,EAN_8,UPC_A,CODE_128`;

  window.location.href = url;
}

// ============================================================
// SCANNER EXTERNO — Selector
// ============================================================
function startScannerExternoSelector() {
  const callbackUrl = `${window.location.origin}${window.location.pathname}?code={CODE}`;
  const url = `zxing://scan/?ret=${encodeURIComponent(callbackUrl)}`;

  window.location.href = url;
}

// ============================================================
// PROCESAR RETORNO EXTERNO (?code=...)
// ============================================================
(function procesarRetornoNativo() {
  const params = new URLSearchParams(window.location.search);
  const code = params.get("code");

  if (code) {
    procesarCodigo(code);
    history.replaceState({}, "", window.location.origin + window.location.pathname);
  }
})();
