// ============================================================
// UI — Modo simple/completo + Scanner avanzado
// ============================================================

// ------------------------------------------------------------
// SCANNER NATIVO (Barcode Scanner+)
// ------------------------------------------------------------

const scannerNativoBtn = document.getElementById("btn-scanner-nativo");

if (scannerNativoBtn) {
  scannerNativoBtn.addEventListener("click", () => {
    const retUrl = encodeURIComponent(window.location.origin + window.location.pathname + "?code={CODE}");
    const intent = `intent://scan/?ret=${retUrl}#Intent;scheme=zxing;package=com.srowen.bs.android;end;`;
    window.location.href = intent;
  });
}

// ------------------------------------------------------------
// MODO SIMPLE / COMPLETO
// ------------------------------------------------------------

const btnSimple = document.getElementById("scanner-mode-simple");
const btnCompleto = document.getElementById("scanner-mode-completo");

if (btnSimple && btnCompleto) {
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
}
