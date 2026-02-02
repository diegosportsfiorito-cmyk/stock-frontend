// APP.JS — LÓGICA PRINCIPAL

const API_URL = "https://stock-backend-1-0upi.onrender.com/query";

const state = {
  items: [],
  catalogItems: [],
  lastQuery: "",
  soloStock: false,
  filtros: {
    marca: "",
    rubro: "",
    talleDesde: "",
    talleHasta: "",
  },
  chart: null,
  lastActivity: Date.now(),
  currentAbort: null,
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
  filtroTalleDesde: document.getElementById("filtro-talle-desde"),
  filtroTalleHasta: document.getElementById("filtro-talle-hasta"),
  btnAplicarFiltros: document.getElementById("btn-aplicar-filtros"),
  connectionDot: document.querySelector(".connection-dot"),
  handsfreeToggle: document.getElementById("handsfree-toggle"),
  btnStop: document.getElementById("btn-stop"),
  stockChartCanvas: document.getElementById("stockChart"),
  orb: document.getElementById("orb"),
  toast: document.getElementById("toast"),
  adminPanel: document.getElementById("admin-panel"),
  scannerTrigger: document.querySelector(".scanner-trigger"),
};

// ORB

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

// UTILIDADES

function formatNumber(n) {
  if (typeof n !== "number") return n;
  return n.toLocaleString("es-AR");
}

function setConnectionStatus(online) {
  if (!els.connectionDot) return;
  els.connectionDot.classList.toggle("online", online);
}

function showToast(msg) {
  if (!els.toast) return;
  els.toast.textContent = msg;
  els.toast.classList.add("visible");
  setTimeout(() => {
    els.toast.classList.remove("visible");
  }, 2500);
}

function setResultsPresence(hasResults) {
  els.appContainer.classList.toggle("has-results", hasResults);
}

// FILTROS (sobre items ya cargados en state.items)

function aplicarFiltrosLocales(items) {
  const { marca, rubro, talleDesde, talleHasta } = state.filtros;
  return items.filter((item) => {
    if (marca && item.marca !== marca) return false;
    if (rubro && item.rubro !== rubro) return false;

    if (talleDesde || talleHasta) {
      const min = talleDesde ? Number(talleDesde) : -Infinity;
      const max = talleHasta ? Number(talleHasta) : Infinity;
      const tieneEnRango = item.talles.some((t) => {
        const tt = Number(t.talle);
        return tt >= min && tt <= max;
      });
      if (!tieneEnRango) return false;
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
    item.talles.forEach((t) => talles.add(Number(t.talle)));
  });

  function fill(select, values, placeholder) {
    select.innerHTML = `<option value="">${placeholder}</option>`;
    [...values].sort((a, b) => (a > b ? 1 : -1)).forEach((v) => {
      const o = document.createElement("option");
      o.value = v;
      o.textContent = v;
      select.appendChild(o);
    });
  }

  fill(els.filtroMarca, marcas, "Marca");
  fill(els.filtroRubro, rubros, "Rubro");

  const tallesOrdenados = [...talles].sort((a, b) => a - b);
  els.filtroTalleDesde.innerHTML = `<option value="">Talle desde</option>`;
  els.filtroTalleHasta.innerHTML = `<option value="">Talle hasta</option>`;
  tallesOrdenados.forEach((t) => {
    const o1 = document.createElement("option");
    o1.value = t;
    o1.textContent = t;
    els.filtroTalleDesde.appendChild(o1);

    const o2 = document.createElement("option");
    o2.value = t;
    o2.textContent = t;
    els.filtroTalleHasta.appendChild(o2);
  });
}

function actualizarFiltrosDesdeUI() {
  state.filtros.marca = els.filtroMarca.value;
  state.filtros.rubro = els.filtroRubro.value;
  state.filtros.talleDesde = els.filtroTalleDesde.value;
  state.filtros.talleHasta = els.filtroTalleHasta.value;
}

// MÉTRICAS

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

// RESULTADOS

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

// DASHBOARD

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

// COPIAR

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
    const text = buildCopyText(state.items);
    await navigator.clipboard.writeText(text);
    showToast("Resultados copiados.");
  } catch (e) {
    showToast("No se pudo copiar.");
  }
}

