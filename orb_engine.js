// ============================================================
// ORB ENGINE — Control de estados visuales del ORB 3D
// ============================================================

const ORB = {
  el: document.getElementById("orb-core"),

  setState(stateClass) {
    if (!this.el) return;
    this.el.className = "";
    if (stateClass) this.el.classList.add(stateClass);
  },

  setLoading(active) {
    this.setState(active ? "orb-loading" : "");
  },

  setReady(active) {
    this.setState(active ? "orb-ready" : "");
  },

  setError(active) {
    this.setState(active ? "orb-error" : "");
  }
};

window.ORB = ORB;
