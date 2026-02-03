// ============================================================
// UI — ORB, TOOLTIP, SCANNER, MODOS
// ============================================================

const orb = document.getElementById("orb");
const orbTooltip = document.getElementById("orb-tooltip");

let tooltipTimeout = null;

function showOrbTooltip() {
  clearTimeout(tooltipTimeout);
  orbTooltip.classList.add("visible");
  tooltipTimeout = setTimeout(() => {
    orbTooltip.classList.remove("visible");
  }, 2000);
}

if (orb) {
  orb.addEventListener("mouseenter", showOrbTooltip);
  orb.addEventListener("click", showOrbTooltip);
}

// ============================================================
// SCANNER WEB (QUAGGA2)
// ============================================================

const scannerBtn = document.getElementById("btn-scanner");
const scannerClose = document.getElementById("scanner-close");
const scannerOverlay = document.getElementById("scanner-overlay");

if (scannerBtn) {
  scannerBtn.addEventListener("click", () => {
    scannerOverlay.style.display = "flex";
    iniciarScanner();
  });
}

if (scannerClose) {
  scannerClose.addEventListener("click", () => {
    cerrarScannerQuagga();
    scannerOverlay.style.display = "none";
  });
}

// ============================================================
// SCANNER NATIVO (Barcode Scanner+)
// ============================================================

const scannerNativoBtn = document.getElementById("btn-scanner-nativo");

if (scannerNativoBtn) {
  scannerNativoBtn.addEventListener("click", () => {
    const retUrl = encodeURIComponent(window.location.origin + window.location.pathname + "?code={CODE}");
    const intent = `intent://scan/?ret=${retUrl}#Intent;scheme=zxing;package=com.srowen.bs.android;end;`;
    window.location.href = intent;
  });
}

// ============================================================
// MODO SIMPLE / COMPLETO
// ============================================================

const btnSimple = document.getElementById("scanner-mode-simple");
const btnCompleto = document.getElementById("scanner-mode-completo");

if (btnSimple && btnCompleto) {
  btnSimple.addEventListener("click", () => {
    setModoScanner("simple");
    btnSimple.classList.add("active");
    btnCompleto.classList.remove("active");
  });

  btnCompleto.addEventListener("click", () => {
    setModoScanner("completo");
    btnCompleto.classList.add("active");
    btnSimple.classList.remove("active");
  });
}
