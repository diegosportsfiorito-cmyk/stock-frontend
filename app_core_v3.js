// ============================================================
// APP CORE — Motor inteligente + warm-up + indicador visual
// Versión corregida y optimizada 2026-02-10 (autocompletado + filtros)
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
    vistaActual: "tarjeta",
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
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/-/g, " ")
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
    ORB.setError(false);
    ORB.setLoading(false);
    ORB.setReady();
  },

  // ============================================================
  // AUTOCOMPLETE — INTELIGENTE
  // ============================================================

  getAutocompleteSuggestions(term) {
    const q = this.normalizarTexto(term);
    if (!q || !this.state.catalogItems.length) return [];

    const exactArticulo = [];
    const exactMarca = [];
    const exactRubro = [];
    const exactDescripcion = [];

    const prefijoArticulo = [];
    const prefijoMarca = [];
    const prefijoRubro = [];
    const prefijoDescripcion = [];

    const parcialArticulo = [];
    const parcialMarca = [];
    const parcialRubro = [];
    const parcialDescripcion = [];

    const pushUnique = (arr, value) => {
      if (!value) return;
      if (!arr.includes(value)) arr.push(value);
    };

    this.state.catalogItems.forEach((item) => {
      const descRaw = item.descripcion || "";
      const marcaRaw = item.marca || "";
      const rubroRaw = item.rubro || "";
      const codigoRaw = item.codigo || "";

      const descN = this.normalizarTexto(descRaw);
      const marcaN = this.normalizarTexto(marcaRaw);
      const rubroN = this.normalizarTexto(rubroRaw);
      const codigoN = this.normalizarTexto(codigoRaw);

      const startsWith = (txt) => txt && txt.startsWith(q);
      const contains = (txt) => txt && txt.includes(q);

      // ARTÍCULO
      if (codigoN === q || descN === q) {
        pushUnique(exactArticulo, descRaw || codigoRaw);
      } else if (startsWith(codigoN) || startsWith(descN)) {
        pushUnique(prefijoArticulo, descRaw || codigoRaw);
      } else if (contains(codigoN) || contains(descN)) {
        pushUnique(parcialArticulo, descRaw || codigoRaw);
      }

      // MARCA
      if (marcaN) {
        if (marcaN === q) pushUnique(exactMarca, marcaRaw);
        else if (startsWith(marcaN)) pushUnique(prefijoMarca, marcaRaw);
        else if (contains(marcaN)) pushUnique(parcialMarca, marcaRaw);
      }

      // RUBRO
      if (rubroN) {
        if (rubroN === q) pushUnique(exactRubro, rubroRaw);
        else if (startsWith(rubroN)) pushUnique(prefijoRubro, rubroRaw);
        else if (contains(rubroN)) pushUnique(parcialRubro, rubroRaw);
      }

      // DESCRIPCIÓN
      if (descN) {
        if (descN === q) pushUnique(exactDescripcion, descRaw);
        else if (startsWith(descN)) pushUnique(prefijoDescripcion, descRaw);
        else if (contains(descN)) pushUnique(parcialDescripcion, descRaw);
      }
    });

    const ordered = [
      ...exactArticulo,
      ...exactMarca,
      ...exactRubro,
      ...exactDescripcion,
      ...prefijoArticulo,
      ...prefijoMarca,
      ...prefijoRubro,
      ...prefijoDescripcion,
      ...parcialArticulo,
      ...parcialMarca,
      ...parcialRubro,
      ...parcialDescripcion,
    ];

    const final = [];
    const seen = new Set();
    for (const v of ordered) {
      if (!v) continue;
      if (seen.has(v)) continue;
      seen.add(v);
      final.push(v);
      if (final.length >= 12) break;
    }

    return final;
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
      if (this.els.fuenteArchivo)
        this.els.fuenteArchivo.textContent = data.resumen?.archivo || "—";
      if (this.els.fuenteFecha)
        this.els.fuenteFecha.textContent = data.resumen?.fecha || "—";
      if (this.els.fuenteMarcas)
        this.els.fuenteMarcas.textContent = data.resumen?.marcas || "—";
      if (this.els.fuenteRubros)
        this.els.fuenteRubros.textContent = data.resumen?.rubros || "—";
      if (this.els.fuenteArticulos)
        this.els.fuenteArticulos.textContent = data.resumen?.articulos || "—";
      if (this.els.fuenteStockTotal)
        this.els.fuenteStockTotal.textContent = data.resumen?.stock_total || "—";
      if (this.els.fuenteStockNegativo)
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

    if (this.els.filtroMarca)
      this.els.filtroMarca.innerHTML =
        `<option value="">Marca</option>` +
        [...marcas].sort().map((m) => `<option>${m}</option>`).join("");

    if (this.els.filtroRubro)
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

    const tokens = qUpper.split(/\W+/).filter(Boolean);

    for (const m of marcasNorm.sort((a, b) => b.length - a.length)) {
      if (tokens.includes(m)) marca = mapMarcas.get(m);
    }

    for (const r of rubrosNorm.sort((a, b) => b.length - a.length)) {
      if (tokens.includes(r)) rubro = mapRubros.get(r);
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

    const esMarcaExacta = marcasNorm.includes(qUpper);
    const esRubroExacto = rubrosNorm.includes(qUpper);
    const usarFiltros = esMarcaExacta || esRubroExacto;

    return {
      filtros_globales: usarFiltros,
      marca: usarFiltros ? marca : null,
      rubro: usarFiltros ? rubro : null,
      talleDesde: null,
      talleHasta: null,
      soloUltimo: false,
      soloNegativo: false,
      question: usarFiltros ? "" : q,
    };
  },
};
// ============================================================
// APP CORE — PARTE 2/2
// ============================================================

