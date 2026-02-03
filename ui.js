// ============================================================
// UI — ORB + SCANNER
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
// SCANNER
// ============================================================

const scannerBtn = document.getElementById("btn-scanner");
const scannerClose = document.getElementById("scanner-close");

scannerBtn.addEventListener("click", () => {
  document.getElementById("scanner-overlay").style.display = "flex";
  iniciarScanner();
});

scannerClose.addEventListener("click", () => {
  cerrarScanner();
});

// ============================================================
// MODO SIMPLE / COMPLETO
// ============================================================

const btnSimple = document.getElementById("scanner-mode-simple");
const btnCompleto = document.getElementById("scanner-mode-completo");

btnSimple.addEventListener("click", () => {
  modoScanner = "simple";
  btnSimple.classList.add("active");
  btnCompleto.classList.remove("active");
});

btnCompleto.addEventListener("click", () => {
  modoScanner = "completo";
  btnCompleto.classList.add("active");
  btnSimple.classList.remove("active");
});
