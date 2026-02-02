// ============================================================
// APP.JS — LÓGICA PRINCIPAL DE STOCK IA PRO
// ============================================================

const API_URL = "https://stock-backend-1-0upi.onrender.com/query";

const state = {
  items: [],
  lastQuery: "",
  soloStock: false,
  filtros: {
    marca: "",
    rubro: "",
    talle: "",
  },
  chart: null,
};

const els = {
  appContainer: document.querySelector(".app-container"),
  searchInput: document.getElementById("search-input"),
  btnSearch: document.getElementById("btn-search"),
  chkSoloStock: document.getElementById("chk-solo-stock"),
  metricArticulos: document.getElementById("metric-articulos"),
  metricPares: document.getElementById("metric-pares"),
  metricAlertas: document.getElementById("metric-alertas"),
  metricValorizado: document.getElementById("metric-valorizado"),
  resultsContainer: document.getElementById("results-container"),
  resultsStatus: document.getElementById("results-status"),
  btnClear: document.getElementById("btn-clear"),
  btnCopy: document.getElementById("btn-copy"),
  btnFiltros: document.getElementById("btn-filtros"),
  filtrosPanel: document.getElementById("filtros-panel"),
  filtroMarca: document.getElementById("filtro-marca"),
  filtroRubro: document.getElementById("filtro-rubro"),
  filtroTalle: document.getElementById("filtro-talle"),
  connectionDot: document.querySelector(".connection-dot"),
  handsfreeToggle: document.getElementById("handsfree-toggle"),
  btnStop: document.getElementById("btn-stop"),
  btnScan: document.getElementById("btn-scan"),
  stockChartCanvas: document.getElementById("stockChart"),
  loadingOverlay: document.getElementById("loading-overlay"),
  orb: document.querySelector(".orb"),
};

// ============================================================
// ORB ANIMATIONS
// ============================================================

function orbSetLoading(active) {
  els.orb.classList.remove("orb-error");
  if (active) {
    els.orb.classList.add("orb-loading");
  } else {
    els.orb.classList.remove("orb-loading");
  }
}

function orbSetError(active) {
  els.orb.classList.remove("orb-loading");
  if (active) {
    els.orb.classList.add("orb-error");
  } else {
    els.orb.classList.remove("orb-error");
  }
}

// ============================================================
// UTILIDADES
// ============================================================

function formatNumber(n) {
  if (typeof n !== "number") return n;
  return n.toLocaleString("es-AR");
}

function setConnectionStatus(online) {
  if (!els.connectionDot) return;
  if (online) {
    els.connectionDot.classList.add("online");
  } else {
    els.connectionDot.classList.remove("online");
  }
}

function showLoading(show) {
  if (!els.loadingOverlay) return;
  if (show) {
    els.loadingOverlay.classList.add("visible");
  } else {
    els.loadingOverlay.classList.remove("visible");
  }
}

function setResultsPresence(hasResults) {
  if (!els.appContainer) return;
  if (hasResults) {
    els.appContainer.classList.add("has-results");
  } else {
    els.appContainer.classList.remove("has-results");
  }
}

// ============================================================
// FILTROS
// ============================================================

function aplicarFiltros(items) {
  const { marca, rubro, talle } = state.filtros;
  return items.filter((item) => {
    if (marca && item.marca && item.marca !== marca) return false;
    if (rubro && item.rubro && item.rubro !== rubro) return false;
    if (talle) {
      const tieneTalle = item.talles.some((t) => String(t.talle) === String(talle));
      if (!tieneTalle) return false;
    }
    return true;
  });
}

function poblarFiltros(items) {
  const marcas = new Set();
  const rubros = new Set();
  const talles = new Set();

  items.forEach((item) => {
    if (item.marca) marcas.add(item.marca);
    if (item.rubro) rubros.add(item.rubro);
    item.talles.forEach((t) => talles.add(String(t.talle)));
  });

  function fill(select, values, placeholder) {
    if (!select) return;
    select.innerHTML = "";
    const opt = document.createElement("option");
    opt.value = "";
    opt.textContent = placeholder;
    select.appendChild(opt);

    Array.from(values)
      .sort()
      .forEach((v) => {
        const o = document.createElement("option");
        o.value = v;
        o.textContent = v;
        select.appendChild(o);
      });
  }

  fill(els.filtroMarca, marcas, "Marca");
  fill(els.filtroRubro, rubros, "Rubro");
  fill(els.filtroTalle, talles, "Talle");
}

function actualizarFiltrosDesdeUI() {
  state.filtros.marca = els.filtroMarca.value || "";
  state.filtros.rubro = els.filtroRubro.value || "";
  state.filtros.talle = els.filtroTalle.value || "";

  const filtrados = aplicarFiltros(state.items);
  renderResultados(filtrados);
  renderMetricas(filtrados);
  renderChart(filtrados);
}

