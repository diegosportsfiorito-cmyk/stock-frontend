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

  // Manos libres toggle (si existe)
  if (els.handsfreeToggle) {
    els.handsfreeToggle.addEventListener("change", (e) => {
      toggleManosLibres(e.target.checked);
    });
  }
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
// PANEL ADMIN — CONFIGURACIÓN DEL ORB (NUEVO SISTEMA)
// ============================================================

const adminPanel = document.getElementById("admin-panel");

const orbColorDia = document.getElementById("orb-color");
const orbColorNoche = document.getElementById("orb-color-dark");
const orbSize = document.getElementById("orb-size");
const orbHalo = document.getElementById("orb-halo");
const orbMode = document.getElementById("orb-mode");
const orbPresets = document.getElementById("orb-presets");
const orbReset = document.getElementById("orb-reset");

// Cargar valores actuales al panel
function cargarConfigOrb() {
  orbColorDia.value = getComputedStyle(document.documentElement)
    .getPropertyValue("--orb-color")
    .trim();

  orbColorNoche.value = getComputedStyle(document.documentElement)
    .getPropertyValue("--orb-color-dark")
    .trim();

  orbSize.value = parseInt(els.orb.style.width || 130);
  orbHalo.value = parseInt(
    getComputedStyle(document.documentElement)
      .getPropertyValue("--orb-halo-strength")
  );

  // Detectar modo actual
  if (els.orb.classList.contains("orb-classic")) orbMode.value = "classic";
  else if (els.orb.classList.contains("orb-3d")) orbMode.value = "3d";
  else orbMode.value = "ultra";
}

// Guardar configuración
orbColorDia.addEventListener("input", () => {
  document.documentElement.style.setProperty("--orb-color", orbColorDia.value);
});

orbColorNoche.addEventListener("input", () => {
  document.documentElement.style.setProperty("--orb-color-dark", orbColorNoche.value);
});

orbSize.addEventListener("input", () => {
  els.orb.style.width = orbSize.value + "px";
  els.orb.style.height = orbSize.value + "px";
});

orbHalo.addEventListener("input", () => {
  document.documentElement.style.setProperty("--orb-halo-strength", orbHalo.value);
});

orbMode.addEventListener("change", () => {
  els.orb.classList.remove("orb-classic", "orb-3d", "orb-ultra");
  els.orb.classList.add("orb-" + orbMode.value);
});

// Presets
orbPresets.addEventListener("change", () => {
  const preset = orbPresets.value;

  switch (preset) {
    case "default":
      document.documentElement.style.setProperty("--orb-color", "#4fc3f7");
      document.documentElement.style.setProperty("--orb-color-dark", "#7c4dff");
      document.documentElement.style.setProperty("--orb-halo-strength", "60");
      els.orb.classList.remove("orb-classic", "orb-3d");
      els.orb.classList.add("orb-ultra");
      break;

    case "plasma":
      document.documentElement.style.setProperty("--orb-color", "#b44cff");
      document.documentElement.style.setProperty("--orb-color-dark", "#5a00a3");
      document.documentElement.style.setProperty("--orb-halo-strength", "80");
      els.orb.classList.remove("orb-classic", "orb-3d");
      els.orb.classList.add("orb-ultra");
      break;

    case "fuego":
      document.documentElement.style.setProperty("--orb-color", "#ff8a00");
      document.documentElement.style.setProperty("--orb-color-dark", "#b30000");
      document.documentElement.style.setProperty("--orb-halo-strength", "90");
      els.orb.classList.remove("orb-classic", "orb-3d");
      els.orb.classList.add("orb-ultra");
      break;

    case "neon":
      document.documentElement.style.setProperty("--orb-color", "#3dff7d");
      document.documentElement.style.setProperty("--orb-color-dark", "#009933");
      document.documentElement.style.setProperty("--orb-halo-strength", "100");
      els.orb.classList.remove("orb-classic", "orb-3d");
      els.orb.classList.add("orb-ultra");
      break;

    case "minimal":
      document.documentElement.style.setProperty("--orb-color", "#444");
      document.documentElement.style.setProperty("--orb-color-dark", "#111");
      document.documentElement.style.setProperty("--orb-halo-strength", "0");
      els.orb.classList.remove("orb-ultra", "orb-3d");
      els.orb.classList.add("orb-classic");
      break;
  }

  showToast("Preset aplicado");
});

// Reset
orbReset.addEventListener("click", () => {
  document.documentElement.style.setProperty("--orb-color", "#4fc3f7");
  document.documentElement.style.setProperty("--orb-color-dark", "#7c4dff");
  document.documentElement.style.setProperty("--orb-halo-strength", "60");

  els.orb.style.width = "130px";
  els.orb.style.height = "130px";

  els.orb.classList.remove("orb-classic", "orb-3d", "orb-ultra");
  els.orb.classList.add("orb-ultra");

  orbMode.value = "ultra";
  orbPresets.value = "default";

  showToast("ORB restaurado");
});
// ============================================================
// MODO DÍA / NOCHE
// ============================================================

document.getElementById("toggle-dark").addEventListener("change", () => {
  document.body.classList.toggle("light-mode");
});

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
  if (els.handsfreeToggle) els.handsfreeToggle.checked = false;
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
  if (els.handsfreeToggle) els.handsfreeToggle.checked = false;
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
    if (els.handsfreeToggle) els.handsfreeToggle.checked = false;
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
      showToast("Modo administrador");
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

  // Manos libres toggle
  if (els.handsfreeToggle) {
    els.handsfreeToggle.addEventListener("change", (e) => {
      toggleManosLibres(e.target.checked);
    });
  }
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
// FIN DEL ARCHIVO
// ============================================================
