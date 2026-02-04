// ============================================================
// ORB ENGINE — Estados, animaciones, presets, panel admin
// ============================================================

const ORB = {
  el: document.getElementById("orb"),

  setReady(v) {
    this.el.classList.remove("orb-loading", "orb-error", "orb-boost");
    v ? this.el.classList.add("orb-ready") : this.el.classList.remove("orb-ready");
  },

  setLoading(v) {
    this.el.classList.remove("orb-ready", "orb-error");
    v
      ? this.el.classList.add("orb-loading", "orb-boost")
      : this.el.classList.remove("orb-loading", "orb-boost");
  },

  setError(v) {
    this.el.classList.remove("orb-ready", "orb-loading", "orb-boost");
    v ? this.el.classList.add("orb-error") : this.el.classList.remove("orb-error");
  }
};

// ============================================================
// PANEL ADMIN — Configuración del ORB
// ============================================================

const adminPanel = document.getElementById("admin-panel");

const orbColorDia = document.getElementById("orb-color");
const orbColorNoche = document.getElementById("orb-color-dark");
const orbSize = document.getElementById("orb-size");
const orbHalo = document.getElementById("orb-halo");
const orbMode = document.getElementById("orb-mode");
const orbPresets = document.getElementById("orb-presets");
const orbReset = document.getElementById("orb-reset");

function cargarConfigOrb() {
  orbColorDia.value = getComputedStyle(document.documentElement)
    .getPropertyValue("--orb-color")
    .trim();

  orbColorNoche.value = getComputedStyle(document.documentElement)
    .getPropertyValue("--orb-color-dark")
    .trim();

  orbSize.value = parseInt(ORB.el.style.width || 130);
  orbHalo.value = parseInt(
    getComputedStyle(document.documentElement)
      .getPropertyValue("--orb-halo-strength")
  );

  if (ORB.el.classList.contains("orb-classic")) orbMode.value = "classic";
  else if (ORB.el.classList.contains("orb-3d")) orbMode.value = "3d";
  else orbMode.value = "ultra";
}

orbColorDia.addEventListener("input", () => {
  document.documentElement.style.setProperty("--orb-color", orbColorDia.value);
});

orbColorNoche.addEventListener("input", () => {
  document.documentElement.style.setProperty("--orb-color-dark", orbColorNoche.value);
});

orbSize.addEventListener("input", () => {
  ORB.el.style.width = orbSize.value + "px";
  ORB.el.style.height = orbSize.value + "px";
});

orbHalo.addEventListener("input", () => {
  document.documentElement.style.setProperty("--orb-halo-strength", orbHalo.value);
});

orbMode.addEventListener("change", () => {
  ORB.el.classList.remove("orb-classic", "orb-3d", "orb-ultra");
  ORB.el.classList.add("orb-" + orbMode.value);
});

orbPresets.addEventListener("change", () => {
  const preset = orbPresets.value;

  const presets = {
    default: ["#4fc3f7", "#7c4dff", "60", "ultra"],
    plasma: ["#b44cff", "#5a00a3", "80", "ultra"],
    fuego: ["#ff8a00", "#b30000", "90", "ultra"],
    neon: ["#3dff7d", "#009933", "100", "ultra"],
    minimal: ["#444", "#111", "0", "classic"],
  };

  const p = presets[preset];
  document.documentElement.style.setProperty("--orb-color", p[0]);
  document.documentElement.style.setProperty("--orb-color-dark", p[1]);
  document.documentElement.style.setProperty("--orb-halo-strength", p[2]);

  ORB.el.classList.remove("orb-classic", "orb-3d", "orb-ultra");
  ORB.el.classList.add("orb-" + p[3]);

  showToast("Preset aplicado");
});

orbReset.addEventListener("click", () => {
  document.documentElement.style.setProperty("--orb-color", "#4fc3f7");
  document.documentElement.style.setProperty("--orb-color-dark", "#7c4dff");
  document.documentElement.style.setProperty("--orb-halo-strength", "60");

  ORB.el.style.width = "130px";
  ORB.el.style.height = "130px";

  ORB.el.classList.remove("orb-classic", "orb-3d", "orb-ultra");
  ORB.el.classList.add("orb-ultra");

  orbMode.value = "ultra";
  orbPresets.value = "default";

  showToast("ORB restaurado");
});
