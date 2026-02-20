// ============================================================
  // PARSER INTELIGENTE — Interpretación de la query
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

    // Marca detectada por coincidencia exacta
    for (const m of marcasNorm.sort((a, b) => b.length - a.length)) {
      if (tokens.includes(m)) marca = mapMarcas.get(m);
    }

    // Rubro detectado por coincidencia exacta
    for (const r of rubrosNorm.sort((a, b) => b.length - a.length)) {
      if (tokens.includes(r)) rubro = mapRubros.get(r);
    }

    // Rango de talles: "38-42", "T38 a T42"
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

    // Talle único: "T38"
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

    // Precio exacto
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

    // Código largo
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

    // Última unidad
    const esUltimo = /\bULTIM[OA]S?\b/.test(qUpper);

    // Stock negativo
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

    // Marca exacta
    const esMarcaExacta = marcasNorm.includes(qUpper);
    const esRubroExacto = rubrosNorm.includes(qUpper);

    let usarFiltros = esMarcaExacta || esRubroExacto;

    // Corrección por voz (si es una sola palabra)
    if (!usarFiltros && tokens.length === 1 && marcasNorm.length) {
      const marcaCorregida = this.corregirMarcaPorVoz(qUpper, mapMarcas);
      if (marcaCorregida) {
        marca = marcaCorregida;
        usarFiltros = true;
      }
    }

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
  // BÚSQUEDA PRINCIPAL
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

    // Cancelar búsqueda anterior
    if (this.state.currentAbort) this.state.currentAbort.abort();
    this.state.currentAbort = new AbortController();

    this.setSearchStatus("Buscando…", "blue");
    ORB.setError?.(false);
    ORB.setLoading?.(true);

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
  // BÚSQUEDA POR FILTROS
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
    ORB.setLoading?.(true);

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

      let items = (await res.json()).items || [];

      // ============================================================
      // FILTRO NUEVO: unidades > / < / = X
      // ============================================================
      const condEl = document.getElementById("filtro-stock-cond");
      const numEl = document.getElementById("filtro-stock-num");

      if (condEl && numEl && numEl.value !== "") {
        const cond = condEl.value;
        const num = Number(numEl.value || 0);

        items = items.filter((it) => {
          const total = (it.talles || []).reduce(
            (a, t) => a + Number(t.stock || 0),
            0
          );
          if (cond === ">") return total > num;
          if (cond === "<") return total < num;
          if (cond === "=") return total === num;
          return true;
        });
      }

      this.state.items = items;

      this.renderResultados(items);
      window.actualizarDashboard?.(items);
      this.actualizarIndicadores(items);

      this.setConnectionStatus(true);
      this.setOrbIdle();
      this.setSearchStatus("Conectado", "green");

      if (this.els.resultsStatus)
        this.els.resultsStatus.textContent = `${items.length} resultados`;
    } catch {
      this.setConnectionStatus(false);
      ORB.setError?.(true);
      this.setSearchStatus("Error de conexión", "red");

      if (this.els.resultsStatus)
        this.els.resultsStatus.textContent = "Error de conexión";
    } finally {
      ORB.setLoading?.(false);
    }
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
  // VISTA TABLA — autoajustada + scroll horizontal
  // ============================================================

  renderVistaTabla(items) {
    const container = this.els.vistaTabla;
    if (!container) return;

    let html = `
      <div class="tabla-wrapper" style="overflow-x:auto;-webkit-overflow-scrolling:touch;">
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
          ${this.normalizarCampo(item.codigo)} — ${this.normalizarCampo(item.descripcion)}
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
  // VISTA ARTÍCULO — detalle completo
  // ============================================================

  renderVistaArticulo(items) {
    const container = this.els.vistaArticulo;
    if (!container) return;

    if (!items.length) {
      container.innerHTML = '<div class="results-empty">Sin resultados.</div>';
      return;
    }

    let html = "";

    items.forEach((base) => {
      const talles = base.talles || [];

      if (!talles.length) {
        html += `
          <div class="detalle-header">
            <h2>${this.normalizarCampo(base.codigo)} — ${this.normalizarCampo(base.descripcion)}</h2>
            <p>${this.normalizarCampo(base.marca)} / ${this.normalizarCampo(base.rubro)}</p>
          </div>

          <div class="results-empty">Este artículo no tiene talles detallados.</div>
          <hr style="opacity:0.25;margin:14px 0;">
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

      const totalGeneral = talles.reduce((acc, t) => {
        const stock = Number(t.stock || 0);
        const precio = Number(base.precio || 0);
        return acc + stock * precio;
      }, 0);

      html += `
        <div class="detalle-header">
          <h2>${this.normalizarCampo(base.codigo)} — ${this.normalizarCampo(base.descripcion)}</h2>
          <p>${this.normalizarCampo(base.marca)} / ${this.normalizarCampo(base.rubro)}</p>
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

            <tr>
              <td colspan="3" style="text-align:right;font-weight:bold;">Total general</td>
              <td>$${this.formatNumber(totalGeneral)}</td>
            </tr>
          </tbody>
        </table>

        <hr style="opacity:0.25;margin:14px 0;">
      `;
    });

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
    let ultimaUnidad = 0;
    let valorizadoTotal = 0;

    arr.forEach((item) => {
      let stockItem = 0;

      (item.talles || []).forEach((t) => {
        const s = Number(t.stock || 0);
        stockItem += s;
        if (s < 0) stockNegativo += 1;
      });

      if (stockItem === 0) sinStock += 1;
      if (stockItem === 1) ultimaUnidad += 1;
      if (item.valorizado) valorizadoTotal += Number(item.valorizado || 0);
      if (stockItem > 0) pares += stockItem;
    });

    if (this.els.metricArticulos)
      this.els.metricArticulos.textContent = this.formatNumber(articulos);

    if (this.els.metricPares)
      this.els.metricPares.textContent = this.formatNumber(pares);

    if (this.els.metricAlertasNegativos)
      this.els.metricAlertasNegativos.textContent = this.formatNumber(stockNegativo);

    if (this.els.metricAlertasCero)
      this.els.metricAlertasCero.textContent = this.formatNumber(sinStock);

    if (this.els.metricValorizado)
      this.els.metricValorizado.textContent = "$" + this.formatNumber(valorizadoTotal);

    // Métrica nueva: última unidad
    const metricUltima = document.getElementById("metric-ultima-unidad-value");
    if (metricUltima) {
      metricUltima.textContent = this.formatNumber(ultimaUnidad);
    }
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

    try {
      const utter = new SpeechSynthesisUtterance(text);
      utter.lang = "es-AR";
      speechSynthesis.cancel();
      speechSynthesis.speak(utter);
    } catch (_) {}
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
  // EVENTOS DE UI (solo los necesarios)
  // ============================================================

  conectarEventosUI() {
    // Aplicar filtros
    this.els.btnAplicarFiltros?.addEventListener("click", () => {
      this.buscarPorFiltros();
    });

    // Enter en el input
    this.els.searchInput?.addEventListener("keydown", (e) => {
      if (e.key === "Enter") this.buscar();
    });

    // Copiar
    const btnCopiar = document.getElementById("btn-copiar");
    btnCopiar?.addEventListener("click", () => this.copiarResultados());

    // Limpiar
    const btnLimpiar = document.getElementById("btn-limpiar");
    btnLimpiar?.addEventListener("click", () => this.limpiarPantalla());

    // Stop
    const btnStop = document.getElementById("btn-stop");
    btnStop?.addEventListener("click", () => this.stopTodo());

    // Scanner interno (botón real)
    const btnScannerInterno1 = document.getElementById("btn-scanner-interno-1");
    btnScannerInterno1?.addEventListener("click", () => {
      if (window.startScannerInterno1) {
        window.startScannerInterno1((code) => {
          if (code) {
            this.els.searchInput.value = code;
            this.buscar();
          }
        });
      }
    });

    // Scanner externo preferido (botón real)
    const btnScannerExternoPreferido = document.getElementById("btn-scanner-externo-preferido");
    btnScannerExternoPreferido?.addEventListener("click", () => {
      if (window.startScannerExternoPreferido) {
        window.startScannerExternoPreferido((code) => {
          if (code) {
            this.els.searchInput.value = code;
            this.buscar();
          }
        });
      }
    });
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
