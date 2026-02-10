(function () {
  const panel = document.getElementById("admin-panel");
  if (!panel) return;

  const els = {
    backendUrl: document.getElementById("admin-backend-url"),
    modoDefecto: document.getElementById("admin-modo-defecto"),

    orbColor: document.getElementById("orb-color"),
    orbColorDark: document.getElementById("orb-color-dark"),
    orbSize: document.getElementById("orb-size"),
    orbHalo: document.getElementById("orb-halo"),
    orbMode: document.getElementById("orb-mode"),
    orbPresets: document.getElementById("orb-presets"),
    orbRingMode: document.getElementById("orb-ring-mode"),

    btnGuardar: document.getElementById("admin-guardar"),
    btnCerrar: document.getElementById("admin-cerrar"),
    btnReset: document.getElementById("orb-reset"),
  };

  // ============================================================
  // CARGAR CONFIGURACIÓN GUARDADA
  // ============================================================

  function cargarConfig() {
    const backendUrl = localStorage.getItem("backendUrl");
    const modoDefecto = localStorage.getItem("modoDefecto");

    const orbColor = localStorage.getItem("orbColor");
    const orbColorDark = localStorage.getItem("orbColorDark");
    const orbSize = localStorage.getItem("orbSize");
    const orbHalo = localStorage.getItem("orbHalo");
    const orbMode = localStorage.getItem("orbMode");
    const orbPresets = localStorage.getItem("orbPresets");
    const orbRingMode = localStorage.getItem("orbRingMode");

    if (backendUrl) els.backendUrl.value = backendUrl;
    if (modoDefecto) els.modoDefecto.value = modoDefecto;

    if (orbColor) els.orbColor.value = orbColor;
    if (orbColorDark) els.orbColorDark.value = orbColorDark;
    if (orbSize) els.orbSize.value = orbSize;
    if (orbHalo) els.orbHalo.value = orbHalo;
    if (orbMode) els.orbMode.value = orbMode;
    if (orbPresets) els.orbPresets.value = orbPresets;
    if (orbRingMode) els.orbRingMode.value = orbRingMode;
  }

  cargarConfig();

  // ============================================================
  // GUARDAR CONFIGURACIÓN
  // ============================================================

  function guardarConfig() {
    localStorage.setItem("backendUrl", els.backendUrl.value.trim());
    localStorage.setItem("modoDefecto", els.modoDefecto.value);

    localStorage.setItem("orbColor", els.orbColor.value);
    localStorage.setItem("orbColorDark", els.orbColorDark.value);
    localStorage.setItem("orbSize", els.orbSize.value);
    localStorage.setItem("orbHalo", els.orbHalo.value);
    localStorage.setItem("orbMode", els.orbMode.value);
    localStorage.setItem("orbPresets", els.orbPresets.value);
    localStorage.setItem("orbRingMode", els.orbRingMode.value);

    aplicarCambiosVisuales();

    panel.style.display = "none";
  }

  // ============================================================
  // APLICAR CAMBIOS VISUALES AL ORB
  // ============================================================

  function aplicarCambiosVisuales() {
    const orbCore = document.getElementById("orb-core");
    if (!orbCore) return;

    const color = els.orbColor.value;
    const colorDark = els.orbColorDark.value;
    const size = els.orbSize.value;
    const halo = els.orbHalo.value;
    const mode = els.orbMode.value;

    document.documentElement.style.setProperty("--orb-color", color);
    document.documentElement.style.setProperty("--orb-color-dark", colorDark);
    document.documentElement.style.setProperty("--orb-halo-strength", halo);

    orbCore.style.width = size + "px";
    orbCore.style.height = size + "px";

    if (window.ORB) {
      ORB.setMode(mode);
    }
  }

  // ============================================================
  // PRESETS
  // ============================================================

  function aplicarPreset(nombre) {
    const presets = {
      default: {
        color: "#4fc3f7",
        dark: "#7c4dff",
        halo: 60,
        mode: "ultra",
      },
      plasma: {
        color: "#ff00ff",
        dark: "#5500ff",
        halo: 90,
        mode: "ultra",
      },
      fuego: {
        color: "#ff6a00",
        dark: "#b30000",
        halo: 110,
        mode: "classic",
      },
      neon: {
        color: "#39ff14",
        dark: "#0b3d02",
        halo: 80,
        mode: "3d",
      },
      minimal: {
        color: "#ffffff",
        dark: "#000000",
        halo: 20,
        mode: "classic",
      },
    };

    const p = presets[nombre];
    if (!p) return;

    els.orbColor.value = p.color;
    els.orbColorDark.value = p.dark;
    els.orbHalo.value = p.halo;
    els.orbMode.value = p.mode;

    aplicarCambiosVisuales();
  }

  els.orbPresets.addEventListener("change", () => {
    aplicarPreset(els.orbPresets.value);
  });

  // ============================================================
  // RESET ORB
  // ============================================================

  els.btnReset.addEventListener("click", () => {
    localStorage.removeItem("orbColor");
    localStorage.removeItem("orbColorDark");
    localStorage.removeItem("orbSize");
    localStorage.removeItem("orbHalo");
    localStorage.removeItem("orbMode");
    localStorage.removeItem("orbPresets");
    localStorage.removeItem("orbRingMode");

    if (window.ORB) ORB.reset();

    cargarConfig();
    aplicarCambiosVisuales();
  });

  // ============================================================
  // BOTONES GUARDAR / CERRAR
  // ============================================================

  els.btnGuardar.addEventListener("click", guardarConfig);

  els.btnCerrar.addEventListener("click", () => {
    panel.style.display = "none";
  });

})();
