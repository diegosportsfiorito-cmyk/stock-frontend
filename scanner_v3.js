// ============================================================
// SCANNER V3 — Integración estable con ZXing + UI (2026 FIX)
// ============================================================

let scannerActivo = false;
let selectedDeviceId = null;
let codeReader = null;

// ------------------------------------------------------------
// MODO SIMPLE / COMPLETO
// ------------------------------------------------------------
function aplicarModo(code) {
  const modo = localStorage.getItem("modoDefecto") || "simple";

  if (modo === "simple") {
    const separadores = ["!", "/", "\\"];
    let corte = code.length;

    separadores.forEach((sep) => {
      const idx = code.indexOf(sep);
      if (idx !== -1 && idx < corte) corte = idx;
    });

    return code.substring(0, corte).trim();
  }

  return code;
}

// ------------------------------------------------------------
// CREAR / OBTENER VIDEO
// ------------------------------------------------------------
function getScannerVideoElement() {
  const overlay = document.getElementById("scanner-overlay");
  if (!overlay) return null;

  let video = document.getElementById("scanner-video");
  if (!video) {
    video = document.createElement("video");
    video.id = "scanner-video";
    video.autoplay = true;
    video.playsInline = true;
    video.style.width = "100%";
    video.style.height = "100%";
    video.style.objectFit = "cover";

    overlay.innerHTML = "";
    overlay.appendChild(video);
  }
  return video;
}

// ------------------------------------------------------------
// INICIAR SCANNER INTERNO (CÁMARA TRASERA)
// ------------------------------------------------------------
function iniciarScannerInterno(onClose) {
  if (scannerActivo) return;
  scannerActivo = true;

  const overlay = document.getElementById("scanner-overlay");
  const videoEl = getScannerVideoElement();

  if (!overlay || !videoEl) {
    scannerActivo = false;
    window.appCore?.showToast?.("No se pudo iniciar el scanner");
    onClose?.();
    return;
  }

  overlay.classList.remove("hidden");
  document.body.classList.add("scanner-active");

  if (!codeReader) {
    codeReader = new ZXing.BrowserMultiFormatReader();
  }

  const formatos = [
    ZXing.BarcodeFormat.EAN_13,
    ZXing.BarcodeFormat.EAN_8,
    ZXing.BarcodeFormat.UPC_A,
    ZXing.BarcodeFormat.UPC_E,
    ZXing.BarcodeFormat.QR_CODE,
  ];

  codeReader.hints = new Map();
  codeReader.hints.set(ZXing.DecodeHintType.POSSIBLE_FORMATS, formatos);

  codeReader
    .listVideoInputDevices()
    .then((devices) => {
      if (!devices.length) throw new Error("No hay cámaras disponibles");

      // Buscar cámara trasera
      let deviceId = null;

      const backCam = devices.find((d) =>
        (d.label || "").toLowerCase().includes("back")
      );

      deviceId = backCam ? backCam.deviceId : devices[0].deviceId;
      selectedDeviceId = deviceId;

      return codeReader.decodeFromVideoDevice(
        deviceId,
        videoEl,
        (result, err) => {
          if (result) {
            const text = result.text || "";
            const finalCode = aplicarModo(text);

            if (window.appCore?.els?.searchInput) {
              window.appCore.els.searchInput.value = finalCode;
            }

            cerrarScanner();
            onClose?.();
          }
        }
      );
    })
    .catch((err) => {
      cerrarScanner();
      window.appCore?.showToast?.("Error iniciando scanner");
      console.error("Scanner error:", err);
      onClose?.();
    });
}

// ------------------------------------------------------------
// CERRAR SCANNER (SEGURO)
// ------------------------------------------------------------
function cerrarScanner() {
  const overlay = document.getElementById("scanner-overlay");
  overlay?.classList.add("hidden");
  document.body.classList.remove("scanner-active");

  try {
    codeReader?.reset();
  } catch (_) {}

  scannerActivo = false;
}

// ------------------------------------------------------------
// BOTONES
// ------------------------------------------------------------
function startScannerInterno1(onClose) {
  iniciarScannerInterno(onClose);
}

function startScannerInterno2(onClose) {
  iniciarScannerInterno(onClose);
}

function startScannerExternoPreferido(onClose) {
  const intent =
    "intent://scan/#Intent;scheme=zxing;package=com.srowen.bs.android;end";

  window.location.href = intent;

  setTimeout(() => {
    const params = new URLSearchParams(window.location.search);
    const raw =
      params.get("SCAN_RESULT") ||
      params.get("q") ||
      params.get("code");

    if (raw) {
      const finalCode = aplicarModo(raw);
      if (window.appCore?.els?.searchInput) {
        window.appCore.els.searchInput.value = finalCode;
      }
    }

    cerrarScanner();
    onClose?.();
  }, 800);
}

function startScannerExternoSelector(onClose) {
  const opciones = [
    {
      nombre: "Barcode Scanner+ (Android)",
      url: "intent://scan/#Intent;scheme=zxing;package=com.srowen.bs.android;end",
    },
    {
      nombre: "ZXing App (Android)",
      url: "zxing://scan",
    },
    {
      nombre: "ZXing Web Scanner",
      url: "https://zxing.appspot.com/scan",
    },
    {
      nombre: "QR Code Reader (iOS)",
      url: "https://apps.apple.com/us/app/qr-code-reader/id1200318119",
    },
  ];

  let msg = "Elegí una opción:\n";
  opciones.forEach((o, i) => (msg += `${i + 1}) ${o.nombre}\n`));

  const elegido = prompt(msg);
  const idx = parseInt(elegido, 10) - 1;

  if (opciones[idx]) window.location.href = opciones[idx].url;

  setTimeout(() => {
    const params = new URLSearchParams(window.location.search);
    const raw =
      params.get("SCAN_RESULT") ||
      params.get("q") ||
      params.get("code");

    if (raw) {
      const finalCode = aplicarModo(raw);
      if (window.appCore?.els?.searchInput) {
        window.appCore.els.searchInput.value = finalCode;
      }
    }

    cerrarScanner();
    onClose?.();
  }, 800);
}

// ------------------------------------------------------------
// EXPORTAR
// ------------------------------------------------------------
window.startScannerInterno1 = startScannerInterno1;
window.startScannerInterno2 = startScannerInterno2;
window.startScannerExternoPreferido = startScannerExternoPreferido;
window.startScannerExternoSelector = startScannerExternoSelector;
