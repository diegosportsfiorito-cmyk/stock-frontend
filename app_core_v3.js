// build 20260210-6
// ============================================================
// APP CORE — Motor inteligente + filtros estructurados
// ============================================================

const AppCore = {
  config: {
    backendUrl: "https://stock-backend-1-0upi.onrender.com",
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
    retryTimeout: null,
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
  // TTS
  // ============================================================

  speakResultados() {
    if (!("speechSynthesis" in window)) return;
    if (!this.state.items.length) return;

    const total = this.state.items.length;
    const pares = this.state.items.reduce(
      (acc, item) => acc + item.talles.reduce((s, t) => s + t.stock, 0),
      0
    );

    const p = this.state.items[0];
    const texto = `Tengo ${total} resultados, con un total de ${pares} unidades. 
    Primer artículo: ${p.descripcion || "sin descripción"}, marca ${
      p.marca || "sin marca"
    }, rubro ${p.rubro || "sin rubro"}.`;

    try {
      ORB.setSpeaking?.(true);
      const u = new SpeechSynthesisUtterance(texto);
      u.lang = "es-AR";
      u.onend = () => {
        ORB.setSpeaking?.(false);
        this.setOrbIdle();
      };
      speechSynthesis.cancel();
      speechSynthesis.speak(u);
    } catch {
      this.setOrbIdle();
    }
  },

  // ============================================================
  // INDICADORES
  // ============================================================

  actualizarIndicadores(items) {
    let articulos = items.length;
    let pares = 0;
    let valorizado = 0;
    let neg = 0;
    let cero = 0;

    items.forEach((item) => {
      let totalItem = 0;
      let todosCero = true;

      item.talles.forEach((t) => {
        pares += t.stock;
        totalItem += t.stock;
        if (t.stock !== 0) todosCero = false;
      });

      if (totalItem < 0) neg++;
      else if (totalItem === 0 && todosCero) cero++;

      valorizado += item.valorizado || 0;
    });

    this.els.metricArticulos.textContent = this.formatNumber(articulos);
    this.els.metricPares.textContent = this.formatNumber(pares);
    this.els.metricAlertasNegativos.textContent = this.formatNumber(neg);
    this.els.metricAlertasCero.textContent = this.formatNumber(cero);
    this.els.metricValorizado.textContent = `$${this.formatNumber(valorizado)}`;
  },

  // ============================================================
  // RENDER TABLA
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
          </tr>`;
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
      </div>`;

    cont.innerHTML = html;
  },
  // ============================================================
  // RENDER TARJETAS
  // ============================================================

  renderResultadosTarjetas(items) {
    const cont = this.els.resultsContainer;
    cont.innerHTML = "";

    if (!items.length) {
      cont.innerHTML = '<div class="results-empty">Sin resultados.</div>';
      return;
    }

    let totalStock = 0;
    const frag = document.createDocumentFragment();

    items.forEach((item) => {
      const card = document.createElement("div");
      card.className = "result-item";

      const titulo = document.createElement("div");
      titulo.className = "result-title";
      titulo.textContent = `${this.normalizarCampo(item.descripcion)} (${this.normalizarCampo(
        item.codigo
      )})`;

      const sub = document.createElement("div");
      sub.className = "result-sub";
      sub.textContent = `${this.normalizarCampo(item.marca)} — ${this.normalizarCampo(
        item.rubro
      )} — ${this.normalizarCampo(item.color)}`;

      const tallesDiv = document.createElement("div");
      tallesDiv.className = "result-talles";

      tallesDiv.textContent = item.talles
        .map((t) => {
          totalStock += t.stock;
          return `Talle ${t.talle}: ${t.stock}`;
        })
        .join(" | ");

      const preciosDiv = document.createElement("div");
      preciosDiv.className = "result-precios";
      preciosDiv.innerHTML = `
        <span class="precio-publico">$${this.formatNumber(item.precio || 0)}</span>
        ${
          item.valorizado
            ? `<span class="precio-valorizado">Valorizado: $${this.formatNumber(
                item.valorizado
              )}</span>`
            : ""
        }`;

      card.appendChild(titulo);
      card.appendChild(sub);
      card.appendChild(tallesDiv);
      card.appendChild(preciosDiv);

      frag.appendChild(card);
    });

    const totalDiv = document.createElement("div");
    totalDiv.className = "results-status";
    totalDiv.textContent = `Total unidades: ${this.formatNumber(totalStock)}`;

    cont.appendChild(frag);
    cont.appendChild(totalDiv);
  },

  // ============================================================
  // RENDER SEGÚN MODO
  // ============================================================

  renderResultados(items) {
    this.state.modoTabla
      ? this.renderResultadosTabla(items)
      : this.renderResultadosTarjetas(items);
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

    if (tokens.length === 1 && marcasNorm.includes(qUpper)) {
      return {
        filtros_globales: true,
        marca: mapMarcas.get(qUpper),
        rubro: null,
        talleDesde: null,
        talleHasta: null,
        soloUltimo: false,
        soloNegativo: false,
        question: "",
      };
    }

    if (tokens.length === 1 && rubrosNorm.includes(qUpper)) {
      return {
        filtros_globales: true,
        marca: null,
        rubro: mapRubros.get(qUpper),
        talleDesde: null,
        talleHasta: null,
        soloUltimo: false,
        soloNegativo: false,
        question: "",
      };
    }

    for (const m of marcasNorm.sort((a, b) => b.length - a.length)) {
      if (tokens.includes(m)) {
        marca = mapMarcas.get(m);
        break;
      }
    }

    for (const r of rubrosNorm.sort((a, b) => b.length - a.length)) {
      if (tokens.includes(r)) {
        rubro = mapRubros.get(r);
        break;
      }
    }

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
      if (this.els.resultsStatus)
        this.els.resultsStatus.textContent = `${this.state.items.length} resultados`;
    } catch (err) {
      if (err.name !== "AbortError") {
        this.setConnectionStatus(false);
        ORB.setError?.(true);
        if (this.els.resultsStatus)
          this.els.resultsStatus.textContent = "Error de conexión";

        clearTimeout(this.state.retryTimeout);
        this.state.retryTimeout = setTimeout(() => this.cargarCatalogo(), 3000);
      }
    } finally {
      ORB.setLoading?.(false);
    }
  },

  // ============================================================
  // CARGA DEL CATÁLOGO (CORREGIDO: /catalog)
  // ============================================================

  async cargarCatalogo() {
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
    } catch (err) {
      this.setConnectionStatus(false);
      clearTimeout(this.state.retryTimeout);
      this.state.retryTimeout = setTimeout(() => this.cargarCatalogo(), 3000);
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
  },

  // ============================================================
  // INIT
  // ============================================================

  init() {
    this.cargarCatalogo();

    this.els.btnAplicarFiltros?.addEventListener("click", () =>
      this.buscarPorFiltros()
    );

    this.els.searchInput?.addEventListener("keydown", (e) => {
      if (e.key === "Enter") this.buscar();
    });
  },
};

window.addEventListener("DOMContentLoaded", () => AppCore.init());
