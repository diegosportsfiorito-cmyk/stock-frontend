// app.js

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
  toggleDark: document.getElementById("toggle-dark"),
  openAdmin: document.getElementById("open-admin"),
  adminPanel: document.getElementById("admin-panel"),
  adminClose: document.getElementById("admin-close"),
  adminSave: document.getElementById("admin-save"),
  orb: document.querySelector(".orb"),
};

// ============================
// UTILIDADES
// ============================

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

function setResultsPresence(hasResults) {
  if (!els.appContainer) return;
  if (hasResults) {
    els.appContainer.classList.add("has-results");
  } else {
    els.appContainer.classList.remove("has-results");
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

// ============================
// RENDER DE RESULTADOS
// ============================

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

function calcularMetricas(items) {
  let articulos = items.length;
  let pares = 0;
  let alertas = 0;
  let valorizado = 0;

  items.forEach((item) => {
    let totalStock = 0;
    item.talles.forEach((t) => {
      totalStock += t.stock;
      if (t.stock <= 0) alertas += 1;
    });
    pares += totalStock;
    valorizado += item.valorizado;
  });

  return { articulos, pares, alertas, valorizado };
}

function renderMetricas(items) {
  const { articulos, pares, alertas, valorizado } = calcularMetricas(items);

  if (els.metricArticulos) els.metricArticulos.textContent = formatNumber(articulos);
  if (els.metricPares) els.metricPares.textContent = formatNumber(pares);
  if (els.metricAlertas) els.metricAlertas.textContent = formatNumber(alertas);
  if (els.metricValorizado)
    els.metricValorizado.textContent = "$" + formatNumber(valorizado);
}

function renderResultados(items) {
  if (!els.resultsContainer) return;

  els.resultsContainer.innerHTML = "";

  if (!items.length) {
    els.resultsContainer.innerHTML =
      '<div class="results-empty">Sin resultados para la búsqueda actual.</div>';
    setResultsPresence(false);
    if (els.resultsStatus) els.resultsStatus.textContent = "Sin resultados";
    return;
  }

  setResultsPresence(true);
  if (els.resultsStatus)
    els.resultsStatus.textContent = `${items.length} artículos encontrados`;

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
      <div class="result-talles">
        ${tallesStr}
      </div>
      <div class="result-total">
        Valorizado total: $${formatNumber(item.valorizado)}
      </div>
    `;

    els.resultsContainer.appendChild(div);
  });
}

// ============================
// DASHBOARD (CHART)
// ============================

function buildChartData(items) {
  const mapTalle = new Map();
  items.forEach((item) => {
    item.talles.forEach((t) => {
      const key = String(t.talle);
      mapTalle.set(key, (mapTalle.get(key) || 0) + t.stock);
    });
  });

  const labels = Array.from(mapTalle.keys());
  const data = Array.from(mapTalle.values());

  return { labels, data };
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

// ============================
// COPIAR RESULTADO
// ============================

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
    alert("Resultados copiados al portapapeles.");
  } catch (e) {
    console.error(e);
    alert("No se pudo copiar el resultado.");
  }
}

// ============================
// LIMPIAR PANTALLA
// ============================

function limpiarPantalla() {
  state.items = [];
  state.lastQuery = "";
  if (els.searchInput) els.searchInput.value = "";
  renderResultados([]);
  renderMetricas([]);
  renderChart([]);
  if (els.resultsStatus) els.resultsStatus.textContent = "Esperando consulta";
}

// ============================
// FILTROS AVANZADOS
// ============================

function toggleFiltrosPanel() {
  if (!els.filtrosPanel) return;
  els.filtrosPanel.classList.toggle("visible");
}

function actualizarFiltrosDesdeUI() {
  if (els.filtroMarca) state.filtros.marca = els.filtroMarca.value || "";
  if (els.filtroRubro) state.filtros.rubro = els.filtroRubro.value || "";
  if (els.filtroTalle) state.filtros.talle = els.filtroTalle.value || "";

  const filtrados = aplicarFiltros(state.items);
  renderResultados(filtrados);
  renderMetricas(filtrados);
  renderChart(filtrados);
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

  function fillSelect(select, values, placeholder) {
    if (!select) return;
    select.innerHTML = "";
    const optEmpty = document.createElement("option");
    optEmpty.value = "";
    optEmpty.textContent = placeholder;
    select.appendChild(optEmpty);

    Array.from(values)
      .sort()
      .forEach((v) => {
        const opt = document.createElement("option");
        opt.value = v;
        opt.textContent = v;
        select.appendChild(opt);
      });
  }

  fillSelect(els.filtroMarca, marcas, "Marca");
  fillSelect(els.filtroRubro, rubros, "Rubro");
  fillSelect(els.filtroTalle, talles, "Talle");
}

// ============================
// BÚSQUEDA
// ============================

async function buscar() {
  const q = (els.searchInput?.value || "").trim();
  if (!q) return;

  state.lastQuery = q;
  state.soloStock = !!els.chkSoloStock?.checked;

  if (els.resultsStatus) els.resultsStatus.textContent = "Buscando...";
  setConnectionStatus(true);
  showLoading(true);

  try {
    const resp = await fetch(API_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        question: q,
        solo_stock: state.soloStock,
      }),
    });

    if (!resp.ok) {
      throw new Error("Error en el servidor");
    }

    const data = await resp.json();
    state.items = data.items || [];

    const filtrados = aplicarFiltros(state.items);
    renderResultados(filtrados);
    renderMetricas(filtrados);
    renderChart(filtrados);
    poblarFiltros(state.items);
    setConnectionStatus(true);
  } catch (e) {
    console.error(e);
    setConnectionStatus(false);
    if (els.resultsContainer) {
      els.resultsContainer.innerHTML =
        '<div class="results-error">Error de conexión</div>';
    }
    if (els.resultsStatus) els.resultsStatus.textContent = "Error de conexión";
  } finally {
    showLoading(false);
  }
}

// ============================
// MANOS LIBRES / STOP (voz)
// ============================

let recognition = null;
let manosLibresActivo = false;

function initVoice() {
  const SpeechRecognition =
    window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SpeechRecognition) {
    console.warn("SpeechRecognition no disponible en este navegador.");
    return;
  }
  recognition = new SpeechRecognition();
  recognition.lang = "es-AR";
  recognition.continuous = true;
  recognition.interimResults = false;

  recognition.onresult = (event) => {
    const last = event.results[event.results.length - 1];
    const text = last[0].transcript.trim();
    if (els.searchInput) {
      els.searchInput.value = text;
    }
    buscar();
  };

  recognition.onend = () => {
    if (manosLibresActivo) {
      recognition.start();
    }
  };
}

function toggleManosLibres(checked) {
  manosLibresActivo = checked;
  if (!recognition) return;
  if (checked) {
    recognition.start();
  } else {
    recognition.stop();
  }
}

function stopTodo() {
  manosLibresActivo = false;
  if (els.handsfreeToggle) els.handsfreeToggle.checked = false;
  if (recognition) recognition.stop();
  window.speechSynthesis.cancel();
}

// ============================
// SCANNER (hook básico)
// ============================

function iniciarScanner() {
  alert("Scanner de código de barras: hook listo para integrar BarcodeDetector.");
}

// ============================
// MODO DÍA/NOCHE (simple toggle de clase)
// ============================

function toggleDarkMode() {
  document.body.classList.toggle("light-mode");
}

// ============================
// ADMIN ORB (solo muestra/oculta panel)
// ============================

function openAdminPanel() {
  if (!els.adminPanel) return;
  els.adminPanel.style.display = "flex";
}

function closeAdminPanel() {
  if (!els.adminPanel) return;
  els.adminPanel.style.display = "none";
}

function saveAdminConfig() {
  // Hook para guardar configuración del ORB (podés persistir en localStorage)
  closeAdminPanel();
}

// ============================
// INIT
// ============================

function initEvents() {
  els.btnSearch?.addEventListener("click", buscar);
  els.searchInput?.addEventListener("keydown", (e) => {
    if (e.key === "Enter") buscar();
  });
  els.btnClear?.addEventListener("click", limpiarPantalla);
  els.btnCopy?.addEventListener("click", copiarResultados);
  els.btnFiltros?.addEventListener("click", toggleFiltrosPanel);

  els.filtroMarca?.addEventListener("change", actualizarFiltrosDesdeUI);
  els.filtroRubro?.addEventListener("change", actualizarFiltrosDesdeUI);
  els.filtroTalle?.addEventListener("change", actualizarFiltrosDesdeUI);

  els.handsfreeToggle?.addEventListener("change", (e) =>
    toggleManosLibres(e.target.checked)
  );
  els.btnStop?.addEventListener("click", stopTodo);
  els.btnScan?.addEventListener("click", iniciarScanner);

  els.toggleDark?.addEventListener("click", toggleDarkMode);
  els.openAdmin?.addEventListener("click", openAdminPanel);
  els.adminClose?.addEventListener("click", closeAdminPanel);
  els.adminSave?.addEventListener("click", saveAdminConfig);
}

function init() {
  initEvents();
  initVoice();
  renderResultados([]);
  renderMetricas([]);
  setConnectionStatus(false);
}

document.addEventListener("DOMContentLoaded", init);
