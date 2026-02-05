// ============================================================
// APP CORE — Búsqueda, filtros, render, conexión backend
// ============================================================

const AppCore = {
  config: {
    backendUrl:
      localStorage.getItem("backendUrl") ||
      "https://stock-backend-1-0upi.onrender.com/query",
    modoDefecto: localStorage.getItem("modoDefecto") || "simple",
  },

  els: {
    searchInput: document.getElementById("search-input"),
    chkSoloStock: document.getElementById("chk-solo-stock"),
    filtroMarca: document.getElementById("filtro-marca"),
    filtroRubro: document.getElementById("filtro-rubro"),
    filtroTalleDesde: document.getElementById("filtro-talle-desde"),
    filtroTalleHasta: document.getElementById("filtro-talle-hasta"),
    filtrosPanel: document.getElementById("filtros-panel"),
    btnAplicarFiltros: document.getElementById("btn-aplicar-filtros"),
    resultsContainer: document.getElementById("results-container"),
    resultsStatus: document.getElementById("results-status"),
    metricArticulos: document.getElementById("metric-articulos-value"),
    metricPares: document.getElementById("metric-pares-value"),
    metricAlertas: document.getElementById("metric-alertas-value"),
    metricValorizado: document.getElementById("metric-valorizado-value"),
    connectionDot: document.getElementById("connection-dot"),
  },

  state: {
    items: [],
    catalogItems: [],
    lastQuery: "",
    currentAbort: null,
    filtros: {
      marca: null,
      rubro: null,
      talleDesde: null,
      talleHasta: null,
    },
    modoTabla: false,
  },

  // ------------------ Utilidades ------------------

  showToast(msg) {
    const toast = document.getElementById("toast");
    if (!toast) return;
    toast.textContent = msg;
    toast.classList.add("visible");
    setTimeout(() => toast.classList.remove("visible"), 2000);
  },

  formatNumber(n) {
    return Number(n || 0).toLocaleString("es-AR");
  },

  setConnectionStatus(ok) {
    if (!this.els.connectionDot) return;
    this.els.connectionDot.classList.toggle("online", ok);
  },

  // ------------------ Indicadores ------------------

  actualizarIndicadores(items) {
    let articulos = items.length;
    let pares = 0;
    let alertas = 0;
    let valorizado = 0;

    items.forEach((item) => {
      let totalItem = 0;
      item.talles.forEach((t) => {
        pares += t.stock;
        totalItem += t.stock;
      });
      if (item.alerta) alertas++;
      valorizado += item.valorizado || 0;
    });

    this.els.metricArticulos.textContent = this.formatNumber(articulos);
    this.els.metricPares.textContent = this.formatNumber(pares);
    this.els.metricAlertas.textContent = this.formatNumber(alertas);
    this.els.metricValorizado.textContent = `$${this.formatNumber(valorizado)}`;

    if (window.actualizarIndicadores) {
      window.actualizarIndicadores({ articulos, pares, alertas, valorizado });
    }
  },

  // ------------------ Render resultados ------------------

  renderResultados(items) {
    if (this.state.modoTabla) {
      this.renderResultadosTabla(items);
      return;
    }

    const cont = this.els.resultsContainer;
    cont.innerHTML = "";

    if (!items.length) {
      cont.innerHTML = '<div class="results-empty">Sin resultados.</div>';
      return;
    }

    items.forEach((item) => {
      const div = document.createElement("div");
      div.className = "result-item";

      const talles = item.talles
        .map((t) => `${t.talle}: ${t.stock}`)
        .join(" | ");

      div.innerHTML = `
        <div class="result-title">${item.codigo} — ${item.descripcion}</div>
        <div class="result-sub">
          Marca: ${item.marca || "—"} | Rubro: ${item.rubro || "—"} | Color: ${
        item.color || "—"
      }
        </div>
        <div class="result-talles">${talles}</div>
        <div class="result-sub">Precio público: $${this.formatNumber(
          item.precio
        )}</div>
        <div class="result-sub">Valorizado: $${this.formatNumber(
          item.valorizado
        )}</div>
      `;

      cont.appendChild(div);
    });
  },

  renderResultadosTabla(items) {
    const cont = this.els.resultsContainer;
    cont.innerHTML = "";

    if (!items.length) {
      cont.innerHTML = '<div class="results-empty">Sin resultados.</div>';
      return;
    }

    let totalStock = 0;

    let html = `
      <div class="tabla-wrapper">
        <table class="tabla-resultados">
          <thead>
            <tr>
              <th>Código</th>
              <th>Descripción</th>
              <th>Marca</th>
              <th>Rubro</th>
              <th>Color</th>
              <th>Talle</th>
              <th>Precio</th>
              <th>Stock</th>
            </tr>
          </thead>
          <tbody>
    `;

    items.forEach((item) => {
      item.talles.forEach((t) => {
        totalStock += t.stock;

        html += `
          <tr>
            <td>${item.codigo}</td>
            <td>${item.descripcion}</td>
            <td>${item.marca || "—"}</td>
            <td>${item.rubro || "—"}</td>
            <td>${item.color || "—"}</td>
            <td>${t.talle}</td>
            <td>$${this.formatNumber(item.precio)}</td>
            <td>${t.stock}</td>
          </tr>
        `;
      });
    });

    html += `
          </tbody>
          <tfoot>
            <tr>
              <td colspan="7" style="text-align:right;"><strong>Total unidades</strong></td>
              <td><strong>${totalStock}</strong></td>
            </tr>
          </tfoot>
        </table>
      </div>
    `;

    cont.innerHTML = html;
  },

  // ------------------ Filtros ------------------

  actualizarFiltrosDesdeUI() {
    this.state.filtros.marca = this.els.filtroMarca.value || null;
    this.state.filtros.rubro = this.els.filtroRubro.value || null;
    this.state.filtros.talleDesde = this.els.filtroTalleDesde.value || null;
    this.state.filtros.talleHasta = this.els.filtroTalleHasta.value || null;
  },

  async buscarPorFiltros() {
    this.actualizarFiltrosDesdeUI();

    const body = {
      question: "",
      solo_stock: this.els.chkSoloStock.checked,
      filtros_globales: true,
      marca: this.state.filtros.marca,
      rubro: this.state.filtros.rubro,
      talle_desde: this.state.filtros.talleDesde,
      talle_hasta: this.state.filtros.talleHasta,
    };

    ORB.setLoading(true);
    this.els.resultsStatus.textContent = "Filtrando…";

    try {
      const res = await fetch(this.config.backendUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      const data = await res.json();
      this.state.items = data.items || [];

      this.renderResultados(this.state.items);
      if (window.actualizarDashboard) {
        window.actualizarDashboard(this.state.items);
      }
      this.actualizarIndicadores(this.state.items);

      this.setConnectionStatus(true);
      ORB.setReady(true);
      this.els.resultsStatus.textContent = `${this.state.items.length} resultados`;
    } catch (err) {
      this.setConnectionStatus(false);
      ORB.setError(true);
      this.els.resultsStatus.textContent = "Error de conexión";
    } finally {
      ORB.setLoading(false);
    }
  },

  // ------------------ Catálogo (marca/rubro) ------------------

  async cargarCatalogo() {
    try {
      const body = {
        question: "",
        solo_stock: false,
        filtros_globales: false,
        marca: null,
        rubro: null,
        talle_desde: null,
        talle_hasta: null,
      };

      const res = await fetch(this.config.backendUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      const data = await res.json();
      this.state.catalogItems = data.items || [];

      const marcas = [
        ...new Set(this.state.catalogItems.map((i) => i.marca).filter(Boolean)),
      ];
      const rubros = [
        ...new Set(this.state.catalogItems.map((i) => i.rubro).filter(Boolean)),
      ];

      this.els.filtroMarca.innerHTML =
        '<option value="">Marca</option>' +
        marcas.map((m) => `<option value="${m}">${m}</option>`).join("");

      this.els.filtroRubro.innerHTML =
        '<option value="">Rubro</option>' +
        rubros.map((r) => `<option value="${r}">${r}</option>`).join("");

      this.setConnectionStatus(true);
    } catch (err) {
      this.setConnectionStatus(false);
    }
  },

  // ------------------ Búsqueda principal ------------------

  async buscar(force = false) {
    const query = this.els.searchInput.value.trim();
    if (!query) {
      this.showToast("Ingresá un código o descripción");
      return;
    }

    if (!force && query === this.state.lastQuery) return;
    this.state.lastQuery = query;

    if (this.state.currentAbort) this.state.currentAbort.abort();
    this.state.currentAbort = new AbortController();

    ORB.setLoading(true);
    this.els.resultsStatus.textContent = "Buscando…";

    try {
      const body = {
        question: query,
        solo_stock: this.els.chkSoloStock.checked,
      };

      const res = await fetch(this.config.backendUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
        signal: this.state.currentAbort.signal,
      });

      if (!res.ok) throw new Error("Error en servidor");

      const data = await res.json();
      this.state.items = data.items || [];

      this.renderResultados(this.state.items);
      if (window.actualizarDashboard) {
        window.actualizarDashboard(this.state.items);
      }
      this.actualizarIndicadores(this.state.items);

      this.setConnectionStatus(true);
      ORB.setReady(true);
      this.els.resultsStatus.textContent = `${this.state.items.length} resultados`;
    } catch (err) {
      if (err.name !== "AbortError") {
        this.setConnectionStatus(false);
        ORB.setError(true);
        this.els.resultsStatus.textContent = "Error de conexión";
      }
    } finally {
      ORB.setLoading(false);
    }
  },

  // ------------------ Utilidades UI ------------------

  limpiarPantalla() {
    this.els.searchInput.value = "";
    this.els.resultsContainer.innerHTML = "";
    this.els.resultsStatus.textContent = "Esperando consulta";
    ORB.setReady(false);
    this.actualizarIndicadores([]);
    if (window.actualizarDashboard) {
      window.actualizarDashboard([]);
    }
  },

  copiarResultados() {
    const text = this.els.resultsContainer.innerText;
    if (!text.trim()) {
      this.showToast("No hay resultados para copiar");
      return;
    }
    navigator.clipboard.writeText(text);
    this.showToast("Copiado");
  },

  stopTodo() {
    if (this.state.currentAbort) this.state.currentAbort.abort();
    ORB.setError(true);
    this.els.resultsStatus.textContent = "Cancelado";
  },

  // ------------------ Config admin ------------------

  aplicarConfigAdmin() {
    const url = localStorage.getItem("backendUrl");
    const modo = localStorage.getItem("modoDefecto");

    if (url) this.config.backendUrl = url;
    if (modo) {
      this.config.modoDefecto = modo;
      if (window.setModoScanner) {
        window.setModoScanner(modo);
      }
    }

    const inputUrl = document.getElementById("admin-backend-url");
    const selectModo = document.getElementById("admin-modo-defecto");
    if (inputUrl) inputUrl.value = this.config.backendUrl;
    if (selectModo) selectModo.value = this.config.modoDefecto;
  },

  // ------------------ INIT ------------------

  async init() {
    this.aplicarConfigAdmin();
    if (window.initUI) {
      window.initUI(this);
    }
    await this.cargarCatalogo();
    ORB.setReady(false);
    this.els.resultsStatus.textContent = "Esperando consulta";
  },
};

window.AppCore = AppCore;

document.addEventListener("DOMContentLoaded", () => {
  AppCore.init();
});
