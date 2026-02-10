// ============================================================
// SCANNER V3 — Integración ZXing + modos interno/externo
// ============================================================

let selectedDeviceId = null;
let codeReader = null;
let scanning = false;

// Overlay
const overlay = document.getElementById("scanner-overlay");

// Botones
const btnInterno1 = document.getElementById("btn-scanner-interno-1");
const btnInterno2 = document.getElementById("btn-scanner-interno-2");
const btnExternoPreferido = document.getElementById("btn-scanner-externo-preferido");
const btnExternoSelector = document.getElementById("btn-scanner-externo-selector");

// ============================================================
// Mostrar / ocultar overlay
// ============================================================

function mostrarOverlay() {
  overlay.classList.remove("hidden");
}

function ocultarOverlay() {
  overlay.classList.add("hidden");
}

// ============================================================
// Iniciar ZXing
// ============================================================

async function iniciarScanner(deviceId) {
  if (scanning) return;
  scanning = true;

  mostrarOverlay();

  if (!codeReader) {
    codeReader = new ZXing.BrowserMultiFormatReader();
  }

  try {
    const videoElement = document.createElement("video");
    videoElement.setAttribute("playsinline", true);
    overlay.innerHTML = "";
    overlay.appendChild(videoElement);

    await codeReader.decodeFromVideoDevice(
      deviceId,
      videoElement,
      (result, err) => {
        if (result) {
          detenerScanner();
          procesarCodigo(result.text);
        }
      }
    );
  } catch (e) {
    console.error("Error iniciando scanner:", e);
    detenerScanner();
  }
}

// ============================================================
// Detener scanner
// ============================================================

function detenerScanner() {
  scanning = false;
  ocultarOverlay();

  if (codeReader) {
    try {
      codeReader.reset();
    } catch (e) {
      console.warn("Error al resetear ZXing:", e);
    }
  }
}

// ============================================================
// Procesar código leído
// ============================================================

function procesarCodigo(code) {
  if (!code) return;

  const input = document.getElementById("search-input");
  if (input) {
    input.value = code;
  }

  if (window.AppCore) {
    AppCore.buscar(true);
  }
}

// ============================================================
// Selección de cámara
// ============================================================

async function seleccionarCamara() {
  try {
    const devices = await ZXing.BrowserMultiFormatReader.listVideoInputDevices();
    if (!devices.length) {
      alert("No se encontraron cámaras.");
      return;
    }

    const nombres = devices.map((d, i) => `${i + 1}: ${d.label || "Cámara " + (i + 1)}`).join("\n");
    const idx = prompt("Elegí cámara:\n\n" + nombres);

    const index = parseInt(idx) - 1;
    if (index >= 0 && index < devices.length) {
      selectedDeviceId = devices[index].deviceId;
      localStorage.setItem("scannerPreferido", selectedDeviceId);
      iniciarScanner(selectedDeviceId);
    }
  } catch (e) {
    console.error("Error seleccionando cámara:", e);
  }
}

// ============================================================
// Scanner externo preferido
// ============================================================

async function iniciarScannerPreferido() {
  const saved = localStorage.getItem("scannerPreferido");

  if (saved) {
    selectedDeviceId = saved;
    iniciarScanner(saved);
    return;
  }

  seleccionarCamara();
}

// ============================================================
// Botones
// ============================================================

if (btnInterno1) {
  btnInterno1.addEventListener("click", async () => {
    const devices = await ZXing.BrowserMultiFormatReader.listVideoInputDevices();
    if (devices.length > 0) iniciarScanner(devices[0].deviceId);
  });
}

if (btnInterno2) {
  btnInterno2.addEventListener("click", async () => {
    const devices = await ZXing.BrowserMultiFormatReader.listVideoInputDevices();
    if (devices.length > 1) iniciarScanner(devices[1].deviceId);
    else alert("No hay segunda cámara disponible.");
  });
}

if (btnExternoPreferido) {
  btnExternoPreferido.addEventListener("click", iniciarScannerPreferido);
}

if (btnExternoSelector) {
  btnExternoSelector.addEventListener("click", seleccionarCamara);
}

// ============================================================
// Cerrar overlay al hacer clic afuera
// ============================================================

overlay.addEventListener("click", () => {
  detenerScanner();
});
