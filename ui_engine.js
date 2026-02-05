// ============================================================
// UI ENGINE — Eventos, botones, filtros, vista tabla/tarjetas
// ============================================================

function initUI(app) {
  const els = app.els;

  const safe = (el) => el !== null && el !== undefined;

  // ------------------------------------------------------------
  // ENTER en input + código admin
  // ------------------------------------------------------------
  if (safe(els.searchInput)) {
    els.searchInput.addEventListener("keydown", (e) => {
      if (e.key === "Enter") {
        const val = e.target.value.trim().toLowerCase();

        if (val === "admin") {
          const adminPanel = document.getElementById("admin-panel");
          if (adminPanel) adminPanel.style.display = "flex";
          e.target.value = "";
          app.showToast("Modo administrador activado");
          return;
        }

        app.buscar();
      }
    });
  }

  // ------------------------------------------------------------
  // ORB click + doble click (admin)
  // ------------------------------------------------------------
  if (safe(els.orb)) {
    els.orb.addEventListener("click", () => app.buscar());

    els.orb.addEventListener("dblclick", () => {
      const adminPanel = document.getElementById("admin-panel");
      if (adminPanel) adminPanel.style.display = "flex";
      app.showToast("Modo administrador activado");
    });
  }

  // ------------------------------------------------------------
  // BOTONES ALREDEDOR DEL ORB (iconos)
  // ------------------------------------------------------------

  // LIMPIAR
  const btnClear = document.getElementById("btn-clear");
  if (safe(btnClear)) {
    btnClear.addEventListener("click", () => app.limpiarPantalla());
  }

  // COPIAR
  const btnCopy = document.getElementById("btn-copy");
  if (safe(btnCopy)) {
    btnCopy.addEventListener("click", () => app.copiarResultados());
  }

  // STOP
  const btnStop = document.getElementById("btn-stop");
  if (safe(btnStop)) {
    btnStop.addEventListener("click", () => app.stopTodo());
  }

  // SCANNER
  const btnScanner = document.getElementById("btn-scanner-nativo");
  if (safe(btnScanner)) {
    btnScanner.addEventListener("click", () => {
      if (typeof startScanner === "function") {
        startScanner();
      } else {
        app.showToast("Scanner no disponible");
      }
    });
  }

  // DÍA / NOCHE
  const toggleDark = document.getElementById("toggle-dark");
  if (safe(toggleDark)) {
    toggleDark.addEventListener("change", (e) => {
      if (e.target.checked) {
        document.body.classList.add("light-mode");
      } else {
        document.body.classList.remove("light-mode");
      }
    });
  }

  // ------------------------------------------------------------
  // FILTROS
  // ------------------------------------------------------------
  if (safe(els.btnFiltros) && safe(els.filtrosPanel)) {
    els.btnFiltros.addEventListener("click", () => {
      els.filtrosPanel.classList.toggle("visible");
    });
  }

  if (safe(els.btnAplicarFiltros)) {
    els.btnAplicarFiltros.addEventListener("click", () => {
      app.actualizarFiltrosDesdeUI();
      app.buscarPorFiltros();
      if (safe(els.searchInput)) els.searchInput.value = "";
    });
  }

  if (safe(els.chkSoloStock)) {
    els.chkSoloStock.addEventListener("change", () => {
      app.buscarPorFiltros();
    });
  }

  // ------------------------------------------------------------
  // VISTA TABLA / TARJETAS (botones separados)
  // ------------------------------------------------------------
  const btnVistaTabla = document.getElementById("btn-vista-tabla");
  const btnVistaTarjetas = document.getElementById("btn-vista-tarjetas");

  if (btnVistaTabla && btnVistaTarjetas) {
    btnVistaTabla.addEventListener("click", () => {
      app.state.modoTabla = true;
      btnVistaTabla.classList.add("active");
      btnVistaTarjetas.classList.remove("active");
      app.renderResultados(app.state.items);
    });

    btnVistaTarjetas.addEventListener("click", () => {
      app.state.modoTabla = false;
      btnVistaTarjetas.classList.add("active");
      btnVistaTabla.classList.remove("active");
      app.renderResultados(app.state.items);
    });
  }

  // ------------------------------------------------------------
  // CAMBIO DE MODO DE GRÁFICO
  // ------------------------------------------------------------
  const chartMode = document.getElementById("chart-mode");
  if (chartMode) {
    chartMode.addEventListener("change", () => {
      actualizarDashboard(app.state.items);
    });
  }
}
