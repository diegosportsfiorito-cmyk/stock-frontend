// ============================================================
// ORB ENGINE — Anillo interactivo (minimalista / iconos / radial)
// ============================================================

(function () {
  const orb = document.getElementById("orb");
  const orbCore = document.getElementById("orb-core");
  if (!orb || !orbCore) return;

  // ============================================================
  // CONFIGURACIÓN
  // ============================================================

  const ringMode = localStorage.getItem("orbRingMode") || "minimalista";

  // Sectores: 3 modos
  const SECTORS = [
    { id: "escuchando", start: 0, end: 120 },
    { id: "manoslibres", start: 120, end: 240 },
    { id: "modoVisual", start: 240, end: 360 },
  ];

  // ============================================================
  // CREACIÓN DEL ANILLO
  // ============================================================

  const ring = document.createElement("div");
  ring.className = "orb-ring";
  ring.dataset.mode = ringMode; // ← ajuste final
  orb.appendChild(ring);

  // Sectores visibles
  SECTORS.forEach((s, i) => {
    const seg = document.createElement("div");
    seg.className = "orb-ring-sector";
    seg.dataset.sector = s.id;
    seg.style.setProperty("--i", i);
    ring.appendChild(seg);
  });

  // Iconos (solo modo admin)
  if (ringMode === "iconos") {
    const icons = {
      escuchando: "👂",
      manoslibres: "🎙️",
      modoVisual: "🌗",
    };

    SECTORS.forEach((s, i) => {
      const icon = document.createElement("div");
      icon.className = "orb-ring-icon";
      icon.innerHTML = icons[s.id];
      icon.style.setProperty("--i", i);
      ring.appendChild(icon);
    });
  }

  // ============================================================
  // RADIAL (solo admin)
  // ============================================================

  let radialVisible = false;

  function showRadial() {
    radialVisible = true;
    ring.classList.add("radial-visible");
  }

  function hideRadial() {
    radialVisible = false;
    ring.classList.remove("radial-visible");
  }

  if (ringMode === "radial") {
    orb.addEventListener("mousedown", () => {
      showRadial();
    });

    document.addEventListener("mouseup", () => {
      hideRadial();
    });
  }

  // ============================================================
  // DETECCIÓN DE ÁNGULO
  // ============================================================

  function getAngleFromEvent(ev) {
    const rect = orb.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;

    const x = ev.clientX - cx;
    const y = ev.clientY - cy;

    let angle = Math.atan2(y, x) * (180 / Math.PI);
    angle = angle < 0 ? angle + 360 : angle;

    return angle;
  }

  function getSectorFromAngle(angle) {
    return SECTORS.find((s) => angle >= s.start && angle < s.end);
  }

  // ============================================================
  // ILUMINACIÓN DE SECTOR
  // ============================================================

  function highlightSector(id) {
    document.querySelectorAll(".orb-ring-sector").forEach((el) => {
      el.classList.toggle("active", el.dataset.sector === id);
    });
  }

  // ============================================================
  // ACCIONES DE CADA SECTOR
  // ============================================================

  function activateSector(id) {
    // Escuchando ON/OFF
    if (id === "escuchando") {
      const sw = document.getElementById("modo-voz-switch");
      if (sw) {
        sw.checked = !sw.checked;
        sw.dispatchEvent(new Event("change"));
      }
    }

    // Manos libres ON/OFF
    if (id === "manoslibres") {
      if (window.voiceUI && window.voiceUI.setHandsfree) {
        const current = document
          .getElementById("btn-handsfree")
          .classList.contains("active");
        window.voiceUI.setHandsfree(!current);
      }
    }

    // Día/Noche
    if (id === "modoVisual") {
      const sw = document.getElementById("toggle-dark");
      if (sw) {
        sw.checked = !sw.checked;
        sw.dispatchEvent(new Event("change"));
      }
    }
  }

  // ============================================================
  // EVENTOS DE ARRASTRE (mouse)
  // ============================================================

  let dragging = false;

  orb.addEventListener("mousedown", (ev) => {
    dragging = true;
    const angle = getAngleFromEvent(ev);
    const sector = getSectorFromAngle(angle);
    if (sector) highlightSector(sector.id);
  });

  document.addEventListener("mousemove", (ev) => {
    if (!dragging) return;
    const angle = getAngleFromEvent(ev);
    const sector = getSectorFromAngle(angle);
    if (sector) highlightSector(sector.id);
  });

  document.addEventListener("mouseup", (ev) => {
    if (!dragging) return;
    dragging = false;

    const angle = getAngleFromEvent(ev);
    const sector = getSectorFromAngle(angle);
    if (sector) {
      highlightSector(sector.id);
      activateSector(sector.id);
    }

    if (ringMode === "radial") hideRadial();
  });

  // ============================================================
  // EVENTOS TOUCH (mobile)
  // ============================================================

  orb.addEventListener("touchstart", (ev) => {
    dragging = true;
    const t = ev.touches[0];
    const angle = getAngleFromEvent(t);
    const sector = getSectorFromAngle(angle);
    if (sector) highlightSector(sector.id);
  });

  orb.addEventListener("touchmove", (ev) => {
    if (!dragging) return;
    const t = ev.touches[0];
    const angle = getAngleFromEvent(t);
    const sector = getSectorFromAngle(angle);
    if (sector) highlightSector(sector.id);
  });

  orb.addEventListener("touchend", (ev) => {
    dragging = false;
    const t = ev.changedTouches[0];
    const angle = getAngleFromEvent(t);
    const sector = getSectorFromAngle(angle);
    if (sector) {
      highlightSector(sector.id);
      activateSector(sector.id);
    }

    if (ringMode === "radial") hideRadial();
  });
})();