// ============================================================
// BÚSQUEDA PRINCIPAL
// ============================================================

AppCore.buscar = async function () {
  const raw = this.els.searchInput?.value || "";
  const q = raw.trim();

  if (!q) {
    this.limpiarPantalla();
    return;
  }

  this.state.lastQuery = q;

  const parsed = this.interpretarQuery(q);

  const body = {
    question: parsed.question || "",
    filtros_globales: !!parsed.filtros_globales,
    marca: parsed.marca || null,
    rubro: parsed.rubro || null,
    talleDesde: parsed.talleDesde || null,
    talleHasta: parsed.talleHasta || null,
    soloUltimo: parsed.soloUltimo || false,
    soloNegativo: parsed.soloNegativo || false,
    solo_stock: this.els.chkSoloStock?.checked || false,
  };

  if (this.state.currentAbort) this.state.currentAbort.abort();
  this.state.currentAbort = new AbortController();

  this.setSearchStatus("Buscando…", "blue");
  ORB.setError(false);
  ORB.setLoading(true);
  if (this.els.resultsStatus)
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
    this.setSearchStatus("Conectado", "green");
    if (this.els.resultsStatus)
      this.els.resultsStatus.textContent = `${this.state.items.length} resultados`;

    if (window.ORB?.isVoiceMode?.()) {
      this.speakResultados();
    }
  } catch (err) {
    if (err.name !== "AbortError") {
      this.setConnectionStatus(false);
      ORB.setError(true);

      this.setSearchStatus("Error de conexión", "red");
      if (this.els.resultsStatus)
        this.els.resultsStatus.textContent = "Error de conexión";

      clearTimeout(this.state.retryTimeout);
      this.state.retryTimeout = setTimeout(() => this.warmUpLoop(), 2000);
    }
  } finally {
    ORB.setLoading(false);
    ORB.setReady();
  }
};

// ============================================================
// BÚSQUEDA POR FILTROS
// ============================================================

AppCore.actualizarFiltrosDesdeUI = function () {
  this.state.filtros.marca = this.els.filtroMarca?.value || null;
  this.state.filtros.rubro = this.els.filtroRubro?.value || null;
  this.state.filtros.talleDesde = this.els.filtroTalleDesde?.value || null;
  this.state.filtros.talleHasta = this.els.filtroTalleHasta?.value || null;
};

AppCore.buscarPorFiltros = async function () {
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
    solo_stock: this.els.chkSoloStock?.checked || false,
  };

  if (this.state.currentAbort) this.state.currentAbort.abort();
  this.state.currentAbort = new AbortController();

  this.setSearchStatus("Buscando…", "blue");
  ORB.setLoading(true);
  if (this.els.resultsStatus)
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
    this.setSearchStatus("Conectado", "green");
    if (this.els.resultsStatus)
      this.els.resultsStatus.textContent = `${this.state.items.length} resultados`;
  } catch {
    this.setConnectionStatus(false);
    ORB.setError(true);
    this.setSearchStatus("Error de conexión", "red");
    if (this.els.resultsStatus)
      this.els.resultsStatus.textContent = "Error de conexión";
  } finally {
    ORB.setLoading(false);
    ORB.setReady();
  }
};

// ============================================================
// RENDER RESULTADOS (3 VISTAS)
// ============================================================

AppCore.renderResultados = function (items) {
  const vTabla = this.els.vistaTabla;
  const vTarjeta = this.els.vistaTarjeta;
  const vArticulo = this.els.vistaArticulo;

  if (!vTabla || !vTarjeta || !vArticulo) return;

  // limpiar autocomplete
  const autoList = document.getElementById("autocomplete-list");
  if (autoList) autoList.innerHTML = "";

  if (!items || !items.length) {
    vTabla.innerHTML = '<div class="results-empty">Sin resultados.</div>';
    vTarjeta.innerHTML = '<div class="results-empty">Sin resultados.</div>';
    vArticulo.innerHTML = '<div class="results-empty">Sin resultados.</div>';
    return;
  }

  this.renderVistaTabla(items);
  this.renderVistaTarjeta(items);
  this.renderVistaArticulo(items);
};

