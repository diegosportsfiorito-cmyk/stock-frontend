// ============================================================
// UI ENGINE V4 — Control total de UI + Layout móvil
// ============================================================
// Opción C: Mantiene tu UX original pero con mejoras sutiles
// ============================================================

function initUI(app) {
  const els = app.els;
  const safe = (el) => el !== null && el !== undefined;

  // ------------------------------------------------------------
  // ELEMENTOS BASE
  // ------------------------------------------------------------
  const orbCore = document.getElementById("orb-core");
  const micButton = document.getElementById("mic-button");
  const modoVozSwitch = document.getElementById("modo-voz-switch");
  const modoManosLibresSwitch = document.getElementById("modo-manos-libres");
  const voiceStatus = document.getElementById("voice-status");
  const helpButton = document.getElementById("help-button");
  const helpModal = document.getElementById("help-modal");
  const helpClose = document.getElementById("help-close");
  const scannerOverlay = document.getElementById("scanner-overlay");
  const autoList = document.getElementById("autocomplete-list");

  const btnClear = document.getElementById("btn-limpiar");
  const btnCopy = document.getElementById("btn-copiar");
  const btnStop = document.getElementById("btn-stop");

  const btnFiltros = document.getElementById("btn-filtros");

  const btnVistaTabla = document.getElementById("btn-ver-tabla");
  const btnVistaTarjetas = document.getElementById("btn-ver-tarjetas");
  const btnVistaArticulo = document.getElementById("btn-ver-articulo");

  const vistaTabla = document.getElementById("vista-tabla");
  const vistaTarjeta = document.getElementById("vista-tarjeta");
  const vistaArticulo = document.getElementById("vista-articulo");

  const adminPanel = document.getElementById("admin-panel");
  const adminGuardar = document.getElementById("admin-guardar");
  const adminCerrar = document.getElementById("admin-cerrar");

  const toggleDark = document.getElementById("toggle-dark");
  const fuenteToggle = document.getElementById("fuente-datos-toggle");
  const fuentePanel = document.getElementById("fuente-datos-panel");

  // ------------------------------------------------------------
  // BEEP (feedback sonoro)
  // ------------------------------------------------------------
  const AudioCtx = window.AudioContext || window.webkitAudioContext;
  let audioCtx = null;

  function beep(freq = 1000, duration = 120) {
    try {
      if (!AudioCtx) return;
      if (!audioCtx) audioCtx = new AudioCtx();
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type = "sine";
      osc.frequency.value = freq;
      gain.gain.value = 0.15;
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.start();
      setTimeout(() => osc.stop(), duration);
    } catch (e) {}
  }

  // ------------------------------------------------------------
  // ESTADO DE VOZ (UI + ORB)
  // ------------------------------------------------------------
  function setVoiceUIState(state) {
    if (!voiceStatus) return;

    if (state === "off") {
      voiceStatus.textContent = "Dictado desactivado";
      voiceStatus.classList.remove("listening");
      ORB.setSpeaking(false);
    } else if (state === "ready") {
      voiceStatus.textContent = "Dictado listo";
      voiceStatus.classList.remove("listening");
      ORB.setSpeaking(false);
    } else if (state === "listening") {
      voiceStatus.textContent = "Escuchando…";
      voiceStatus.classList.add("listening");
      ORB.setSpeaking(true);
    }
  }

  // Estado inicial
  if (modoVozSwitch?.checked) setVoiceUIState("ready");
  else setVoiceUIState("off");

  // ------------------------------------------------------------
  // SWITCH: Dictado
  // ------------------------------------------------------------
  if (modoVozSwitch) {
    const saved = localStorage.getItem("modoVoz");
    if (saved === "on") {
      modoVozSwitch.checked = true;
      setVoiceUIState("ready");
    }

    modoVozSwitch.addEventListener("change", (e) => {
      const on = e.target.checked;
      localStorage.setItem("modoVoz", on ? "on" : "off");
      setVoiceUIState(on ? "ready" : "off");
      beep(on ? 1400 : 600);
      app.showToast(on ? "Dictado activado" : "Dictado desactivado");
    });
  }

  // ------------------------------------------------------------
  // SWITCH: Manos libres
  // ------------------------------------------------------------
  if (modoManosLibresSwitch) {
    const savedML = localStorage.getItem("manosLibres");
    window.manosLibresActivo = savedML === "on";

    modoManosLibresSwitch.checked = window.manosLibresActivo;

    modoManosLibresSwitch.addEventListener("change", (e) => {
      const on = e.target.checked;
      window.manosLibresActivo = on;
      localStorage.setItem("manosLibres", on ? "on" : "off");
      beep(on ? 1200 : 500);
      app.showToast(on ? "Manos libres activado" : "Manos libres desactivado");
    });
  }

  // ------------------------------------------------------------
  // DICTADO POR VOZ
  // ------------------------------------------------------------
  function startDictado() {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition || null;
    if (!SR) {
      app.showToast("Dictado no soportado en este navegador");
      beep(600);
      return;
    }

    const rec = new SR();
    rec.lang = "es-AR";
    rec.interimResults = false;
    rec.maxAlternatives = 1;

    setVoiceUIState("listening");
    beep(1500);

    rec.onresult = (ev) => {
      let text = ev.results[0][0].transcript || "";
      text = text.replace(/[.。]+$/g, "").trim();
      els.searchInput.value = text;
      setVoiceUIState("ready");
      autoList.innerHTML = "";
      ORB.setLoading(true);
      app.buscar();
      setTimeout(() => ORB.setReady(), 600);
    };

    rec.onerror = () => {
      setVoiceUIState("ready");
      app.showToast("Error en dictado");
    };

    rec.onend = () => {
      if (modoVozSwitch?.checked) setVoiceUIState("ready");
      else setVoiceUIState("off");
    };

    rec.start();
  }

  if (micButton) {
    micButton.addEventListener("click", () => {
      if (!modoVozSwitch?.checked) {
        app.showToast("Activá el dictado para usar el micrófono");
        beep(600);
        return;
      }
      startDictado();
    });
  }

  // ------------------------------------------------------------
  // AUTOCOMPLETE
  // ------------------------------------------------------------
  function renderAutocomplete(term) {
    if (!autoList || !els.searchInput) return;
    const value = term.trim();
    if (!value) {
      autoList.innerHTML = "";
      return;
    }

    const sugerencias = app.getAutocompleteSuggestions?.(value) || [];

    if (!sugerencias.length) {
      autoList.innerHTML = "";
      return;
    }

    autoList.innerHTML = sugerencias
      .map((s) => `<li data-value="${s}">${s}</li>`)
      .join("");
  }

  els.searchInput?.addEventListener("input", (e) => {
    renderAutocomplete(e.target.value || "");
  });

  els.searchInput?.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      const val = e.target.value.trim().toLowerCase();

      // Modo admin
      if (val === "admin") {
        adminPanel.classList.remove("hidden");
        adminPanel.classList.add("visible");
        e.target.value = "";
        autoList.innerHTML = "";
        app.showToast("Modo administrador activado");
        return;
      }

      // Autocomplete
      if (autoList.children.length > 0) {
        const first = autoList.querySelector("li");
        if (first) {
          els.searchInput.value = first.dataset.value || first.textContent;
          autoList.innerHTML = "";
        }
      }

      ORB.setLoading(true);
      app.buscar();
      setTimeout(() => ORB.setReady(), 600);
    }
  });

  autoList?.addEventListener("click", (e) => {
    const li = e.target;
    if (li.tagName === "LI") {
      els.searchInput.value = li.dataset.value || li.textContent;
      autoList.innerHTML = "";
      ORB.setLoading(true);
      app.buscar();
      setTimeout(() => ORB.setReady(), 600);
    }
  });

  document.addEventListener("click", (e) => {
    if (!autoList) return;
    if (e.target !== els.searchInput && !autoList.contains(e.target)) {
      autoList.innerHTML = "";
    }
  });
