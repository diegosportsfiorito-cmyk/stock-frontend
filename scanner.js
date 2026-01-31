// ============================================================
// SCANNER.JS — Lector de códigos de barras / QR (FINAL)
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
  // PARSER UNIVERSAL DE CÓDIGOS
  // ------------------------------------------------------------
  function parseCode(raw) {
    let code = (raw || "").trim();

    // 1) Caso especial: "!!" → ARTÍCULO !! TALLE (color vacío)
    if (code.includes("!!")) {
      const [articulo, talle] = code.split("!!");
      return {
        articulo,
        color: "",
        talle
      };
    }

    // 2) Caso con "!" → puede ser 1 o 2 separadores
    if (code.includes("!")) {
      const parts = code.split("!");

      if (parts.length === 2) {
        // Formato: ARTÍCULO ! TALLE  (color vacío)
        return {
          articulo: parts[0],
          color: "",
          talle: parts[1]
        };
      }

      if (parts.length === 3) {
        // Formato: ARTÍCULO ! COLOR ! TALLE
        return {
          articulo: parts[0],
          color: parts[1],
          talle: parts[2]
        };
      }
    }

    // 3) Caso con "/" → ARTÍCULO / TALLE (color vacío, talle puede ser compuesto)
    if (code.includes("/")) {
      const parts = code.split("/");
      return {
        articulo: parts[0],
        color: "",
        talle: parts.slice(1).join("/") // 38/9, U/NE, etc.
      };
    }

    // 4) Sin separadores → todo es artículo
    return {
      articulo: code,
      color: "",
      talle: ""
    };
  }

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
    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      const cams = devices.filter(d => d.kind === "videoinput");

      cameraSelect.innerHTML = cams
        .map((c, idx) => `<option value="${c.deviceId}">${c.label || `Cámara ${idx + 1}`}</option>`)
        .join("");

      // Por defecto: primera cámara (que suele ser la frontal en muchos dispositivos)
      if (!currentDeviceId && cams.length > 0) {
        currentDeviceId = cams[0].deviceId;
      }
    } catch (err) {
      console.error("Error al enumerar cámaras:", err);
    }
  }

  // ------------------------------------------------------------
  // Iniciar cámara (por defecto: facing front / user)
  // ------------------------------------------------------------
  async function startCamera() {
    stopCamera();

    try {
      const constraints = {
        video: currentDeviceId
          ? { deviceId: { exact: currentDeviceId } }
          : { facingMode: "user" } // cámara frontal por defecto
      };

      stream = await navigator.mediaDevices.getUserMedia(constraints);
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
      console.warn("Torch no soportado en esta cámara");
      return;
    }

    torchOn = !torchOn;

    try {
      await track.applyConstraints({
        advanced: [{ torch: torchOn }]
      });
    } catch (err) {
      console.error("Error al activar torch:", err);
    }
  }

  // ------------------------------------------------------------
  // Setear modo (solo / completo / auto)
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
      // BarcodeDetector puede fallar en algunos frames, no cortamos el loop
    }

    return null;
  }

  // ------------------------------------------------------------
  // Manejar código detectado (modos SOLO / COMPLETO / AUTO)
  // ------------------------------------------------------------
  function handleScan(code) {
    if (!code) return;

    const { articulo, color, talle } = parseCode(code);

    if (!articulo) return;

    if (mode === "solo") {
      // Solo artículo, búsqueda automática, cerrar scanner
      close();
      document.getElementById("searchInput").value = articulo;
      ORB.page = 1;
      ORB_BACKEND.buscar(articulo);
      return;
    }

    if (mode === "completo") {
      // Artículo + color + talle (solo los que existan), no cierra scanner
      const q = [articulo, color, talle].filter(x => x).join(" ");
      document.getElementById("searchInput").value = q;
      ORB.page = 1;
      ORB_BACKEND.buscar(q);
      return;
    }

    if (mode === "auto") {
      // Igual que SOLO, pero pensado para flujo rápido
      close();
      document.getElementById("searchInput").value = articulo;
      ORB.page = 1;
      ORB_BACKEND.buscar(articulo);
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
