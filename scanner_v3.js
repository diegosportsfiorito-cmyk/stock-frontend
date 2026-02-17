/* ============================================================
   SCANNER V4 PRO — IA PRO ULTRA
   scanner_v3.js (versión final)
   ============================================================ */

(function () {
  let codeReader = null;
  let currentStream = null;
  let scanning = false;
  let multiMode = false;
  let detectedCodes = [];
  let zoomLevel = 1;
  let maxZoom = 1;
  let torchOn = false;

  const overlay = document.getElementById("scanner-overlay");
  const video = document.getElementById("scanner-video");

  /* ============================================================
     BEEP
     ============================================================ */
  const AudioCtx = window.AudioContext || window.webkitAudioContext;
  let audioCtx = null;

  function beep(freq = 1200, duration = 120) {
    try {
      if (!AudioCtx) return;
      if (!audioCtx) audioCtx = new AudioCtx();
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type = "sine";
      osc.frequency.value = freq;
      gain.gain.value = 0.15;
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.start();
      setTimeout(() => osc.stop(), duration);
    } catch (_) {}
  }

  /* ============================================================
     CREAR CONTROLES (inyectados dinámicamente)
     ============================================================ */
  function createControls() {
    const controls = document.createElement("div");
    controls.className = "scanner-controls";

    controls.innerHTML = `
      <button class="scanner-btn" id="scn-torch">🔦</button>
      <button class="scanner-btn" id="scn-zoom-in">➕</button>
      <button class="scanner-btn" id="scn-zoom-out">➖</button>
      <button class="scanner-btn-primary" id="scn-multi">Multi-scan</button>
      <button class="scanner-btn-danger" id="scn-close">✖</button>
    `;

    overlay.appendChild(controls);

    // Contador (solo multi-scan)
    const counter = document.createElement("div");
    counter.className = "scanner-counter hidden";
    counter.id = "scn-counter";
    overlay.appendChild(counter);
  }

  /* ============================================================
     MOSTRAR / OCULTAR CONTROLES
     ============================================================ */
  function updateControls() {
    const btnMulti = document.getElementById("scn-multi");
    const btnClose = document.getElementById("scn-close");
    const counter = document.getElementById("scn-counter");

    if (!multiMode) {
      btnMulti.textContent = "Multi-scan";
      counter.classList.add("hidden");
    } else {
      btnMulti.textContent = "Enviar todos";
      counter.classList.remove("hidden");
      counter.textContent = `${detectedCodes.length} códigos`;
    }
  }

  /* ============================================================
     TORCH
     ============================================================ */
  async function toggleTorch() {
    if (!currentStream) return;

    const track = currentStream.getVideoTracks()[0];
    const capabilities = track.getCapabilities();

    if (!capabilities.torch) {
      appCore.showToast("Linterna no disponible");
      return;
    }

    torchOn = !torchOn;

    try {
      await track.applyConstraints({
        advanced: [{ torch: torchOn }],
      });
    } catch (e) {
      appCore.showToast("No se pudo activar la linterna");
    }
  }

  /* ============================================================
     ZOOM
     ============================================================ */
  async function applyZoom() {
    if (!currentStream) return;

    const track = currentStream.getVideoTracks()[0];
    const capabilities = track.getCapabilities();

    if (!capabilities.zoom) {
      appCore.showToast("Zoom no soportado");
      return;
    }

    maxZoom = capabilities.zoom.max || 1;

    zoomLevel = Math.max(1, Math.min(zoomLevel, maxZoom));

    try {
      await track.applyConstraints({
        advanced: [{ zoom: zoomLevel }],
      });
    } catch (e) {
      console.warn("Zoom error:", e);
    }
  }

  /* ============================================================
     INICIAR CÁMARA
     ============================================================ */
  async function startCamera() {
    try {
      currentStream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: "environment",
          width: { ideal: 1280 },
          height: { ideal: 720 },
          focusMode: "continuous",
        },
        audio: false,
      });

      video.srcObject = currentStream;
      await video.play();

      return true;
    } catch (e) {
      appCore.showToast("No se pudo acceder a la cámara");
      return false;
    }
  }

  /* ============================================================
     DETENER CÁMARA
     ============================================================ */
  function stopCamera() {
    if (currentStream) {
      currentStream.getTracks().forEach((t) => t.stop());
      currentStream = null;
    }
  }

  /* ============================================================
     CERRAR SCANNER
     ============================================================ */
  function closeScanner() {
    scanning = false;
    multiMode = false;
    detectedCodes = [];
    stopCamera();
    overlay.classList.add("hidden");
    document.body.classList.remove("scanner-active");
  }

  /* ============================================================
     PROCESAR CÓDIGO DETECTADO
     ============================================================ */
  function handleDetected(code) {
    beep();

    if (!multiMode) {
      // MODO SIMPLE
      closeScanner();
      const input = document.getElementById("search-input");
      if (input) input.value = code;
      if (window.appCore?.buscar) appCore.buscar();
      return;
    }

    // MODO MULTI-SCAN
    if (!detectedCodes.includes(code)) {
      detectedCodes.push(code);
      updateControls();
    }
  }

  /* ============================================================
     INICIAR DECODIFICACIÓN ZXING
     ============================================================ */
  async function startDecoding() {
    if (!codeReader) {
      codeReader = new ZXing.BrowserMultiFormatReader();
    }

    scanning = true;

    try {
      await codeReader.decodeFromVideoDevice(
        null,
        "scanner-video",
        (result, err) => {
          if (result) {
            handleDetected(result.text);
          }
        }
      );
    } catch (e) {
      console.warn("ZXing error:", e);
      appCore.showToast("Error iniciando scanner");
    }
  }

  /* ============================================================
     INICIAR SCANNER (PÚBLICO)
     ============================================================ */
  async function startScanner(callback) {
    if (scanning) return;

    overlay.classList.remove("hidden");
    document.body.classList.add("scanner-active");

    if (!document.querySelector(".scanner-controls")) {
      createControls();
    }

    updateControls();

    const ok = await startCamera();
    if (!ok) return;

    startDecoding();

    /* Eventos de controles */
    document.getElementById("scn-torch").onclick = toggleTorch;
    document.getElementById("scn-zoom-in").onclick = () => {
      zoomLevel += 0.3;
      applyZoom();
    };
    document.getElementById("scn-zoom-out").onclick = () => {
      zoomLevel -= 0.3;
      applyZoom();
    };

    document.getElementById("scn-close").onclick = () => {
      closeScanner();
    };

    document.getElementById("scn-multi").onclick = () => {
      if (!multiMode) {
        // Activar multi-scan
        multiMode = true;
        detectedCodes = [];
        updateControls();
      } else {
        // Enviar todos → copiar al portapapeles
        const txt = detectedCodes.join("\n");
        navigator.clipboard.writeText(txt);
        appCore.showToast("Códigos copiados");
      }
    };

    // Tap en video → torch
    video.onclick = toggleTorch;
  }

  /* ============================================================
     EXPONER FUNCIONES GLOBALES
     ============================================================ */
  window.startScannerInterno1 = startScanner;
  window.startScannerInterno2 = startScanner;
  window.startScannerExternoPreferido = startScanner;
  window.startScannerExternoSelector = startScanner;
})();