// ============================================================
// UI ENGINE V4 — Parte 2 (ORB, Scanner, Filtros, Vistas, Admin)
// ============================================================

// ------------------------------------------------------------
// ORB — botón de búsqueda (mejorado, opción C)
// ------------------------------------------------------------
if (orbCore) {
  const isMobile = window.matchMedia("(max-width: 768px)").matches;

  // Toque en móvil
  if (isMobile) {
    orbCore.addEventListener("touchend", () => {
      autoList.innerHTML = "";
      ORB.setLoading(true);
      app.buscar();
      setTimeout(() => ORB.setReady(), 600);
    });
  }

  // Click en desktop
  orbCore.addEventListener("click", () => {
    autoList.innerHTML = "";
    ORB.setLoading(true);
    app.buscar();
    setTimeout(() => ORB.setReady(), 600);
  });

  // Doble click → Admin
  orbCore.addEventListener("dblclick", () => {
    adminPanel.classList.remove("hidden");
    adminPanel.classList.add("visible");
    app.showToast("Modo administrador activado");
  });
}

// ------------------------------------------------------------
// BOTONES DE ACCIÓN
// ------------------------------------------------------------
btnClear?.addEventListener("click", () => {
  app.limpiarPantalla();
  ORB.setReady();
  beep(800);
});

