// build 20260210-3-XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX
// build 20260210-3-XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX
// ============================================================
// APP CORE — Motor inteligente + filtros estructurados
// ============================================================

const AppCore = {
  config: {
    backendUrl:
      localStorage.getItem("backendUrl") ||
      "https://stock-backend-1-0upi.onrender.com",
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

    metricAlertasNegativos: document.getElementById("metric-alertas-negativos"),
    metricAlertasCero: document.getElementById("metric-alertas-cero"),

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
  },

  // ============================================================
  // UTILIDADES
  // ============================================================

  normalizarCampo(valor) {
    if (!valor) return "—";
    const v = String(valor).trim().toUpperCase();
    if (v === "NAN" || v === "NULL" || v === "UNDEFINED") return "—";
    return valor;
  },

  normalizarTexto(valor) {
    if (!valor) return "";
    return valor
      .toString()
      .normalize("NFKD")
      .replace(/\u00A0/g, " ")
      .replace(/\s+/g, " ")
      .trim()
      .toUpperCase();
  },

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

  // ============================================================
  // TTS
  // ============================================================

  speakResultados() {
    if (!("speechSynthesis" in window)) return;
    if (!this.state.items || !this.state.items.length) return;

    const total = this.state.items.length;
    const pares = this.state.items.reduce(
      (acc, item) => acc + item.talles.reduce((s, t) => s + t.stock, 0),
      0
    );

    const primer = this.state.items[0];
    const texto = `Tengo ${total} resultados, con un total de ${pares} unidades. 
    Primer artículo: ${primer.descripcion || "sin descripción"}, marca ${
      primer.marca || "sin marca"
    }, rubro ${primer.rubro || "sin rubro"}.`;

    try {
      if (window.ORB && ORB.setSpeaking) ORB.setSpeaking(true);
      const utter = new SpeechSynthesisUtterance(texto);
      utter.lang = "es-AR";
      utter.onend = () => {
        if (window.ORB && ORB.setSpeaking) ORB.setSpeaking(false);
        else if (window.ORB && ORB.setReady) ORB.setReady(true);
      };
      window.speechSynthesis.cancel();
      window.speechSynthesis.speak(utter);
    } catch (e) {
      if (window.ORB && ORB.setReady) ORB.setReady(true);
    }
  },

  // ============================================================
  // INDICADORES
  // ============================================================

  actualizarIndicadores(items) {
    let articulos = items.length;
    let pares = 0;
    let valorizado = 0;

    let alertasNegativos = 0;
    let alertasCero = 0;

    items.forEach((item) => {
      let totalItem = 0;
      let todosCero = true;

      item.talles.forEach((t) => {
        pares += t.stock;
        totalItem += t.stock;
        if (t.stock !== 0) todosCero = false;
      });

      if (totalItem < 0) alertasNegativos++;
      else if (totalItem === 0 && todosCero) alertasCero++;

      valorizado += item.valorizado || 0;
    });

    this.els.metricArticulos.textContent = this.formatNumber(articulos);
    this.els.metricPares.textContent = this.formatNumber(pares);

    this.els.metricAlertasNegativos.textContent =
      this.formatNumber(alertasNegativos);
    this.els.metricAlertasCero.textContent = this.formatNumber(alertasCero);

    this.els.metricValorizado.textContent = `$${this.formatNumber(valorizado)}`;

    if (window.actualizarIndicadores) {
      window.actualizarIndicadores({
        articulos,
        pares,
        alertasNegativos,
        alertasCero,
        valorizado,
      });
    }
  },

  // ============================================================
  // RENDER RESULTADOS (TABLA)
  // ============================================================

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
            <td>${this.normalizarCampo(item.codigo)}</td>
            <td>${this.normalizarCampo(item.descripcion)}</td>
            <td>${this.normalizarCampo(item.marca)}</td>
            <td>${this.normalizarCampo(item.rubro)}</td>
            <td>${this.normalizarCampo(item.color)}</td>
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
        const norm = this.normalizarTexto(i.marca);
        if (norm && !mapMarcas.has(norm)) mapMarcas.set(norm, i.marca);
      }
      if (i.rubro) {
        const norm = this.normalizarTexto(i.rubro);
        if (norm && !mapRubros.has(norm)) mapRubros.set(norm, i.rubro);
      }
    });

    const marcasNorm = Array.from(mapMarcas.keys());
    const rubrosNorm = Array.from(mapRubros.keys());

    let marca = null;
    let rubro = null;
    let talleDesde = null;
    let talleHasta = null;

    const tokens = qUpper.split(/\W+/);

    const marcasOrdenadas = marcasNorm.sort((a, b) => b.length - a.length);
    for (const mNorm of marcasOrdenadas) {
      if (!mNorm) continue;
      if (tokens.includes(mNorm)) {
        marca = mapMarcas.get(mNorm);
        break;
      }
    }

    const rubrosOrdenados = rubrosNorm.sort((a, b) => b.length - a.length);
    for (const rNorm of rubrosOrdenados) {
      if (!rNorm) continue;
      if (tokens.includes(rNorm)) {
        rubro = mapRubros.get(rNorm);
        break;
      }
    }

    const matchRango = qUpper.match(/T?(\d+)\s*(?:A|-|\/)\s*T?(\d+)/);
    if (matchRango) {
      talleDesde = parseInt(matchRango[1]);
      talleHasta = parseInt(matchRango[2]);
      return {
        filtros_globales: true,
        marca,
        rubro,
        talleDesde,
        talleHasta,
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

    const usarFiltros =
      marca !== null || rubro !== null || talleDesde !== null || talleHasta !== null;

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
  // BÚSQUEDA PRINCIPAL
  // ============================================================

  async buscar(force = false) {
    const raw = this.els.searchInput.value.trim();
    if (!raw) {
      this.showToast("Ingresá un código o descripción");
      return;
    }

    if (!force && raw === this.state.lastQuery) return;
    this.state.lastQuery = raw;

    const parsed = this.interpretarQuery(raw);

    if (this.state.currentAbort) this.state.currentAbort.abort();
    this.state.currentAbort = new AbortController();

    if (window.ORB && ORB.setLoading) ORB.setLoading(true);
    this.els.resultsStatus.textContent = "Buscando…";

    const body = {
      question: parsed.question || "",
      solo_stock: this.els.chkSoloStock.checked,
      filtros_globales: parsed.filtros_globales,
      marca: parsed.marca,
      rubro: parsed.rubro,
      talleDesde: parsed.talleDesde,
      talleHasta: parsed.talleHasta,
      soloUltimo: parsed.soloUltimo,
      soloNegativo: parsed.soloNegativo,
    };

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
      if (window.actualizarDashboard) {
        window.actualizarDashboard(this.state.items);
      }
      this.actualizarIndicadores(this.state.items);

      this.setConnectionStatus(true);
      if (window.ORB && ORB.setReady) ORB.setReady(true);
      this.els.resultsStatus.textContent = `${this.state.items.length} resultados`;

      this.speakResultados();
    } catch (err) {
      if (err.name !== "AbortError") {
        this.setConnectionStatus(false);
        if (window.ORB && ORB.setError) ORB.setError(true);
        this.els.resultsStatus.textContent = "Error de conexión";
      }
    } finally {
      if (window.ORB && ORB.setLoading) ORB.setLoading(false);
    }
  },

  // ============================================================
  // FILTROS MANUALES
  // ============================================================

  actualizarFiltrosDesdeUI() {
    this.state.filtros.marca = this.els.filtroMarca.value || null;
    this.state.filtros.rubro = this.els.filtroRubro.value || null;
    this.state.filtros.talleDesde = this.els.filtroTalleDesde.value || null;
    this.state.filtros.talleHasta = this.els.filtroTalleHasta.value || null;
  },

  async buscarPorFiltros() {
    this.actualizarFiltrosDesdeUI();

    if (this.state.currentAbort) this.state.currentAbort.abort();
    this.state.currentAbort = new AbortController();

    const body = {
      question: "",
      solo_stock: this.els.chkSoloStock.checked,
      filtros_globales: true,
      marca: this.state.filtros.marca,
      rubro: this.state.filtros.rubro,
      talleDesde: this.state.filtros.talleDesde,
      talleHasta: this.state.filtros.talleHasta,
      soloUltimo: false,
      soloNegativo: false,
    };

    if (window.ORB && ORB.setLoading) ORB.setLoading(true);
    this.els.resultsStatus.textContent = "Filtrando…";

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
      if (window.actualizarDashboard) {
        window.actualizarDashboard(this.state.items);
      }
      this.actualizarIndicadores(this.state.items);

      this.setConnectionStatus(true);
      if (window.ORB && ORB.setReady) ORB.setReady(true);
      this.els.resultsStatus.textContent = `${this.state.items.length} resultados`;

      this.speakResultados();
    } catch (err) {
      if (err.name !== "AbortError") {
        this.setConnectionStatus(false);
        if (window.ORB && ORB.setError) ORB.setError(true);
        this.els.resultsStatus.textContent = "Error de conexión";
      }
    } finally {
      if (window.ORB && ORB.setLoading) ORB.setLoading(false);
    }
  },

  // ============================================================
  // RESUMEN CATÁLOGO
  // ============================================================

  calcularResumenCatalogo() {
    const items = this.state.catalogItems || [];
    const marcas = new Set();
    const rubros = new Set();
    let articulos = items.length;
    let stockTotal = 0;
    let stockNegativo = 0;

    items.forEach((item) => {
      if (item.marca) marcas.add(item.marca);
      if (item.rubro) rubros.add(item.rubro);

      let totalItem = 0;
      (item.talles || []).forEach((t) => {
        stockTotal += t.stock;
        totalItem += t.stock;
      });

      if (totalItem < 0) stockNegativo++;
    });

    const resumen = {
      archivo: "Catálogo remoto",
      fecha: new Date().toLocaleString("es-AR"),
      marcas: marcas.size,
      rubros: rubros.size,
      articulos,
      stockTotal,
      stockNegativo,
    };

    this.state.resumenCatalogo = resumen;

    if (this.els.fuenteArchivo) {
      this.els.fuenteArchivo.textContent = resumen.archivo;
      this.els.fuenteFecha.textContent = resumen.fecha;
      this.els.fuenteMarcas.textContent = resumen.marcas;
      this.els.fuenteRubros.textContent = resumen.rubros;
      this.els.fuenteArticulos.textContent = resumen.articulos;
      this.els.fuenteStockTotal.textContent = this.formatNumber(
        resumen.stockTotal
      );
      this.els.fuenteStockNegativo.textContent = resumen.stockNegativo;
    }
  },
  // ============================================================
  // CATÁLOGO
  // ============================================================

  async cargarCatalogo() {
    try {
      const body = {
        question: "",
        solo_stock: false,
        filtros_globales: false,
        marca: null,
        rubro: null,
        talleDesde: null,
        talleHasta: null,
        soloUltimo: false,
        soloNegativo: false,
      };

      const res = await fetch(this.config.backendUrl + "/query", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      const data = await res.json();
      this.state.catalogItems = data.items || [];

      const marcasSet = new Map();
      const rubrosSet = new Map();

      this.state.catalogItems.forEach((i) => {
        if (i.marca) {
          const norm = this.normalizarTexto(i.marca);
          if (norm && !marcasSet.has(norm)) marcasSet.set(norm, i.marca);
        }
        if (i.rubro) {
          const norm = this.normalizarTexto(i.rubro);
          if (norm && !rubrosSet.has(norm)) rubrosSet.set(norm, i.rubro);
        }
      });

      const marcas = Array.from(marcasSet.values());
      const rubros = Array.from(rubrosSet.values());

      this.els.filtroMarca.innerHTML =
        '<option value="">Marca</option>' +
        marcas.map((m) => `<option value="${m}">${m}</option>`).join("");

      this.els.filtroRubro.innerHTML =
        '<option value="">Rubro</option>' +
        rubros.map((r) => `<option value="${r}">${r}</option>`).join("");

      this.calcularResumenCatalogo();
      this.setConnectionStatus(true);
    } catch (err) {
      this.setConnectionStatus(false);
    }
  },

  // ============================================================
  // AUTOCOMPLETADO
  // ============================================================

  getAutocompleteSuggestions(term) {
    const q = this.normalizarTexto(term);
    if (!q || !this.state.catalogItems.length) return [];

    const sugerencias = new Set();

    this.state.catalogItems.forEach((item) => {
      const marca = this.normalizarTexto(item.marca);
      const rubro = this.normalizarTexto(item.rubro);
      const desc = this.normalizarTexto(item.descripcion);
      const codigo = this.normalizarTexto(item.codigo);

      if (marca && marca.includes(q)) sugerencias.add(item.marca);
      if (rubro && rubro.includes(q)) sugerencias.add(item.rubro);
      if (desc && desc.includes(q)) sugerencias.add(item.descripcion);
      if (codigo && codigo.includes(q)) sugerencias.add(item.codigo);
    });

    return Array.from(sugerencias).slice(0, 10);
  },

  // ============================================================
  // UTILIDADES UI
  // ============================================================

  limpiarPantalla() {
    this.els.searchInput.value = "";
    this.state.lastQuery = "";
    this.els.resultsContainer.innerHTML = "";
    this.els.resultsStatus.textContent = "Esperando consulta";
    if (window.ORB && ORB.setReady) ORB.setReady(false);
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
    if (window.ORB && ORB.setError) ORB.setError(true);
    this.els.resultsStatus.textContent = "Cancelado";
  },

  // ============================================================
  // CONFIG ADMIN (CORREGIDO Y BLINDADO)
  // ============================================================

  aplicarConfigAdmin() {
    let url = localStorage.getItem("backendUrl");
    const modo = localStorage.getItem("modoDefecto");

    if (url) {
      url = url.trim();

      // Eliminar /query o /query/ si está presente
      url = url.replace(/\/query\/?$/i, "");

      // Eliminar barras finales repetidas
      url = url.replace(/\/+$/g, "");

      this.config.backendUrl = url;
    }

    // Si no hay URL válida, usar la correcta por defecto
    if (!this.config.backendUrl) {
      this.config.backendUrl = "https://stock-backend-1-0upi.onrender.com";
    }

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

    // Debug explícito
    console.log("BACKEND URL EFECTIVA:", this.config.backendUrl);
  },
  // ============================================================
  // INIT
  // ============================================================

  async init() {
    this.aplicarConfigAdmin();

    if (window.initUI) {
      window.initUI(this);
    }

    // 5 clics en el ORB para abrir admin
    const orb = document.getElementById("orb-core");
    const adminPanel = document.getElementById("admin-panel");
    if (orb && adminPanel) {
      let orbClicks = 0;
      orb.addEventListener("click", () => {
        orbClicks++;
        if (orbClicks >= 5) {
          adminPanel.style.display = "flex";
          orbClicks = 0;
        }
        setTimeout(() => {
          orbClicks = 0;
        }, 1200);
      });
    }

    // Toggle fuente de datos
    if (this.els.fuenteDatosToggle && this.els.fuenteDatosPanel) {
      this.els.fuenteDatosToggle.addEventListener("click", () => {
        this.els.fuenteDatosPanel.classList.toggle("visible");
      });
    }

    await this.cargarCatalogo();

    if (window.ORB && ORB.setReady) ORB.setReady(false);
    this.els.resultsStatus.textContent = "Esperando consulta";
  },
};

window.AppCore = AppCore;

document.addEventListener("DOMContentLoaded", () => {
  AppCore.init();
});
