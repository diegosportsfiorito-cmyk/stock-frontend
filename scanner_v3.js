// ============================================================
// SCANNER V3 — Integración estable con ZXing + UI
// ============================================================
// Correcciones aplicadas:
// - Sin dobles disparos
// - Cierre correcto del overlay
// - Cámara liberada siempre
// - Callback unificado hacia ui_engine_v3.js
// - Manejo correcto de facingMode
// - Manejo correcto de errores
// - Compatible con AppCore y layout móvil
// ============================================================

let scannerActivo = false;
let selectedDeviceId = null;

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
// INICIAR SCANNER INTERNO
// ------------------------------------------------------------
function iniciarScanner(facingMode, onClose) {
  if (scannerActivo) return;
  scannerActivo = true;

  const overlay = document.getElementById("scanner-overlay");
  if (overlay) overlay.classList.remove("hidden");

  const codeReader = new ZXing.BrowserMultiFormatReader();

  codeReader
    .listVideoInputDevices()
    .then((videoInputDevices) => {
      if (!videoInputDevices.length) {
        throw new Error("No hay cámaras disponibles");
      }

      // Selección de cámara
      let deviceId = null;

      if (selectedDeviceId) {
        deviceId = selectedDeviceId;
      } else {
        const cam = videoInputDevices.find((d) =>
          d.label.toLowerCase().includes(facingMode)
        );
        deviceId = cam ? cam.deviceId : videoInputDevices[0].deviceId;
      }

      // Decodificación en vivo
      return codeReader.decodeFromVideoDevice(
        deviceId,
        "scanner-overlay",
        (result, err) => {
          if (result) {
            const text = result.text || "";

            // Cargar valor en input
            if (window.AppCore?.els?.searchInput) {
              AppCore.els.searchInput.value = text;
            }

            // Cerrar overlay
            if (overlay) overlay.classList.add("hidden");

            // Liberar cámara
            codeReader.reset();
            scannerActivo = false;

            // Callback hacia UI
            if (onClose) onClose();
          }
        }
      );
    })
    .catch((err) => {
      if (overlay) overlay.classList.add("hidden");
      scannerActivo = false;

      if (onClose) onClose();

      if (window.AppCore) {
        AppCore.showToast("Error iniciando scanner");
      }

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
    "https://zxing.appspot.com/scan"
  ];

  for (const url of apps) {
    window.location.href = url;
  }

  setTimeout(() => {
    if (onClose) onClose();
  }, 1500);
}

// ------------------------------------------------------------
// SCANNER EXTERNO (selector manual)
// ------------------------------------------------------------
function startScannerExternoSelector(onClose) {
  const opciones = [
    "zxing://scan",
    "https://zxing.appspot.com/scan",
    "intent://scan/#Intent;scheme=zxing;package=com.google.zxing.client.android;end"
  ];

  const elegido = prompt(
    "Elegí una opción:\n1) ZXing App\n2) ZXing Web\n3) ZXing Intent"
  );

  const idx = parseInt(elegido) - 1;
  if (opciones[idx]) {
    window.location.href = opciones[idx];
  }

  setTimeout(() => {
    if (onClose) onClose();
  }, 1500);
}

// ------------------------------------------------------------
// EXPORTAR
// ------------------------------------------------------------
window.startScannerInterno1 = startScannerInterno1;
window.startScannerInterno2 = startScannerInterno2;
window.startScannerExternoPreferido = startScannerExternoPreferido;
window.startScannerExternoSelector = startScannerExternoSelector;
