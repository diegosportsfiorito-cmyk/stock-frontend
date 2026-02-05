// ============================================================
// ORB ADMIN ENGINE — Configuración avanzada del ORB
// ============================================================
//
// Este módulo controla:
//  - Presets
//  - Tamaño del ORB
//  - Halo (intensidad)
//  - Colores día / noche
//  - Modo visual (classic / 3d / ultra)
//  - Reset del ORB
//  - Sincronización con CSS variables
//  - Integración con el panel admin
//
// No controla estados (loading/ready/error).
// Eso lo maneja orb_engine.js
// ============================================================

// ------------------------------
// ELEMENTOS DEL PANEL ADMIN
// ------------------------------

const ORB_ADMIN = {
  panel: document.getElementById("admin-panel"),

  inputColorDia: document.getElementById("orb-color"),
  inputColorNoche: document.getElementById("orb-color-dark"),
  inputSize: document.getElementById("orb-size"),
  inputHalo: document.getElementById("orb-halo"),
  inputModo: document.getElementById("orb-mode"),
  inputPresets: document.getElementById("orb-presets"),
  btnReset: document.getElementById("orb-reset"),

  orbEl: document.getElementById("orb-core"),

  // ------------------------------
  // Cargar valores actuales
  // ------------------------------
  cargarConfig() {
    if (!this.orbEl) return;

    // Colores
    this.inputColorDia.value = getComputedStyle(document.documentElement)
      .getPropertyValue("--orb-color")
      .trim();

    this.inputColorNoche.value = getComputedStyle(document.documentElement)
      .getPropertyValue("--orb-color-dark")
      .trim();

    // Tamaño
    const size = parseInt(this.orbEl.style.width || 130);
    this.inputSize.value = size;

    // Halo
    const halo = parseInt(
      getComputedStyle(document.documentElement)
        .getPropertyValue("--orb-halo-strength")
    );
    this.inputHalo.value = halo;

    // Modo visual
    if (this.orbEl.classList.contains("orb-classic")) this.inputModo.value = "classic";
    else if (this.orbEl.classList.contains("orb-3d")) this.inputModo.value = "3d";
    else this.inputModo.value = "ultra";
  },

  // ------------------------------
  // Aplicar cambios en tiempo real
  // ------------------------------
  initListeners() {
    if (!this.orbEl) return;

    // Color día
    this.inputColorDia?.addEventListener("input", () => {
      document.documentElement.style.setProperty("--orb-color", this.inputColorDia.value);
    });

    // Color noche
    this.inputColorNoche?.addEventListener("input", () => {
      document.documentElement.style.setProperty(
        "--orb-color-dark",
        this.inputColorNoche.value
      );
    });

    // Tamaño
    this.inputSize?.addEventListener("input", () => {
      const px = this.inputSize.value + "px";
      this.orbEl.style.width = px;
      this.orbEl.style.height = px;
    });

    // Halo
    this.inputHalo?.addEventListener("input", () => {
      document.documentElement.style.setProperty(
        "--orb-halo-strength",
        this.inputHalo.value
      );
    });

    // Modo visual
    this.inputModo?.addEventListener("change", () => {
      this.orbEl.classList.remove("orb-classic", "orb-3d", "orb-ultra");
      this.orbEl.classList.add("orb-" + this.inputModo.value);
    });

    // Presets
    this.inputPresets?.addEventListener("change", () => {
      this.aplicarPreset(this.inputPresets.value);
    });

    // Reset
    this.btnReset?.addEventListener("click", () => {
      this.resetOrb();
    });
  },

  // ------------------------------
  // Presets
  // ------------------------------
  aplicarPreset(nombre) {
    const presets = {
      default: ["#4fc3f7", "#7c4dff", "60", "ultra"],
      plasma: ["#b44cff", "#5a00a3", "80", "ultra"],
      fuego: ["#ff8a00", "#b30000", "90", "ultra"],
      neon: ["#3dff7d", "#009933", "100", "ultra"],
      minimal: ["#444", "#111", "0", "classic"],
    };

    const p = presets[nombre];
    if (!p) return;

    // Aplicar colores
    document.documentElement.style.setProperty("--orb-color", p[0]);
    document.documentElement.style.setProperty("--orb-color-dark", p[1]);
    document.documentElement.style.setProperty("--orb-halo-strength", p[2]);

    // Modo visual
    this.orbEl.classList.remove("orb-classic", "orb-3d", "orb-ultra");
    this.orbEl.classList.add("orb-" + p[3]);

    // Actualizar panel
    this.inputColorDia.value = p[0];
    this.inputColorNoche.value = p[1];
    this.inputHalo.value = p[2];
    this.inputModo.value = p[3];

    if (window.AppCore) AppCore.showToast("Preset aplicado");
  },

  // ------------------------------
  // Reset del ORB
  // ------------------------------
  resetOrb() {
    document.documentElement.style.setProperty("--orb-color", "#4fc3f7");
    document.documentElement.style.setProperty("--orb-color-dark", "#7c4dff");
    document.documentElement.style.setProperty("--orb-halo-strength", "60");

    this.orbEl.style.width = "130px";
    this.orbEl.style.height = "130px";

    this.orbEl.classList.remove("orb-classic", "orb-3d", "orb-ultra");
    this.orbEl.classList.add("orb-ultra");

    this.inputModo.value = "ultra";
    this.inputPresets.value = "default";

    if (window.AppCore) AppCore.showToast("ORB restaurado");
  },

  // ------------------------------
  // Inicialización
  // ------------------------------
  init() {
    this.cargarConfig();
    this.initListeners();
  },
};

// Inicializar cuando el DOM esté listo
document.addEventListener("DOMContentLoaded", () => {
  ORB_ADMIN.init();
});