btnCopy?.addEventListener("click", () => {
  app.copiarResultados();
  beep(900);
});

btnStop?.addEventListener("click", () => {
  app.stopTodo();
  ORB.setReady();
  beep(500);
});

// ------------------------------------------------------------
// SCANNER
// ------------------------------------------------------------
function setScannerOverlay(active) {
  if (!scannerOverlay) return;
  if (active) {
    scannerOverlay.classList.remove("hidden");
    document.body.classList.add("scanner-active");
  } else {
    scannerOverlay.classList.add("hidden");
    document.body.classList.remove("scanner-active");
  }
}

const btnScanner1 = document.getElementById("btn-scanner-interno-1");
const btnScanner2 = document.getElementById("btn-scanner-interno-2");
const btnScannerExtPref = document.getElementById("btn-scanner-externo-preferido");
const btnScannerExtSel = document.getElementById("btn-scanner-externo-selector");

function scannerCallback() {
  setScannerOverlay(false);
  if (els.searchInput?.value.trim()) {
    ORB.setLoading(true);
    app.buscar();
    setTimeout(() => ORB.setReady(), 600);
  }
}

if (btnScanner1 && typeof startScannerInterno1 === "function") {
  btnScanner1.addEventListener("click", () => {
    setScannerOverlay(true);
    startScannerInterno1(scannerCallback);
  });
}

if (btnScanner2 && typeof startScannerInterno2 === "function") {
  btnScanner2.addEventListener("click", () => {
    setScannerOverlay(true);
    startScannerInterno2(scannerCallback);
  });
}

if (btnScannerExtPref && typeof startScannerExternoPreferido === "function") {
  btnScannerExtPref.addEventListener("click", () => {
    setScannerOverlay(true);
    startScannerExternoPreferido(scannerCallback);
  });
}

if (btnScannerExtSel && typeof startScannerExternoSelector === "function") {
  btnScannerExtSel.addEventListener("click", () => {
    setScannerOverlay(true);
    startScannerExternoSelector(scannerCallback);
  });
}

// ------------------------------------------------------------
// FILTROS
// ------------------------------------------------------------
btnFiltros?.addEventListener("click", () => {
  els.filtrosPanel?.classList.toggle("visible");
});

els.btnAplicarFiltros?.addEventListener("click", () => {
  ORB.setLoading(true);
  app.buscarPorFiltros();
  setTimeout(() => ORB.setReady(), 600);
});

// ------------------------------------------------------------
// VISTAS: TABLA / TARJETAS / ARTÍCULO
// ------------------------------------------------------------
function setVista(v) {
  app.state.vistaActual = v;

  btnVistaTabla?.classList.toggle("active", v === "tabla");
  btnVistaTarjetas?.classList.toggle("active", v === "tarjeta");
  btnVistaArticulo?.classList.toggle("active", v === "articulo");

  vistaTabla?.classList.toggle("active", v === "tabla");
  vistaTarjeta?.classList.toggle("active", v === "tarjeta");
  vistaArticulo?.classList.toggle("active", v === "articulo");

  autoList.innerHTML = "";
  app.renderResultados(app.state.items);
}

btnVistaTabla?.addEventListener("click", () => setVista("tabla"));
btnVistaTarjetas?.addEventListener("click", () => setVista("tarjeta"));
btnVistaArticulo?.addEventListener("click", () => setVista("articulo"));

setVista(app.state.vistaActual || "tarjeta");

// ------------------------------------------------------------
// PANEL ADMIN
// ------------------------------------------------------------
adminGuardar?.addEventListener("click", () => {
  const modo = document.getElementById("admin-modo-defecto").value;
  localStorage.setItem("modoDefecto", modo);

  app.showToast("Configuración guardada");

  adminPanel.classList.remove("visible");
  adminPanel.classList.add("hidden");
});