// LIMPIAR (solo resultados, no configuraciones)

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

// BÚSQUEDA PRINCIPAL (texto + filtros globales si están seteados)

async function buscar(force = false) {
  const q = els.searchInput.value.trim();
  if (!q && !force) return;

  state.lastQuery = q;
  state.soloStock = !!els.chkSoloStock.checked;

  els.resultsStatus.textContent = "Buscando...";
  setConnectionStatus(true);
  orbSetLoading(true);

  state.lastActivity = Date.now();

  // abortar petición anterior si existe
  if (state.currentAbort) {
    state.currentAbort.abort();
  }
  const controller = new AbortController();
  state.currentAbort = controller;

  try {
    const body = {
      question: q,
      solo_stock: state.soloStock,
      filtros_globales: true,
      marca: state.filtros.marca || null,
      rubro: state.filtros.rubro || null,
      talle_desde: state.filtros.talleDesde || null,
      talle_hasta: state.filtros.talleHasta || null,
    };

    const resp = await fetch(API_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      signal: controller.signal,
    });

    if (!resp.ok) throw new Error("Error en el servidor");

    const data = await resp.json();
    state.items = data.items || [];

    renderResultados(state.items);
    renderMetricas(state.items);
    renderChart(state.items);

    setConnectionStatus(true);
    orbSetError(false);
  } catch (e) {
    if (e.name === "AbortError") {
      // STOP presionado
      els.resultsStatus.textContent = "Consulta detenida";
    } else {
      console.error(e);
      setConnectionStatus(false);
      els.resultsContainer.innerHTML =
        '<div class="results-error">Error de conexión</div>';
      els.resultsStatus.textContent = "Error de conexión";
      orbSetError(true);
      setTimeout(() => orbSetError(false), 2500);
    }
  } finally {
    if (state.currentAbort === controller) {
      state.currentAbort = null;
    }
    orbSetLoading(false);
  }
}

// BÚSQUEDA SOLO POR FILTROS (sin texto)

async function buscarPorFiltros() {
  state.soloStock = !!els.chkSoloStock.checked;
  els.resultsStatus.textContent = "Buscando por filtros...";
  setConnectionStatus(true);
  orbSetLoading(true);

  state.lastActivity = Date.now();

  if (state.currentAbort) {
    state.currentAbort.abort();
  }
  const controller = new AbortController();
  state.currentAbort = controller;

  try {
    const body = {
      question: "",
      solo_stock: state.soloStock,
      filtros_globales: true,
      marca: state.filtros.marca || null,
      rubro: state.filtros.rubro || null,
      talle_desde: state.filtros.talleDesde || null,
      talle_hasta: state.filtros.talleHasta || null,
    };

    const resp = await fetch(API_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      signal: controller.signal,
    });

    if (!resp.ok) throw new Error("Error en el servidor");

    const data = await resp.json();
    state.items = data.items || [];

    renderResultados(state.items);
    renderMetricas(state.items);
    renderChart(state.items);

    setConnectionStatus(true);
    orbSetError(false);
  } catch (e) {
    if (e.name === "AbortError") {
      els.resultsStatus.textContent = "Consulta detenida";
    } else {
      console.error(e);
      setConnectionStatus(false);
      els.resultsContainer.innerHTML =
        '<div class="results-error">Error de conexión</div>';
      els.resultsStatus.textContent = "Error de conexión";
      orbSetError(true);
      setTimeout(() => orbSetError(false), 2500);
    }
  } finally {
    if (state.currentAbort === controller) {
      state.currentAbort = null;
    }
    orbSetLoading(false);
  }
}

// CARGAR CATÁLOGO COMPLETO PARA LLENAR FILTROS

