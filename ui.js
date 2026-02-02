/* ============================================================
   UI.JS — CONFIGURACIÓN DEL ORB
============================================================ */

const adminPanel = document.getElementById("admin-panel");
const adminSave = document.getElementById("admin-save");
const adminClose = document.getElementById("admin-close");

const inputColorDia = document.getElementById("orb-color-dia");
const inputColorNoche = document.getElementById("orb-color-noche");
const inputSize = document.getElementById("orb-size");
const inputPulse = document.getElementById("orb-pulse");
const inputSpin = document.getElementById("orb-spin");
const inputHalo = document.getElementById("orb-halo");
const inputResp = document.getElementById("orb-respiracion");

const orb = document.querySelector(".orb");

/* CONFIG POR DEFECTO */
const defaultConfig = {
  colorDia: "#4fc3f7",
  colorNoche: "#7c4dff",
  tamano: 140,
  pulso: 3,
  giro: 6,
  halo: true,
  respiracion: true
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

  orb.classList.toggle("orb-halo", cfg.halo);
  orb.classList.toggle("orb-breathe", cfg.respiracion);
}

document.getElementById("open-admin").addEventListener("click", () => {
  const cfg = cargarConfigORB();

  inputColorDia.value = cfg.colorDia;
  inputColorNoche.value = cfg.colorNoche;
  inputSize.value = cfg.tamano;
  inputPulse.value = cfg.pulso;
  inputSpin.value = cfg.giro;
  inputHalo.checked = cfg.halo;
  inputResp.checked = cfg.respiracion;

  adminPanel.style.display = "flex";
});

adminClose.addEventListener("click", () => {
  adminPanel.style.display = "none";
});

adminSave.addEventListener("click", () => {
  const nuevaConfig = {
    colorDia: inputColorDia.value,
    colorNoche: inputColorNoche.value,
    tamano: parseInt(inputSize.value),
    pulso: parseInt(inputPulse.value),
    giro: parseInt(inputSpin.value),
    halo: inputHalo.checked,
    respiracion: inputResp.checked
  };

  guardarConfigORB(nuevaConfig);
  aplicarConfigORB();
  adminPanel.style.display = "none";
});

aplicarConfigORB();
