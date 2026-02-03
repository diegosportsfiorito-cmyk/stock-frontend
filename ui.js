// ============================================================
// UI — ORB, TOOLTIP, POSICIÓN, ANIMACIONES
// ============================================================

const orb = document.getElementById("orb");
const orbTooltip = document.getElementById("orb-tooltip");

// ------------------------------------------------------------
// TOOLTIP DEL ORB
// ------------------------------------------------------------

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

// ------------------------------------------------------------
// AJUSTE DE TAMAÑO SEGÚN CLASES DEL BODY (orb-b1 / orb-b2 / orb-b3)
// ------------------------------------------------------------

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

// ------------------------------------------------------------
// AJUSTE DE POSICIÓN SEGÚN CONFIGURACIÓN DEL ADMIN PANEL
// ------------------------------------------------------------

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

// ------------------------------------------------------------
// OBSERVADOR PARA CAMBIOS EN EL BODY
// ------------------------------------------------------------

const bodyObserver = new MutationObserver(() => {
  applyOrbSizeFromBody();
  applyOrbPosition();
});

bodyObserver.observe(document.body, {
  attributes: true,
  attributeFilter: ["class", "data-orb-pos"],
});

// ------------------------------------------------------------
// EFECTO VISUAL AL HACER CLICK EN EL ORB
// ------------------------------------------------------------

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
// INTEGRACIÓN DEL SCANNER — NUEVO BLOQUE
// ============================================================

// Elementos del scanner
const scannerOverlay = document.getElementById("scanner-overlay");
const scannerCloseBtn = document.getElementById("scanner-close");
const scannerBtn = document.getElementById("btn-scanner");

// Abrir scanner
function abrirScanner() {
  scannerOverlay.classList.add("visible");
  iniciarScanner(); // función del scanner.js
}

// Cerrar scanner
function cerrarScanner() {
  scannerActivo = false; // variable del scanner.js
  scannerOverlay.classList.remove("visible");
}

// Eventos del scanner
scannerBtn.addEventListener("click", abrirScanner);
scannerCloseBtn.addEventListener("click", cerrarScanner);

// ------------------------------------------------------------
// MODO SIMPLE / COMPLETO
// ------------------------------------------------------------

const btnSimple = document.getElementById("scanner-mode-simple");
const btnCompleto = document.getElementById("scanner-mode-completo");

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

// ============================================================
// FIN DEL ARCHIVO UI
// ============================================================