async function cargarCatalogo() {
  try {
    const body = {
      question: "",
      solo_stock: false,
      filtros_globales: false,
      marca: null,
      rubro: null,
      talle_desde: null,
      talle_hasta: null,
    };

    const resp = await fetch(API_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    if (!resp.ok) throw new Error("Error en el servidor");

    const data = await resp.json();
    state.catalogItems = data.items || [];
    poblarFiltros(state.catalogItems);
  } catch (e) {
    console.error("Error cargando catálogo para filtros:", e);
  }
}

// Exponer para scanner.js
window.buscar = () => buscar(false);

// MANOS LIBRES / VOZ

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
    const evt = new Event("input");
    els.searchInput.dispatchEvent(evt);
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
  if (checked) {
    recognition.continuous = true;
    recognition.start();
    showToast("Manos libres activado");
  } else {
    recognition.stop();
    showToast("Manos libres desactivado");
  }
}

function stopTodo() {
  manosLibresActivo = false;
  els.handsfreeToggle.checked = false;
  if (recognition) recognition.stop();
  window.speechSynthesis.cancel();
  if (state.currentAbort) {
    state.currentAbort.abort();
    state.currentAbort = null;
  }
  orbSetLoading(false);
  showToast("STOP ejecutado");
}

// VOZ botón (una sola escucha)

function escucharUnaVez() {
  if (!recognition) {
    showToast("Voz no disponible en este dispositivo.");
    return;
  }
  manosLibresActivo = false;
  els.handsfreeToggle.checked = false;
  recognition.stop();
  recognition.continuous = false;
  recognition.start();
  showToast("Escuchando una consulta…");
}

// TIMEOUT MANOS LIBRES

setInterval(() => {
  if (!manosLibresActivo) return;
  const diff = Date.now() - state.lastActivity;
  if (diff > 30000) {
    toggleManosLibres(false);
    els.handsfreeToggle.checked = false;
    showToast("Manos libres desactivado por inactividad");
  }
}, 5000);

// EVENTOS

function initEvents() {
  // ORB como botón principal
  els.orb.addEventListener("click", () => buscar(false));

  // Input → READY + clave ADMIN
  els.searchInput.addEventListener("input", () => {
    const val = els.searchInput.value.trim();
    const hasText = val.length > 0;
    orbSetReady(hasText);

    if (val.toUpperCase() === "ADMIN") {
      els.searchInput.value = "";
      orbSetReady(false);
      if (els.adminPanel) {
        els.adminPanel.style.display = "flex";
      }
    }
  });

  els.btnClear.addEventListener("click", limpiarPantalla);
  els.btnCopy.addEventListener("click", copiarResultados);
  els.btnFiltros.addEventListener("click", () =>
    els.filtrosPanel.classList.toggle("visible")
  );

  els.filtroMarca.addEventListener("change", () => {
    actualizarFiltrosDesdeUI();
  });
  els.filtroRubro.addEventListener("change", () => {
    actualizarFiltrosDesdeUI();
  });
  els.filtroTalleDesde.addEventListener("change", () => {
    actualizarFiltrosDesdeUI();
  });
  els.filtroTalleHasta.addEventListener("change", () => {
    actualizarFiltrosDesdeUI();
  });

  els.btnAplicarFiltros.addEventListener("click", () => {
    actualizarFiltrosDesdeUI();
    buscarPorFiltros();
  });

  els.handsfreeToggle.addEventListener("change", (e) =>
    toggleManosLibres(e.target.checked)
  );

  els.btnStop.addEventListener("click", stopTodo);

  if (els.scannerTrigger) {
    els.scannerTrigger.addEventListener("click", () => {
      if (typeof window.iniciarScanner === "function") {
        window.iniciarScanner();
      } else {
        alert("Scanner no disponible.");
      }
    });
  }

  const btnVoice = document.getElementById("toggle-voice");
  if (btnVoice) {
    btnVoice.addEventListener("click", escucharUnaVez);
  }
}

// INIT

function init() {
  initEvents();
  initVoice();
  renderResultados([]);
  renderMetricas([]);
  setConnectionStatus(false);
  cargarCatalogo();
}

document.addEventListener("DOMContentLoaded", init);
