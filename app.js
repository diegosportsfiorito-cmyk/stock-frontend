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
  scannerModeSimple: document.getElementById("scanner-mode-simple"),
  scannerModeCompleto: document.getElementById("scanner-mode-completo"),
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
  scannerMode: "solo_articulo",
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
  els.orb.classList.remove("orb-loading", "orb-error");
  if (v) els.orb.classList.add("orb-ready");
  else els.orb.classList.remove("orb-ready");
}

function orbSetLoading(v) {
  els.orb.classList.remove("orb-ready", "orb-error");
  if (v) els.orb.classList.add("orb-loading");
  else els.orb.classList.remove("orb-loading");
}

function orbSetError(v) {
  els.orb.classList.remove("orb-ready", "orb-loading");
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
    <table class="table-view">
      <thead>
        <tr>
          <th>Artículo</th>
          <th>Descripción</th>
          <th>Talle</th>
          <th>Cantidad</th>
        </tr>
      </thead>
      <tbody>
  `;

  items.forEach((item) => {
    item.talles.forEach((t) => {
      html += `
        <tr>
          <td>${item.codigo}</td>
          <td>${item.descripcion}</td>
          <td>${t.talle}</td>
          <td>${t.stock}</td>
        </tr>
      `;
    });
  });

  html += "</tbody></table>";

  els.resultsContainer.innerHTML = html;
}

// ============================================================
// MÉTRICAS
// ============================================================

function renderMetricas(items) {
  let articulos = items.length;
  let pares = 0;
  let alertas = 0;
  let valorizado = 0;

  items.forEach((item) => {
    item.talles.forEach((t) => {
      pares += t.stock;
      if (t.stock === 0) alertas++;
    });
    valorizado += item.valorizado;
  });

  document.getElementById("metric-articulos").textContent = articulos;
  document.getElementById("metric-pares").textContent = pares;
  document.getElementById("metric-alertas").textContent = alertas;
  document.getElementById("metric-valorizado").textContent =
    "$" + formatNumber(valorizado);
}

// ============================================================
// DASHBOARD — CHART
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
      `Marca: ${item.marca || "—"} | Rubro: ${item.rubro || "—"} | Color: ${
        item.color || "—"
      }`
    );
    const talles = item.talles
      .map((t) => `${t.talle}: ${t.stock}`)
      .join(" | ");
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
// BÚSQUEDA PRINCIPAL
// ============================================================

async function buscar(force = false) {
  const q = els.searchInput.value.trim();
  if (!q && !force) return;

  state.lastQuery = q;
  state.soloStock = !!els.chkSoloStock.checked;

  els.resultsStatus.textContent = "Buscando...";
  setConnectionStatus(true);
  orbSetLoading(true);

  state.lastActivity = Date.now();

  if (state.currentAbort) state.currentAbort.abort();
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
    if (state.currentAbort === controller) state.currentAbort = null;
    orbSetLoading(false);
  }
}

// ============================================================
// BÚSQUEDA SOLO POR FILTROS
// ============================================================

async function buscarPorFiltros() {
  state.soloStock = !!els.chkSoloStock.checked;
  els.resultsStatus.textContent = "Buscando por filtros...";
  setConnectionStatus(true);
  orbSetLoading(true);

  state.lastActivity = Date.now();

  if (state.currentAbort) state.currentAbort.abort();
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
    if (state.currentAbort === controller) state.currentAbort = null;
    orbSetLoading(false);
  }
}

// ============================================================
// CARGAR CATÁLOGO PARA FILTROS
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

// ============================================================
// POBLAR FILTROS
// ============================================================

function poblarFiltros(items) {
  const marcas = [...new Set(items.map((i) => i.marca).filter(Boolean))];
  const rubros = [...new Set(items.map((i) => i.rubro).filter(Boolean))];

  els.filtroMarca.innerHTML =
    '<option value="">Marca</option>' +
    marcas.map((m) => `<option value="${m}">${m}</option>`).join("");

  els.filtroRubro.innerHTML =
    '<option value="">Rubro</option>' +
    rubros.map((r) => `<option value="${r}">${r}</option>`).join("");
}

function actualizarFiltrosDesdeUI() {
  state.filtros.marca = els.filtroMarca.value || null;
  state.filtros.rubro = els.filtroRubro.value || null;
  state.filtros.talleDesde = els.filtroTalleDesde.value || null;
  state.filtros.talleHasta = els.filtroTalleHasta.value || null;
}
// ============================================================
// MANOS LIBRES / VOZ
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

// ============================================================
// TIMEOUT MANOS LIBRES
// ============================================================

setInterval(() => {
  if (!manosLibresActivo) return;
  const diff = Date.now() - state.lastActivity;
  if (diff > 30000) {
    toggleManosLibres(false);
    els.handsfreeToggle.checked = false;
    showToast("Manos libres desactivado por inactividad");
  }
}, 5000);

// ============================================================
// EVENTOS
// ============================================================

function initEvents() {
  // ORB como botón principal
  els.orb.addEventListener("click", () => buscar(false));

  // ENTER inicia búsqueda
  els.searchInput.addEventListener("keydown", (e) => {
    if (e.key === "Enter") buscar(false);
  });

  // Input → READY + clave ADMIN
  els.searchInput.addEventListener("input", () => {
    const val = els.searchInput.value.trim();
    orbSetReady(val.length > 0);

    if (val.toUpperCase() === "ADMIN") {
      els.searchInput.value = "";
      orbSetReady(false);
      const adminPanel = document.getElementById("admin-panel");
      if (adminPanel) adminPanel.style.display = "flex";
    }
  });

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

  // SWITCH SCANNER SIMPLE / COMPLETO
  els.scannerModeSimple.addEventListener("click", () => {
    state.scannerMode = "solo_articulo";
    els.scannerModeSimple.classList.add("active");
    els.scannerModeCompleto.classList.remove("active");
  });

  els.scannerModeCompleto.addEventListener("click", () => {
    state.scannerMode = "completo";
    els.scannerModeCompleto.classList.add("active");
    els.scannerModeSimple.classList.remove("active");
  });

  // BOTÓN SCANNER
  document.getElementById("btn-scanner").addEventListener("click", () => {
    window.abrirScanner(state.scannerMode);
  });
}

// ============================================================
// INICIALIZACIÓN
// ============================================================

async function init() {
  initVoice();
  initEvents();
  await cargarCatalogo();
  orbSetReady(false);
  els.resultsStatus.textContent = "Esperando consulta";
}

document.addEventListener("DOMContentLoaded", init);
// ============================================================
// PANEL ADMIN — CONFIGURACIÓN DEL ORB
// ============================================================

const adminPanel = document.getElementById("admin-panel");
const adminSave = document.getElementById("admin-save");
const adminClose = document.getElementById("admin-close");

const orbColorDia = document.getElementById("orb-color-dia");
const orbColorNoche = document.getElementById("orb-color-noche");
const orbSize = document.getElementById("orb-size");
const orbPulse = document.getElementById("orb-pulse");
const orbSpin = document.getElementById("orb-spin");
const orbPos = document.getElementById("orb-pos");
const orbCenterSize = document.getElementById("orb-center-size");

// Cargar valores actuales al panel
function cargarConfigOrb() {
  orbColorDia.value = getComputedStyle(document.documentElement)
    .getPropertyValue("--orb-color")
    .trim();

  orbColorNoche.value = getComputedStyle(document.documentElement)
    .getPropertyValue("--orb-color-dark")
    .trim();

  orbSize.value = parseInt(els.orb.style.width || 120);
  orbPulse.value = parseInt(
    getComputedStyle(document.documentElement)
      .getPropertyValue("--orb-pulse-speed")
      .replace("s", "")
  );
  orbSpin.value = parseInt(
    getComputedStyle(document.documentElement)
      .getPropertyValue("--orb-spin-speed")
      .replace("s", "")
  );
}

// Guardar configuración
adminSave.addEventListener("click", () => {
  document.documentElement.style.setProperty("--orb-color", orbColorDia.value);
  document.documentElement.style.setProperty(
    "--orb-color-dark",
    orbColorNoche.value
  );

  els.orb.style.width = orbSize.value + "px";
  els.orb.style.height = orbSize.value + "px";

  document.documentElement.style.setProperty(
    "--orb-pulse-speed",
    orbPulse.value + "s"
  );
  document.documentElement.style.setProperty(
    "--orb-spin-speed",
    orbSpin.value + "s"
  );

  // Posición del ORB
  if (orbPos.value === "left") {
    els.orb.style.margin = "0 auto 0 0";
  } else if (orbPos.value === "center") {
    els.orb.style.margin = "0 auto";
  } else if (orbPos.value === "floating") {
    els.orb.style.position = "fixed";
    els.orb.style.bottom = "20px";
    els.orb.style.right = "20px";
  }

  // Tamaño centrado
  document.body.classList.remove("orb-b1", "orb-b2", "orb-b3");
  document.body.classList.add("orb-" + orbCenterSize.value);

  showToast("Configuración guardada");
});

// Cerrar panel
adminClose.addEventListener("click", () => {
  adminPanel.style.display = "none";
});

// Abrir panel desde botón Admin
document.getElementById("open-admin").addEventListener("click", () => {
  adminPanel.style.display = "flex";
  cargarConfigOrb();
});

// ============================================================
// MODO DÍA / NOCHE
// ============================================================

document.getElementById("toggle-dark").addEventListener("click", () => {
  document.body.classList.toggle("light-mode");
});

// ============================================================
// FIN DEL ARCHIVO
// ============================================================
