// ============================================================
// UI GENERAL
// ============================================================

const orb = document.getElementById("orb");
const orbTooltip = document.getElementById("orb-tooltip");
const filtrosPanel = document.getElementById("filtros-panel");
const btnFiltros = document.getElementById("btn-filtros");
const btnLimpiar = document.getElementById("btn-limpiar");
const soloStockCheckbox = document.getElementById("solo-stock");
const btnSimple = document.getElementById("scanner-mode-simple");
const btnCompleto = document.getElementById("scanner-mode-completo");
const scannerNativoBtn = document.getElementById("btn-scanner-nativo");
const toastEl = document.getElementById("toast");
const adminPanel = document.getElementById("admin-panel");

// ORB click → foco en input
if (orb) {
  orb.addEventListener("click", () => {
    const input = document.getElementById("search-input");
    if (!input) return;

    input.focus();

    orb.style.transform = "scale(0.92)";
    setTimeout(() => {
      orb.style.transform = "";
    }, 150);

    orbTooltip.classList.add("visible");
    setTimeout(() => {
      orbTooltip.classList.remove("visible");
    }, 1200);
  });
}

// Scanner nativo
if (scannerNativoBtn) {
  scannerNativoBtn.addEventListener("click", () => {
    const retUrl = encodeURIComponent(window.location.origin + window.location.pathname + "?code={CODE}");
    const intent = `intent://scan/?ret=${retUrl}#Intent;scheme=zxing;package=com.srowen.bs.android;end;`;
    window.location.href = intent;
  });
}

// Modo simple / completo
if (btnSimple && btnCompleto) {
  btnSimple.addEventListener("click", () => {
    modoScanner = "simple";
    btnSimple.classList.add("active");
    btnCompleto.classList.remove("active");
    showToast("Modo scanner: Simple");
  });

  btnCompleto.addEventListener("click", () => {
    modoScanner = "completo";
    btnCompleto.classList.add("active");
    btnSimple.classList.remove("active");
    showToast("Modo scanner: Completo");
  });
}

// Filtros
if (btnFiltros && filtrosPanel) {
  btnFiltros.addEventListener("click", () => {
    filtrosPanel.classList.toggle("visible");
  });
}

// Limpiar
if (btnLimpiar) {
  btnLimpiar.addEventListener("click", () => {
    const input = document.getElementById("search-input");
    if (input) input.value = "";
    input?.dispatchEvent(new Event("input"));
    showToast("Búsqueda limpiada");
  });
}

// Toast
function showToast(msg) {
  if (!toastEl) return;
  toastEl.textContent = msg;
  toastEl.classList.add("visible");
  setTimeout(() => {
    toastEl.classList.remove("visible");
  }, 1800);
}

// Admin: triple click en brand-title
const brandTitle = document.querySelector(".brand-title");
if (brandTitle && adminPanel) {
  let clicks = 0;
  let timer = null;

  brandTitle.addEventListener("click", () => {
    clicks++;
    if (clicks === 1) {
      timer = setTimeout(() => { clicks = 0; }, 600);
    } else if (clicks === 3) {
      clearTimeout(timer);
      clicks = 0;
      adminPanel.style.display = adminPanel.style.display === "flex" ? "none" : "flex";
      showToast("Modo administrador");
    }
  });
}

// ============================================================
// CONFIGURACIÓN DEL ORB — ADMIN PANEL
// ============================================================

const orbColorInput = document.getElementById("orb-color");
const orbColorDarkInput = document.getElementById("orb-color-dark");
const orbSizeInput = document.getElementById("orb-size");
const orbHaloInput = document.getElementById("orb-halo");
const orbModeSelect = document.getElementById("orb-mode");
const orbPresetsSelect = document.getElementById("orb-presets");
const orbResetBtn = document.getElementById("orb-reset");

// Color principal
if (orbColorInput) {
  orbColorInput.addEventListener("input", e => {
    document.documentElement.style.setProperty("--orb-color", e.target.value);
  });
}

// Color secundario
if (orbColorDarkInput) {
  orbColorDarkInput.addEventListener("input", e => {
    document.documentElement.style.setProperty("--orb-color-dark", e.target.value);
  });
}

// Tamaño
if (orbSizeInput && orb) {
  orbSizeInput.addEventListener("input", e => {
    const size = e.target.value + "px";
    orb.style.width = size;
    orb.style.height = size;
  });
}

// Halo
if (orbHaloInput && orb) {
  orbHaloInput.addEventListener("input", e => {
    const halo = e.target.value;
    orb.style.setProperty("--orb-halo-strength", halo);
  });
}

// Modo visual
if (orbModeSelect && orb) {
  orbModeSelect.addEventListener("change", e => {
    orb.classList.remove("orb-classic", "orb-3d", "orb-ultra");
    orb.classList.add("orb-" + e.target.value);
  });
}

// Reset
if (orbResetBtn && orb) {
  orbResetBtn.addEventListener("click", () => {
    document.documentElement.style.setProperty("--orb-color", "#4fc3f7");
    document.documentElement.style.setProperty("--orb-color-dark", "#7c4dff");

    orb.style.width = "130px";
    orb.style.height = "130px";

    orb.style.setProperty("--orb-halo-strength", "60");

    orb.classList.remove("orb-classic", "orb-3d", "orb-ultra");
    orb.classList.add("orb-ultra");

    if (orbModeSelect) orbModeSelect.value = "ultra";
    if (orbPresetsSelect) orbPresetsSelect.value = "default";

    showToast("ORB restaurado a valores predeterminados");
  });
}

// PRESETS DEL ORB
if (orbPresetsSelect && orb) {
  orbPresetsSelect.addEventListener("change", e => {
    const preset = e.target.value;

    switch (preset) {
      case "default": // Energía Azul
        document.documentElement.style.setProperty("--orb-color", "#4fc3f7");
        document.documentElement.style.setProperty("--orb-color-dark", "#7c4dff");
        orb.style.setProperty("--orb-halo-strength", "60");
        orb.classList.remove("orb-classic", "orb-3d");
        orb.classList.add("orb-ultra");
        break;

      case "plasma": // Plasma Violeta
        document.documentElement.style.setProperty("--orb-color", "#b44cff");
        document.documentElement.style.setProperty("--orb-color-dark", "#5a00a3");
        orb.style.setProperty("--orb-halo-strength", "80");
        orb.classList.remove("orb-classic", "orb-3d");
        orb.classList.add("orb-ultra");
        break;

      case "fuego": // Fuego
        document.documentElement.style.setProperty("--orb-color", "#ff8a00");
        document.documentElement.style.setProperty("--orb-color-dark", "#b30000");
        orb.style.setProperty("--orb-halo-strength", "90");
        orb.classList.remove("orb-classic", "orb-3d");
        orb.classList.add("orb-ultra");
        break;

      case "neon": // Neón Verde
        document.documentElement.style.setProperty("--orb-color", "#3dff7d");
        document.documentElement.style.setProperty("--orb-color-dark", "#009933");
        orb.style.setProperty("--orb-halo-strength", "100");
        orb.classList.remove("orb-classic", "orb-3d");
        orb.classList.add("orb-ultra");
        break;

      case "minimal": // Minimalista
        document.documentElement.style.setProperty("--orb-color", "#444");
        document.documentElement.style.setProperty("--orb-color-dark", "#111");
        orb.style.setProperty("--orb-halo-strength", "0");
        orb.classList.remove("orb-ultra", "orb-3d");
        orb.classList.add("orb-classic");
        break;
    }

    showToast("Preset aplicado");
  });
}
