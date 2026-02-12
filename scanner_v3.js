// ============================================================
// SCANNER V3 — Integración estable con ZXing + UI
// Versión restaurada + mejorada según requerimientos 2026
// ============================================================
// - Botón 1 → lector interno (cámara trasera)
// - Botón 2 → lector interno robusto (cámara trasera)
// - Botón 3 → abrir Barcode Scanner+ (app instalada)
// - Botón 4 → selector Android/iOS para abrir/descargar apps
// - Todos devuelven el código al input y disparan búsqueda
// - Sin cámara selfie en ningún caso
// ============================================================

let scannerActivo = false;
let selectedDeviceId = null;
let codeReader = null;

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
function iniciarScannerInterno(facingMode, onClose) {
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

  if (!codeReader) {
    codeReader = new ZXing.BrowserMultiFormatReader();
  }

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

            // Cargar valor en input
            if (appCore?.els?.searchInput) {
              appCore.els.searchInput.value = text;
            }

            // Cerrar overlay
            overlay.classList.add("hidden");
            document.body.classList.remove("scanner-active");

            // Liberar cámara
            try {
              codeReader.reset();
            } catch (_) {}

            scannerActivo = false;

            // Disparar búsqueda
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
  iniciarScannerInterno("environment", onClose);
}

// ------------------------------------------------------------
// BOTÓN 2 — LECTOR INTERNO ROBUSTO (TRASERA)
// ------------------------------------------------------------
function startScannerInterno2(onClose) {
  iniciarScannerInterno("environment", onClose);
}

// ------------------------------------------------------------
// BOTÓN 3 — ABRIR APP INSTALADA "BARCODE SCANNER+"
// ------------------------------------------------------------
// Esta app devuelve el código vía intent → window.location.href
// Formato estándar ZXing
// ------------------------------------------------------------
function startScannerExternoPreferido(onClose) {
  const intent =
    "intent://scan/#Intent;scheme=zxing;package=com.srowen.bs.android;end";

  window.location.href = intent;

  // Esperamos retorno
  setTimeout(() => {
    // Si la app devolvió el código, ZXing lo pone en la URL como ?q=xxxx
    const params = new URLSearchParams(window.location.search);
    const code = params.get("q");

    if (code && appCore?.els?.searchInput) {
      appCore.els.searchInput.value = code;
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
    const code = params.get("q");

    if (code && appCore?.els?.searchInput) {
      appCore.els.searchInput.value = code;
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
