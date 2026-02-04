// ============================================================
// ELEMENTOS
// ============================================================

const els = {
  searchInput: document.getElementById("search-input"),
  btnClear: document.getElementById("btn-clear"),
  btnCopy: document.getElementById("btn-copy"),
  btnFiltros: document.getElementById("btn-filtros"),
  filtrosPanel: document.getElementById("filtros-panel"),
  filtroMarca: document.getElementById("filtro-marca"),
  filtroRubro: document.getElementById("filtro-rubro"),
  filtroTalleDesde: document.getElementById("filtro-talle-desde"),
  filtroTalleHasta: document.getElementById("filtro-talle-hasta"),
  btnAplicarFiltros: document.getElementById("btn-aplicar-filtros"),
  chkSoloStock: document.getElementById("chk-solo-stock"),
  resultsContainer: document.getElementById("results-container"),
  resultsStatus: document.getElementById("results-status"),
  handsfreeToggle: document.getElementById("handsfree-toggle"),
  btnStop: document.getElementById("btn-stop"),
  orb: document.getElementById("orb"),
  stockChartCanvas: document.getElementById("stockChart"),
  btnTabla: document.getElementById("btn-tabla"),
};

const API_URL = "https://stock-backend-1-0upi.onrender.com/query";

// ============================================================
// ESTADO GLOBAL
// ============================================================

const state = {
  items: [],
  catalogItems: [],
  lastQuery: "",
  soloStock: false,
  currentAbort: null,
  lastActivity: Date.now(),
  chart: null,
  filtros: {
    marca: null,
    rubro: null,
    talleDesde: null,
    talleHasta: null,
  },
  modoTabla: false,
};

// ============================================================
// UTILIDADES
// ============================================================

function showToast(msg) {
  const toast = document.getElementById("toast");
  toast.textContent = msg;
  toast.classList.add("visible");
  setTimeout(() => toast.classList.remove("visible"), 2000);
}

function formatNumber(n) {
  return Number(n).toLocaleString("es-AR");
}

function setConnectionStatus(ok) {
  const dot = document.querySelector(".connection-dot");
  if (!dot) return;
  dot.style.background = ok ? "#3ddc84" : "#ff4f6a";
}

// ============================================================
// ORB — ESTADOS
// ============================================================

function orbSetReady(v) {
  els.orb.classList.remove("orb-loading", "orb-error", "orb-boost");
  if (v) els.orb.classList.add("orb-ready");
  else els.orb.classList.remove("orb-ready");
}

function orbSetLoading(v) {
  els.orb.classList.remove("orb-ready", "orb-error");
  if (v) els.orb.classList.add("orb-loading", "orb-boost");
  else els.orb.classList.remove("orb-loading", "orb-boost");
}

function orbSetError(v) {
  els.orb.classList.remove("orb-ready", "orb-loading", "orb-boost");
  if (v) els.orb.classList.add("orb-error");
  else els.orb.classList.remove("orb-error");
}

// ============================================================
// RENDER RESULTADOS — TARJETAS
// ============================================================

function renderResultados(items) {
  if (state.modoTabla) {
    renderResultadosTabla(items);
    return;
  }

  els.resultsContainer.innerHTML = "";

  if (!items.length) {
    els.resultsContainer.innerHTML =
      '<div class="results-empty">Sin resultados.</div>';
    return;
  }

  items.forEach((item) => {
    const div = document.createElement("div");
    div.className = "result-item";

    const talles = item.talles
      .map((t) => `${t.talle}: ${t.stock}`)
      .join(" | ");

    div.innerHTML = `
      <div class="result-title">${item.codigo} — ${item.descripcion}</div>
      <div class="result-sub">
        Marca: ${item.marca || "—"} | Rubro: ${item.rubro || "—"} | Color: ${
      item.color || "—"
    }
      </div>
      <div class="result-talles">${talles}</div>
      <div class="result-sub">Valorizado: $${formatNumber(item.valorizado)}</div>
    `;

    els.resultsContainer.appendChild(div);
  });
}

// ============================================================
// RENDER RESULTADOS — TABLA
// ============================================================

function renderResultadosTabla(items) {
  els.resultsContainer.innerHTML = "";

  if (!items.length) {
    els.resultsContainer.innerHTML =
      '<div class="results-empty">Sin resultados.</div>';
    return;
  }

  let html = `
    <table class="tabla-resultados">
      <thead>
        <tr>
          <th>Código</th>
          <th>Descripción</th>
          <th>Marca</th>
          <th>Rubro</th>
          <th>Color</th>
          <th>Talles</th>
          <th>Valorizado</th>
        </tr>
      </thead>
      <tbody>
  `;

  items.forEach((item) => {
    const talles = item.talles
      .map((t) => `${t.talle}: ${t.stock}`)
      .join(" | ");

    html += `
      <tr>
        <td>${item.codigo}</td>
        <td>${item.descripcion}</td>
        <td>${item.marca || "—"}</td>
        <td>${item.rubro || "—"}</td>
        <td>${item.color || "—"}</td>
        <td>${talles}</td>
        <td>$${formatNumber(item.valorizado)}</td>
      </tr>
    `;
  });

  html += "</tbody></table>";
  els.resultsContainer.innerHTML = html;
}

// ============================================================
// DASHBOARD
// ============================================================

function actualizarDashboard(items) {
  if (!els.stockChartCanvas) return;

  const tallesMap = {};

  items.forEach((item) => {
    item.talles.forEach((t) => {
      tallesMap[t.talle] = (tallesMap[t.talle] || 0) + t.stock;
    });
  });

  const labels = Object.keys(tallesMap);
  const data = Object.values(tallesMap);

  if (state.chart) state.chart.destroy();

  state.chart = new Chart(els.stockChartCanvas, {
    type: "bar",
    data: {
      labels,
      datasets: [
        {
          label: "Stock por talle",
          data,
          backgroundColor: "#4fc3f7",
        },
      ],
    },
    options: {
      responsive: true,
      plugins: {
        legend: { display: false },
      },
    },
  });
}

