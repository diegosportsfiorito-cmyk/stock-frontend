/* ============================================================
   MÓDULO DE VOZ — PREMIUM
   Voz femenina argentina por defecto
============================================================ */

let vozActiva = true;
let vozSeleccionada = null;

/* ============================================================
   INICIALIZAR VOCES
============================================================ */
function inicializarVoz() {
    const voces = speechSynthesis.getVoices();

    // Buscar voz femenina argentina
    vozSeleccionada =
        voces.find(v => v.lang === "es-AR" && v.name.toLowerCase().includes("female")) ||
        voces.find(v => v.lang === "es-AR") ||
        voces.find(v => v.lang.startsWith("es")) ||
        voces[0];

    console.log("Voz seleccionada:", vozSeleccionada?.name);
}

speechSynthesis.onvoiceschanged = inicializarVoz;

/* ============================================================
   HABLAR TEXTO
============================================================ */
function hablar(texto) {
    if (!vozActiva) return;

    const msg = new SpeechSynthesisUtterance(texto);
    msg.voice = vozSeleccionada;
    msg.rate = 1;   // velocidad natural
    msg.pitch = 1;  // tono natural
    msg.volume = 1; // volumen máximo

    speechSynthesis.speak(msg);
}

/* ============================================================
   FRASES PREDEFINIDAS
============================================================ */
function hablarBuscando(q) {
    if (!vozActiva) return;
    hablar(`Buscando ${q}`);
}

function hablarResultados(cantidad) {
    if (!vozActiva) return;

    if (cantidad === 1) {
        hablar("Encontré un artículo.");
    } else {
        hablar(`Encontré ${cantidad} artículos.`);
    }
}

function hablarError() {
    if (!vozActiva) return;
    hablar("Hubo un error al consultar el backend.");
}

/* ============================================================
   ACTIVAR / DESACTIVAR VOZ
============================================================ */
function toggleVoz() {
    vozActiva = !vozActiva;
    return vozActiva;
}

/* ============================================================
   MODO MANOS LIBRES (OPCIONAL)
   Si querés, después lo activamos.
============================================================ */
// let reconocimiento;
// function activarManosLibres() {
//     reconocimiento = new webkitSpeechRecognition();
//     reconocimiento.lang = "es-AR";
//     reconocimiento.continuous = true;
//     reconocimiento.interimResults = false;

//     reconocimiento.onresult = (event) => {
//         const texto = event.results[event.results.length - 1][0].transcript.trim().toLowerCase();
//         console.log("Escuchado:", texto);

//         if (texto.startsWith("buscar")) {
//             const q = texto.replace("buscar", "").trim();
//             if (q.length > 0) {
//                 document.getElementById("search-input").value = q;
//                 buscarArticulo(q);
//             }
//         }
//     };

//     reconocimiento.start();
// }
