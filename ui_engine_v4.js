// ============================================================
// UI ENGINE V4 — Control total de UI + Layout móvil
// ============================================================
// Opción 1A + B + D: Dictado automático + ORB + Scanner + Vistas
// ============================================================

function initUI(app) {
  const els = app.els;

  // ------------------------------------------------------------
  // ELEMENTOS BASE
  // ------------------------------------------------------------
  const orbCore = document.getElementById("orb-core");
  const micButton = document.getElementById("mic-button");
  const dictadoAutoSwitch = document.getElementById("modo-voz-switch");
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

  // PANEL FUENTE DE DATOS
  const fuenteToggle = document.getElementById("fuente-datos-toggle");
  const fuentePanel = document.getElementById("fuente-datos-panel");

  // SWITCH MODO SCANNER (simple / completo)
  const scannerModeSwitch = document.getElementById("scanner-mode-switch");

  // ------------------------------------------------------------
  // BOTONES DEL SCANNER (solo 2)
  // ------------------------------------------------------------
  const btnScannerInterno1 = document.getElementById("btn-scanner-interno-1");
  const btnScannerExternoPreferido = document.getElementById("btn-scanner-externo-preferido");

  els.filtrosPanel?.classList.remove("visible");
  fuentePanel?.classList.remove("visible");

  // ------------------------------------------------------------
  // BEEP
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
  // ESTADO DE VOZ
  // ------------------------------------------------------------
  function setVoiceUIState(state) {
    if (!voiceStatus) return;

    if (state === "off") {
      voiceStatus.textContent = "Dictado desactivado";
      voiceStatus.classList.remove("listening");
      ORB.setSpeaking?.(false);
    } else if (state === "ready") {
      voiceStatus.textContent = "Dictado listo";
      voiceStatus.classList.remove("listening");
      ORB.setSpeaking?.(false);
    } else if (state === "listening") {
      voiceStatus.textContent = "Escuchando…";
      voiceStatus.classList.add("listening");
      ORB.setSpeaking?.(true);
    }
  }

  // Estado inicial dictado automático
  if (dictadoAutoSwitch) {
    const savedAuto = localStorage.getItem("dictadoAutomatico");
    if (savedAuto === "on") {
      dictadoAutoSwitch.checked = true;
      setVoiceUIState("ready");
    } else {
      dictadoAutoSwitch.checked = false;
      setVoiceUIState("off");
    }

    dictadoAutoSwitch.addEventListener("change", (e) => {
      const on = e.target.checked;
      localStorage.setItem("dictadoAutomatico", on ? "on" : "off");
      setVoiceUIState(on ? "ready" : "off");
      beep(on ? 1400 : 600);
      app.showToast(on ? "Dictado automático activado" : "Dictado automático desactivado");
    });
  } else {
    setVoiceUIState("off");
  }

  // ------------------------------------------------------------
  // DICTADO MANUAL
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

      ORB.setLoading?.(true);
      app.buscar();

      setTimeout(() => {
        app.setOrbIdle?.();
      }, 600);
    };

    rec.onerror = () => {
      setVoiceUIState("ready");
      app.showToast("Error en dictado");
    };

    rec.onend = () => {
      if (dictadoAutoSwitch?.checked) setVoiceUIState("ready");
      else setVoiceUIState("off");
    };

    rec.start();
  }

  micButton?.addEventListener("click", () => {
    startDictado();
  });

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

      if (val === "admin") {
        adminPanel.classList.remove("hidden");
        adminPanel.classList.add("visible");
        e.target.value = "";
        if (autoList) autoList.innerHTML = "";
        app.showToast("Modo administrador activado");
        return;
      }

      if (autoList && autoList.children.length > 0) {
        const first = autoList.querySelector("li");
        if (first) {
          els.searchInput.value = first.dataset.value || first.textContent;
          autoList.innerHTML = "";
        }
      }

      ORB.setLoading?.(true);
      app.buscar();

      setTimeout(() => {
        app.setOrbIdle?.();
      }, 600);
    }
  });

  autoList?.addEventListener("click", (e) => {
    const li = e.target;
    if (li.tagName === "LI") {
      els.searchInput.value = li.dataset.value || li.textContent;
      autoList.innerHTML = "";
      ORB.setLoading?.(true);
      app.buscar();

      setTimeout(() => {
        app.setOrbIdle?.();
      }, 600);
    }
  });

  document.addEventListener("click", (e) => {
    if (!autoList) return;
    if (e.target !== els.searchInput && !autoList.contains(e.target)) {
      autoList.innerHTML = "";
    }
  });

  // ============================================================
  // ORB
  // ============================================================
  if (orbCore) {
    const isMobile = window.matchMedia("(max-width: 768px)").matches;

    if (isMobile) {
      orbCore.addEventListener("touchend", () => {
        if (autoList) autoList.innerHTML = "";
        ORB.setLoading?.(true);
        app.buscar();
        setTimeout(() => {
          app.setOrbIdle?.();
        }, 600);
      });
    }

    orbCore.addEventListener("click", () => {
      if (autoList) autoList.innerHTML = "";
      ORB.setLoading?.(true);
      app.buscar();
      setTimeout(() => {
        app.setOrbIdle?.();
      }, 600);
    });

    orbCore.addEventListener("dblclick", () => {
      adminPanel.classList.remove("hidden");
      adminPanel.classList.add("visible");
      app.showToast("Modo administrador activado");
    });
  }

  // ============================================================
  // SCANNER — NATIVO + WEB FALLBACK
  // ============================================================

  // Inicializar modo scanner desde localStorage
  (function initScannerMode() {
    const saved = localStorage.getItem("scannerModo") || "simple";
    if (scannerModeSwitch) {
      scannerModeSwitch.checked = saved === "completo";
    }
  })();

  if (scannerModeSwitch) {
    scannerModeSwitch.addEventListener("change", (e) => {
      const on = e.target.checked;
      const modo = on ? "completo" : "simple";
      localStorage.setItem("scannerModo", modo);
      app.showToast(`Scanner en modo ${modo.toUpperCase()}`);
    });
  }

  function getScannerMode() {
    return localStorage.getItem("scannerModo") || "simple";
  }

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

  function scannerCallback() {
    setScannerOverlay(false);
    if (els.searchInput?.value.trim()) {
      ORB.setLoading?.(true);
      app.buscar();
      setTimeout(() => {
        app.setOrbIdle?.();
      }, 600);
    }
  }

  // ------------------------------------------------------------
  // SCANNER EXTERNO — Barcode Scanner+ con fallback
  // ------------------------------------------------------------
  function abrirBarcodeScannerPlus() {
    const pkg = "com.pcmehanik.smarttoolbox";
    const scheme = "smarttoolbox://scan";

    // Intento abrir la app directamente
    window.location.href = scheme;

    // Si no abre → Play Store / App Store / alternativas
    setTimeout(() => {
      if (/Android/i.test(navigator.userAgent)) {
        window.location.href =
          "https://play.google.com/store/apps/details?id=" + pkg;
      } else if (/iPhone|iPad|iPod/i.test(navigator.userAgent)) {
        window.location.href =
          "https://apps.apple.com/us/app/qr-barcode-scanner/id1200318119";
      } else {
        alert("Instalá Barcode Scanner+ o un lector compatible para usar el scanner externo.");
      }
    }, 800);
  }

  // ------------------------------------------------------------
  // SCANNER INTERNO
  // ------------------------------------------------------------
  function abrirScannerWebInterno() {
    if (typeof window.startScannerInterno1 === "function") {
      const modo = getScannerMode(); // "simple" | "completo"
      setScannerOverlay(true);
      window.startScannerInterno1(scannerCallback, modo);
    } else {
      app.showToast("Scanner interno no disponible");
    }
  }

  // ------------------------------------------------------------
  // BOTONES SCANNER
  // ------------------------------------------------------------
  btnScannerInterno1?.addEventListener("click", abrirScannerWebInterno);
  btnScannerExternoPreferido?.addEventListener("click", abrirBarcodeScannerPlus);

  // ============================================================
  // BOTONES DE ACCIÓN
  // ============================================================
  btnClear?.addEventListener("click", () => {
    app.limpiarPantalla();
    app.setOrbIdle?.();
    beep(800);
  });

  btnCopy?.addEventListener("click", () => {
    app.copiarResultados();
    beep(900);
  });

  btnStop?.addEventListener("click", () => {
    app.stopTodo();
    app.setOrbIdle?.();
    beep(500);
  });

  // ============================================================
  // FILTROS
  // ============================================================
  btnFiltros?.addEventListener("click", () => {
    els.filtrosPanel?.classList.toggle("visible");
  });

  els.btnAplicarFiltros?.addEventListener("click", () => {
    ORB.setLoading?.(true);
    app.buscarPorFiltros();
    setTimeout(() => {
      app.setOrbIdle?.();
    }, 600);
  });

  // ============================================================
  // VISTAS
  // ============================================================
  function setVista(v) {
    app.state.vistaActual = v;

    btnVistaTabla?.classList.toggle("active", v === "tabla");
    btnVistaTarjetas?.classList.toggle("active", v === "tarjeta");
    btnVistaArticulo?.classList.toggle("active", v === "articulo");

    vistaTabla?.classList.toggle("active", v === "tabla");
    vistaTarjeta?.classList.toggle("active", v === "tarjeta");
    vistaArticulo?.classList.toggle("active", v === "articulo");

    if (autoList) autoList.innerHTML = "";
    app.renderResultados(app.state.items);
  }

  btnVistaTabla?.addEventListener("click", () => setVista("tabla"));
  btnVistaTarjetas?.addEventListener("click", () => setVista("tarjeta"));
  btnVistaArticulo?.addEventListener("click", () => setVista("articulo"));

  setVista(app.state.vistaActual || "tarjeta");

  // ============================================================
  // PANEL ADMIN
  // ============================================================
  adminGuardar?.addEventListener("click", () => {
    const modo = document.getElementById("admin-modo-defecto").value;
    const backend = document.getElementById("admin-backend-url").value;

    localStorage.setItem("modoDefecto", modo);
    localStorage.setItem("backendURL", backend);

    app.showToast("Configuración guardada");

    adminPanel.classList.remove("visible");
    adminPanel.classList.add("hidden");
  });

  adminCerrar?.addEventListener("click", () => {
    adminPanel.classList.remove("visible");
    adminPanel.classList.add("hidden");
  });

  // ============================================================
  // MÉTRICAS FILTRABLES
  // ============================================================
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

  // ============================================================
  // MODO DÍA / NOCHE
  // ============================================================
  function aplicarModoDark(on) {
    document.body.classList.toggle("light-mode", on);
    localStorage.set
