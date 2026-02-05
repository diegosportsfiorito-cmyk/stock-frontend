// ============================================================
// ORB ENGINE — Estados del ORB (idle / loading / ready / listening / error)
// ============================================================

const ORB = {
  el: document.getElementById("orb-core"),
  currentState: "idle",

  setBase() {
    if (!this.el) return;
    this.el.className = "orb-ultra";
  },

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
    } else if (state === "error") {
      this.el.classList.add("orb-error");
    }
  },

  setLoading(v) {
    this.setState(v ? "loading" : "idle");
  },

  setReady(v) {
    this.setState(v ? "ready" : "idle");
  },

  setListening(v) {
    this.setState(v ? "listening" : "ready");
  },

  setError(v) {
    this.setState(v ? "error" : "idle");
  },
};
