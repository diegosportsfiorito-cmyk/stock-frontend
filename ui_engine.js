// ============================================================
// UI ENGINE — Eventos, botones, filtros, vista tabla/tarjetas
// ============================================================

function initUI(app) {
  const els = app.els;
  const safe = (el) => el !== null && el !== undefined;

  // ENTER en input + código admin
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

  // ORB click + doble click (admin)
  const orb = document.getElementById("orb");
  if (safe(orb)) {
    orb.addEventListener("click", () => app.buscar());
    orb.addEventListener("dblclick", () => {
      const adminPanel = document.getElementById("admin-panel");
      if (adminPanel) adminPanel.style.display = "flex";
      app.showToast("Modo administrador activado");
    });
  }

  // Botones alrededor del ORB
  const btnClear = document.getElementById("btn-clear");
  if (safe(btnClear)) btnClear.addEventListener("click", () => app.limpiarPantalla());

  const btnCopy = document.getElementById("btn-copy");
  if (safe(btnCopy)) btnCopy.addEventListener("click", () => app.copiarResultados());

  const btnStop = document.getElementById("btn-stop");
  if (safe(btnStop)) btnStop.addEventListener("click", () => app.stopTodo());

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

  // Modo scanner simple/completo
  const modoToggle = document.getElementById("modo-scanner-toggle");
  if (modoToggle) {
    modoToggle.checked = (window.modoScanner || "simple") === "completo";
    modoToggle.addEventListener("change", (e) => {
      const modo = e.target.checked ? "completo" : "simple";
      if (window.setModoScanner) {
        window.setModoScanner(modo);
      }
      localStorage.setItem("modoDefecto", modo);
      app.showToast(`Modo scanner: ${modo.toUpperCase()}`);
    });
  }

  // Día / noche
  const toggleDark = document.getElementById("toggle-dark");
  if (toggleDark) {
    toggleDark.checked = document.body.classList.contains("light-mode");
    toggleDark.addEventListener("change", (e) => {
      if (e.target.checked) {
        document.body.classList.add("light-mode");
      } else {
        document.body.classList.remove("light-mode");
      }
    });
  }

  // Filtros
  const btnFiltros = document.getElementById("btn-filtros");
  if (btnFiltros && els.filtrosPanel) {
    btnFiltros.addEventListener("click", () => {
      els.filtrosPanel.classList.toggle("visible");
    });
  }

  if (els.btnAplicarFiltros) {
    els.btnAplicarFiltros.addEventListener("click", () => {
      app.buscarPorFiltros();
    });
  }

  if (els.chkSoloStock) {
    els.chkSoloStock.addEventListener("change", () => {
      app.buscarPorFiltros();
    });
  }

  // Vista tabla / tarjetas
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

  // Cambio de modo de gráfico
  const chartMode = document.getElementById("chart-mode");
  if (chartMode && window.actualizarDashboard) {
    chartMode.addEventListener("change", () => {
      window.actualizarDashboard(app.state.items);
    });
  }

  // Panel admin: guardar / cerrar
  const adminGuardar = document.getElementById("admin-guardar");
  const adminCerrar = document.getElementById("admin-cerrar");
  const adminPanel = document.getElementById("admin-panel");
  const adminBackendUrl = document.getElementById("admin-backend-url");
  const adminModoDefecto = document.getElementById("admin-modo-defecto");

  if (adminGuardar) {
    adminGuardar.addEventListener("click", () => {
      const url = adminBackendUrl.value.trim();
      const modo = adminModoDefecto.value;

      if (url) {
        localStorage.setItem("backendUrl", url);
        AppCore.config.backendUrl = url;
      }
      localStorage.setItem("modoDefecto", modo);
      if (window.setModoScanner) {
        window.setModoScanner(modo);
      }

      AppCore.showToast("Configuración guardada");
      if (adminPanel) adminPanel.style.display = "none";
    });
  }

  if (adminCerrar) {
    adminCerrar.addEventListener("click", () => {
      if (adminPanel) adminPanel.style.display = "none";
    });
  }

  // Click en métricas (hook futuro)
  const metricArt = document.getElementById("metric-articulos");
  const metricPares = document.getElementById("metric-pares");
  const metricAlertas = document.getElementById("metric-alertas");
  const metricVal = document.getElementById("metric-valorizado");

  [metricArt, metricPares, metricAlertas, metricVal].forEach((m) => {
    if (!m) return;
    m.addEventListener("click", () => {
      AppCore.showToast("Métricas clickeables (filtros rápidos en futuro)");
    });
  });
}

window.initUI = initUI;
