// ============================================================
// UI ENGINE — Comportamiento visual y de interfaz
// ============================================================

(function () {
  const body = document.body;

  // ============================================================
  // MODO DÍA / NOCHE
  // ============================================================

  const toggleDark = document.getElementById("toggle-dark");
  if (toggleDark) {
    const saved = localStorage.getItem("modoOscuro") === "1";
    toggleDark.checked = saved;
    body.classList.toggle("dark-mode", saved);
    body.classList.toggle("light-mode", !saved);

    toggleDark.addEventListener("change", () => {
      const active = toggleDark.checked;
      localStorage.setItem("modoOscuro", active ? "1" : "0");
      body.classList.toggle("dark-mode", active);
      body.classList.toggle("light-mode", !active);
    });
  }

  // ============================================================
  // PANEL DE AYUDA
  // ============================================================

  const helpBtn = document.getElementById("help-button");
  const helpModal = document.getElementById("help-modal");
  const helpClose = document.getElementById("help-close");

  if (helpBtn && helpModal && helpClose) {
    helpBtn.addEventListener("click", () => {
      helpModal.classList.remove("hidden");
    });

    helpClose.addEventListener("click", () => {
      helpModal.classList.add("hidden");
    });

    helpModal.addEventListener("click", (e) => {
      if (e.target === helpModal) helpModal.classList.add("hidden");
    });
  }

  // ============================================================
  // TOAST
  // ============================================================

  const toast = document.getElementById("toast");

  window.UI = {
    toast(msg, tiempo = 2000) {
      if (!toast) return;
      toast.textContent = msg;
      toast.classList.add("visible");
      setTimeout(() => toast.classList.remove("visible"), tiempo);
    }
  };

  // ============================================================
  // FILTROS PANEL
  // ============================================================

  const btnFiltros = document.getElementById("btn-filtros");
  const filtrosPanel = document.getElementById("filtros-panel");

  if (btnFiltros && filtrosPanel) {
    btnFiltros.addEventListener("click", () => {
      filtrosPanel.classList.toggle("visible");
    });
  }

  // ============================================================
  // FUENTE DE DATOS PANEL (ya manejado en HTML)
  // ============================================================

  // Nada adicional aquí.

  // ============================================================
  // MÉTRICAS — Click para filtros rápidos
  // ============================================================

  const metricNeg = document.getElementById("metric-negativos");
  const metricCero = document.getElementById("metric-cero");

  if (metricNeg) {
    metricNeg.addEventListener("click", () => {
      const input = document.getElementById("search-input");
      input.value = "NEGATIVOS";
      AppCore.buscar(true);
    });
  }

  if (metricCero) {
    metricCero.addEventListener("click", () => {
      const input = document.getElementById("search-input");
      input.value = "0";
      AppCore.buscar(true);
    });
  }

  // ============================================================
  // MODO ESCUCHANDO (DICTADO)
  // ============================================================

  const modoVozSwitch = document.getElementById("modo-voz-switch");
  const voiceStatus = document.getElementById("voice-status");

  if (modoVozSwitch && voiceStatus) {
    modoVozSwitch.addEventListener("change", () => {
      const active = modoVozSwitch.checked;
      AppCore.state.modoVoz = active;

      voiceStatus.textContent = active ? "Dictado activado" : "Dictado desactivado";

      if (active) ORB.setListening(true);
      else ORB.setListening(false);
    });
  }

  // ============================================================
  // MANOS LIBRES (placeholder, integración futura)
  // ============================================================

  const btnHandsfree = document.getElementById("btn-handsfree");
  if (btnHandsfree) {
    btnHandsfree.addEventListener("click", () => {
      UI.toast("Modo manos libres aún no implementado");
    });
  }

  // ============================================================
  // MIC DICTADO AL INPUT (placeholder)
  // ============================================================

  const btnMic = document.getElementById("mic-button");
  if (btnMic) {
    btnMic.addEventListener("click", () => {
      UI.toast("Dictado al input aún no implementado");
    });
  }

  // ============================================================
  // ESC = limpiar
  // ============================================================

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
      const input = document.getElementById("search-input");
      if (input) input.value = "";
      if (AppCore.els.resultsContainer) AppCore.els.resultsContainer.innerHTML = "";
      if (AppCore.els.resultsStatus) AppCore.els.resultsStatus.textContent = "Esperando consulta";
    }
  });

})();
