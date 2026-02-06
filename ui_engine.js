// ============================================================
// UI ENGINE — Eventos, botones, filtros, vista tabla/tarjetas
// + dictado, manos libres, scanner overlay, atajos, métricas, autocomplete
// ============================================================

function initUI(app) {
  const els = app.els;
  const safe = (el) => el !== null && el !== undefined;

  const orbCore = document.getElementById("orb-core");
  const micButton = document.getElementById("mic-button");
  const modoVozSwitch = document.getElementById("modo-voz-switch");
  const voiceStatus = document.getElementById("voice-status");
  const helpButton = document.getElementById("help-button");
  const helpModal = document.getElementById("help-modal");
  const helpClose = document.getElementById("help-close");
  const scannerOverlay = document.getElementById("scanner-overlay");
  const autoList = document.getElementById("autocomplete-list");

  // ============================================================
  // AUDIO — BIP
  // ============================================================

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

  // ============================================================
  // VOZ — Dictado
  // ============================================================

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

  if (modoVozSwitch && modoVozSwitch.checked) setVoiceUIState("ready");
  else setVoiceUIState("off");

  if (modoVozSwitch) {
    modoVozSwitch.addEventListener("change", (e) => {
      const on = e.target.checked;
      localStorage.setItem("modoVoz", on ? "on" : "off");
      setVoiceUIState(on ? "ready" : "off");
      beep(on ? 1400 : 600);
      app.showToast(on ? "Dictado activado" : "Dictado desactivado");
    });

    const saved = localStorage.getItem("modoVoz");
    if (saved === "on") {
      modoVozSwitch.checked = true;
      setVoiceUIState("ready");
    }
  }

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
      const text = ev.results[0][0].transcript || "";
      if (els.searchInput) els.searchInput.value = text;
      setVoiceUIState("ready");
      if (autoList) autoList.innerHTML = "";
      app.buscar(true);
    };

    rec.onerror = () => {
      setVoiceUIState("ready");
      app.showToast("Error en dictado");
    };

    rec.onend = () => {
      if (modoVozSwitch.checked) setVoiceUIState("ready");
      else setVoiceUIState("off");
    };

    rec.start();
  }

  if (micButton) {
    micButton.addEventListener("click", () => {
      if (!modoVozSwitch.checked) {
        app.showToast("Activá el dictado (oreja) para usar el micrófono");
        beep(600);
        return;
      }
      startDictado();
    });
  }

  window.voiceUI = {
    setListening: () => setVoiceUIState("listening"),
    setReady: () => setVoiceUIState("ready"),
    setOff: () => setVoiceUIState("off"),
  };

  // ============================================================
  // AUTOCOMPLETADO
  // ============================================================

  function renderAutocomplete(term) {
    if (!autoList || !els.searchInput) return;
    const value = term.trim();
    if (!value) {
      autoList.innerHTML = "";
      return;
    }

    if (!window.AppCore || !AppCore.getAutocompleteSuggestions) {
      autoList.innerHTML = "";
      return;
    }

    const sugerencias = AppCore.getAutocompleteSuggestions(value);
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
  }

  if (autoList) {
    autoList.addEventListener("click", (e) => {
      const li = e.target;
      if (li && li.tagName === "LI" && els.searchInput) {
        const val = li.getAttribute("data-value") || li.textContent || "";
        els.searchInput.value = val;
        autoList.innerHTML = "";
        app.buscar(true);
      }
    });
  }

  // ============================================================
  // ENTER en input + admin
  // ============================================================

  if (safe(els.searchInput)) {
    els.searchInput.addEventListener("keydown", (e) => {
      if (e.key === "Enter") {
        const val = e.target.value.trim().toLowerCase();

        if (val === "admin") {
          const adminPanel = document.getElementById("admin-panel");
          if (adminPanel) adminPanel.style.display = "flex";
          e.target.value = "";
          if (autoList) autoList.innerHTML = "";
          app.showToast("Modo administrador activado");
          return;
        }

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

  // ============================================================
  // ORB
  // ============================================================

  const orb = document.getElementById("orb");
  if (safe(orb)) {
    orb.addEventListener("click", () => {
      orb.classList.add("orb-pulse");
      setTimeout(() => orb.classList.remove("orb-pulse"), 300);
      if (autoList) autoList.innerHTML = "";
      app.buscar();
    });

    orb.addEventListener("dblclick", () => {
      const adminPanel = document.getElementById("admin-panel");
      if (adminPanel) adminPanel.style.display = "flex";
      app.showToast("Modo administrador activado");
    });
  }

  // ============================================================
  // Botones ORB
  // ============================================================

  const btnClear = document.getElementById("btn-clear");
  if (safe(btnClear))
    btnClear.addEventListener("click", () => {
      if (autoList) autoList.innerHTML = "";
      app.limpiarPantalla();
    });

  const btnCopy = document.getElementById("btn-copy");
  if (safe(btnCopy)) btnCopy.addEventListener("click", () => app.copiarResultados());

  const btnStop = document.getElementById("btn-stop");
  if (safe(btnStop)) btnStop.addEventListener("click", () => app.stopTodo());

  // ============================================================
  // SCANNER — overlay
  // ============================================================

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

  if (btnScanner1 && typeof startScannerInterno1 === "function") {
    btnScanner1.addEventListener("click", () => {
      setScannerOverlay(true);
      startScannerInterno1(() => setScannerOverlay(false));
    });
  } else if (btnScanner1) {
    btnScanner1.addEventListener("click", () => {
      app.showToast("Scanner interno A no disponible");
    });
  }

  if (btnScanner2 && typeof startScannerInterno2 === "function") {
    btnScanner2.addEventListener("click", () => {
      setScannerOverlay(true);
      startScannerInterno2(() => setScannerOverlay(false));
    });
  } else if (btnScanner2) {
    btnScanner2.addEventListener("click", () => {
      app.showToast("Scanner interno B no disponible");
    });
  }

  if (btnScannerExtPref && typeof startScannerExternoPreferido === "function") {
    btnScannerExtPref.addEventListener("click", () => {
      setScannerOverlay(true);
      startScannerExternoPreferido(() => setScannerOverlay(false));
    });
  }

  if (btnScannerExtSel && typeof startScannerExternoSelector === "function") {
    btnScannerExtSel.addEventListener("click", () => {
      setScannerOverlay(true);
      startScannerExternoSelector(() => setScannerOverlay(false));
    });
  }

  window.scannerUI = {
    start: () => setScannerOverlay(true),
    stop: () => setScannerOverlay(false),
  };

  // ============================================================
  // Modo scanner simple/completo
  // ============================================================

  const modoToggle = document.getElementById("modo-scanner-toggle");
  if (modoToggle) {
    modoToggle.checked = (window.modoScanner || "simple") === "completo";
    modoToggle.addEventListener("change", (e) => {
      const modo = e.target.checked ? "completo" : "simple";
      if (window.setModoScanner) window.setModoScanner(modo);
      localStorage.setItem("modoDefecto", modo);
      app.showToast(`Modo scanner: ${modo.toUpperCase()}`);
    });
  }

  // ============================================================
  // Día / noche
  // ============================================================

  const toggleDark = document.getElementById("toggle-dark");
  if (toggleDark) {
    toggleDark.checked = document.body.classList.contains("light-mode");
    toggleDark.addEventListener("change", (e) => {
      if (e.target.checked) document.body.classList.add("light-mode");
      else document.body.classList.remove("light-mode");
    });
  }

  // ============================================================
  // Filtros
  // ============================================================

  const btnFiltros = document.getElementById("btn-filtros");
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

  // ============================================================
  // Vista tabla / tarjetas
  // ============================================================

  const btnVistaTabla = document.getElementById("btn-vista-tabla");
  const btnVistaTarjetas = document.getElementById("btn-vista-tarjetas");

  if (btnVistaTabla && btnVistaTarjetas) {
    btnVistaTabla.addEventListener("click", () => {
      app.state.modoTabla = true;
      btnVistaTabla.classList.add("active");
      btnVistaTarjetas.classList.remove("active");
      app.renderResultados(app.state.items);
    });

    btnVistaTarjetas.addEventListener("click", () => {
      app.state.modoTabla = false;
      btnVistaTarjetas.classList.add("active");
      btnVistaTabla.classList.remove("active");
      app.renderResultados(app.state.items);
    });
  }

  // ============================================================
  // Cambio de modo de gráfico
  // ============================================================

  const chartMode = document.getElementById("chart-mode");
  if (chartMode && window.actualizarDashboard) {
    chartMode.addEventListener("change", () => {
      window.actualizarDashboard(app.state.items);
    });
  }

  // ============================================================
  // Panel admin
  // ============================================================

  const adminGuardar = document.getElementById("admin-guardar");
  const adminCerrar = document.getElementById("admin-cerrar");
  const adminPanel = document.getElementById("admin-panel");
  const adminBackendUrl = document.getElementById("admin-backend-url");
  const adminModoDefecto = document.getElementById("admin-modo-defecto");

  if (adminGuardar) {
    adminGuardar.addEventListener("click", () => {
      const url = adminBackendUrl.value.trim();
      const modo = adminModoDefecto.value;

      if (url) {
        localStorage.setItem("backendUrl", url);
        AppCore.config.backendUrl = url;
      }

      localStorage.setItem("modoDefecto", modo);
      if (window.setModoScanner) window.setModoScanner(modo);

      AppCore.showToast("Configuración guardada");
      if (adminPanel) adminPanel.style.display = "none";
    });
  }

  if (adminCerrar) {
    adminCerrar.addEventListener("click", () => {
      if (adminPanel) adminPanel.style.display = "none";
    });
  }

  // ============================================================
  // Ayuda — modal
  // ============================================================

  if (helpButton && helpModal) {
    helpButton.addEventListener("click", () => {
      helpModal.classList.remove("hidden");
    });
  }

  if (helpClose && helpModal) {
    helpClose.addEventListener("click", () => {
      helpModal.classList.add("hidden");
    });
  }

  if (helpModal) {
    helpModal.addEventListener("click", (e) => {
      if (e.target === helpModal) helpModal.classList.add("hidden");
    });
  }

  // ============================================================
  // Métricas clickeables
  // ============================================================

  const metricArt = document.getElementById("metric-articulos");
  const metricPares = document.getElementById("metric-pares");
  const metricAlertas = document.getElementById("metric-alertas");
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

  [metricArt, metricAlertas, metricVal].forEach((m) => {
    if (!m) return;
    m.addEventListener("click", () => {
      AppCore.showToast("Métricas clickeables (futuro)");
    });
  });

  // ============================================================
  // Atajos
  // ============================================================

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

window.initUI = initUI;
