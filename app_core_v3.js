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

  // ============================================================
  // RESPUESTA POR VOZ (RESUMEN + TOP ITEMS)
  // ============================================================

  speakResultados() {
    if (!("speechSynthesis" in window)) return;

    const synth = window.speechSynthesis;
    synth.cancel();

    let texto = "";

    if (!this.state.items || !this.state.items.length) {
      texto = "No se encontraron resultados.";
    } else {
      const totalArticulos = this.state.items.length;
      let totalUnidades = 0;

      this.state.items.forEach((it) => {
        const sum = (it.talles || []).reduce(
          (a, t) => a + Number(t.stock || 0),
          0
        );
        totalUnidades += sum;
      });

      texto = `Encontré ${totalArticulos} artículos, con un total de ${totalUnidades} unidades. `;

      const top = this.state.items.slice(0, 5);
      top.forEach((item) => {
        texto += `${item.descripcion || "Artículo"} de marca ${
          item.marca || "sin marca"
        }, rubro ${item.rubro || "sin rubro"}. `;
      });
    }

    const utter = new SpeechSynthesisUtterance(texto);
    utter.lang = "es-AR";
    utter.rate = 1;
    utter.pitch = 1;

    if (window.ORB?.setSpeaking) {
      ORB.setSpeaking(true);
      utter.onend = () => {
        ORB.setSpeaking(false);
      };
    }

    synth.speak(utter);
  },

  // ============================================================
  // BÚSQUEDA PRINCIPAL
  // ============================================================

  async buscar() {
    const q = this.els.searchInput?.value.trim() || "";
    if (!q) {
      this.showToast("Ingresá un artículo, marca o rubro");
      return;
    }

    this.state.lastQuery = q;

    const parsed = this.interpretarQuery(q);

    if (this.state.currentAbort) {
      this.state.currentAbort.abort();
      this.state.currentAbort = null;
    }

    const controller = new AbortController();
    this.state.currentAbort = controller;

    this.setSearchStatus("Buscando…", "blue");
    ORB.setLoading?.(true);

    try {
      const res = await fetch(this.config.backendUrl + "/query", {
        method: "POST",
        body: JSON.stringify(parsed),
        headers: { "Content-Type": "application/json" },
        signal: controller.signal,
      });

      if (!res.ok) throw new Error("Error en backend");

      const data = await res.json();

      this.state.items = data.items || [];

      this.renderResultados(this.state.items);
      this.actualizarIndicadores(this.state.items);

      this.setSearchStatus("Listo", "green");
      this.setConnectionStatus(true);

      this.speakResultados();

    } catch (e) {
      if (e.name === "AbortError") return;

      this.setSearchStatus("Error", "red");
      this.setConnectionStatus(false);
      ORB.setError?.(true);

      this.showToast("Error de conexión");
    } finally {
      ORB.setLoading?.(false);
      this.state.currentAbort = null;
    }
  },

  // ============================================================
  // BÚSQUEDA POR FILTROS
  // ============================================================

  async buscarPorFiltros() {
    const marca = this.els.filtroMarca?.value || "";
    const rubro = this.els.filtroRubro?.value || "";
    const talleDesde = this.els.filtroTalleDesde?.value || "";
    const talleHasta = this.els.filtroTalleHasta?.value || "";
    const soloStock = this.els.chkSoloStock?.checked || false;

    const payload = {
      filtros_globales: true,
      marca: marca || null,
      rubro: rubro || null,
      talleDesde: talleDesde ? Number(talleDesde) : null,
      talleHasta: talleHasta ? Number(talleHasta) : null,
      soloUltimo: false,
      soloNegativo: false,
      soloStock,
      question: "",
    };

    if (this.state.currentAbort) {
      this.state.currentAbort.abort();
      this.state.currentAbort = null;
    }

    const controller = new AbortController();
    this.state.currentAbort = controller;

    this.setSearchStatus("Filtrando…", "blue");
    ORB.setLoading?.(true);

    try {
      const res = await fetch(this.config.backendUrl + "/query", {
        method: "POST",
        body: JSON.stringify(payload),
        headers: { "Content-Type": "application/json" },
        signal: controller.signal,
      });

      if (!res.ok) throw new Error("Error en backend");

      const data = await res.json();

      this.state.items = data.items || [];

      this.renderResultados(this.state.items);
      this.actualizarIndicadores(this.state.items);

      this.setSearchStatus("Listo", "green");
      this.setConnectionStatus(true);

      this.speakResultados();

    } catch (e) {
      if (e.name === "AbortError") return;

      this.setSearchStatus("Error", "red");
      this.setConnectionStatus(false);
      ORB.setError?.(true);

      this.showToast("Error de conexión");
    } finally {
      ORB.setLoading?.(false);
      this.state.currentAbort = null;
    }
  },
  // ============================================================
  // RENDERIZADO DE RESULTADOS
  // ============================================================

  renderResultados(items) {
    if (!this.els.resultsContainer) return;

    const vista = this.state.vistaActual;

    if (!items || !items.length) {
      this.els.resultsContainer.innerHTML = `
        <div class="no-results">
          <p>No se encontraron resultados</p>
        </div>`;
      return;
    }

    if (vista === "tabla") {
      this.renderTabla(items);
    } else if (vista === "articulo") {
      this.renderArticulo(items);
    } else {
      this.renderTarjetas(items);
    }
  },

  // ============================================================
  // RENDER TABLA
  // ============================================================

  renderTabla(items) {
    this.els.resultsContainer.innerHTML = `
      <table class="tabla-stock">
        <thead>
          <tr>
            <th>Artículo</th>
            <th>Marca</th>
            <th>Rubro</th>
            <th>Talles</th>
            <th>Total</th>
          </tr>
        </thead>
        <tbody>
          ${items
            .map((it) => {
              const total = (it.talles || []).reduce(
                (a, t) => a + Number(t.stock || 0),
                0
              );
              const talles = (it.talles || [])
                .map((t) => `${t.talle}: ${t.stock}`)
                .join(" • ");

              return `
                <tr>
                  <td>${it.descripcion || "—"}</td>
                  <td>${it.marca || "—"}</td>
                  <td>${it.rubro || "—"}</td>
                  <td>${talles}</td>
                  <td class="${total <= 0 ? "negativo" : ""}">${total}</td>
                </tr>`;
            })
            .join("")}
        </tbody>
      </table>
    `;
  },

  // ============================================================
  // RENDER TARJETAS
  // ============================================================

  renderTarjetas(items) {
    this.els.resultsContainer.innerHTML = items
      .map((it) => {
        const total = (it.talles || []).reduce(
          (a, t) => a + Number(t.stock || 0),
          0
        );

        const talles = (it.talles || [])
          .map(
            (t) =>
              `<span class="talle ${t.stock <= 0 ? "neg" : ""}">
                ${t.talle}: ${t.stock}
              </span>`
          )
          .join("");

        return `
          <div class="card-item">
            <h3>${it.descripcion || "—"}</h3>
            <p class="marca">${it.marca || "—"}</p>
            <p class="rubro">${it.rubro || "—"}</p>
            <div class="talles">${talles}</div>
            <div class="total ${total <= 0 ? "negativo" : ""}">
              Total: ${total}
            </div>
          </div>
        `;
      })
      .join("");
  },

  // ============================================================
  // RENDER ARTÍCULO (vista detallada)
  // ============================================================

  renderArticulo(items) {
    const it = items[0];
    if (!it) {
      this.els.resultsContainer.innerHTML = `<p>No hay artículo para mostrar</p>`;
      return;
    }

    const total = (it.talles || []).reduce(
      (a, t) => a + Number(t.stock || 0),
      0
    );

    const talles = (it.talles || [])
      .map(
        (t) =>
          `<div class="fila-talle ${t.stock <= 0 ? "neg" : ""}">
            <span>${t.talle}</span>
            <span>${t.stock}</span>
          </div>`
      )
      .join("");

    this.els.resultsContainer.innerHTML = `
      <div class="articulo-detalle">
        <h2>${it.descripcion || "—"}</h2>
        <p><strong>Marca:</strong> ${it.marca || "—"}</p>
        <p><strong>Rubro:</strong> ${it.rubro || "—"}</p>

        <h3>Talles</h3>
        <div class="talles-detalle">${talles}</div>

        <h3>Total</h3>
        <p class="total ${total <= 0 ? "negativo" : ""}">${total}</p>
      </div>
    `;
  },

  // ============================================================
  // INDICADORES
  // ============================================================

  actualizarIndicadores(items) {
    if (!items) return;

    const totalArt = items.length;
    let totalPares = 0;
    let negativos = 0;
    let ceros = 0;
    let valorizado = 0;

    items.forEach((it) => {
      const sum = (it.talles || []).reduce(
        (a, t) => a + Number(t.stock || 0),
        0
      );

      totalPares += sum;
      if (sum < 0) negativos++;
      if (sum === 0) ceros++;

      valorizado += Number(it.valorizado || 0);
    });

    if (this.els.metricArticulos)
      this.els.metricArticulos.textContent = this.formatNumber(totalArt);
    if (this.els.metricPares)
      this.els.metricPares.textContent = this.formatNumber(totalPares);
    if (this.els.metricAlertasNegativos)
      this.els.metricAlertasNegativos.textContent = negativos;
    if (this.els.metricAlertasCero)
      this.els.metricAlertasCero.textContent = ceros;
    if (this.els.metricValorizado)
      this.els.metricValorizado.textContent = "$ " + this.formatNumber(valorizado);
  },

  // ============================================================
  // COPIAR RESULTADOS
  // ============================================================

  copiarResultados() {
    const txt = this.els.resultsContainer?.innerText || "";
    navigator.clipboard.writeText(txt);
    this.showToast("Copiado");
  },

  // ============================================================
  // LIMPIAR
  // ============================================================

  limpiarPantalla() {
    if (this.els.searchInput) this.els.searchInput.value = "";
    if (this.els.resultsContainer) this.els.resultsContainer.innerHTML = "";
    this.setSearchStatus("Listo", "green");
  },

  // ============================================================
  // STOP
  // ============================================================

  stopTodo() {
    if (this.state.currentAbort) {
      this.state.currentAbort.abort();
      this.state.currentAbort = null;
    }
    window.speechSynthesis?.cancel();
    this.setSearchStatus("Listo", "green");
  },

  // ============================================================
  // INIT
  // ============================================================

  init() {
    this.setSearchStatus("Activando servidor…", "orange");
    this.warmUpLoop();
  },
};

// Exponer global
window.appCore = AppCore;
