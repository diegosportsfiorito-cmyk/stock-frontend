// ============================================================
// APP CORE — Motor principal de búsqueda y estado
// ============================================================

window.AppCore = {
  state: {
    catalogo: [],
    buscando: false,
    abortController: null,
    modoVoz: false,
    modoScanner: "simple",
  },

  els: {},

  // ============================================================
  // INIT
  // ============================================================

  async init() {
    this.mapElements();
    this.bindEvents();
    await this.cargarCatalogo();
    this.actualizarFuenteDatos();
  },

  // ============================================================
  // MAPEO DE ELEMENTOS
  // ============================================================

  mapElements() {
    this.els.searchInput = document.getElementById("search-input");
    this.els.searchStatus = document.getElementById("search-status");
    this.els.resultsContainer = document.getElementById("results-container");
    this.els.resultsStatus = document.getElementById("results-status");

    this.els.btnClear = document.getElementById("btn-clear");
    this.els.btnCopy = document.getElementById("btn-copy");
    this.els.btnStop = document.getElementById("btn-stop");

    this.els.chkSoloStock = document.getElementById("chk-solo-stock");

    this.els.filtroMarca = document.getElementById("filtro-marca");
    this.els.filtroRubro = document.getElementById("filtro-rubro");
    this.els.filtroTalleDesde = document.getElementById("filtro-talle-desde");
    this.els.filtroTalleHasta = document.getElementById("filtro-talle-hasta");
    this.els.btnAplicarFiltros = document.getElementById("btn-aplicar-filtros");

    this.els.autocompleteList = document.getElementById("autocomplete-list");
  },

  // ============================================================
  // EVENTOS
  // ============================================================

  bindEvents() {
    // Enter para buscar
    if (this.els.searchInput) {
      this.els.searchInput.addEventListener("keydown", (e) => {
        if (e.key === "Enter") this.buscar();
      });
    }

    // Botón limpiar
    if (this.els.btnClear) {
      this.els.btnClear.addEventListener("click", () => {
        this.els.searchInput.value = "";
        this.els.resultsContainer.innerHTML = "";
        this.els.resultsStatus.textContent = "Esperando consulta";
      });
    }

    // Botón copiar
    if (this.els.btnCopy) {
      this.els.btnCopy.addEventListener("click", () => {
        navigator.clipboard.writeText(this.els.resultsContainer.innerText || "");
      });
    }

    // Botón detener
    if (this.els.btnStop) {
      this.els.btnStop.addEventListener("click", () => this.detenerBusqueda());
    }

    // Filtros avanzados
    if (this.els.btnAplicarFiltros) {
      this.els.btnAplicarFiltros.addEventListener("click", () => {
        this.buscarPorFiltros();
      });
    }

    // Autocomplete
    if (this.els.searchInput) {
      this.els.searchInput.addEventListener("input", () => this.autocomplete());
    }
  },

  // ============================================================
  // CARGAR CATÁLOGO
  // ============================================================

  async cargarCatalogo() {
    try {
      const backendUrl = localStorage.getItem("backendUrl") || "";
      if (!backendUrl) return;

      const res = await fetch(backendUrl + "/catalogo");
      const data = await res.json();

      this.state.catalogo = data.items || [];

      this.cargarFiltros(data);
      this.actualizarFuenteDatos(data);
    } catch (e) {
      console.error("Error cargando catálogo:", e);
    }
  },

  cargarFiltros(data) {
    if (!data) return;

    const marcas = data.marcas || [];
    const rubros = data.rubros || [];

    this.els.filtroMarca.innerHTML = `<option value="">Marca</option>` +
      marcas.map(m => `<option value="${m}">${m}</option>`).join("");

    this.els.filtroRubro.innerHTML = `<option value="">Rubro</option>` +
      rubros.map(r => `<option value="${r}">${r}</option>`).join("");
  },

  actualizarFuenteDatos(data = {}) {
    if (!window.FUENTE) return;

    window.FUENTE.setDatos({
      archivo: data.archivo || "—",
      fecha: data.fecha || "—",
      marcas: (data.marcas || []).length,
      rubros: (data.rubros || []).length,
      articulos: (data.items || []).length,
      stockTotal: data.stockTotal || 0,
      stockNegativo: data.stockNegativo || 0
    });
  },

  // ============================================================
  // AUTOCOMPLETE
  // ============================================================

  autocomplete() {
    const q = this.els.searchInput.value.trim().toUpperCase();
    if (!q) {
      this.els.autocompleteList.innerHTML = "";
      return;
    }

    const sugerencias = this.state.catalogo
      .filter(item =>
        item.descripcion.toUpperCase().includes(q) ||
        item.marca.toUpperCase().includes(q) ||
        item.rubro.toUpperCase().includes(q)
      )
      .slice(0, 10);

    this.els.autocompleteList.innerHTML = sugerencias
      .map(s => `<li>${s.descripcion}</li>`)
      .join("");

    Array.from(this.els.autocompleteList.children).forEach(li => {
      li.addEventListener("click", () => {
        this.els.searchInput.value = li.textContent;
        this.els.autocompleteList.innerHTML = "";
        this.buscar();
      });
    });
  },

  // ============================================================
  // PARSER DE CONSULTA
  // ============================================================

  parsearConsulta(q) {
    const qUpper = q.trim().toUpperCase();

    // Rango de talles
    const matchRango = qUpper.match(/T?(\d+)\s*(?:A|-|\/)\s*T?(\d+)/);
    if (matchRango) {
      return {
        filtros_globales: true,
        talleDesde: Number(matchRango[1]),
        talleHasta: Number(matchRango[2]),
        marca: "",
        rubro: "",
        question: ""
      };
    }

    // Precio
    const matchPrecio = qUpper.match(/^(?:P|\$)?(\d{2,6})$/);
    if (matchPrecio) {
      return {
        filtros_globales: true,
        precio: Number(matchPrecio[1]),
        marca: "",
        rubro: "",
        talleDesde: "",
        talleHasta: "",
        question: ""
      };
    }

    // Marca
    const marcas = [...new Set(this.state.catalogo.map(i => i.marca.toUpperCase()))];
    if (marcas.includes(qUpper)) {
      return {
        filtros_globales: true,
        marca: qUpper,
        rubro: "",
        talleDesde: "",
        talleHasta: "",
        question: ""
      };
    }

    // Rubro
    const rubros = [...new Set(this.state.catalogo.map(i => i.rubro.toUpperCase()))];
    if (rubros.includes(qUpper)) {
      return {
        filtros_globales: true,
        marca: "",
        rubro: qUpper,
        talleDesde: "",
        talleHasta: "",
        question: ""
      };
    }

    // Talle único
    const matchTalle = qUpper.match(/^T?(\d{1,3})$/);
    if (matchTalle) {
      return {
        filtros_globales: true,
        marca: "",
        rubro: "",
        talleDesde: Number(matchTalle[1]),
        talleHasta: Number(matchTalle[1]),
        question: ""
      };
    }

    // Consulta libre
    return {
      filtros_globales: false,
      question: qUpper
    };
  },

  // ============================================================
  // BÚSQUEDA PRINCIPAL
  // ============================================================

  async buscar(forzado = false) {
    const q = this.els.searchInput.value.trim();
    if (!q && !forzado) return;

    const backendUrl = localStorage.getItem("backendUrl") || "";
    if (!backendUrl) return;

    this.detenerBusqueda();
    this.state.buscando = true;

    ORB.setLoading(true);
    this.els.searchStatus.textContent = "Buscando...";

    const parsed = this.parsearConsulta(q);

    try {
      this.state.abortController = new AbortController();

      const res = await fetch(backendUrl + "/buscar", {
        method: "POST",
        body: JSON.stringify(parsed),
        headers: { "Content-Type": "application/json" },
        signal: this.state.abortController.signal
      });

      const data = await res.json();

      this.renderResultados(data.items || []);
      actualizarIndicadores(data.indicadores || {});
      actualizarDashboard(data.items || []);

      this.els.searchStatus.textContent = "Completado";
      ORB.setReady(true);
    } catch (e) {
      if (e.name !== "AbortError") {
        console.error("Error en búsqueda:", e);
        ORB.setError(true);
      }
    }

    this.state.buscando = false;
  },

  detenerBusqueda() {
    if (this.state.abortController) {
      try { this.state.abortController.abort(); } catch {}
    }
    this.state.buscando = false;
    ORB.setLoading(false);
  },

  // ============================================================
  // BÚSQUEDA POR FILTROS AVANZADOS
  // ============================================================

  async buscarPorFiltros() {
    const backendUrl = localStorage.getItem("backendUrl") || "";
    if (!backendUrl) return;

    const payload = {
      filtros_globales: true,
      marca: this.els.filtroMarca.value.trim().toUpperCase(),
      rubro: this.els.filtroRubro.value.trim().toUpperCase(),
      talleDesde: this.els.filtroTalleDesde.value,
      talleHasta: this.els.filtroTalleHasta.value,
      question: ""
    };

    this.detenerBusqueda();
    this.state.buscando = true;

    ORB.setLoading(true);
    this.els.searchStatus.textContent = "Buscando...";

    try {
      this.state.abortController = new AbortController();

      const res = await fetch(backendUrl + "/buscar", {
        method: "POST",
        body: JSON.stringify(payload),
        headers: { "Content-Type": "application/json" },
        signal: this.state.abortController.signal
      });

      const data = await res.json();

      this.renderResultados(data.items || []);
      actualizarIndicadores(data.indicadores || {});
      actualizarDashboard(data.items || []);

      this.els.searchStatus.textContent = "Completado";
      ORB.setReady(true);
    } catch (e) {
      if (e.name !== "AbortError") {
        console.error("Error en filtros:", e);
        ORB.setError(true);
      }
    }

    this.state.buscando = false;
  },

  // ============================================================
  // RENDER DE RESULTADOS
  // ============================================================

  renderResultados(items) {
    if (!this.els.resultsContainer) return;

    if (!items.length) {
      this.els.resultsContainer.innerHTML = "<div class='no-results'>Sin resultados</div>";
      this.els.resultsStatus.textContent = "0 resultados";
      return;
    }

    this.els.resultsStatus.textContent = `${items.length} resultados`;

    this.els.resultsContainer.innerHTML = items
      .map(item => {
        const talles = item.talles
          .map(t => `${t.talle}: ${t.stock}`)
          .join(" • ");

        return `
          <div class="result-item">
            <div class="result-title">${item.descripcion}</div>
            <div class="result-sub">${item.marca} — ${item.rubro}</div>
            <div class="result-talles">${talles}</div>
          </div>
        `;
      })
      .join("");
  }
};

// ============================================================
// INICIO
// ============================================================

document.addEventListener("DOMContentLoaded", () => {
  AppCore.init();
});
