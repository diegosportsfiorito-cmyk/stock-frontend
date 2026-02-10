(function () {
  const orb = document.getElementById("orb");
  const orbCore = document.getElementById("orb-core");
  if (!orb || !orbCore) return;

  // Tamaño final del ORB
  orbCore.style.width = "110px";
  orbCore.style.height = "110px";

  // Modo del anillo (se conserva para compatibilidad)
  const ringMode = localStorage.getItem("orbRingMode") || "iconos";

  // Sectores originales (compatibilidad futura)
  const SECTORS = [
    { id: "stop", start: 337.5, end: 22.5 },
    { id: "clear", start: 22.5, end: 67.5 },
    { id: "copy", start: 67.5, end: 112.5 },
    { id: "daynight", start: 112.5, end: 157.5 },
    { id: "help", start: 157.5, end: 202.5 },
    { id: "solostock", start: 202.5, end: 247.5 },
    { id: "escuchando", start: 247.5, end: 292.5 },
    { id: "filtros", start: 292.5, end: 337.5 },
  ];

  const ICONS = {
    stop: "⏹",
    clear: "🧹",
    copy: "📋",
    daynight: "🌗",
    help: "❓",
    solostock: "📦",
    escuchando: "👂",
    filtros: "🎛️",
  };

  // ============================================================
  // ANILLO ORIGINAL — DESACTIVADO (NO SE BORRA NADA)
  // ============================================================

  // Código original preservado pero desactivado:
  //
  // const ring = document.createElement("div");
  // ring.className = "orb-ring";
  // ring.dataset.mode = ringMode;
  // orb.appendChild(ring);
  //
  // SECTORS.forEach((s, i) => {
  //   const seg = document.createElement("div");
  //   seg.className = "orb-ring-sector";
  //   seg.dataset.sector = s.id;
  //   seg.style.setProperty("--i", i);
  //   ring.appendChild(seg);
  // });
  //
  // if (ringMode === "iconos") {
  //   SECTORS.forEach((s, i) => {
  //     const icon = document.createElement("div");
  //     icon.className = "orb-ring-icon";
  //     icon.innerHTML = ICONS[s.id];
  //     icon.style.setProperty("--i", i);
  //     ring.appendChild(icon);
  //   });
  // }

  // ============================================================
  // LÓGICA DEL ANILLO DESACTIVADA
  // ============================================================

  function getAngle() { return null; }
  function getSector() { return null; }
  function highlight() {}
  function activate() {}

  let dragging = false;

  orb.addEventListener("mousedown", () => {
    dragging = false;
  });

  document.addEventListener("mousemove", () => {
    if (!dragging) return;
  });

  document.addEventListener("mouseup", () => {
    dragging = false;
  });

  orb.addEventListener("touchstart", () => {
    dragging = false;
  });

  orb.addEventListener("touchmove", () => {
    if (!dragging) return;
  });

  orb.addEventListener("touchend", () => {
    dragging = false;
  });

  // ============================================================
  // ORB COMO BOTÓN DE BÚSQUEDA
  // ============================================================

  orbCore.addEventListener("click", () => {
    if (window.AppCore && !AppCore.state.buscando) {
      AppCore.buscar(true);
    }
  });

  // ============================================================
  // 5 CLICS PARA ABRIR PANEL ADMIN
  // ============================================================

  const adminPanel = document.getElementById("admin-panel");
  if (adminPanel) {
    let clickTimes = [];

    orbCore.addEventListener("click", () => {
      const now = Date.now();
      clickTimes.push(now);
      clickTimes = clickTimes.filter(t => now - t < 1000);

      if (clickTimes.length >= 5) {
        adminPanel.style.display = "flex";
        clickTimes = [];
      }
    });
  }

  // ============================================================
  // API GLOBAL DEL ORB
  // ============================================================

  window.ORB = {
    currentMode: "ultra",

    setBase() {
      orbCore.className = "orb-ultra";
    },

    setHalo(value) {
      document.documentElement.style.setProperty("--orb-halo-strength", value);
    },

    setMode(mode) {
      this.currentMode = mode;
      orbCore.className = "orb-" + mode;
    },

    reset() {
      this.currentMode = "ultra";
      orbCore.className = "orb-ultra";
      document.documentElement.style.setProperty("--orb-halo-strength", 60);
    },

    // Estados visuales
    setLoading(active) {
      orbCore.classList.remove("orb-error", "orb-ready", "orb-listening");
      if (active) orbCore.classList.add("orb-loading");
      else orbCore.classList.remove("orb-loading");
    },

    setReady(active) {
      orbCore.classList.remove("orb-error", "orb-loading", "orb-listening");
      if (active) orbCore.classList.add("orb-ready");
      else orbCore.classList.remove("orb-ready");
    },

    setError(active) {
      orbCore.classList.remove("orb-ready", "orb-loading", "orb-listening");
      if (active) orbCore.classList.add("orb-error");
      else orbCore.classList.remove("orb-error");
    },

    setListening(active) {
      orbCore.classList.remove("orb-error", "orb-loading", "orb-ready");
      if (active) orbCore.classList.add("orb-listening");
      else orbCore.classList.remove("orb-listening");
    }
  };

  // ============================================================
  // FEEDBACK VISUAL (PRESIÓN)
  // ============================================================

  orbCore.addEventListener("mousedown", () => {
    orbCore.style.transform = "scale(0.96)";
  });

  document.addEventListener("mouseup", () => {
    orbCore.style.transform = "scale(1)";
  });

  orbCore.addEventListener("touchstart", () => {
    orbCore.style.transform = "scale(0.96)";
  });

  orbCore.addEventListener("touchend", () => {
    orbCore.style.transform = "scale(1)";
  });
})();
