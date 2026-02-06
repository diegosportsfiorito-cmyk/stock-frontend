// ============================================================
// ORB ADMIN ENGINE — Configuración avanzada del ORB
// ============================================================

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

  // ============================================================
  // CARGAR CONFIG ACTUAL DEL ORB
  // ============================================================

  cargarConfig() {
    if (!this.orbEl) return;

    this.inputColorDia.value = getComputedStyle(document.documentElement)
      .getPropertyValue("--orb-color")
      .trim();

    this.inputColorNoche.value = getComputedStyle(document.documentElement)
      .getPropertyValue("--orb-color-dark")
      .trim();

    const size = parseInt(this.orbEl.style.width || 130);
    this.inputSize.value = size;

    const halo = parseInt(
      getComputedStyle(document.documentElement)
        .getPropertyValue("--orb-halo-strength")
    );
    this.inputHalo.value = halo;

    this.inputModo.value = ORB.currentMode;
  },

  // ============================================================
  // LISTENERS
  // ============================================================

  initListeners() {
    if (!this.orbEl) return;

    // Color día
    this.inputColorDia?.addEventListener("input", () => {
      document.documentElement.style.setProperty("--orb-color", this.inputColorDia.value);
      ORB.setBase();
    });

    // Color noche
    this.inputColorNoche?.addEventListener("input", () => {
      document.documentElement.style.setProperty("--orb-color-dark", this.inputColorNoche.value);
      ORB.setBase();
    });

    // Tamaño ORB
    this.inputSize?.addEventListener("input", () => {
      const px = this.inputSize.value + "px";
      this.orbEl.style.width = px;
      this.orbEl.style.height = px;
    });

    // Halo
    this.inputHalo?.addEventListener("input", () => {
      ORB.setHalo(parseInt(this.inputHalo.value));
    });

    // Modo visual
    this.inputModo?.addEventListener("change", () => {
      ORB.setMode(this.inputModo.value);
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

  // ============================================================
  // PRESETS
  // ============================================================

  aplicarPreset(nombre) {
    const presets = {
      default: ["#4fc3f7", "#7c4dff", 60, "ultra"],
      plasma: ["#b44cff", "#5a00a3", 80, "ultra"],
      fuego: ["#ff8a00", "#b30000", 90, "ultra"],
      neon: ["#3dff7d", "#009933", 100, "ultra"],
      minimal: ["#444444", "#111111", 0, "classic"],
    };

    const p = presets[nombre];
    if (!p) return;

    document.documentElement.style.setProperty("--orb-color", p[0]);
    document.documentElement.style.setProperty("--orb-color-dark", p[1]);
    ORB.setHalo(parseInt(p[2]));
    ORB.setMode(p[3]);

    this.inputColorDia.value = p[0];
    this.inputColorNoche.value = p[1];
    this.inputHalo.value = p[2];
    this.inputModo.value = p[3];

    if (window.AppCore) AppCore.showToast("Preset aplicado");
  },

  // ============================================================
  // RESET COMPLETO
  // ============================================================

  resetOrb() {
    ORB.reset();

    document.documentElement.style.setProperty("--orb-color", "#4fc3f7");
    document.documentElement.style.setProperty("--orb-color-dark", "#7c4dff");

    this.orbEl.style.width = "130px";
    this.orbEl.style.height = "130px";

    this.inputColorDia.value = "#4fc3f7";
    this.inputColorNoche.value = "#7c4dff";
    this.inputSize.value = 130;
    this.inputHalo.value = 60;
    this.inputModo.value = "ultra";
    this.inputPresets.value = "default";

    if (window.AppCore) AppCore.showToast("ORB restaurado");
  },

  // ============================================================
  // INIT
  // ============================================================

  init() {
    this.cargarConfig();
    this.initListeners();
  },
};

document.addEventListener("DOMContentLoaded", () => {
  ORB_ADMIN.init();
});
