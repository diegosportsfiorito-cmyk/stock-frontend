// ============================================================
// SCANNER V3 — Integración estable con ZXing + UI
// Versión final integrada 2026
// ============================================================
// - Botón 1 → lector interno (cámara trasera)
// - Botón 2 → lector interno robusto (cámara trasera)
// - Botón 3 → abrir Barcode Scanner+ (app instalada)
// - Botón 4 → selector Android/iOS para abrir/descargar apps
// - Interno: EAN13 / UPC / QR (ZXing web)
// - CODE128: usar SIEMPRE botón 3 (Barcode Scanner+)
// - Modo SIMPLE / COMPLETO:
//   SIMPLE  = primer tramo hasta ! / \
//   COMPLETO = código completo
//   El guion "-" ES parte del artículo, NO separador
// ============================================================

let scannerActivo = false;
let selectedDeviceId = null;
let codeReader = null;
let lastClipboardValue = "";
let scannerExternoEnEspera = false;

// ------------------------------------------------------------
// MODO SIMPLE / COMPLETO (lógica de artículo)
// ------------------------------------------------------------
function aplicarModo(code) {
  const modo = localStorage.getItem("modoDefecto") || "simple";

  if (modo === "simple") {
    // separadores de tramo: !  /  \
    const separadores = ["!", "/", "\\"];

    let corte = code.length;

    separadores.forEach((sep) => {
      const idx = code.indexOf(sep);
      if (idx !== -1 && idx < corte) corte = idx;
    });

    return code.substring(0, corte).trim();
  }

  // COMPLETO = código tal cual
  return code;
}

// ------------------------------------------------------------
// CERRAR SCANNER (INTERNO / EXTERNO)
// ------------------------------------------------------------
function cerrarScanner() {
  const overlay = document.getElementById("scanner-overlay");
  if (overlay) overlay.classList.add("hidden");

  document.body.classList.remove("scanner-active");

  try {
    codeReader?.reset();
  } catch (_) {}

  scannerActivo = false;
  scannerExternoEnEspera = false;
}

// Escape para cerrar
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape") {
    cerrarScanner();
  }
});

// Clic en overlay para cerrar (si se quiere permitir)
document.addEventListener("click", (e) => {
  const overlay = document.getElementById("scanner-overlay");
  if (!overlay) return;
  if (e.target === overlay) {
    cerrarScanner();
  }
});

// ------------------------------------------------------------
// DETECTAR RETORNO A LA APP (para scanner externo)
// ------------------------------------------------------------
document.addEventListener("visibilitychange", async () => {
  if (!scannerExternoEnEspera) return;
  if (document.visibilityState !== "visible") return;

  try {
    const text = await navigator.clipboard.readText();
    if (text && text !== lastClipboardValue) {
      lastClipboardValue = text;

      const finalCode = aplicarModo(text);

      if (appCore?.els?.searchInput) {
        appCore.els.searchInput.value = finalCode;
      }

      cerrarScanner();
    }
  } catch (_) {
    // ignoramos errores de clipboard
  }
});

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
  scannerExternoEnEspera = false;

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

  // Formatos soportados por ZXing web (interno)
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

            cerrarScanner();
            onClose?.();
          }
        }
      );
    })
    .catch((err) => {
      cerrarScanner();
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
// (mismo flujo por ahora, separado por si luego diferenciamos)
// ------------------------------------------------------------
function startScannerInterno2(onClose) {
  iniciarScannerInterno(onClose);
}

// ------------------------------------------------------------
// BOTÓN 3 — ABRIR APP INSTALADA "BARCODE SCANNER+"
// (para CODE128 / CODE39 / todo lo complejo)
// ------------------------------------------------------------
function startScannerExternoPreferido(onClose) {
  if (scannerActivo) return;
  scannerActivo = true;
  scannerExternoEnEspera = true;
  lastClipboardValue = "";

  const overlay = document.getElementById("scanner-overlay");
  if (overlay) overlay.classList.remove("hidden");
  document.body.classList.add("scanner-active");

  const intent =
    "intent://scan/#Intent;scheme=zxing;package=com.srowen.bs.android;end";

  // Abrir app externa
  window.location.href = intent;

  // Intento de retorno vía SCAN_RESULT (si el navegador lo respeta)
  setTimeout(() => {
    const params = new URLSearchParams(window.location.search);

    const raw =
      params.get("SCAN_RESULT") ||
      params.get("q") ||
      params.get("code");

    if (raw) {
      const finalCode = aplicarModo(raw);

      if (appCore?.els?.searchInput) {
        appCore.els.searchInput.value = finalCode;
      }

      cerrarScanner();
      onClose?.();
      return;
    }

    // Si no hay SCAN_RESULT, quedamos a la espera de visibilitychange + clipboard
  }, 800);
}

// ------------------------------------------------------------
// BOTÓN 4 — SELECTOR ANDROID / IOS
// ------------------------------------------------------------
function startScannerExternoSelector(onClose) {
  if (scannerActivo) return;
  scannerActivo = true;
  scannerExternoEnEspera = true;
  lastClipboardValue = "";

  const overlay = document.getElementById("scanner-overlay");
  if (overlay) overlay.classList.remove("hidden");
  document.body.classList.add("scanner-active");

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

  // Intento de SCAN_RESULT
  setTimeout(() => {
    const params = new URLSearchParams(window.location.search);

    const raw =
      params.get("SCAN_RESULT") ||
      params.get("q") ||
      params.get("code");

    if (raw) {
      const finalCode = aplicarModo(raw);

      if (appCore?.els?.searchInput) {
        appCore.els.searchInput.value = finalCode;
      }

      cerrarScanner();
      onClose?.();
      return;
    }

    // Si no hay SCAN_RESULT, esperamos visibilitychange + clipboard
  }, 800);
}

// ------------------------------------------------------------
// EXPORTAR
// ------------------------------------------------------------
window.startScannerInterno1 = startScannerInterno1;
window.startScannerInterno2 = startScannerInterno2;
window.startScannerExternoPreferido = startScannerExternoPreferido;
window.startScannerExternoSelector = startScannerExternoSelector;
