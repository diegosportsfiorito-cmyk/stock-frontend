// ============================================================
// ORB ADMIN ENGINE — Configuración avanzada del ORB (v2 compatible)
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
    if (!window.ORB) return;

    this.inputColorDia.value = ORB.color || "#4f8cff";
    this.inputColorNoche.value = ORB.colorDark || "#4f8cff";
    this.inputSize.value = ORB.size || 140;
    this.inputHalo.value = ORB.halo || 60;
    this.inputModo.value = ORB.mode || "ultra";
  },

  // ============================================================
  // LISTENERS
  // ============================================================

  initListeners() {
    if (!window.ORB) return;

    this.inputColorDia?.addEventListener("input", () => {
      ORB.setColor(this.inputColorDia.value);
    });

    this.inputColorNoche?.addEventListener("input", () => {
      ORB.setColorDark(this.inputColorNoche.value);
    });

    this.inputSize?.addEventListener("input", () => {
      ORB.setSize(parseInt(this.inputSize.value));
    });

    this.inputHalo?.addEventListener("input", () => {
      ORB.setHalo(parseInt(this.inputHalo.value));
    });

    this.inputModo?.addEventListener("change", () => {
      ORB.setMode(this.inputModo.value);
    });

    this.inputPresets?.addEventListener("change", () => {
      ORB.setPreset(this.inputPresets.value);
      this.cargarConfig();
      if (window.AppCore) AppCore.showToast("Preset aplicado");
    });

    this.btnReset?.addEventListener("click", () => {
      this.resetOrb();
    });
  },

  // ============================================================
  // RESET COMPLETO
  // ============================================================

  resetOrb() {
    if (!window.ORB) return;

    ORB.reset();
    this.cargarConfig();

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
