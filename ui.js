/* ============================================================
   UI.JS — PANEL ADMIN + CONFIGURACIÓN DEL ORB
============================================================ */

/* ELEMENTOS */
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
const inputOverlay = document.getElementById("orb-overlay");
const inputVoz = document.getElementById("orb-voz");

/* ============================================================
   CONFIGURACIÓN POR DEFECTO
============================================================ */
const defaultConfig = {
    colorDia: "#4fc3f7",
    colorNoche: "#7c4dff",
    tamano: 140,
    pulso: 3,
    giro: 1,
    halo: true,
    respiracion: true,
    overlay: true,
    voz: true
};

/* ============================================================
   CARGAR CONFIGURACIÓN
============================================================ */
function cargarConfigORB() {
    const cfg = JSON.parse(localStorage.getItem("orbConfig"));
    return cfg || defaultConfig;
}

/* ============================================================
   GUARDAR CONFIGURACIÓN
============================================================ */
function guardarConfigORB(cfg) {
    localStorage.setItem("orbConfig", JSON.stringify(cfg));
}

/* ============================================================
   APLICAR CONFIGURACIÓN AL ORB
============================================================ */
function aplicarConfigORB() {
    const cfg = cargarConfigORB();

    // Colores
    document.documentElement.style.setProperty("--orb-color", cfg.colorDia);
    document.documentElement.style.setProperty("--orb-color-dark", cfg.colorDia);

    // Tamaño
    orb.style.width = cfg.tamano + "px";
    orb.style.height = cfg.tamano + "px";

    // Pulso
    orb.style.animationDuration = `${cfg.pulso}s`;

    // Giro
    orb.style.setProperty("--orb-spin-speed", cfg.giro);

    // Halo
    orb.style.boxShadow = cfg.halo ? `0 0 35px var(--orb-color)` : "none";

    // Respiración
    if (cfg.respiracion) {
        orb.classList.add("orb-breathe");
    } else {
        orb.classList.remove("orb-breathe");
    }

    // Overlay
    overlay.style.display = cfg.overlay ? "none" : "none"; // se activa desde app.js

    // Voz
    vozActiva = cfg.voz;
}

/* ============================================================
   MOSTRAR PANEL ADMIN
============================================================ */
document.getElementById("open-admin").addEventListener("click", () => {
    const cfg = cargarConfigORB();

    inputColorDia.value = cfg.colorDia;
    inputColorNoche.value = cfg.colorNoche;
    inputSize.value = cfg.tamano;
    inputPulse.value = cfg.pulso;
    inputSpin.value = cfg.giro;
    inputHalo.checked = cfg.halo;
    inputResp.checked = cfg.respiracion;
    inputOverlay.checked = cfg.overlay;
    inputVoz.checked = cfg.voz;

    adminPanel.style.display = "block";
});

/* ============================================================
   CERRAR PANEL ADMIN
============================================================ */
adminClose.addEventListener("click", () => {
    adminPanel.style.display = "none";
});

/* ============================================================
   GUARDAR CONFIGURACIÓN DESDE ADMIN
============================================================ */
adminSave.addEventListener("click", () => {
    const nuevaConfig = {
        colorDia: inputColorDia.value,
        colorNoche: inputColorNoche.value,
        tamano: parseInt(inputSize.value),
        pulso: parseInt(inputPulse.value),
        giro: parseInt(inputSpin.value),
        halo: inputHalo.checked,
        respiracion: inputResp.checked,
        overlay: inputOverlay.checked,
        voz: inputVoz.checked
    };

    guardarConfigORB(nuevaConfig);
    aplicarConfigORB();

    adminPanel.style.display = "none";
});

/* ============================================================
   APLICAR CONFIGURACIÓN AL INICIAR
============================================================ */
aplicarConfigORB();
