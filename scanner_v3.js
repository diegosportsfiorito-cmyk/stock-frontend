// ============================================================
// SCANNER V3 — Integración estable con ZXing + UI
// Versión final integrada 2026
// ============================================================
// - Botón 1 → lector interno (cámara trasera)
// - Botón 2 → lector interno robusto (cámara trasera)
// - Botón 3 → abrir Barcode Scanner+ (app instalada)
// - Botón 4 → selector Android/iOS para abrir/descargar apps
// - Todos devuelven el código al input y disparan búsqueda
// - Soporte CODE128, CODE39, EAN13, UPC, QR
// - Respeta modo SIMPLE / COMPLETO (switch)
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
    // SIMPLE = solo números del código
    return code.replace(/\D+/g, "");
  }

  // COMPLETO = código tal cual
  return code;
}

// ------------------------------------------------------------
// CREAR / OBTENER VIDEO DENTRO DEL OVERLAY
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
// INICIAR SCANNER INTERNO (SIEMPRE CÁMARA TRASERA)
// ------------------------------------------------------------
function iniciarScannerInterno(onClose) {
  if (scannerActivo) return;
  scannerActivo = true;

  const overlay = document.getElementById("scanner-overlay");
  const videoEl = getScannerVideoElement();

  if (!overlay || !videoEl) {
    scannerActivo = false;
    appCore?.showToast?.("No se pudo iniciar el scanner");
    onClose?.();
    return;
  }

  overlay.classList.remove("hidden");
  document.body.classList.add("scanner-active");

  // Inicializar lector
  if (!codeReader) {
    codeReader = new ZXing.BrowserMultiFormatReader();
  }

  // Forzar formatos soportados
  const formatos = [
    ZXing.BarcodeFormat.CODE_128,
    ZXing.BarcodeFormat.CODE_39,
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
    .then((videoInputDevices) => {
      if (!videoInputDevices.length) {
        throw new Error("No hay cámaras disponibles");
      }

      // SIEMPRE CÁMARA TRASERA
      let deviceId = null;

      const cam = videoInputDevices.find((d) =>
        d.label.toLowerCase().includes("back")
      );

      deviceId = cam ? cam.deviceId : videoInputDevices[0].deviceId;
      selectedDeviceId = deviceId;

      return codeReader.decodeFromVideoDevice(
        deviceId,
        videoEl,
        (result, err) => {
          if (result) {
            const text = result.text || "";
            const finalCode = aplicarModo(text);

            if (appCore?.els?.searchInput) {
              appCore.els.searchInput.value = finalCode;
            }

            overlay.classList.add("hidden");
            document.body.classList.remove("scanner-active");

            try {
              codeReader.reset();
            } catch (_) {}

            scannerActivo = false;

            onClose?.();
          }
        }
      );
    })
    .catch((err) => {
      overlay.classList.add("hidden");
      document.body.classList.remove("scanner-active");
      scannerActivo = false;

      try {
        codeReader?.reset();
      } catch (_) {}

      onClose?.();
      appCore?.showToast?.("Error iniciando scanner");
      console.error("Scanner error:", err);
    });
}
// ------------------------------------------------------------
// BOTÓN 1 — LECTOR INTERNO (TRASERA)
// ------------------------------------------------------------
function startScannerInterno1(onClose) {
  iniciarScannerInterno(onClose);
}

// ------------------------------------------------------------
// BOTÓN 2 — LECTOR INTERNO ROBUSTO (TRASERA)
// (por ahora mismo flujo, pero separado por si luego diferenciamos)
// ------------------------------------------------------------
function startScannerInterno2(onClose) {
  iniciarScannerInterno(onClose);
}

// ------------------------------------------------------------
// BOTÓN 3 — ABRIR APP INSTALADA "BARCODE SCANNER+"
// ------------------------------------------------------------
function startScannerExternoPreferido(onClose) {
  const intent =
    "intent://scan/#Intent;scheme=zxing;package=com.srowen.bs.android;end";

  // Abrir app
  window.location.href = intent;

  // Esperar retorno
  setTimeout(() => {
    const params = new URLSearchParams(window.location.search);

    const code =
      params.get("SCAN_RESULT") ||
      params.get("q") ||
      params.get("code");

    if (code && appCore?.els?.searchInput) {
      const finalCode = aplicarModo(code);
      appCore.els.searchInput.value = finalCode;
      onClose?.();
    }
  }, 1500);
}

// ------------------------------------------------------------
// BOTÓN 4 — SELECTOR ANDROID / IOS
// ------------------------------------------------------------
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
  opciones.forEach((o, i) => {
    msg += `${i + 1}) ${o.nombre}\n`;
  });

  const elegido = prompt(msg);
  const idx = parseInt(elegido, 10) - 1;

  if (opciones[idx]) {
    window.location.href = opciones[idx].url;
  }

  setTimeout(() => {
    const params = new URLSearchParams(window.location.search);

    const code =
      params.get("SCAN_RESULT") ||
      params.get("q") ||
      params.get("code");

    if (code && appCore?.els?.searchInput) {
      const finalCode = aplicarModo(code);
      appCore.els.searchInput.value = finalCode;
      onClose?.();
    }
  }, 1500);
}
// ------------------------------------------------------------
// EXPORTAR
// ------------------------------------------------------------
window.startScannerInterno1 = startScannerInterno1;
window.startScannerInterno2 = startScannerInterno2;
window.startScannerExternoPreferido = startScannerExternoPreferido;
window.startScannerExternoSelector = startScannerExternoSelector;
