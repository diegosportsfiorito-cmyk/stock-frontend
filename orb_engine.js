// ============================================================
// ORB ENGINE — Estados del ORB (loading / ready / error)
// ============================================================

const ORB = {
  el: document.getElementById("orb-core"),

  setState(className) {
    if (!this.el) return;
    // Siempre mantenemos la base visual
    this.el.className = "orb-ultra";
    if (className) this.el.classList.add(className);
  },

  setLoading(v) {
    this.setState(v ? "orb-loading" : "");
  },

  setReady(v) {
    this.setState(v ? "orb-ready" : "");
  },

  setError(v) {
    this.setState(v ? "orb-error" : "");
  },
};
