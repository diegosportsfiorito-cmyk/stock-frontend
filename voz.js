// ============================================================
// VOZ.JS — Reconocimiento de voz para búsqueda
// ============================================================

window.ORB_VOZ = (function () {

  let recognition = null;
  let active = false;

  const statusEl = document.getElementById("voiceStatus");

  // ------------------------------------------------------------
  // Inicializar reconocimiento
  // ------------------------------------------------------------
  function init() {
    const SpeechRecognition =
      window.SpeechRecognition || window.webkitSpeechRecognition;

    if (!SpeechRecognition) {
      statusEl.textContent = "Voz no soportada";
      return;
    }

    recognition = new SpeechRecognition();
    recognition.lang = "es-AR";
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;

    recognition.onstart = () => {
      active = true;
      statusEl.textContent = "Escuchando…";
    };

    recognition.onend = () => {
      active = false;
      statusEl.textContent = "Voz inactiva";
    };

    recognition.onerror = () => {
      active = false;
      statusEl.textContent = "Error de voz";
    };

    recognition.onresult = (event) => {
      const text = event.results[0][0].transcript.trim();
      statusEl.textContent = `Escuchado: "${text}"`;

      if (text) {
        document.getElementById("searchInput").value = text;
        ORB.page = 1;
        ORB_BACKEND.buscar(text);
      }
    };
  }

  // ------------------------------------------------------------
  // Alternar voz
  // ------------------------------------------------------------
  function toggle() {
    if (!recognition) {
      statusEl.textContent = "Voz no soportada";
      return;
    }

    if (active) {
      recognition.stop();
      active = false;
      statusEl.textContent = "Voz inactiva";
    } else {
      recognition.start();
    }
  }

  // ------------------------------------------------------------
  // API pública
  // ------------------------------------------------------------
  return {
    init,
    toggle
  };

})();


// Inicializar al cargar
window.addEventListener("DOMContentLoaded", () => {
  ORB_VOZ.init();
});
