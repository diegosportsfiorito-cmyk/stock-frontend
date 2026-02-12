// ============================================================
// APP CORE — Motor inteligente + warm-up + indicador visual
// Versión corregida y optimizada 2026-02-10
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
    modoTabla: false,
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
  // AUTOCOMPLETE — NUEVO
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

      // Fuente de datos
      this.els.fuenteArchivo.textContent = data.resumen?.archivo || "—";
      this.els.fuenteFecha.textContent = data.resumen?.fecha || "—";
      this.els.fuenteMarcas.textContent = data.resumen?.marcas || "—";
      this.els.fuenteRubros.textContent = data.resumen?.rubros || "—";
      this.els.fuenteArticulos.textContent = data.resumen?.articulos || "—";
      this.els.fuenteStockTotal.textContent = data.resumen?.stock_total || "—";
      this.els.fuenteStockNegativo.textContent =
        data.resumen?.stock_negativo || "—";

      // Poblar combos
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
  // PARSER INTELIGENTE
  // ============================================================

  interpretarQuery(raw) {
    const q = raw.trim();
    const qUpper = this.normalizarTexto(q);

    const mapMarcas = new Map();
    const mapRubros = new Map();

    this.state.catalogItems.forEach((i) => {
      if (i.marca) mapMarcas.set(this.normalizarTexto(i.marca), i.marca);
      if (i.rubro) mapRubros.set(this.normalizarTexto(i.rubro), i.rubro);
    });

    const marcasNorm = [...mapMarcas.keys()];
    const rubrosNorm = [...mapRubros.keys()];

    let marca = null;
    let rubro = null;

    const tokens = qUpper.split(/\W+/);

    for (const m of marcasNorm.sort((a, b) => b.length - a.length)) {
      if (tokens.includes(m)) marca = mapMarcas.get(m);
    }

    for (const r of rubrosNorm.sort((a, b) => b.length - a.length)) {
      if (tokens.includes(r)) rubro = mapRubros.get(r);
    }

    // Talles
    const matchRango = qUpper.match(/T?(\d+)\s*(?:A|-|\/)\s*T?(\d+)/);
    if (matchRango) {
      return {
        filtros_globales: true,
        marca,
        rubro,
        talleDesde: parseInt(matchRango[1]),
        talleHasta: parseInt(matchRango[2]),
        soloUltimo: false,
        soloNegativo: false,
        question: "",
      };
    }

    const matchTalle = qUpper.match(/^T?(\d{1,3})$/);
    if (matchTalle) {
      const t = parseInt(matchTalle[1]);
      return {
        filtros_globales: true,
        marca,
        rubro,
        talleDesde: t,
        talleHasta: t,
        soloUltimo: false,
        soloNegativo: false,
        question: "",
      };
    }

    // Precio
    const matchPrecio = qUpper.match(/^(?:P|\$)?(\d{2,6})$/);
    if (matchPrecio) {
      return {
        filtros_globales: false,
        marca: null,
        rubro: null,
        talleDesde: null,
        talleHasta: null,
        soloUltimo: false,
        soloNegativo: false,
        question: matchPrecio[1],
      };
    }

    // Código
    if (/^\d[\d\- ]{6,14}\d$/.test(qUpper)) {
      return {
        filtros_globales: false,
        marca: null,
        rubro: null,
        talleDesde: null,
        talleHasta: null,
        soloUltimo: false,
        soloNegativo: false,
        question: qUpper.replace(/[\s\-]/g, ""),
      };
    }

    // Últimos / negativos
    const esUltimo = /\bULTIM[OA]S?\b/.test(qUpper);
    const esNegativo = /\bNEGATIV[OA]S?\b/.test(qUpper);

    if (esUltimo || esNegativo) {
      return {
        filtros_globales: true,
        marca,
        rubro,
        talleDesde: null,
        talleHasta: null,
        soloUltimo: esUltimo,
        soloNegativo: esNegativo,
        question: "",
      };
    }

    const usarFiltros = marca || rubro;

    return {
      filtros_globales: usarFiltros,
      marca,
      rubro,
      talleDesde: null,
      talleHasta: null,
      soloUltimo: false,
      soloNegativo: false,
      question: usarFiltros ? "" : q,
    };
  },
    } finally {
      ORB.setLoading?.(false);
    }
  },

  // ============================================================
  // BÚSQUEDA POR FILTROS
  // ============================================================

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
      filtros_globales: true,
      marca: this.state.filtros.marca || null,
      rubro: this.state.filtros.rubro || null,
      talleDesde: this.state.filtros.talleDesde
        ? parseInt(this.state.filtros.talleDesde)
        : null,
      talleHasta: this.state.filtros.talleHasta
        ? parseInt(this.state.filtros.talleHasta)
        : null,
      soloUltimo: false,
      soloNegativo: false,
      solo_stock: this.els.chkSoloStock.checked || false,
    };

    if (this.state.currentAbort) this.state.currentAbort.abort();
    this.state.currentAbort = new AbortController();

    this.setSearchStatus("Buscando…", "blue");
    ORB.setLoading?.(true);
    this.els.resultsStatus.textContent = "Buscando…";

    try {
      const res = await fetch(this.config.backendUrl + "/query", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
        signal: this.state.currentAbort.signal,
      });

      if (!res.ok) throw new Error();

      const data = await res.json();
      this.state.items = data.items || [];

      this.renderResultados(this.state.items);
      window.actualizarDashboard?.(this.state.items);
      this.actualizarIndicadores(this.state.items);

      this.setConnectionStatus(true);
      this.setOrbIdle();

      this.setSearchStatus("Conectado", "green");
      this.els.resultsStatus.textContent = `${this.state.items.length} resultados`;
    } catch {
      this.setConnectionStatus(false);
      ORB.setError?.(true);
      this.setSearchStatus("Error de conexión", "red");
      this.els.resultsStatus.textContent = "Error de conexión";
    } finally {
      ORB.setLoading?.(false);
    }
  },

  // ============================================================
  // RENDER RESULTADOS
  // ============================================================

  renderResultados(items) {
    const container = this.els.resultsContainer;
    if (!container) return;

    container.innerHTML = "";

    if (!items || !items.length) {
      container.innerHTML =
        '<div class="results-empty">Sin resultados.</div>';
      return;
    }

    if (this.state.modoTabla) {
      // Tabla
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
      return;
    }

    // Tarjetas
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

    // Toggle tabla / tarjetas
    const btnTabla = document.getElementById("btn-ver-tabla");
    const btnTarjetas = document.getElementById("btn-ver-tarjetas");

    btnTabla?.addEventListener("click", () => {
      this.state.modoTabla = true;
      btnTabla.classList.add("active");
      btnTarjetas.classList.remove("active");
      this.renderResultados(this.state.items);
    });

    btnTarjetas?.addEventListener("click", () => {
      this.state.modoTabla = false;
      btnTarjetas.classList.add("active");
      btnTabla.classList.remove("active");
      this.renderResultados(this.state.items);
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
};

// ============================================================
// INSTANCIA GLOBAL
// ============================================================

window.appCore = AppCore;

window.addEventListener("DOMContentLoaded", () => {
  appCore.init();
});
