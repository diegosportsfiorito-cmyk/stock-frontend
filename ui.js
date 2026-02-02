/* ============================================================
   UI.JS — CONFIGURACIÓN DEL ORB PARA STOCK IA PRO
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

const inputPos = document.getElementById("orb-pos");
const inputCenterSize = document.getElementById("orb-center-size");

const orb = document.getElementById("orb");
const toggleDark = document.getElementById("toggle-dark");

/* ============================================================
   CONFIGURACIÓN POR DEFECTO
============================================================ */
const defaultConfig = {
    colorDia: "#4fc3f7",
    colorNoche: "#7c4dff",
    tamano: 110,
    pulso: 3,
    giro: 6,
    halo: true,
    respiracion: true,

    posicion: "center",   // left | center | floating
    centerSize: "b2",     // b1 | b2 | b3

    modoClaro: false
};

/* ============================================================
   CARGAR CONFIGURACIÓN
============================================================ */
function cargarConfigORB() {
    return JSON.parse(localStorage.getItem("orbConfig")) || defaultConfig;
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
    document.documentElement.style.setProperty("--orb-color-dark", cfg.colorNoche);

    // Pulso y giro
    document.documentElement.style.setProperty("--orb-pulse-speed", cfg.pulso + "s");
    document.documentElement.style.setProperty("--orb-spin-speed", cfg.giro + "s");

    // Tamaño base (solo para modo A y C)
    orb.style.width = cfg.tamano + "px";
    orb.style.height = cfg.tamano + "px";

    // Halo
    orb.classList.toggle("orb-halo", cfg.halo);

    // Respiración
    orb.classList.toggle("orb-breathe", cfg.respiracion);

    // ============================================================
    // POSICIÓN DEL ORB (A / B / C)
    // ============================================================

    document.body.classList.remove(
        "orb-left",
        "orb-center",
        "orb-floating",
        "orb-b1",
        "orb-b2",
        "orb-b3"
    );

    // Posición principal
    if (cfg.posicion === "left") {
        document.body.classList.add("orb-left");
    } else if (cfg.posicion === "center") {
        document.body.classList.add("orb-center");
    } else if (cfg.posicion === "floating") {
        document.body.classList.add("orb-floating");
    }

    // Tamaño del modo centrado (B1 / B2 / B3)
    if (cfg.posicion === "center") {
        document.body.classList.add("orb-" + cfg.centerSize);
    }

    // ============================================================
    // MODO DÍA / NOCHE
    // ============================================================

    if (cfg.modoClaro) {
        document.body.classList.add("light-mode");
    } else {
        document.body.classList.remove("light-mode");
    }
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

    inputPos.value = cfg.posicion;
    inputCenterSize.value = cfg.centerSize;

    adminPanel.style.display = "flex";
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

        posicion: inputPos.value,
        centerSize: inputCenterSize.value,

        modoClaro: document.body.classList.contains("light-mode")
    };

    guardarConfigORB(nuevaConfig);
    aplicarConfigORB();

    adminPanel.style.display = "none";
});

/* ============================================================
   TOGGLE MODO DÍA/NOCHE
============================================================ */
toggleDark.addEventListener("click", () => {
    const cfg = cargarConfigORB();

    cfg.modoClaro = !cfg.modoClaro;

    guardarConfigORB(cfg);
    aplicarConfigORB();
});

/* ============================================================
   APLICAR CONFIGURACIÓN AL INICIAR
============================================================ */
aplicarConfigORB();
