let scannerStream = null;
let currentScannerMode = "solo";

const scannerOverlay = document.getElementById("scannerOverlay");
const scannerVideo = document.getElementById("scannerVideo");
const scannerStatus = document.getElementById("scannerStatus");
const btnOpenScanner = document.getElementById("btnOpenScanner");
const btnCloseScanner = document.getElementById("btnCloseScanner");
const scannerModeButtons = document.querySelectorAll(".scanner-mode");
const searchInput = document.getElementById("searchInput");
const btnSearch = document.getElementById("btnSearch");

scannerModeButtons.forEach((btn) => {
  btn.addEventListener("click", () => {
    scannerModeButtons.forEach((b) => b.classList.remove("active"));
    btn.classList.add("active");
    currentScannerMode = btn.dataset.mode;
  });
});

btnOpenScanner.addEventListener("click", async () => {
  scannerOverlay.classList.remove("hidden");
  scannerStatus.textContent = "Iniciando cámara...";
  await startScanner();
});

btnCloseScanner.addEventListener("click", () => {
  stopScanner();
  scannerOverlay.classList.add("hidden");
});

async function startScanner() {
  try {
    stopScanner();

    scannerStream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: { exact: "environment" } },
      audio: false,
    });

    scannerVideo.srcObject = scannerStream;
    scannerStatus.textContent = "Apuntá al código de barras...";

    startBarcodeLoop();
  } catch (err) {
    console.error(err);
    scannerStatus.textContent = "No se pudo acceder a la cámara.";
  }
}

function stopScanner() {
  if (scannerStream) {
    scannerStream.getTracks().forEach((t) => t.stop());
    scannerStream = null;
  }
}

async function startBarcodeLoop() {
  const detector = new BarcodeDetector({
    formats: ["code_128", "ean_13", "ean_8", "code_39", "upc_a", "upc_e"],
  });

  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");

  async function scanFrame() {
    if (!scannerStream) return;

    if (scannerVideo.readyState === scannerVideo.HAVE_ENOUGH_DATA) {
      canvas.width = scannerVideo.videoWidth;
      canvas.height = scannerVideo.videoHeight;
      ctx.drawImage(scannerVideo, 0, 0, canvas.width, canvas.height);

      try {
        const barcodes = await detector.detect(canvas);
        if (barcodes.length > 0) {
          const raw = barcodes[0].rawValue.trim();
          handleScannedCode(raw);
          scannerStatus.textContent = `Código detectado: ${raw}`;
          stopScanner();
          scannerOverlay.classList.add("hidden");
          return;
        }
      } catch (e) {
        console.error("Error detectando código:", e);
      }
    }

    requestAnimationFrame(scanFrame);
  }

  requestAnimationFrame(scanFrame);
}

function handleScannedCode(raw) {
  let articulo = "";
  let talle = "";

  if (raw.includes("!!")) {
    const [art, rest] = raw.split("!!");
    articulo = art || "";
    talle = rest || "";
  } else if (raw.includes("!")) {
    const [art, rest] = raw.split("!");
    articulo = art || "";
    talle = rest || "";
  } else if (raw.includes("/")) {
    const parts = raw.split("/");
    articulo = parts[0] || "";
    talle = parts.slice(1).join("/") || "";
  } else {
    articulo = raw;
  }

  if (currentScannerMode === "solo") {
    searchInput.value = articulo;
  } else if (currentScannerMode === "completo") {
    searchInput.value = raw;
  } else {
    searchInput.value = articulo || raw;
  }

  btnSearch.click();
}
