// ============================================================
// ORB ENGINE V2 — Núcleo visual del asistente
// ============================================================
// Correcciones aplicadas:
// - Estados sincronizados con app_core_v3.js
// - Modo día/noche real
// - Presets consistentes
// - Animaciones limpias (sin superposición)
// - Reset visual correcto después de error
// - Sin loops de animación
// - Tamaño dinámico estable
// ============================================================

const ORB = {
  el: null,
  core: null,

  // Config visual
  size: 140,
  halo: 60,
  color: "#4f8cff",
  colorDark: "#4f8cff",
  mode: "ultra",
  preset: "default",

  // Estados
  isDark: false,
  isSpeaking: false,
  isLoading: false,
  isError: false,

  init() {
    this.el = document.getElementById("orb");
    this.core = document.getElementById("orb-core");
    if (!this.el || !this.core) return;

    this.loadConfig();
    this.applyVisuals();
    this.applyPreset(this.preset);
    this.bindEvents();
  },

  // ------------------------------------------------------------
  // Cargar configuración guardada
  // ------------------------------------------------------------
  loadConfig() {
    const c1 = localStorage.getItem("orbColor");
    const c2 = localStorage.getItem("orbColorDark");
    const s = localStorage.getItem("orbSize");
    const h = localStorage.getItem("orbHalo");
    const m = localStorage.getItem("orbMode");
    const p = localStorage.getItem("orbPreset");

    if (c1) this.color = c1;
    if (c2) this.colorDark = c2;
    if (s) this.size = parseInt(s);
    if (h) this.halo = parseInt(h);
    if (m) this.mode = m;
    if (p) this.preset = p;
  },

  saveConfig() {
    localStorage.setItem("orbColor", this.color);
    localStorage.setItem("orbColorDark", this.colorDark);
    localStorage.setItem("orbSize", this.size);
    localStorage.setItem("orbHalo", this.halo);
    localStorage.setItem("orbMode", this.mode);
    localStorage.setItem("orbPreset", this.preset);
  },

  // ------------------------------------------------------------
  // Eventos globales
  // ------------------------------------------------------------
  bindEvents() {
    const toggleDark = document.getElementById("toggle-dark");
    if (toggleDark) {
      this.isDark = toggleDark.checked;
      toggleDark.addEventListener("change", () => {
        this.isDark = toggleDark.checked;
        this.applyVisuals();
      });
    }
  },

  // ------------------------------------------------------------
  // Aplicar visuales base (idle)
  // ------------------------------------------------------------
  applyVisuals() {
    if (!this.core) return;

    const color = this.isDark ? this.colorDark : this.color;

    this.core.style.width = this.size + "px";
    this.core.style.height = this.size + "px";
    this.core.style.animation = "";
    this.core.style.filter = "";

    if (this.mode === "ultra") {
      this.core.style.background = `radial-gradient(circle at 30% 20%, ${color}, #111)`;
      this.core.style.boxShadow = `0 0 ${this.halo}px ${color}`;
    } else if (this.mode === "3d") {
      this.core.style.background = `linear-gradient(145deg, ${color}, #000)`;
      this.core.style.boxShadow = `inset 0 0 20px #000, 0 0 ${this.halo}px ${color}`;
    } else {
      this.core.style.background = color;
      this.core.style.boxShadow = `0 0 ${this.halo}px ${color}`;
    }
  },

  // ------------------------------------------------------------
  // Presets visuales
  // ------------------------------------------------------------
  applyPreset(p) {
    this.preset = p;

    if (p === "default") {
      this.color = "#4f8cff";
      this.colorDark = "#4f8cff";
      this.halo = 60;
      this.mode = "ultra";
    } else if (p === "plasma") {
      this.color = "#ff00ff";
      this.colorDark = "#ff00ff";
      this.halo = 80;
      this.mode = "ultra";
    } else if (p === "fuego") {
      this.color = "#ff4500";
      this.colorDark = "#ff4500";
      this.halo = 90;
      this.mode = "3d";
    } else if (p === "neon") {
      this.color = "#39ff14";
      this.colorDark = "#39ff14";
      this.halo = 100;
      this.mode = "ultra";
    } else if (p === "minimal") {
      this.color = "#888";
      this.colorDark = "#444";
      this.halo = 20;
      this.mode = "classic";
    }

    this.saveConfig();
    this.applyVisuals();
  },

  // ------------------------------------------------------------
  // Estado: hablando (dictado / manos libres)
  // ------------------------------------------------------------
  setSpeaking(v) {
    this.isSpeaking = v;
    if (!this.core) return;

    if (v) {
      this.core.style.animation = "orbSpeaking 0.6s infinite alternate";
    } else {
      this.core.style.animation = "";
      this.applyVisuals();
    }
  },

  // ------------------------------------------------------------
  // Estado: cargando (búsqueda)
  // ------------------------------------------------------------
  setLoading(v) {
    this.isLoading = v;
    if (!this.core) return;

    if (v) {
      this.core.style.animation = "orbLoading 1s infinite linear";
      this.core.style.filter = "blur(2px) brightness(1.4)";
    } else {
      this.core.style.animation = "";
      this.core.style.filter = "";
      this.applyVisuals();
    }
  },

  // ------------------------------------------------------------
  // Estado: error
  // ------------------------------------------------------------
  setError(v) {
    this.isError = v;
    if (!this.core) return;

    if (v) {
      this.core.style.animation = "";
      this.core.style.filter = "";
      this.core.style.boxShadow = `0 0 ${this.halo}px #ff4f6a`;
      this.core.style.background = `radial-gradient(circle at 30% 20%, #ff4f6a, #111)`;
    } else {
      this.applyVisuals();
    }
  },

  // ------------------------------------------------------------
  // Reset total
  // ------------------------------------------------------------
  reset() {
    this.color = "#4f8cff";
    this.colorDark = "#4f8cff";
    this.size = 140;
    this.halo = 60;
    this.mode = "ultra";
    this.preset = "default";
    this.saveConfig();
    this.applyVisuals();
  },
};

// Inicializar
window.addEventListener("DOMContentLoaded", () => ORB.init());

// ------------------------------------------------------------
// Animaciones
// ------------------------------------------------------------
const style = document.createElement("style");
style.textContent = `
@keyframes orbSpeaking {
  from { transform: scale(1); }
  to { transform: scale(1.06); }
}

@keyframes orbLoading {
  from { filter: hue-rotate(0deg); }
  to { filter: hue-rotate(360deg); }
}
`;
document.head.appendChild(style);
