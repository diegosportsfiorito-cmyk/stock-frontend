// ============================================================
// UI ENGINE V3 — Control total de UI + Layout móvil
// ============================================================
// Controla:
// - ORB (click/touch)
// - Enter en PC y móvil
// - Autocomplete
// - Scanner
// - Voz (micrófono, dictado, manos libres)
// - Botones de acción (limpiar, copiar, stop)
// - Filtros
// - Vista tabla/tarjetas/artículo
// - Panel admin (sin backendUrl)
// - Layout móvil (<768px)
// - Modo día/noche persistente
// ============================================================

function initUI(app) {
  const els = app.els;
  const safe = (el) => el !== null && el !== undefined;

  // ------------------------------------------------------------
  // ELEMENTOS BASE
  // ------------------------------------------------------------
  const orbCore = document.getElementById("orb-core");
  const orb = document.getElementById("orb");
  const micButton = document.getElementById("mic-button");
  const modoVozSwitch = document.getElementById("modo-voz-switch");
  const modoManosLibresSwitch = document.getElementById("modo-manos-libres");
  const voiceStatus = document.getElementById("voice-status");
  const helpButton = document.getElementById("help-button");
  const helpModal = document.getElementById("help-modal");
  const helpClose = document.getElementById("help-close");
  const scannerOverlay = document.getElementById("scanner-overlay");
  const autoList = document.getElementById("autocomplete-list");

  // IDs alineados con el HTML actual
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
  // ESTADO DE VOZ (UI)
  // ------------------------------------------------------------
  function setVoiceUIState(state) {
    if (!voiceStatus) return;

    if (state === "off") {
      voiceStatus.textContent = "Dictado desactivado";
      voiceStatus.classList.remove("listening");
      if (orbCore) orbCore.classList.remove("orb-listening");
    } else if (state === "ready") {
      voiceStatus.textContent = "Dictado listo";
      voiceStatus.classList.remove("listening");
      if (orbCore) orbCore.classList.remove("orb-listening");
    } else if (state === "listening") {
      voiceStatus.textContent = "Escuchando…";
      voiceStatus.classList.add("listening");
      if (orbCore) orbCore.classList.add("orb-listening");
    }
  }

  // Estado inicial de switches de voz
  if (modoVozSwitch && modoVozSwitch.checked) setVoiceUIState("ready");
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
      if (els.searchInput) els.searchInput.value = text;
      setVoiceUIState("ready");
      if (autoList) autoList.innerHTML = "";
      app.buscar();
    };

    rec.onerror = () => {
      setVoiceUIState("ready");
      app.showToast("Error en dictado");
    };

    rec.onend = () => {
      if (modoVozSwitch && modoVozSwitch.checked) setVoiceUIState("ready");
      else setVoiceUIState("off");
    };

    rec.start();
  }

  if (micButton) {
    micButton.addEventListener("click", () => {
      if (!modoVozSwitch || !modoVozSwitch.checked) {
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

    const sugerencias =
      app && typeof app.getAutocompleteSuggestions === "function"
        ? app.getAutocompleteSuggestions(value)
        : [];

    if (!sugerencias.length) {
      autoList.innerHTML = "";
      return;
    }

    autoList.innerHTML = sugerencias
      .map((s) => `<li data-value="${s}">${s}</li>`)
      .join("");
  }

  if (safe(els.searchInput)) {
    els.searchInput.addEventListener("input", (e) => {
      renderAutocomplete(e.target.value || "");
    });

    // ENTER — búsqueda estable
    els.searchInput.addEventListener("keydown", (e) => {
      if (e.key === "Enter") {
        const val = e.target.value.trim().toLowerCase();

        // Modo admin
        if (val === "admin") {
          if (adminPanel) adminPanel.style.display = "flex";
          e.target.value = "";
          if (autoList) autoList.innerHTML = "";
          app.showToast("Modo administrador activado");
          return;
        }

        // Autocomplete: tomar primera sugerencia
        if (autoList && autoList.children.length > 0) {
          const first = autoList.querySelector("li");
          if (first) {
            const v = first.getAttribute("data-value") || first.textContent || "";
            els.searchInput.value = v;
            autoList.innerHTML = "";
          }
        }

        app.buscar();
      }
    });
  }

  if (autoList) {
    autoList.addEventListener("click", (e) => {
      const li = e.target;
      if (li && li.tagName === "LI" && els.searchInput) {
        const val = li.getAttribute("data-value") || li.textContent || "";
        els.searchInput.value = val;
        autoList.innerHTML = "";
        app.buscar();
      }
    });
  }

  // ------------------------------------------------------------
  // ORB — botón de búsqueda (sin doble disparo)
  // ------------------------------------------------------------
  if (orb) {
    const isMobile = window.matchMedia("(max-width: 768px)").matches;

    if (isMobile) {
      orb.addEventListener("touchend", () => {
        if (autoList) autoList.innerHTML = "";
        app.buscar();
      });
    } else {
      orb.addEventListener("click", () => {
        orb.classList.add("orb-pulse");
        setTimeout(() => orb.classList.remove("orb-pulse"), 300);
        if (autoList) autoList.innerHTML = "";
        app.buscar();
      });
    }

    // Doble click → admin
    orb.addEventListener("dblclick", () => {
      if (adminPanel) adminPanel.style.display = "flex";
      app.showToast("Modo administrador activado");
    });
  }

  // ------------------------------------------------------------
  // BOTONES DE ACCIÓN
  // ------------------------------------------------------------
  if (btnClear) {
    btnClear.addEventListener("click", () => {
      app.limpiarPantalla();
      beep(800);
    });
  }

  if (btnCopy) {
    btnCopy.addEventListener("click", () => {
      app.copiarResultados();
      beep(900);
    });
  }

  if (btnStop) {
    btnStop.addEventListener("click", () => {
      app.stopTodo();
      beep(500);
    });
  }

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
    if (els.searchInput && els.searchInput.value.trim()) {
      app.buscar();
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
  if (btnFiltros && els.filtrosPanel) {
    btnFiltros.addEventListener("click", () => {
      els.filtrosPanel.classList.toggle("visible");
    });
  }

  if (els.btnAplicarFiltros) {
    els.btnAplicarFiltros.addEventListener("click", () => app.buscarPorFiltros());
  }

  if (els.chkSoloStock) {
    els.chkSoloStock.addEventListener("change", () => app.buscarPorFiltros());
  }

  if (els.filtroMarca) {
    els.filtroMarca.addEventListener("change", () => app.buscarPorFiltros());
  }
  if (els.filtroRubro) {
    els.filtroRubro.addEventListener("change", () => app.buscarPorFiltros());
  }
  if (els.filtroTalleDesde) {
    els.filtroTalleDesde.addEventListener("change", () => app.buscarPorFiltros());
  }
  if (els.filtroTalleHasta) {
    els.filtroTalleHasta.addEventListener("change", () => app.buscarPorFiltros());
  }

  // ------------------------------------------------------------
  // VISTAS: TABLA / TARJETAS / ARTÍCULO
  // ------------------------------------------------------------
  function setVista(v) {
    app.state.vistaActual = v;

    if (btnVistaTabla) btnVistaTabla.classList.toggle("active", v === "tabla");
    if (btnVistaTarjetas) btnVistaTarjetas.classList.toggle("active", v === "tarjeta");
    if (btnVistaArticulo) btnVistaArticulo.classList.toggle("active", v === "articulo");

    if (vistaTabla) vistaTabla.classList.toggle("active", v === "tabla");
    if (vistaTarjeta) vistaTarjeta.classList.toggle("active", v === "tarjeta");
    if (vistaArticulo) vistaArticulo.classList.toggle("active", v === "articulo");

    app.renderResultados(app.state.items);
  }

  if (btnVistaTabla) {
    btnVistaTabla.addEventListener("click", () => setVista("tabla"));
  }
  if (btnVistaTarjetas) {
    btnVistaTarjetas.addEventListener("click", () => setVista("tarjeta"));
  }
  if (btnVistaArticulo) {
    btnVistaArticulo.addEventListener("click", () => setVista("articulo"));
  }

  // Vista inicial
  setVista(app.state.vistaActual || "tarjeta");

  // ------------------------------------------------------------
  // PANEL ADMIN (sin backendUrl)
  // ------------------------------------------------------------
  if (adminGuardar) {
    adminGuardar.addEventListener("click", () => {
      const modo = document.getElementById("admin-modo-defecto").value;
      localStorage.setItem("modoDefecto", modo);
      if (window.setModoScanner) window.setModoScanner(modo);

      app.showToast("Configuración guardada");
      if (adminPanel) adminPanel.style.display = "none";
    });
  }

  if (adminCerrar) {
    adminCerrar.addEventListener("click", () => {
      if (adminPanel) adminPanel.style.display = "none";
    });
  }

  // ------------------------------------------------------------
  // MÉTRICAS (clickeables)
  // ------------------------------------------------------------
  const metricArt = document.getElementById("metric-articulos");
  const metricPares = document.getElementById("metric-pares");
  const metricAlertasNeg = document.getElementById("metric-alertas-negativos");
  const metricAlertasCero = document.getElementById("metric-alertas-cero");
  const metricVal = document.getElementById("metric-valorizado");

  if (metricPares && els.chkSoloStock) {
    metricPares.addEventListener("click", () => {
      els.chkSoloStock.checked = !els.chkSoloStock.checked;
      app.showToast(
        els.chkSoloStock.checked
          ? "Mostrando solo artículos con stock"
          : "Mostrando todos los artículos"
      );
      app.buscarPorFiltros();
    });
  }

  [metricArt, metricAlertasNeg, metricAlertasCero, metricVal].forEach((m) => {
    if (!m) return;
    m.addEventListener("click", () => {
      app.showToast("Métricas clickeables (futuro)");
    });
  });

  // ------------------------------------------------------------
  // MODO DÍA / NOCHE (persistente)
  // ------------------------------------------------------------
  if (toggleDark) {
    const savedTheme = localStorage.getItem("theme") || "dark";
    const isLight = savedTheme === "light";
    document.body.classList.toggle("light-mode", isLight);
    toggleDark.checked = isLight;

    toggleDark.addEventListener("change", () => {
      const on = toggleDark.checked;
      document.body.classList.toggle("light-mode", on);
      localStorage.setItem("theme", on ? "light" : "dark");
    });
  }

  // ------------------------------------------------------------
  // AYUDA
  // ------------------------------------------------------------
  if (helpButton && helpModal && helpClose) {
    helpModal.classList.add("hidden");

    helpButton.addEventListener("click", () => {
      helpModal.classList.remove("hidden");
    });

    helpClose.addEventListener("click", () => {
      helpModal.classList.add("hidden");
    });

    helpModal.addEventListener("click", (e) => {
      if (e.target === helpModal) {
        helpModal.classList.add("hidden");
      }
    });
  }

  // ------------------------------------------------------------
  // PANEL FUENTE DE DATOS
  // ------------------------------------------------------------
  if (fuentePanel) fuentePanel.classList.remove("visible");
  if (fuenteToggle && fuentePanel) {
    fuenteToggle.addEventListener("click", () => {
      fuentePanel.classList.toggle("visible");
    });
  }

  // ------------------------------------------------------------
  // ATAJOS DE TECLADO
  // ------------------------------------------------------------
  document.addEventListener("keydown", (e) => {
    const tag = (e.target && e.target.tagName) || "";
    const isInput = ["INPUT", "TEXTAREA"].includes(tag);

    if (e.key === "Escape") {
      if (autoList && autoList.innerHTML.trim()) {
        autoList.innerHTML = "";
        return;
      }
      app.limpiarPantalla();
      return;
    }

    if (e.key === "F2" && !isInput) {
      if (btnScanner1) btnScanner1.click();
      e.preventDefault();
      return;
    }

    if (e.key === "F3" && !isInput) {
      if (micButton) micButton.click();
      e.preventDefault();
      return;
    }
  });
}

// Exponer initUI
window.initUI = initUI;