AppCore.renderVistaTabla = function (items) {
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
};

AppCore.renderVistaTarjeta = function (items) {
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
};

AppCore.renderVistaArticulo = function (items) {
  const container = this.els.vistaArticulo;
  if (!container) return;

  if (!items.length) {
    container.innerHTML = '<div class="results-empty">Sin resultados.</div>';
    return;
  }

  const base = items[0];
  const talles = base.talles || [];

  if (!talles.length) {
    container.innerHTML = `
      <div class="detalle-header">
        <h2>${this.normalizarCampo(base.codigo)} — ${this.normalizarCampo(
      base.descripcion
    )}</h2>
        <p>${this.normalizarCampo(base.marca)} / ${this.normalizarCampo(
      base.rubro
    )}</p>
      </div>
      <div class="results-empty">Este artículo no tiene talles detallados.</div>
    `;
    return;
  }

  const rowsHtml = talles
    .map((t) => {
      const stock = Number(t.stock || 0);
      const precio = Number(base.precio || 0);
      const total = stock * precio;
      return `
      <tr>
        <td>${this.normalizarCampo(t.talle)}</td>
        <td>${stock}</td>
        <td>$${this.formatNumber(precio)}</td>
        <td>$${this.formatNumber(total)}</td>
      </tr>
    `;
    })
    .join("");

  const html = `
    <div class="detalle-header">
      <h2>${this.normalizarCampo(base.codigo)} — ${this.normalizarCampo(
    base.descripcion
  )}</h2>
      <p>${this.normalizarCampo(base.marca)} / ${this.normalizarCampo(
    base.rubro
  )}</p>
    </div>

    <table class="tabla-talles">
      <thead>
        <tr>
          <th>Talle</th>
          <th>Cantidad</th>
          <th>Precio</th>
          <th>Total</th>
        </tr>
      </thead>
      <tbody>
        ${rowsHtml}
      </tbody>
    </table>
  `;

  container.innerHTML = html;
};

// ============================================================
// INDICADORES / MÉTRICAS
// ============================================================

AppCore.actualizarIndicadores = function (items) {
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

  if (this.els.metricArticulos)
    this.els.metricArticulos.textContent = this.formatNumber(articulos);
  if (this.els.metricPares)
    this.els.metricPares.textContent = this.formatNumber(pares);
  if (this.els.metricAlertasNegativos)
    this.els.metricAlertasNegativos.textContent =
      this.formatNumber(stockNegativo);
  if (this.els.metricAlertasCero)
    this.els.metricAlertasCero.textContent = this.formatNumber(sinStock);
  if (this.els.metricValorizado)
    this.els.metricValorizado.textContent =
      "$" + this.formatNumber(valorizadoTotal);
};

// ============================================================
// COPIAR RESULTADOS
// ============================================================

AppCore.copiarResultados = function () {
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
};

// ============================================================
// STOP TODO
// ============================================================

AppCore.stopTodo = function () {
  if (this.state.currentAbort) this.state.currentAbort.abort();
  try {
    speechSynthesis.cancel();
  } catch (_) {}
  ORB.setError(false);
  ORB.setLoading(false);
  ORB.setSpeaking(false);
  ORB.setReady();
  this.setSearchStatus("Listo", "blue");
};

// ============================================================
// VOZ — LECTURA DE RESULTADOS
// ============================================================

AppCore.speakResultados = function () {
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

  ORB.setSpeaking(true);

  utter.onend = () => {
    ORB.setSpeaking(false);
  };

  speechSynthesis.cancel();
  speechSynthesis.speak(utter);
};

// ============================================================
// LIMPIAR PANTALLA
// ============================================================

AppCore.limpiarPantalla = function () {
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
};

// ============================================================
// EVENTOS DE UI (solo los que NO maneja UI ENGINE V4)
// ============================================================

AppCore.conectarEventosUI = function () {
  // Filtros
  this.els.btnAplicarFiltros?.addEventListener("click", () => {
    this.buscarPorFiltros();
  });

  // Fuente de datos
  this.els.fuenteDatosToggle?.addEventListener("click", () => {
    this.els.fuenteDatosPanel?.classList.toggle("visible");
  });

  // Enter en input (UI ENGINE también lo maneja, pero este es fallback)
  this.els.searchInput?.addEventListener("keydown", (e) => {
    if (e.key === "Enter") this.buscar();
  });
};

// ============================================================
// INIT
// ============================================================

AppCore.init = function () {
  this.setSearchStatus("Activando servidor…", "orange");
  this.warmUpLoop();
  this.conectarEventosUI();
};

// ============================================================
// INSTANCIA GLOBAL
// ============================================================

window.appCore = AppCore;

window.addEventListener("DOMContentLoaded", () => {
  appCore.init();
});