adminCerrar?.addEventListener("click", () => {
  adminPanel.classList.remove("visible");
  adminPanel.classList.add("hidden");
});

// ------------------------------------------------------------
// MÉTRICAS FILTRABLES
// ------------------------------------------------------------
const mArt = document.getElementById("metric-articulos");
const mUni = document.getElementById("metric-pares");
const mNeg = document.getElementById("metric-alertas-negativos");
const mCero = document.getElementById("metric-alertas-cero");
const mVal = document.getElementById("metric-valorizado");

function filtrarNegativos() {
  const items = app.state.items.filter((it) =>
    (it.talles || []).some((t) => Number(t.stock) < 0)
  );
  app.renderResultados(items);
  app.actualizarIndicadores(items);
  app.showToast("Mostrando artículos con stock negativo");
}

function filtrarSinStock() {
  const items = app.state.items.filter((it) => {
    const total = (it.talles || []).reduce((a, t) => a + Number(t.stock || 0), 0);
    return total === 0;
  });
  app.renderResultados(items);
  app.actualizarIndicadores(items);
  app.showToast("Mostrando artículos sin stock");
}

function filtrarConStock() {
  const items = app.state.items.filter((it) => {
    const total = (it.talles || []).reduce((a, t) => a + Number(t.stock || 0), 0);
    return total > 0;
  });
  app.renderResultados(items);
  app.actualizarIndicadores(items);
  app.showToast("Mostrando artículos con stock");
}

function ordenarPorValorizado() {
  const items = [...app.state.items].sort(
    (a, b) => Number(b.valorizado || 0) - Number(a.valorizado || 0)
  );
  app.renderResultados(items);
  app.actualizarIndicadores(items);
  app.showToast("Ordenado por valorizado");
}

function mostrarTodos() {
  app.renderResultados(app.state.items);
  app.actualizarIndicadores(app.state.items);
  app.showToast("Mostrando todos los artículos");
}

mArt?.addEventListener("click", mostrarTodos);
mUni?.addEventListener("click", filtrarConStock);
mNeg?.addEventListener("click", filtrarNegativos);
mCero?.addEventListener("click", filtrarSinStock);
mVal?.addEventListener("click", ordenarPorValorizado);

// ------------------------------------------------------------
// MODO DÍA / NOCHE
// ------------------------------------------------------------
function aplicarModoDark(on) {
  document.body.classList.toggle("light-mode", on);
  localStorage.setItem("theme", on ? "light" : "dark");
}

const savedTheme = localStorage.getItem("theme") || "dark";
aplicarModoDark(savedTheme === "light");
toggleDark.checked = savedTheme === "light";

toggleDark?.addEventListener("change", () => {
  aplicarModoDark(toggleDark.checked);
});

// ------------------------------------------------------------
// AYUDA
// ------------------------------------------------------------
helpModal?.classList.add("hidden");

helpButton?.addEventListener("click", () => {
  helpModal.classList.remove("hidden");
});

helpClose?.addEventListener("click", () => {
  helpModal.classList.add("hidden");
});

helpModal?.addEventListener("click", (e) => {
  if (e.target === helpModal) helpModal.classList.add("hidden");
});

// ------------------------------------------------------------
// PANEL FUENTE DE DATOS
// ------------------------------------------------------------
fuentePanel?.classList.remove("visible");

fuenteToggle?.addEventListener("click", () => {
  fuentePanel.classList.toggle("visible");
});

// ------------------------------------------------------------
// ATAJOS DE TECLADO
// ------------------------------------------------------------
document.addEventListener("keydown", (e) => {
  const tag = (e.target && e.target.tagName) || "";
  const isInput = ["INPUT", "TEXTAREA"].includes(tag);

  if (e.key === "Escape") {
    if (autoList?.innerHTML.trim()) {
      autoList.innerHTML = "";
      return;
    }
    app.limpiarPantalla();
    return;
  }

  if (e.key === "F2" && !isInput) {
    btnScanner1?.click();
    e.preventDefault();
    return;
  }

  if (e.key === "F3" && !isInput) {
    micButton?.click();
    e.preventDefault();
    return;
  }
});
}

// Exponer initUI
window.initUI = initUI;
