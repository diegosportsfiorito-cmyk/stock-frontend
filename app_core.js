// ============================================================
// APP CORE — Búsqueda, filtros, render, conexión backend
// ============================================================

const API_URL = "https://stock-backend-1-0upi.onrender.com/query";

const AppCore = {
  els: {
    searchInput: document.getElementById("search-input"),
    btnClear: document.getElementById("btn-clear"),
    btnCopy: document.getElementById("btn-copy"),
    btnFiltros: document.getElementById("btn-filtros"),
    filtrosPanel: document.getElementById("filtros-panel"),
    filtroMarca: document.getElementById("filtro-marca"),
    filtroRubro: document.getElementById("filtro-rubro"),
    filtroTalleDesde: document.getElementById("filtro-talle-desde"),
    filtroTalleHasta: document.getElementById("filtro-talle-hasta"),
    btnAplicarFiltros: document.getElementById("btn-aplicar-filtros"),
    chkSoloStock: document.getElementById("chk-solo-stock"),
    resultsContainer: document.getElementById("results-container"),
    resultsStatus: document.getElementById("results-status"),
    btnStop: document.getElementById("btn-stop"),
    orb: document.getElementById("orb"),
    stockChartCanvas: document.getElementById("stockChart"),
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
    return Number(n).toLocaleString("es-AR");
  },

  setConnectionStatus(ok) {
    const dot = document.querySelector(".connection-dot");
    if (!dot) return;
    dot.style.background = ok ? "#3ddc84" : "#ff4f6a";
  },

  // ------------------ Render resultados ------------------

  renderResultados(items) {
    const els = this.els;

    if (this.state.modoTabla) {
      this.renderResultadosTabla(items);
      return;
    }

    els.resultsContainer.innerHTML = "";

    if (!items.length) {
      els.resultsContainer.innerHTML =
        '<div class="results-empty">Sin resultados.</div>';
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

      els.resultsContainer.appendChild(div);
    });
  },

  renderResultadosTabla(items) {
    const els = this.els;
    els.resultsContainer.innerHTML = "";

    if (!items.length) {
      els.resultsContainer.innerHTML =
        '<div class="results-empty">Sin resultados.</div>';
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

    els.resultsContainer.innerHTML = html;
  },

  // ------------------ Filtros ------------------

  actualizarFiltrosDesdeUI() {
    const els = this.els;
    this.state.filtros.marca = els.filtroMarca.value || null;
    this.state.filtros.rubro = els.filtroRubro.value || null;
    this.state.filtros.talleDesde = els.filtroTalleDesde.value || null;
    this.state.filtros.talleHasta = els.filtroTalleHasta.value || null;
  },

  async buscarPorFiltros() {
    const els = this.els;

    const body = {
      question: "",
      solo_stock: els.chkSoloStock.checked,
      filtros_globales: true,
      marca: this.state.filtros.marca,
      rubro: this.state.filtros.rubro,
      talle_desde: this.state.filtros.talleDesde,
      talle_hasta: this.state.filtros.talleHasta,
    };

    ORB.setLoading(true);
    els.resultsStatus.textContent = "Filtrando…";

    try {
      const res = await fetch(API_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      const data = await res.json();
      this.state.items = data.items || [];

      this.renderResultados(this.state.items);
      actualizarDashboard(this.state.items);
      actualizarIndicadores(this.state.items);

      this.setConnectionStatus(true);
      ORB.setReady(true);
      els.resultsStatus.textContent = `${this.state.items.length} resultados`;
    } catch (err) {
      this.setConnectionStatus(false);
      ORB.setError(true);
      els.resultsStatus.textContent = "Error de conexión";
    } finally {
      ORB.setLoading(false);
    }
  },

  // ------------------ Catálogo (marca/rubro) ------------------

  async cargarCatalogo() {
    const els = this.els;

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

      const res = await fetch(API_URL, {
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

      els.filtroMarca.innerHTML =
        '<option value="">Marca</option>' +
        marcas.map((m) => `<option value="${m}">${m}</option>`).join("");

      els.filtroRubro.innerHTML =
        '<option value="">Rubro</option>' +
        rubros.map((r) => `<option value="${r}">${r}</option>`).join("");

      this.setConnectionStatus(true);
    } catch (err) {
      this.setConnectionStatus(false);
    }
  },

  // ------------------ Búsqueda principal ------------------

  async buscar(force = false) {
    const els = this.els;
    const query = els.searchInput.value.trim();
    if (!query) {
      this.showToast("Ingresá un código o descripción");
      return;
    }

    if (!force && query === this.state.lastQuery) return;
    this.state.lastQuery = query;

    if (this.state.currentAbort) this.state.currentAbort.abort();
    this.state.currentAbort = new AbortController();

    ORB.setLoading(true);
    els.resultsStatus.textContent = "Buscando…";

    try {
      const body = {
        question: query,
        solo_stock: els.chkSoloStock.checked,
      };

      const res = await fetch(API_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
        signal: this.state.currentAbort.signal,
      });

      if (!res.ok) throw new Error("Error en servidor");

      const data = await res.json();
      this.state.items = data.items || [];

      this.renderResultados(this.state.items);
      actualizarDashboard(this.state.items);
      actualizarIndicadores(this.state.items);

      this.setConnectionStatus(true);
      ORB.setReady(true);
      els.resultsStatus.textContent = `${this.state.items.length} resultados`;
    } catch (err) {
      if (err.name !== "AbortError") {
        this.setConnectionStatus(false);
        ORB.setError(true);
        els.resultsStatus.textContent = "Error de conexión";
      }
    } finally {
      ORB.setLoading(false);
    }
  },

  // ------------------ Utilidades UI ------------------

  limpiarPantalla: function () {
    const els = this.els;
    if (els.searchInput) els.searchInput.value = "";
    els.resultsContainer.innerHTML = "";
    els.resultsStatus.textContent = "Esperando consulta";
    ORB.setReady(false);
    actualizarIndicadores([]);
    actualizarDashboard([]);
  },

  copiarResultados: function () {
    const text = this.els.resultsContainer.innerText;
    if (!text.trim()) {
      this.showToast("No hay resultados para copiar");
      return;
    }
    navigator.clipboard.writeText(text);
    this.showToast("Copiado");
  },

  stopTodo: function () {
    if (this.state.currentAbort) this.state.currentAbort.abort();
    ORB.setError(true);
    this.els.resultsStatus.textContent = "Cancelado";
  },

  // ------------------ INIT ------------------

  async init() {
    initUI(this);
    await this.cargarCatalogo();
    ORB.setReady(false);
    this.els.resultsStatus.textContent = "Esperando consulta";
  },
};

window.AppCore = AppCore;

document.addEventListener("DOMContentLoaded", () => {
  AppCore.init();
});
