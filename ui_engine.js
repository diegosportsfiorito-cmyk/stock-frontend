// ============================================================
// UI ENGINE — Eventos, botones, filtros, vista tabla/tarjetas
// ============================================================

function initUI(app) {
  const els = app.els;

  // ENTER en input
  els.searchInput.addEventListener("keydown", (e) => {
    if (e.key === "Enter") app.buscar();
  });

  // ORB click
  els.orb.addEventListener("click", () => app.buscar());

  // LIMPIAR
  els.btnClear.addEventListener("click", app.limpiarPantalla);

  // COPIAR
  els.btnCopy.addEventListener("click", app.copiarResultados);

  // STOP
  els.btnStop.addEventListener("click", app.stopTodo);

  // FILTROS PANEL
  els.btnFiltros.addEventListener("click", () => {
    els.filtrosPanel.classList.toggle("visible");
  });

  els.btnAplicarFiltros.addEventListener("click", () => {
    app.actualizarFiltrosDesdeUI();
    app.buscarPorFiltros();
  });

  // SOLO STOCK
  els.chkSoloStock.addEventListener("change", () => {
    app.buscarPorFiltros();
  });

  // VISTA TABLA / TARJETAS
  els.btnTabla.addEventListener("click", () => {
    app.state.modoTabla = !app.state.modoTabla;
    els.btnTabla.textContent = app.state.modoTabla
      ? "Vista tarjetas"
      : "Vista tabla";
    app.renderResultados(app.state.items);
  });

  // Cambio de modo de gráfico
  const chartMode = document.getElementById("chart-mode");
  if (chartMode) {
    chartMode.addEventListener("change", () => {
      actualizarDashboard(app.state.items);
    });
  }
}
