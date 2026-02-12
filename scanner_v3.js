// ============================================================
// SCANNER V3 — Integración estable con ZXing + UI
// ============================================================
// Correcciones finales:
// - Uso correcto de appCore (no AppCore)
// - Cierre seguro del overlay
// - Reset garantizado del lector
// - Prevención de doble inicio
// - Callback unificado hacia UI Engine
// - Manejo robusto de errores
// ============================================================

let scannerActivo = false;
let selectedDeviceId = null;
let codeReader = null;

// ------------------------------------------------------------
// SCANNERS INTERNOS (A = environment, B = user)
// ------------------------------------------------------------
function startScannerInterno1(onClose) {
  iniciarScanner("environment", onClose);
}

function startScannerInterno2(onClose) {
  iniciarScanner("user", onClose);
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
// INICIAR SCANNER INTERNO
// ------------------------------------------------------------
function iniciarScanner(facingMode, onClose) {
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

      // Selección de cámara
      let deviceId = selectedDeviceId;

      if (!deviceId) {
        const cam = videoInputDevices.find((d) =>
          d.label.toLowerCase().includes(facingMode)
        );
        deviceId = cam ? cam.deviceId : videoInputDevices[0].deviceId;
        selectedDeviceId = deviceId;
      }

      // Decodificación en vivo
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

            // Callback hacia UI (dispara búsqueda)
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
// SCANNER EXTERNO (preferido)
// ------------------------------------------------------------
function startScannerExternoPreferido(onClose) {
  const apps = [
    "zxing://scan",
    "intent://scan/#Intent;scheme=zxing;package=com.google.zxing.client.android;end",
    "https://zxing.appspot.com/scan",
  ];

  for (const url of apps) {
    window.location.href = url;
  }

  setTimeout(() => onClose?.(), 1500);
}

// ------------------------------------------------------------
// SCANNER EXTERNO (selector manual)
// ------------------------------------------------------------
function startScannerExternoSelector(onClose) {
  const opciones = [
    "zxing://scan",
    "https://zxing.appspot.com/scan",
    "intent://scan/#Intent;scheme=zxing;package=com.google.zxing.client.android;end",
  ];

  const elegido = prompt(
    "Elegí una opción:\n1) ZXing App\n2) ZXing Web\n3) ZXing Intent"
  );

  const idx = parseInt(elegido, 10) - 1;
  if (opciones[idx]) {
    window.location.href = opciones[idx];
  }

  setTimeout(() => onClose?.(), 1500);
}

// ------------------------------------------------------------
// EXPORTAR
// ------------------------------------------------------------
window.startScannerInterno1 = startScannerInterno1;
window.startScannerInterno2 = startScannerInterno2;
window.startScannerExternoPreferido = startScannerExternoPreferido;
window.startScannerExternoSelector = startScannerExternoSelector;
