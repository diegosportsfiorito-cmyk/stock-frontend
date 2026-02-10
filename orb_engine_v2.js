// ============================================================
// ORB ENGINE — Estados del ORB (idle / loading / ready / listening / speaking / error)
// Compatible con: presets, modo día/noche, TTS, admin panel
// ============================================================

const ORB = {
  el: document.getElementById("orb-core"),
  currentState: "idle",
  currentMode: "ultra", // ultra | 3d | classic
  haloIntensity: 60,

  // ============================================================
  // BASE
  // ============================================================

  setBase() {
    if (!this.el) return;

    // Limpia todos los estados
    this.el.classList.remove(
      "orb-ultra",
      "orb-3d",
      "orb-classic",
      "orb-loading",
      "orb-ready",
      "orb-listening",
      "orb-speaking",
      "orb-error"
    );

    // Aplica el modo visual actual
    if (this.currentMode === "3d") {
      this.el.classList.add("orb-3d");
    } else if (this.currentMode === "classic") {
      this.el.classList.add("orb-classic");
    } else {
      this.el.classList.add("orb-ultra");
    }

    // Aplica halo dinámico
    document.documentElement.style.setProperty(
      "--orb-halo-strength",
      this.haloIntensity
    );
  },

  // ============================================================
  // ESTADOS
  // ============================================================

  setState(state) {
    if (!this.el) return;

    this.currentState = state;
    this.setBase();

    if (state === "loading") {
      this.el.classList.add("orb-loading");
    } else if (state === "ready") {
      this.el.classList.add("orb-ready");
    } else if (state === "listening") {
      this.el.classList.add("orb-listening");
    } else if (state === "speaking") {
      this.el.classList.add("orb-speaking");
    } else if (state === "error") {
      this.el.classList.add("orb-error");
    }
  },

  // ============================================================
  // MÉTODOS PÚBLICOS
  // ============================================================

  setLoading(v) {
    this.setState(v ? "loading" : "idle");
  },

  setReady(v) {
    this.setState(v ? "ready" : "idle");
  },

  setListening(v) {
    this.setState(v ? "listening" : "ready");
  },

  setSpeaking(v) {
    this.setState(v ? "speaking" : "ready");
  },

  setError(v) {
    this.setState(v ? "error" : "idle");
  },

  // ============================================================
  // MODO VISUAL (desde panel admin)
  // ============================================================

  setMode(mode) {
    this.currentMode = mode;
    this.setBase();
  },

  // ============================================================
  // HALO (desde panel admin)
  // ============================================================

  setHalo(intensity) {
    this.haloIntensity = intensity;
    this.setBase();
  },

  // ============================================================
  // RESET COMPLETO
  // ============================================================

  reset() {
    this.currentState = "idle";
    this.currentMode = "ultra";
    this.haloIntensity = 60;
    this.setBase();
  },
};

// Exponer global
window.ORB = ORB;