// ============================================================
// BUSCAR
// ============================================================

async function buscar(force = false) {
  const query = els.searchInput.value.trim();
  if (!query) {
    showToast("Ingresá un código o descripción");
    return;
  }

  if (!force && query === state.lastQuery) return;

  state.lastQuery = query;

  if (state.currentAbort) state.currentAbort.abort();
  state.currentAbort = new AbortController();

  orbSetLoading(true);
  els.resultsStatus.textContent = "Buscando…";

  try {
    const body = {
      question: query,
      solo_stock: els.chkSoloStock.checked,
    };

    const res = await fetch(API_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      signal: state.currentAbort.signal,
    });

    if (!res.ok) throw new Error("Error en servidor");

    const data = await res.json();
    state.items = data.items || [];

    renderResultados(state.items);
    actualizarDashboard(state.items);

    setConnectionStatus(true);
    orbSetReady(true);
    els.resultsStatus.textContent = `${state.items.length} resultados`;

  } catch (err) {
    if (err.name !== "AbortError") {
      setConnectionStatus(false);
      orbSetError(true);
      els.resultsStatus.textContent = "Error de conexión";
    }
  } finally {
    orbSetLoading(false);
  }
}

// ============================================================
// FILTROS
// ============================================================

function actualizarFiltrosDesdeUI() {
  state.filtros.marca = els.filtroMarca.value || null;
  state.filtros.rubro = els.filtroRubro.value || null;
  state.filtros.talleDesde = els.filtroTalleDesde.value || null;
  state.filtros.talleHasta = els.filtroTalleHasta.value || null;
}

async function buscarPorFiltros() {
  const body = {
    question: "",
    solo_stock: els.chkSoloStock.checked,
    filtros_globales: true,
    marca: state.filtros.marca,
    rubro: state.filtros.rubro,
    talle_desde: state.filtros.talleDesde,
    talle_hasta: state.filtros.talleHasta,
  };

  orbSetLoading(true);
  els.resultsStatus.textContent = "Filtrando…";

  try {
    const res = await fetch(API_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    const data = await res.json();
    state.items = data.items || [];

    renderResultados(state.items);
    actualizarDashboard(state.items);

    setConnectionStatus(true);
    orbSetReady(true);
    els.resultsStatus.textContent = `${state.items.length} resultados`;

  } catch (err) {
    setConnectionStatus(false);
    orbSetError(true);
    els.resultsStatus.textContent = "Error de conexión";
  } finally {
    orbSetLoading(false);
  }
}

// ============================================================
// CARGAR CATÁLOGO (MARCA / RUBRO)
// ============================================================

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

    const res = await fetch(API_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    const data = await res.json();
    state.catalogItems = data.items || [];

    const marcas = [...new Set(state.catalogItems.map((i) => i.marca).filter(Boolean))];
    const rubros = [...new Set(state.catalogItems.map((i) => i.rubro).filter(Boolean))];

    els.filtroMarca.innerHTML = '<option value="">Marca</option>' +
      marcas.map((m) => `<option value="${m}">${m}</option>`).join("");

    els.filtroRubro.innerHTML = '<option value="">Rubro</option>' +
      rubros.map((r) => `<option value="${r}">${r}</option>`).join("");

    setConnectionStatus(true);

  } catch (err) {
    setConnectionStatus(false);
  }
}

// ============================================================
// LIMPIAR / COPIAR / STOP
// ============================================================

function limpiarPantalla() {
  els.searchInput.value = "";
  els.resultsContainer.innerHTML = "";
  els.resultsStatus.textContent = "Esperando consulta";
  orbSetReady(false);
}

function copiarResultados() {
  const text = els.resultsContainer.innerText;
  navigator.clipboard.writeText(text);
  showToast("Copiado");
}

function stopTodo() {
  if (state.currentAbort) state.currentAbort.abort();
  orbSetError(true);
  els.resultsStatus.textContent = "Cancelado";
}

// ============================================================
// EVENTOS
// ============================================================

function initEvents() {
  // ENTER
  els.searchInput.addEventListener("keydown", (e) => {
    if (e.key === "Enter") buscar();
  });

  // ORB CLICK
  els.orb.addEventListener("click", () => buscar());

  // LIMPIAR
  els.btnClear.addEventListener("click", limpiarPantalla);

  // COPIAR
  els.btnCopy.addEventListener("click", copiarResultados);

  // STOP
  els.btnStop.addEventListener("click", stopTodo);

  // FILTROS
  els.btnFiltros.addEventListener("click", () => {
    els.filtrosPanel.classList.toggle("visible");
  });

  els.btnAplicarFiltros.addEventListener("click", () => {
    actualizarFiltrosDesdeUI();
    buscarPorFiltros();
  });

  // SOLO STOCK
  els.chkSoloStock.addEventListener("change", () => {
    buscarPorFiltros();
  });

  // VISTA TABLA
  els.btnTabla.addEventListener("click", () => {
    state.modoTabla = !state.modoTabla;
    els.btnTabla.textContent = state.modoTabla ? "Vista tarjetas" : "Vista tabla";
    renderResultados(state.items);
  });
}

// ============================================================
// INICIALIZACIÓN
// ============================================================

async function init() {
  initEvents();
  await cargarCatalogo();
  orbSetReady(false);
  els.resultsStatus.textContent = "Esperando consulta";
}

document.addEventListener("DOMContentLoaded", init);
