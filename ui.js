// ============================================================
// UI — ORB, TOOLTIP, POSICIÓN, ANIMACIONES
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

orb.addEventListener("mouseenter", showOrbTooltip);
orb.addEventListener("click", showOrbTooltip);

function applyOrbSizeFromBody() {
  if (document.body.classList.contains("orb-b1")) {
    orb.style.width = "70px";
    orb.style.height = "70px";
  } else if (document.body.classList.contains("orb-b2")) {
    orb.style.width = "110px";
    orb.style.height = "110px";
  } else if (document.body.classList.contains("orb-b3")) {
    orb.style.width = "160px";
    orb.style.height = "160px";
  }
}
applyOrbSizeFromBody();

function applyOrbPosition() {
  const pos = document.body.dataset.orbPos;
  if (!pos || pos === "center") {
    orb.style.position = "relative";
    orb.style.margin = "0 auto";
    return;
  }
  if (pos === "left") {
    orb.style.position = "relative";
    orb.style.margin = "0 auto 0 0";
    return;
  }
  if (pos === "floating") {
    orb.style.position = "fixed";
    orb.style.bottom = "20px";
    orb.style.right = "20px";
    orb.style.margin = "0";
  }
}
applyOrbPosition();

const bodyObserver = new MutationObserver(() => {
  applyOrbSizeFromBody();
  applyOrbPosition();
});
bodyObserver.observe(document.body, {
  attributes: true,
  attributeFilter: ["class", "data-orb-pos"],
});

orb.addEventListener("mousedown", () => {
  orb.style.transform = "scale(0.92)";
});
orb.addEventListener("mouseup", () => {
  orb.style.transform = "scale(1)";
});
orb.addEventListener("mouseleave", () => {
  orb.style.transform = "scale(1)";
});

// ============================================================
// SCANNER (QUAGGA)
// ============================================================

const scannerOverlay = document.getElementById("scanner-overlay");
const scannerCloseBtn = document.getElementById("scanner-close");
const scannerBtn = document.getElementById("btn-scanner");

function abrirScanner() {
  scannerOverlay.classList.add("visible");
  iniciarScanner();
}

function cerrarScanner() {
  cerrarScannerQuagga();
  scannerOverlay.classList.remove("visible");
}

if (scannerBtn) scannerBtn.addEventListener("click", abrirScanner);
if (scannerCloseBtn) scannerCloseBtn.addEventListener("click", cerrarScanner);

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

// ============================================================
// FIN UI
// ============================================================
