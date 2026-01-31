// ============================================================
// SCANNER.JS — Lector de códigos de barras / QR
// ============================================================

window.ORB_SCANNER = (function () {

  let stream = null;
  let currentDeviceId = null;
  let mode = "solo"; // solo | completo | auto
  let scanning = false;
  let torchOn = false;

  const overlay = document.getElementById("scannerOverlay");
  const video = document.getElementById("scannerVideo");
  const cameraSelect = document.getElementById("cameraSelect");

  // ------------------------------------------------------------
  // Abrir scanner
  // ------------------------------------------------------------
  async function open() {
    overlay.classList.remove("hidden");
    await loadCameras();
    await startCamera();
    scanning = true;
    scanLoop();
  }

  // ------------------------------------------------------------
  // Cerrar scanner
  // ------------------------------------------------------------
  function close() {
    overlay.classList.add("hidden");
    scanning = false;
    stopCamera();
  }

  // ------------------------------------------------------------
  // Cargar cámaras disponibles
  // ------------------------------------------------------------
  async function loadCameras() {
    const devices = await navigator.mediaDevices.enumerateDevices();
    const cams = devices.filter(d => d.kind === "videoinput");

    cameraSelect.innerHTML = cams
      .map(c => `<option value="${c.deviceId}">${c.label || "Cámara"}</option>`)
      .join("");

    if (!currentDeviceId && cams.length > 0) {
      currentDeviceId = cams[0].deviceId;
    }
  }

  // ------------------------------------------------------------
  // Iniciar cámara
  // ------------------------------------------------------------
  async function startCamera() {
    stopCamera();

    try {
      stream = await navigator.mediaDevices.getUserMedia({
        video: {
          deviceId: currentDeviceId ? { exact: currentDeviceId } : undefined,
          facingMode: "environment"
        }
      });

      video.srcObject = stream;
      await video.play();

    } catch (err) {
      console.error("Error al iniciar cámara:", err);
    }
  }

  // ------------------------------------------------------------
  // Detener cámara
  // ------------------------------------------------------------
  function stopCamera() {
    if (stream) {
      stream.getTracks().forEach(t => t.stop());
      stream = null;
    }
  }

  // ------------------------------------------------------------
  // Cambiar cámara
  // ------------------------------------------------------------
  async function changeCamera(deviceId) {
    currentDeviceId = deviceId;
    await startCamera();
  }

  // ------------------------------------------------------------
  // Linterna
  // ------------------------------------------------------------
  async function toggleTorch() {
    if (!stream) return;

    const track = stream.getVideoTracks()[0];
    const capabilities = track.getCapabilities();

    if (!capabilities.torch) {
      console.warn("Torch no soportado");
      return;
    }

    torchOn = !torchOn;

    try {
      await track.applyConstraints({
        advanced: [{ torch: torchOn }]
      });
    } catch (err) {
      console.error("Error torch:", err);
    }
  }

  // ------------------------------------------------------------
  // Setear modo
  // ------------------------------------------------------------
  function setMode(m) {
    mode = m;
  }

  // ------------------------------------------------------------
  // Loop de escaneo
  // ------------------------------------------------------------
  async function scanLoop() {
    if (!scanning) return;

    try {
      const code = await detectCode();
      if (code) handleScan(code);
    } catch (err) {
      console.error("Error en scanLoop:", err);
    }

    requestAnimationFrame(scanLoop);
  }

  // ------------------------------------------------------------
  // Detección de código usando BarcodeDetector
  // ------------------------------------------------------------
  async function detectCode() {
    if (!("BarcodeDetector" in window)) return null;

    const detector = new BarcodeDetector({
      formats: ["ean_13", "ean_8", "code_128", "qr_code", "upc_a", "upc_e"]
    });

    try {
      const barcodes = await detector.detect(video);
      if (barcodes.length > 0) {
        return barcodes[0].rawValue;
      }
    } catch (err) {
      // BarcodeDetector puede fallar en algunos frames
    }

    return null;
  }

  // ------------------------------------------------------------
  // Manejar código detectado
  // ------------------------------------------------------------
  function handleScan(code) {
    if (!code) return;

    console.log("Código detectado:", code);

    if (mode === "solo") {
      close();
      document.getElementById("searchInput").value = code;
      ORB.page = 1;
      ORB_BACKEND.buscar(code);
      return;
    }

    if (mode === "completo") {
      document.getElementById("searchInput").value = code;
      ORB.page = 1;
      ORB_BACKEND.buscar(code);
      return;
    }

    if (mode === "auto") {
      close();
      document.getElementById("searchInput").value = code;
      ORB.page = 1;
      ORB_BACKEND.buscar(code);
      return;
    }
  }

  // ------------------------------------------------------------
  // API pública
  // ------------------------------------------------------------
  return {
    open,
    close,
    toggleTorch,
    changeCamera,
    setMode
  };

})();
