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

// ============================================================
// SCANNER HÍBRIDO
// ============================================================

const scannerBtn = document.getElementById("btn-scanner");

scannerBtn.addEventListener("click", () => {
  iniciarScanner();
});

// ============================================================
// MODO SIMPLE / COMPLETO
// ============================================================

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
