window.ORB_SCANNER = (function () {
  let scannerStream = null;
  let scannerActive = false;
  let scannerDevices = [];
  let currentDeviceId = null;
  let zxingReader = null;
  let barcodeDetector = null;
  let scannerLoopActive = false;

  async function initScannerEngines() {
    if ("BarcodeDetector" in window) {
      try {
        barcodeDetector = new BarcodeDetector({
          formats: ["ean_13", "ean_8", "code_128", "code_39", "upc_a", "upc_e", "qr_code"]
        });
      } catch {
        barcodeDetector = null;
      }
    }
    if (window.ZXing && window.ZXing.BrowserMultiFormatReader) {
      zxingReader = new ZXing.BrowserMultiFormatReader();
    }
  }

  async function listarDispositivosVideo() {
    const devices = await navigator.mediaDevices.enumerateDevices();
    scannerDevices = devices.filter(d => d.kind === "videoinput");
    const select = document.getElementById("scannerDeviceSelect");
    select.innerHTML = "";
    scannerDevices.forEach((dev, idx) => {
      const opt = document.createElement("option");
      opt.value = dev.deviceId;
      opt.textContent = dev.label || `Cámara ${idx + 1}`;
      select.appendChild(opt);
    });
    if (scannerDevices.length > 0) {
      currentDeviceId = scannerDevices[0].deviceId;
      select.value = currentDeviceId;
    }
  }

  async function iniciarStreamScanner(deviceId) {
    const video = document.getElementById("scannerVideo");
    if (scannerStream) {
      scannerStream.getTracks().forEach(t => t.stop());
      scannerStream = null;
    }
    const constraints = {
      audio: false,
      video: deviceId ? { deviceId: { exact: deviceId } } : { facingMode: "environment" }
    };
    scannerStream = await navigator.mediaDevices.getUserMedia(constraints);
    video.srcObject = scannerStream;
  }

  function cerrarScannerOverlay() {
    const overlay = document.getElementById("scannerOverlay");
    overlay.classList.remove("visible");
    scannerActive = false;
    scannerLoopActive = false;
    if (scannerStream) {
      scannerStream.getTracks().forEach(t => t.stop());
      scannerStream = null;
    }
  }

  function manejarResultadoScan(texto) {
    if (!texto) return;
    try { navigator.vibrate && navigator.vibrate(80); } catch {}
    try { beep.currentTime = 0; beep.play().catch(() => {}); } catch {}

    const procesado = procesarCodigoEscaneado(texto);
    const input = document.getElementById("queryInput");
    input.value = procesado;
    cerrarScannerOverlay();
    document.getElementById("searchBtn").click();
  }

  function iniciarLoopDeteccion(videoEl) {
    if (!scannerStream) return;
    scannerLoopActive = true;

    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");

    const loop = async () => {
      if (!scannerLoopActive || !scannerActive) return;

      if (videoEl.readyState === videoEl.HAVE_ENOUGH_DATA) {
        canvas.width = videoEl.videoWidth;
        canvas.height = videoEl.videoHeight;
        ctx.drawImage(videoEl, 0, 0, canvas.width, canvas.height);

        try {
          if (barcodeDetector) {
            const bitmap = await createImageBitmap(canvas);
            const codes = await barcodeDetector.detect(bitmap);
            if (codes && codes.length > 0) {
              const raw = codes[0].rawValue || "";
              manejarResultadoScan(raw);
              return;
            }
          } else if (zxingReader) {
            const luminanceSource = new ZXing.HTMLCanvasElementLuminanceSource(canvas);
            const binaryBitmap = new ZXing.BinaryBitmap(new ZXing.HybridBinarizer(luminanceSource));
            const result = zxingReader.decode(binaryBitmap);
            if (result && result.text) {
              manejarResultadoScan(result.text);
              return;
            }
          }
        } catch {
          // ZXing lanza excepciones cuando no encuentra código, es normal
        }
      }
      requestAnimationFrame(loop);
    };

    requestAnimationFrame(loop);
  }

  async function abrirScannerOverlay() {
    const overlay = document.getElementById("scannerOverlay");
    const video = document.getElementById("scannerVideo");

    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      alert("Este dispositivo no soporta cámara.");
      return;
    }

    overlay.classList.add("visible");
    scannerActive = true;

    try {
      await listarDispositivosVideo();
      await iniciarStreamScanner(currentDeviceId);
      iniciarLoopDeteccion(video);
    } catch (e) {
      console.error("[SCANNER] Error al iniciar:", e);
      cerrarScannerOverlay();
    }
  }

  function initEvents() {
    document.getElementById("scanBtn").addEventListener("click", async () => {
      await initScannerEngines();
      abrirScannerOverlay();
    });

    document.getElementById("scannerCloseBtn").addEventListener("click", () => {
      cerrarScannerOverlay();
    });

    document.getElementById("scannerDeviceSelect").addEventListener("change", async e => {
      currentDeviceId = e.target.value;
      if (scannerActive) {
        try {
          await iniciarStreamScanner(currentDeviceId);
          const video = document.getElementById("scannerVideo");
          iniciarLoopDeteccion(video);
        } catch (err) {
          console.error("[SCANNER] Error cambiando cámara:", err);
        }
      }
    });
  }

  function init() {
    initEvents();
  }

  return { init };
})();