// ============================================================
// MÉTRICAS
// ============================================================

function calcularMetricas(items) {
  let articulos = items.length;
  let pares = 0;
  let alertas = 0;
  let valorizado = 0;

  items.forEach((item) => {
    let totalStock = 0;
    item.talles.forEach((t) => {
      totalStock += t.stock;
      if (t.stock <= 0) alertas++;
    });
    pares += totalStock;
    valorizado += item.valorizado;
  });

  return { articulos, pares, alertas, valorizado };
}

function renderMetricas(items) {
  const { articulos, pares, alertas, valorizado } = calcularMetricas(items);

  els.metricArticulos.textContent = formatNumber(articulos);
  els.metricPares.textContent = formatNumber(pares);
  els.metricAlertas.textContent = formatNumber(alertas);
  els.metricValorizado.textContent = "$" + formatNumber(valorizado);
}

// ============================================================
// RESULTADOS
// ============================================================

function renderResultados(items) {
  els.resultsContainer.innerHTML = "";

  if (!items.length) {
    els.resultsContainer.innerHTML =
      '<div class="results-empty">Sin resultados.</div>';
    setResultsPresence(false);
    els.resultsStatus.textContent = "Sin resultados";
    return;
  }

  setResultsPresence(true);
  els.resultsStatus.textContent = `${items.length} artículos`;

  items.forEach((item) => {
    const div = document.createElement("div");
    div.className = "result-item";

    const tallesStr = item.talles
      .map((t) => `<span>${t.talle}: ${t.stock}</span>`)
      .join("");

    div.innerHTML = `
      <div class="result-header-line">
        <div>
          <div class="result-code">${item.codigo}</div>
          <div class="result-desc">${item.descripcion}</div>
        </div>
        <div class="result-price">$${formatNumber(item.precio)}</div>
      </div>

      <div class="result-meta">
        Marca: ${item.marca || "—"} &nbsp; Rubro: ${item.rubro || "—"} &nbsp; Color: ${
      item.color || "—"
    }
      </div>

      <div class="result-talles">${tallesStr}</div>

      <div class="result-total">
        Valorizado total: $${formatNumber(item.valorizado)}
      </div>
    `;

    els.resultsContainer.appendChild(div);
  });
}

// ============================================================
// DASHBOARD (CHART)
// ============================================================

function buildChartData(items) {
  const map = new Map();
  items.forEach((item) => {
    item.talles.forEach((t) => {
      const key = String(t.talle);
      map.set(key, (map.get(key) || 0) + t.stock);
    });
  });

  return {
    labels: Array.from(map.keys()),
    data: Array.from(map.values()),
  };
}

function renderChart(items) {
  if (!els.stockChartCanvas || typeof Chart === "undefined") return;

  const { labels, data } = buildChartData(items);

  if (state.chart) {
    state.chart.destroy();
    state.chart = null;
  }

  if (!labels.length) return;

  state.chart = new Chart(els.stockChartCanvas, {
    type: "pie",
    data: {
      labels,
      datasets: [
        {
          data,
          backgroundColor: [
            "#4f46e5",
            "#22c55e",
            "#f97316",
            "#e11d48",
            "#06b6d4",
            "#a855f7",
            "#facc15",
            "#0ea5e9",
          ],
          borderWidth: 0,
        },
      ],
    },
    options: {
      plugins: {
        legend: {
          labels: {
            color: "#e5e7eb",
            font: { size: 10 },
          },
        },
      },
    },
  });
}

// ============================================================
// COPIAR RESULTADOS
// ============================================================

function buildCopyText(items) {
  if (!items.length) return "Sin resultados.";

  let lines = [];
  lines.push(`Consulta: ${state.lastQuery}`);
  lines.push("");

  items.forEach((item) => {
    lines.push(`${item.codigo} - ${item.descripcion}`);
    lines.push(`Precio: $${formatNumber(item.precio)}`);
    lines.push(
      `Marca: ${item.marca || "—"} | Rubro: ${item.rubro || "—"} | Color: ${
        item.color || "—"
      }`
    );
    const talles = item.talles.map((t) => `${t.talle}: ${t.stock}`).join(" | ");
    lines.push(`Talles: ${talles}`);
    lines.push(`Valorizado total: $${formatNumber(item.valorizado)}`);
    lines.push("--------------------------------------------------");
  });

  return lines.join("\n");
}

async function copiarResultados() {
  try {
    const text = buildCopyText(aplicarFiltros(state.items));
    await navigator.clipboard.writeText(text);
    alert("Resultados copiados.");
  } catch (e) {
    alert("No se pudo copiar.");
  }
}

// ============================================================
// LIMPIAR
// ============================================================

function limpiarPantalla() {
  state.items = [];
  state.lastQuery = "";
  els.searchInput.value = "";
  renderResultados([]);
  renderMetricas([]);
  renderChart([]);
  els
