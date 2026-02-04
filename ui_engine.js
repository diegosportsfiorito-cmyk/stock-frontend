// ============================================================
// UI ENGINE — Eventos, botones, filtros, vista tabla/tarjetas
// ============================================================

function initUI(app) {
  const els = app.els;

  // ============================================================
  // PROTECCIÓN: si falta algún elemento, no rompe nada
  // ============================================================
  const safe = (el) => el !== null && el !== undefined;

  // ============================================================
  // ENTER en input + ACTIVAR ADMIN (código secreto)
  // ============================================================
  if (safe(els.searchInput)) {
    els.searchInput.addEventListener("keydown", (e) => {
      if (e.key === "Enter") {
        const val = e.target.value.trim().toLowerCase();

        // ACTIVAR PANEL ADMIN
        if (val === "admin") {
          const adminPanel = document.getElementById("admin-panel");
          if (adminPanel) adminPanel.style.display = "flex";
          e.target.value = "";
          showToast("Modo administrador activado");
          return;
        }

        app.buscar();
      }
    });
  }

  // ============================================================
  // ORB click + doble click (admin)
  // ============================================================
  if (safe(els.orb)) {
    els.orb.addEventListener("click", () => app.buscar());

    els.orb.addEventListener("dblclick", () => {
      const adminPanel = document.getElementById("admin-panel");
      if (adminPanel) adminPanel.style.display = "flex";
      showToast("Modo administrador activado");
    });
  }

  // ============================================================
  // BOTÓN LIMPIAR (solo resultados, no configuración)
  // ============================================================
  if (safe(els.btnClear)) {
    els.btnClear.addEventListener("click", () => app.limpiarPantalla());
  }

  // ============================================================
  // BOTÓN COPIAR
  // ============================================================
  if (safe(els.btnCopy)) {
    els.btnCopy.addEventListener("click", () => app.copiarResultados());
  }

  // ============================================================
  // BOTÓN STOP
  // ============================================================
  if (safe(els.btnStop)) {
    els.btnStop.addEventListener("click", () => app.stopTodo());
  }

  // ============================================================
  // FILTROS PANEL
  // ============================================================
  if (safe(els.btnFiltros) && safe(els.filtrosPanel)) {
    els.btnFiltros.addEventListener("click", () => {
      els.filtrosPanel.classList.toggle("visible");
    });
  }

  if (safe(els.btnAplicarFiltros)) {
    els.btnAplicarFiltros.addEventListener("click", () => {
      app.actualizarFiltrosDesdeUI();
      app.buscarPorFiltros();
    });
  }

  // ============================================================
  // SOLO STOCK
  // ============================================================
  if (safe(els.chkSoloStock)) {
    els.chkSoloStock.addEventListener("change", () => {
      app.buscarPorFiltros();
    });
  }

  // ============================================================
  // VISTA TABLA / TARJETAS
  // ============================================================
  if (safe(els.btnTabla)) {
    els.btnTabla.addEventListener("click", () => {
      app.state.modoTabla = !app.state.modoTabla;

      els.btnTabla.textContent = app.state.modoTabla
        ? "Vista tarjetas"
        : "Vista tabla";

      app.renderResultados(app.state.items);
    });
  }

  // ============================================================
  // CAMBIO DE MODO DE GRÁFICO
  // ============================================================
  const chartMode = document.getElementById("chart-mode");
  if (safe(chartMode)) {
    chartMode.addEventListener("change", () => {
      actualizarDashboard(app.state.items);
    });
  }

  // ============================================================
  // SCANNER (si existe startScanner en scanner_v2.js)
  // ============================================================
  const btnScanner = document.getElementById("btn-scanner-nativo");
  if (safe(btnScanner)) {
    btnScanner.addEventListener("click", () => {
      if (typeof startScanner === "function") {
        startScanner();
      } else {
        showToast("Scanner no disponible");
      }
    });
  }
}
