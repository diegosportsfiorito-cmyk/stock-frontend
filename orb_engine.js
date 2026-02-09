(function () {
  const orb = document.getElementById("orb");
  const orbCore = document.getElementById("orb-core");
  if (!orb || !orbCore) return;

  // Ajuste crítico: tamaño real del ORB para que el anillo tenga espacio
  orbCore.style.width = "110px";
  orbCore.style.height = "110px";

  const ringMode = localStorage.getItem("orbRingMode") || "iconos";

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

  const ring = document.createElement("div");
  ring.className = "orb-ring";
  ring.dataset.mode = ringMode;
  orb.appendChild(ring);

  SECTORS.forEach((s, i) => {
    const seg = document.createElement("div");
    seg.className = "orb-ring-sector";
    seg.dataset.sector = s.id;
    seg.style.setProperty("--i", i);
    ring.appendChild(seg);
  });

  if (ringMode === "iconos") {
    SECTORS.forEach((s, i) => {
      const icon = document.createElement("div");
      icon.className = "orb-ring-icon";
      icon.innerHTML = ICONS[s.id];
      icon.style.setProperty("--i", i);
      ring.appendChild(icon);
    });
  }

  function getAngle(ev) {
    const rect = orb.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;

    const x = ev.clientX - cx;
    const y = ev.clientY - cy;

    let angle = Math.atan2(y, x) * (180 / Math.PI);
    if (angle < 0) angle += 360;
    return angle;
  }

  function getSector(angle) {
    return SECTORS.find((s) => {
      if (s.start < s.end) return angle >= s.start && angle < s.end;
      return angle >= s.start || angle < s.end;
    });
  }

  function highlight(id) {
    document.querySelectorAll(".orb-ring-sector").forEach((el) => {
      el.classList.toggle("active", el.dataset.sector === id);
    });
  }

  function activate(id) {
    switch (id) {
      case "stop":
        document.getElementById("btn-stop")?.click();
        break;
      case "clear":
        document.getElementById("btn-clear")?.click();
        break;
      case "copy":
        document.getElementById("btn-copy")?.click();
        break;
      case "daynight":
        const sw = document.getElementById("toggle-dark");
        if (sw) {
          sw.checked = !sw.checked;
          sw.dispatchEvent(new Event("change"));
        }
        break;
      case "help":
        document.getElementById("help-button")?.click();
        break;
      case "solostock":
        const chk = document.getElementById("chk-solo-stock");
        if (chk) {
          chk.checked = !chk.checked;
          chk.dispatchEvent(new Event("change"));
        }
        break;
      case "escuchando":
        const voz = document.getElementById("modo-voz-switch");
        if (voz) {
          voz.checked = !voz.checked;
          voz.dispatchEvent(new Event("change"));
        }
        break;
      case "filtros":
        document.getElementById("btn-filtros")?.click();
        break;
    }
  }

  let dragging = false;

  orb.addEventListener("mousedown", (ev) => {
    dragging = true;
    const angle = getAngle(ev);
    const s = getSector(angle);
    if (s) highlight(s.id);
  });

  document.addEventListener("mousemove", (ev) => {
    if (!dragging) return;
    const angle = getAngle(ev);
    const s = getSector(angle);
    if (s) highlight(s.id);
  });

  document.addEventListener("mouseup", (ev) => {
    if (!dragging) return;
    dragging = false;
    const angle = getAngle(ev);
    const s = getSector(angle);
    if (s) {
      highlight(s.id);
      activate(s.id);
    }
  });

  orb.addEventListener("touchstart", (ev) => {
    dragging = true;
    const t = ev.touches[0];
    const angle = getAngle(t);
    const s = getSector(angle);
    if (s) highlight(s.id);
  });

  orb.addEventListener("touchmove", (ev) => {
    if (!dragging) return;
    const t = ev.touches[0];
    const angle = getAngle(t);
    const s = getSector(angle);
    if (s) highlight(s.id);
  });

  orb.addEventListener("touchend", (ev) => {
    dragging = false;
    const t = ev.changedTouches[0];
    const angle = getAngle(t);
    const s = getSector(angle);
    if (s) {
      highlight(s.id);
      activate(s.id);
    }
  });

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
    }
  };
})();
