// ============================================================
// APP CORE — Motor inteligente + warm-up + indicador visual
// Versión final 2026 — Vista Artículo OPCIÓN A
// ============================================================

const AppCore = {
  config: {
    backendUrl: "https://stock-backend-1-0upi.onrender.com",
    modoDefecto: localStorage.getItem("modoDefecto") || "simple",
  },

  els: {
    searchInput: document.getElementById("search-input"),
    searchStatus: document.getElementById("search-status"),

    chkSoloStock: document.getElementById("chk-solo-stock"),
    filtroMarca: document.getElementById("filtro-marca"),
    filtroRubro: document.getElementById("filtro-rubro"),
    filtroTalleDesde: document.getElementById("filtro-talle-desde"),
    filtroTalleHasta: document.getElementById("filtro-talle-hasta"),
    filtrosPanel: document.getElementById("filtros-panel"),
    btnAplicarFiltros: document.getElementById("btn-aplicar-filtros"),

    resultsContainer: document.getElementById("results-container"),
    resultsStatus: document.getElementById("results-status"),

    vistaTabla: document.getElementById("vista-tabla"),
    vistaTarjeta: document.getElementById("vista-tarjeta"),
    vistaArticulo: document.getElementById("vista-articulo"),

    metricArticulos: document.getElementById("metric-articulos-value"),
    metricPares: document.getElementById("metric-pares-value"),
    metricAlertasNegativos: document.getElementById("metric-alertas-negativos-value"),
    metricAlertasCero: document.getElementById("metric-alertas-cero-value"),
    metricValorizado: document.getElementById("metric-valorizado-value"),

    connectionDot: document.getElementById("connection-dot"),

    fuenteDatosToggle: document.getElementById("fuente-datos-toggle"),
    fuenteDatosPanel: document.getElementById("fuente-datos-panel"),
    fuenteArchivo: document.getElementById("fuente-archivo"),
    fuenteFecha: document.getElementById("fuente-fecha"),
    fuenteMarcas: document.getElementById("fuente-marcas"),
    fuenteRubros: document.getElementById("fuente-rubros"),
    fuenteArticulos: document.getElementById("fuente-articulos"),
    fuenteStockTotal: document.getElementById("fuente-stock-total"),
    fuenteStockNegativo: document.getElementById("fuente-stock-negativo"),
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
    vistaActual: "tarjeta", // tabla | tarjeta | articulo
    resumenCatalogo: null,
    retryTimeout: null,
    warmingUp: true,
  },

  // ============================================================
  // UTILIDADES
  // ============================================================

  normalizarCampo(v) {
    if (!v && v !== 0) return "—";
    const t = String(v).trim().toUpperCase();
    if (["NAN", "NULL", "UNDEFINED"].includes(t)) return "—";
    return v;
  },

  normalizarTexto(v) {
    if (!v) return "";
    return v
      .toString()
      .normalize("NFKD")
      .replace(/\u00A0/g, " ")
      .replace(/\s+/g, " ")
      .trim()
      .toUpperCase();
  },

  showToast(msg) {
    const t = document.getElementById("toast");
    if (!t) return;
    t.textContent = msg;
    t.classList.add("visible");
    setTimeout(() => t.classList.remove("visible"), 2000);
  },

  formatNumber(n) {
    return Number(n || 0).toLocaleString("es-AR");
  },

  setConnectionStatus(ok) {
    this.els.connectionDot?.classList.toggle("online", ok);
  },

  setSearchStatus(text, color = "blue") {
    if (!this.els.searchStatus) return;
    this.els.searchStatus.textContent = text;
    this.els.searchStatus.className = "search-status " + color;
  },

  setOrbIdle() {
    if (!window.ORB) return;
    ORB.setError?.(false);
    ORB.setLoading?.(false);
  },

  // ============================================================
  // AUTOCOMPLETE
  // ============================================================

  getAutocompleteSuggestions(term) {
    const q = this.normalizarTexto(term);
    if (!q || !this.state.catalogItems.length) return [];

    const set = new Set();

    this.state.catalogItems.forEach((item) => {
      const desc = this.normalizarTexto(item.descripcion || "");
      const marca = this.normalizarTexto(item.marca || "");
      const rubro = this.normalizarTexto(item.rubro || "");

      if (desc.includes(q)) set.add(item.descripcion);
      if (marca.includes(q)) set.add(item.marca);
      if (rubro.includes(q)) set.add(item.rubro);
    });

    return Array.from(set).slice(0, 12);
  },

  // ============================================================
  // WARM-UP + CARGA CATÁLOGO
  // ============================================================

  async pingBackend() {
    this.setSearchStatus("Activando servidor…", "orange");
    this.setConnectionStatus(false);

    try {
      const res = await fetch(this.config.backendUrl + "/ping");
      if (!res.ok) throw new Error();

      this.setSearchStatus("Conectado", "green");
      this.setConnectionStatus(true);
      this.state.warmingUp = false;
      return true;
    } catch {
      this.setSearchStatus("Activando servidor…", "orange");
      return false;
    }
  },

  async warmUpLoop() {
    const ok = await this.pingBackend();
    if (!ok) {
      setTimeout(() => this.warmUpLoop(), 2000);
      return;
    }
    this.cargarCatalogo();
  },

  async cargarCatalogo() {
    this.setSearchStatus("Cargando catálogo…", "blue");

    try {
      const res = await fetch(this.config.backendUrl + "/catalog");
      if (!res.ok) throw new Error();

      const data = await res.json();

      this.state.catalogItems = data.items || [];
      this.state.resumenCatalogo = data.resumen || null;

      this.els.fuenteArchivo.textContent = data.resumen?.archivo || "—";
      this.els.fuenteFecha.textContent = data.resumen?.fecha || "—";
      this.els.fuenteMarcas.textContent = data.resumen?.marcas || "—";
      this.els.fuenteRubros.textContent = data.resumen?.rubros || "—";
      this.els.fuenteArticulos.textContent = data.resumen?.articulos || "—";
      this.els.fuenteStockTotal.textContent = data.resumen?.stock_total || "—";
      this.els.fuenteStockNegativo.textContent =
        data.resumen?.stock_negativo || "—";

      this.poblarFiltros();

      this.setConnectionStatus(true);
      this.setSearchStatus("Conectado", "green");
    } catch {
      this.setConnectionStatus(false);
      this.setSearchStatus("Error de conexión", "red");

      clearTimeout(this.state.retryTimeout);
      this.state.retryTimeout = setTimeout(() => this.warmUpLoop(), 2000);
    }
  },

  poblarFiltros() {
    const marcas = new Set();
    const rubros = new Set();

    this.state.catalogItems.forEach((i) => {
      if (i.marca) marcas.add(i.marca);
      if (i.rubro) rubros.add(i.rubro);
    });

    this.els.filtroMarca.innerHTML =
      `<option value="">Marca</option>` +
      [...marcas].sort().map((m) => `<option>${m}</option>`).join("");

    this.els.filtroRubro.innerHTML =
      `<option value="">Rubro</option>` +
      [...rubros].sort().map((r) => `<option>${r}</option>`).join("");
  },
  // ============================================================
  // RENDER RESULTADOS (3 VISTAS)
  // ============================================================

  renderResultados(items) {
    const vTabla = this.els.vistaTabla;
    const vTarjeta = this.els.vistaTarjeta;
    const vArticulo = this.els.vistaArticulo;

    if (!vTabla || !vTarjeta || !vArticulo) return;

    if (!items || !items.length) {
      vTabla.innerHTML = '<div class="results-empty">Sin resultados.</div>';
      vTarjeta.innerHTML = '<div class="results-empty">Sin resultados.</div>';
      vArticulo.innerHTML = '<div class="results-empty">Sin resultados.</div>';
      return;
    }

    this.renderVistaTabla(items);
    this.renderVistaTarjeta(items);
    this.renderVistaArticulo(items);
  },

  // ============================================================
  // VISTA TABLA
  // ============================================================

  renderVistaTabla(items) {
    const container = this.els.vistaTabla;
    if (!container) return;

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
            <th>Precio</th>
            <th>Talles</th>
            <th>Valorizado</th>
          </tr>
        </thead>
        <tbody>
    `;

    items.forEach((item) => {
      const talles = (item.talles || [])
        .map((t) => `${this.normalizarCampo(t.talle)}: ${t.stock}`)
        .join(" | ");

      html += `
        <tr>
          <td>${this.normalizarCampo(item.codigo)}</td>
          <td>${this.normalizarCampo(item.descripcion)}</td>
          <td>${this.normalizarCampo(item.marca)}</td>
          <td>${this.normalizarCampo(item.rubro)}</td>
          <td>${this.normalizarCampo(item.color)}</td>
          <td>$${this.formatNumber(item.precio)}</td>
          <td>${talles}</td>
          <td>$${this.formatNumber(item.valorizado)}</td>
        </tr>
      `;
    });

    html += "</tbody></table></div>";
    container.innerHTML = html;
  },

  // ============================================================
  // VISTA TARJETA
  // ============================================================

  renderVistaTarjeta(items) {
    const container = this.els.vistaTarjeta;
    if (!container) return;
    container.innerHTML = "";

    items.forEach((item) => {
      const div = document.createElement("div");
      div.className = "result-item";

      const talles = (item.talles || [])
        .map((t) => `${this.normalizarCampo(t.talle)}: ${t.stock}`)
        .join(" | ");

      div.innerHTML = `
        <div class="result-title">
          ${this.normalizarCampo(item.codigo)} — ${this.normalizarCampo(
        item.descripcion
      )}
        </div>
        <div class="result-sub">
          Marca: ${this.normalizarCampo(item.marca)} |
          Rubro: ${this.normalizarCampo(item.rubro)} |
          Color: ${this.normalizarCampo(item.color)}
        </div>
        <div class="result-precio">Precio: $${this.formatNumber(item.precio)}</div>
        <div class="result-talles">${talles}</div>
        <div class="result-sub">
          Valorizado: $${this.formatNumber(item.valorizado)}
        </div>
      `;

      container.appendChild(div);
    });
  },

  // ============================================================
  // ⭐ VISTA ARTÍCULO (OPCIÓN A — SIEMPRE EXPANDIDA POR TALLE)
  // ============================================================

  renderVistaArticulo(items) {
    const container = this.els.vistaArticulo;
    if (!container) return;

    if (!items.length) {
      container.innerHTML = '<div class="results-empty">Sin resultados.</div>';
      return;
    }

    let html = `
      <div class="tabla-wrapper-articulo">
        <table class="tabla-articulo">
          <thead>
            <tr>
              <th>Marca</th>
              <th>Rubro</th>
              <th>Código</th>
              <th>Descripción</th>
              <th>Talle</th>
              <th>Cantidad</th>
              <th>Precio</th>
              <th>Total</th>
            </tr>
          </thead>
          <tbody>
    `;

    items.forEach(item => {
      const marca = this.normalizarCampo(item.marca);
      const rubro = this.normalizarCampo(item.rubro);
      const codigo = this.normalizarCampo(item.codigo);
      const descripcion = this.normalizarCampo(item.descripcion);
      const precio = Number(item.precio || 0);

      (item.talles || []).forEach(t => {
        const talle = this.normalizarCampo(t.talle);
        const cantidad = Number(t.stock || 0);
        const total = cantidad * precio;

        html += `
          <tr>
            <td>${marca}</td>
            <td>${rubro}</td>
            <td>${codigo}</td>
            <td>${descripcion}</td>
            <td>${talle}</td>
            <td>${cantidad}</td>
            <td>$${this.formatNumber(precio)}</td>
            <td>$${this.formatNumber(total)}</td>
          </tr>
        `;
      });
    });

    html += `
          </tbody>
        </table>
      </div>
    `;

    container.innerHTML = html;
  },
  // ============================================================
  // INDICADORES / MÉTRICAS
  // ============================================================

  actualizarIndicadores(items) {
    const arr = items || [];

    const articulos = arr.length;

    let pares = 0;
    let stockNegativo = 0;
    let sinStock = 0;
    let valorizadoTotal = 0;

    arr.forEach((item) => {
      let stockItem = 0;

      (item.talles || []).forEach((t) => {
        const s = Number(t.stock || 0);
        stockItem += s;
        if (s < 0) stockNegativo += 1;
      });

      if (stockItem === 0) sinStock += 1;
      if (item.valorizado) valorizadoTotal += Number(item.valorizado || 0);
      if (stockItem > 0) pares += stockItem;
    });

    this.els.metricArticulos.textContent = this.formatNumber(articulos);
    this.els.metricPares.textContent = this.formatNumber(pares);
    this.els.metricAlertasNegativos.textContent =
      this.formatNumber(stockNegativo);
    this.els.metricAlertasCero.textContent = this.formatNumber(sinStock);
    this.els.metricValorizado.textContent =
      "$" + this.formatNumber(valorizadoTotal);
  },

  // ============================================================
  // COPIAR RESULTADOS
  // ============================================================

  copiarResultados() {
    if (!this.state.items.length) {
      this.showToast("No hay resultados para copiar");
      return;
    }

    let txt = "";
    this.state.items.forEach((item) => {
      txt += `${item.codigo} — ${item.descripcion} — ${item.marca} — ${item.rubro}\n`;
      (item.talles || []).forEach((t) => {
        txt += `  Talle ${t.talle}: ${t.stock}\n`;
      });
      txt += "\n";
    });

    navigator.clipboard.writeText(txt);
    this.showToast("Copiado");
  },

  // ============================================================
  // STOP TODO
  // ============================================================

  stopTodo() {
    if (this.state.currentAbort) this.state.currentAbort.abort();
    try {
      speechSynthesis.cancel();
    } catch (_) {}

    ORB.setError?.(false);
    ORB.setLoading?.(false);
    ORB.setSpeaking?.(false);

    this.setSearchStatus("Listo", "blue");
  },

  // ============================================================
  // VOZ — LECTURA DE RESULTADOS
  // ============================================================

  speakResultados() {
    if (!("speechSynthesis" in window)) return;
    if (!this.state.items.length) return;

    const top = this.state.items.slice(0, 5);
    let text = "Resultados de stock. ";

    top.forEach((item) => {
      text += `${item.descripcion || "Artículo"} de marca ${
        item.marca || "sin marca"
      }, rubro ${item.rubro || "sin rubro"}. `;
    });

    const utter = new SpeechSynthesisUtterance(text);
    utter.lang = "es-AR";

    speechSynthesis.cancel();
    speechSynthesis.speak(utter);
  },

  // ============================================================
  // LIMPIAR PANTALLA
  // ============================================================

  limpiarPantalla() {
    this.state.items = [];

    this.renderResultados([]);
    window.actualizarDashboard?.([]);
    this.actualizarIndicadores([]);

    if (this.els.resultsStatus)
      this.els.resultsStatus.textContent = "Sin resultados";

    if (this.els.searchInput)
      this.els.searchInput.value = "";

    this.setOrbIdle();
    this.setSearchStatus("Listo", "blue");
  },

  // ============================================================
  // EVENTOS DE UI
  // ============================================================

  conectarEventosUI() {
    // Botón aplicar filtros
    this.els.btnAplicarFiltros?.addEventListener("click", () => {
      this.buscarPorFiltros();
    });

    // ENTER en el input
    this.els.searchInput?.addEventListener("keydown", (e) => {
      if (e.key === "Enter") this.buscar();
    });

    // Botón copiar
    const btnCopiar = document.getElementById("btn-copiar");
    btnCopiar?.addEventListener("click", () => this.copiarResultados());

    // Botón limpiar
    const btnLimpiar = document.getElementById("btn-limpiar");
    btnLimpiar?.addEventListener("click", () => this.limpiarPantalla());

    // Botón STOP
    const btnStop = document.getElementById("btn-stop");
    btnStop?.addEventListener("click", () => this.stopTodo());

    // Toggle fuente de datos
    this.els.fuenteDatosToggle?.addEventListener("click", () => {
      this.els.fuenteDatosPanel?.classList.toggle("visible");
    });

    // ORB: clic inicia búsqueda
    const orb = document.getElementById("orb");
    orb?.addEventListener("click", () => this.buscar());
  },

  // ============================================================
  // INIT
  // ============================================================

  init() {
    this.setSearchStatus("Activando servidor…", "orange");
    this.warmUpLoop();
    this.conectarEventosUI();
  },
}; // ← CIERRE DEL OBJETO AppCore

// ============================================================
// INSTANCIA GLOBAL
// ============================================================

window.appCore = AppCore;

// ============================================================
// AUTO-INIT
// ============================================================

window.addEventListener("DOMContentLoaded", () => {
  appCore.init();
});
