// UI.JS — CONFIGURACIÓN DEL ORB Y MODO DÍA/NOCHE

const adminPanel = document.getElementById("admin-panel");
const adminSave = document.getElementById("admin-save");
const adminClose = document.getElementById("admin-close");

const inputColorDia = document.getElementById("orb-color-dia");
const inputColorNoche = document.getElementById("orb-color-noche");
const inputSize = document.getElementById("orb-size");
const inputPulse = document.getElementById("orb-pulse");
const inputSpin = document.getElementById("orb-spin");
const inputPos = document.getElementById("orb-pos");
const inputCenterSize = document.getElementById("orb-center-size");

const orb = document.getElementById("orb");
const orbTooltip = document.getElementById("orb-tooltip");
const toggleDark = document.getElementById("toggle-dark");

const defaultConfig = {
  colorDia: "#4fc3f7",
  colorNoche: "#7c4dff",
  tamano: 110,
  pulso: 3,
  giro: 6,
  posicion: "center",
  centerSize: "b2",
  modoClaro: false,
};

function cargarConfigORB() {
  return JSON.parse(localStorage.getItem("orbConfig")) || defaultConfig;
}

function guardarConfigORB(cfg) {
  localStorage.setItem("orbConfig", JSON.stringify(cfg));
}

function aplicarConfigORB() {
  const cfg = cargarConfigORB();

  document.documentElement.style.setProperty("--orb-color", cfg.colorDia);
  document.documentElement.style.setProperty("--orb-color-dark", cfg.colorNoche);
  document.documentElement.style.setProperty("--orb-pulse-speed", cfg.pulso + "s");
  document.documentElement.style.setProperty("--orb-spin-speed", cfg.giro + "s");

  orb.style.width = cfg.tamano + "px";
  orb.style.height = cfg.tamano + "px";

  document.body.classList.remove(
    "orb-left",
    "orb-center",
    "orb-floating",
    "orb-b1",
    "orb-b2",
    "orb-b3"
  );

  if (cfg.posicion === "left") {
    document.body.classList.add("orb-left");
  } else if (cfg.posicion === "center") {
    document.body.classList.add("orb-center");
  } else if (cfg.posicion === "floating") {
    document.body.classList.add("orb-floating");
  }

  if (cfg.posicion === "center") {
    document.body.classList.add("orb-" + cfg.centerSize);
  }

  if (cfg.modoClaro) {
    document.body.classList.add("light-mode");
  } else {
    document.body.classList.remove("light-mode");
  }

  // halo + respiración siempre activos
  orb.classList.add("orb-halo", "orb-breathe");
}

document.getElementById("open-admin").addEventListener("click", () => {
  const cfg = cargarConfigORB();

  inputColorDia.value = cfg.colorDia;
  inputColorNoche.value = cfg.colorNoche;
  inputSize.value = cfg.tamano;
  inputPulse.value = cfg.pulso;
  inputSpin.value = cfg.giro;
  inputPos.value = cfg.posicion;
  inputCenterSize.value = cfg.centerSize;

  adminPanel.style.display = "flex";
});

adminClose.addEventListener("click", () => {
  adminPanel.style.display = "none";
});

adminSave.addEventListener("click", () => {
  const cfg = cargarConfigORB();

  const nuevaConfig = {
    colorDia: inputColorDia.value,
    colorNoche: inputColorNoche.value,
    tamano: parseInt(inputSize.value),
    pulso: parseInt(inputPulse.value),
    giro: parseInt(inputSpin.value),
    posicion: inputPos.value,
    centerSize: inputCenterSize.value,
    modoClaro: cfg.modoClaro,
  };

  guardarConfigORB(nuevaConfig);
  aplicarConfigORB();
  adminPanel.style.display = "none";
});

toggleDark.addEventListener("click", () => {
  const cfg = cargarConfigORB();
  cfg.modoClaro = !cfg.modoClaro;
  guardarConfigORB(cfg);
  aplicarConfigORB();
});

// Tooltip ORB: aparece al inicio, se oculta al primer click
if (orbTooltip) {
  setTimeout(() => {
    orbTooltip.classList.add("visible");
  }, 600);

  orb.addEventListener("click", () => {
    orbTooltip.classList.remove("visible");
  });
}

aplicarConfigORB();
