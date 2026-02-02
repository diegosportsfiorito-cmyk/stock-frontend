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
  orb: document.getElementById("orb"),
};

// ============================================================
// ORB ANIMATIONS
// ============================================================

function orbSetReady(active) {
  if (active) els.orb.classList.add("orb-ready");
  else els.orb.classList.remove("orb-ready");
}

function orbSetLoading(active) {
  els.orb.classList.remove("orb-error");
  if (active) els.orb.classList.add("orb-loading");
  else els.orb.classList.remove("orb-loading");
}

function orbSetError(active) {
  els.orb.classList.remove("orb-loading");
  if (active) els.orb.classList.add("orb-error");
  else els.orb.classList.remove("orb-error");
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
  els.connectionDot.classList.toggle("online", online);
}

function showLoading(show) {
  els.loadingOverlay.classList.toggle("visible", show);
}

function setResultsPresence(hasResults) {
  els.appContainer.classList.toggle("has-results", hasResults);
}

// ============================================================
// FILTROS
// ============================================================

function aplicarFiltros(items) {
  const { marca, rubro, talle } = state.filtros;
  return items.filter((item) => {
    if (marca && item.marca !== marca) return false;
    if (rubro && item.rubro !== rubro) return false;
    if (talle) {
      const tiene = item.talles.some((t) => String(t.talle) === String(talle));
      if (!tiene) return false;
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
    select.innerHTML = `<option value="">${placeholder}</option>`;
    [...values].sort().forEach((v) => {
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
  state.filtros.marca = els.filtroMarca.value;
  state.filtros.rubro = els.filtroRubro.value;
  state.filtros.talle = els.filtroTalle.value;

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
        Marca: ${item.marca || "—"} &nbsp; Rubro: ${item.rubro || "—"} &nbsp; Color: ${item.color || "—"}
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
// DASHBOARD
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
    labels: [...map.keys()],
    data: [...map.values()],
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
      `Marca: ${item.marca || "—"} | Rubro: ${item.rubro || "—"} | Color: ${item.color || "—"}`
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
  orbSetReady(false);
  renderResultados([]);
  renderMetricas([]);
  renderChart([]);
  els.resultsStatus.textContent = "Esperando consulta";
}

// ============================================================
// BÚSQUEDA PRINCIPAL (ORB ES EL BOTÓN)
// ============================================================

async function buscar() {
  const q = els.searchInput.value.trim();
  if (!q) return;

  state.lastQuery = q;
  state.soloStock = !!els.chkSoloStock.checked;

  els.resultsStatus.textContent = "Buscando...";
  setConnectionStatus(true);
  showLoading(true);
  orbSetLoading(true);

  try {
    const resp = await fetch(API_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        question: q,
        solo_stock: state.soloStock,
      }),
    });

    if (!resp.ok) throw new Error("Error en el servidor");

    const data = await resp.json();
    state.items = data.items || [];

    const filtrados = aplicarFiltros(state.items);
    renderResultados(filtrados);
    renderMetricas(filtrados);
    renderChart(filtrados);
    poblarFiltros(state.items);

    setConnectionStatus(true);
    orbSetError(false);
  } catch (e) {
    console.error(e);
    setConnectionStatus(false);
    els.resultsContainer.innerHTML =
      '<div class="results-error">Error de conexión</div>';
    els.resultsStatus.textContent = "Error de conexión";
    orbSetError(true);
    setTimeout(() => orbSetError(false), 2500);
  } finally {
    showLoading(false);
    orbSetLoading(false);
  }
}

// ============================================================
// MANOS LIBRES / STOP
// ============================================================

let recognition = null;
let manosLibresActivo = false;

function initVoice() {
  const SpeechRecognition =
    window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SpeechRecognition) return;

  recognition = new SpeechRecognition();
  recognition.lang = "es-AR";
  recognition.continuous = true;
  recognition.interimResults = false;

  recognition.onresult = (event) => {
    const last = event.results[event.results.length - 1];
    const text = last[0].transcript.trim();
    els.searchInput.value = text;
    orbSetReady(true);
    buscar();
  };

  recognition.onend = () => {
    if (manosLibresActivo) recognition.start();
  };
}

function toggleManosLibres(checked) {
  manosLibresActivo = checked;
  if (!recognition) return;
  if (checked) recognition.start();
  else recognition.stop();
}

function stopTodo() {
  manosLibresActivo = false;
  els.handsfreeToggle.checked = false;
  if (recognition) recognition.stop();
  window.speechSynthesis.cancel();
}

// ============================================================
// SCANNER (hook)
// ============================================================

function iniciarScanner() {
  alert("Scanner listo para integrar BarcodeDetector.");
}

// ============================================================
// EVENTOS
// ============================================================

function initEvents() {
  // ORB como botón principal
  els.orb.addEventListener("click", buscar);

  // Input activa modo READY
  els.searchInput.addEventListener("input", () => {
    const hasText = els.searchInput.value.trim().length > 0;
    orbSetReady(hasText);
  });

  els.btnClear.addEventListener("click", limpiarPantalla);
  els.btnCopy.addEventListener("click", copiarResultados);
  els.btnFiltros.addEventListener("click", () =>
    els.filtrosPanel.classList.toggle("visible")
  );

  els.filtroMarca.addEventListener("change", actualizarFiltrosDesdeUI);
  els.filtroRubro.addEventListener("change", actualizarFiltrosDesdeUI);
  els.filtroTalle.addEventListener("change", actualizarFiltrosDesdeUI);

  els.handsfreeToggle.addEventListener("change", (e) =>
    toggleManosLibres(e.target.checked)
  );

  els.btnStop.addEventListener("click", stopTodo);
  els.btnScan.addEventListener("click", iniciarScanner);
}

// ============================================================
// INIT
// ============================================================

function init() {
  initEvents();
  initVoice();
  renderResultados([]);
  renderMetricas([]);
  setConnectionStatus(false);
}

document.addEventListener("DOMContentLoaded", init);
