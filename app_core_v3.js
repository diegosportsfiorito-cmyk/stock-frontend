// build 20260210-REBUILD
// ============================================================
// APP CORE — Motor inteligente + warm-up + indicador visual
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
  // INDICADOR VISUAL
  // ============================================================

  setSearchStatus(text, color = "blue") {
    if (!this.els.searchStatus) return;
    this.els.searchStatus.textContent = text;
    this.els.searchStatus.className = "search-status " + color;
  },

  // ============================================================
  // UTILIDADES
  // ============================================================

  normalizarCampo(v) {
    if (!v) return "—";
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
    if (!this.els.connectionDot) return;
    this.els.connectionDot.classList.toggle("online", ok);
  },

  setOrbIdle() {
    if (!window.ORB) return;
    ORB.setError?.(false);
    ORB.setLoading?.(false);
  },

  // ============================================================
  // WARM-UP PROFESIONAL DEL BACKEND
  // ============================================================

  async pingBackend() {
    this.setSearchStatus("Activando servidor…", "orange");
    this.setConnectionStatus(false);

    try {
      const res = await fetch(this.config.backendUrl + "/ping");
      if (!res.ok) throw new Error("Backend no listo");

      this.setSearchStatus("Conectado", "green");
      this.setConnectionStatus(true);
      this.state.warmingUp = false;
      return true;

    } catch (err) {
      this.setSearchStatus("Activando servidor…", "orange");
      this.setConnectionStatus(false);
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

  // ============================================================
  // PARSER INTELIGENTE
  // ============================================================

  interpretarQuery(raw) {
    const q = raw.trim();
    const qUpper = this.normalizarTexto(q);

    const mapMarcas = new Map();
    const mapRubros = new Map();

    this.state.catalogItems.forEach((i) => {
      if (i.marca) {
        const n = this.normalizarTexto(i.marca);
        if (!mapMarcas.has(n)) mapMarcas.set(n, i.marca);
      }
      if (i.rubro) {
        const n = this.normalizarTexto(i.rubro);
        if (!mapRubros.has(n)) mapRubros.set(n, i.rubro);
      }
    });

    const marcasNorm = [...mapMarcas.keys()];
    const rubrosNorm = [...mapRubros.keys()];

    let marca = null;
    let rubro = null;
    let talleDesde = null;
    let talleHasta = null;

    const tokens = qUpper.split(/\W+/);
    // Marca parcial
    for (const m of marcasNorm.sort((a, b) => b.length - a.length)) {
      if (tokens.includes(m)) {
        marca = mapMarcas.get(m);
        break;
      }
    }

    // Rubro parcial
    for (const r of rubrosNorm.sort((a, b) => b.length - a.length)) {
      if (tokens.includes(r)) {
        rubro = mapRubros.get(r);
        break;
      }
    }

    // Rango de talles
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

    // Talle único
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

    const usarFiltros = marca || rubro || talleDesde || talleHasta;

    return {
      filtros_globales: usarFiltros,
      marca,
      rubro,
      talleDesde,
      talleHasta,
      soloUltimo: false,
      soloNegativo: false,
      question: usarFiltros ? "" : q,
    };
  },

  // ============================================================
  // FILTROS MANUALES
  // ============================================================

  actualizarFiltrosDesdeUI() {
    this.state.filtros.marca = this.els.filtroMarca?.value || null;
    this.state.filtros.rubro = this.els.filtroRubro?.value || null;
    this.state.filtros.talleDesde = this.els.filtroTalleDesde?.value || null;
    this.state.filtros.talleHasta = this.els.filtroTalleHasta?.value || null;
  },

  async buscarPorFiltros() {
    this.actualizarFiltrosDesdeUI();

    const body = {
      question: "",
      solo_stock: this.els.chkSoloStock?.checked || false,
      filtros_globales: true,
      marca: this.state.filtros.marca,
      rubro: this.state.filtros.rubro,
      talleDesde: this.state.filtros.talleDesde
        ? parseInt(this.state.filtros.talleDesde)
        : null,
      talleHasta: this.state.filtros.talleHasta
        ? parseInt(this.state.filtros.talleHasta)
        : null,
      soloUltimo: false,
      soloNegativo: false,
    };

    if (this.state.currentAbort) this.state.currentAbort.abort();
    this.state.currentAbort = new AbortController();

    this.setSearchStatus("Buscando…", "blue");
    ORB.setError?.(false);
    ORB.setLoading?.(true);
    if (this.els.resultsStatus) this.els.resultsStatus.textContent = "Buscando…";

    try {
      const res = await fetch(this.config.backendUrl + "/query", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
        signal: this.state.currentAbort.signal,
      });

      if (!res.ok) throw new Error("Error en servidor");

      const data = await res.json();
      this.state.items = data.items || [];

      this.renderResultados(this.state.items);
      window.actualizarDashboard?.(this.state.items);
      this.actualizarIndicadores(this.state.items);

      this.setConnectionStatus(true);
      this.setOrbIdle();

      this.setSearchStatus("Conectado", "green");
      if (this.els.resultsStatus)
        this.els.resultsStatus.textContent = `${this.state.items.length} resultados`;

    } catch (err) {
      if (err.name !== "AbortError") {
        this.setConnectionStatus(false);
        ORB.setError?.(true);

        this.setSearchStatus("Error de conexión", "red");
        if (this.els.resultsStatus)
          this.els.resultsStatus.textContent = "Error de conexión";

        clearTimeout(this.state.retryTimeout);
        this.state.retryTimeout = setTimeout(() => this.warmUpLoop(), 2000);
      }
    } finally {
      ORB.setLoading?.(false);
    }
  },
  // ============================================================
  // CARGA DEL CATÁLOGO
  // ============================================================

  async cargarCatalogo() {
    this.setSearchStatus("Cargando catálogo…", "blue");

    try {
      const res = await fetch(this.config.backendUrl + "/catalog");
      if (!res.ok) throw new Error("Error catálogo");

      const data = await res.json();

      this.state.catalogItems = data.items || [];
      this.state.resumenCatalogo = data.resumen || null;

      if (this.els.fuenteArchivo) this.els.fuenteArchivo.textContent = data.resumen?.archivo || "—";
      if (this.els.fuenteFecha) this.els.fuenteFecha.textContent = data.resumen?.fecha || "—";
      if (this.els.fuenteMarcas) this.els.fuenteMarcas.textContent = data.resumen?.marcas || "—";
      if (this.els.fuenteRubros) this.els.fuenteRubros.textContent = data.resumen?.rubros || "—";
      if (this.els.fuenteArticulos) this.els.fuenteArticulos.textContent = data.resumen?.articulos || "—";
      if (this.els.fuenteStockTotal) this.els.fuenteStockTotal.textContent = data.resumen?.stock_total || "—";
      if (this.els.fuenteStockNegativo) this.els.fuenteStockNegativo.textContent = data.resumen?.stock_negativo || "—";

      this.setConnectionStatus(true);
      this.setSearchStatus("Conectado", "green");

    } catch (err) {
      this.setConnectionStatus(false);
      this.setSearchStatus("Error de conexión", "red");

      clearTimeout(this.state.retryTimeout);
      this.state.retryTimeout = setTimeout(() => this.warmUpLoop(), 2000);
    }
  },

  // ============================================================
  // LIMPIAR PANTALLA
  // ============================================================

  limpiarPantalla() {
    this.state.items = [];
    this.renderResultados([]);
    window.actualizarDashboard?.([]);
    this.actualizarIndicadores([]);
    if (this.els.resultsStatus) this.els.resultsStatus.textContent = "Sin resultados";
    this.setOrbIdle();
    this.setSearchStatus("Listo", "blue");
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
      item.talles.forEach((t) => {
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
    speechSynthesis.cancel();
    ORB.setError?.(false);
    ORB.setLoading?.(false);
    ORB.setSpeaking?.(false);
    this.setSearchStatus("Listo", "blue");
  },

  // ============================================================
  // BUSCAR (motor principal reconstruido)
  // ============================================================

  async buscar() {
    const raw = this.els.searchInput?.value || "";
    const q = raw.trim();

    if (!q) {
      this.limpiarPantalla();
      return;
    }

    this.state.lastQuery = q;

    const parsed = this.interpretarQuery(q);

    const body = {
      question: parsed.question,
      filtros_globales: parsed.filtros_globales,
      marca: parsed.marca,
      rubro: parsed.rubro,
      talleDesde: parsed.talleDesde,
      talleHasta: parsed.talleHasta,
      soloUltimo: parsed.soloUltimo,
      soloNegativo: parsed.soloNegativo,
      solo_stock: this.els.chkSoloStock?.checked || false,
    };

    if (this.state.currentAbort) this.state.currentAbort.abort();
    this.state.currentAbort = new AbortController();

    this.setSearchStatus("Buscando…", "blue");
    ORB.setError?.(false);
    ORB.setLoading?.(true);
    if (this.els.resultsStatus) this.els.resultsStatus.textContent = "Buscando…";

    try {
      const res = await fetch(this.config.backendUrl + "/query", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
        signal: this.state.currentAbort.signal,
      });

      if (!res.ok) throw new Error("Error en servidor");

      const data = await res.json();
      this.state.items = data.items || [];

      this.renderResultados(this.state.items);
      window.actualizarDashboard?.(this.state.items);
      this.actualizarIndicadores(this.state.items);

      this.setConnectionStatus(true);
      this.setOrbIdle();

      this.setSearchStatus("Conectado", "green");
      if (this.els.resultsStatus)
        this.els.resultsStatus.textContent = `${this.state.items.length} resultados`;

      if (window.ORB?.isVoiceMode?.()) {
        this.speakResultados();
      }

    } catch (err) {
      if (err.name !== "AbortError") {
        this.setConnectionStatus(false);
        ORB.setError?.(true);

        this.setSearchStatus("Error de conexión", "red");
        if (this.els.resultsStatus)
          this.els.resultsStatus.textContent = "Error de conexión";

        clearTimeout(this.state.retryTimeout);
        this.state.retryTimeout = setTimeout(() => this.warmUpLoop(), 2000);
      }
    } finally {
      ORB.setLoading?.(false);
    }
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
