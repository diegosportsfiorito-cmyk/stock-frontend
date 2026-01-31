// ============================================================
// VOZ.JS — Reconocimiento de voz para búsqueda
// ============================================================

window.ORB_VOZ = (function () {

  let recognition = null;
  let active = false;

  const statusEl = document.getElementById("voiceStatus");

  function init() {
    const SpeechRecognition =
      window.SpeechRecognition || window.webkitSpeechRecognition;

    if (!SpeechRecognition) {
      if (statusEl) statusEl.textContent = "Voz no soportada";
      return;
    }

    recognition = new SpeechRecognition();
    recognition.lang = "es-AR";
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;

    recognition.onstart = () => {
      active = true;
      if (statusEl) statusEl.textContent = "Escuchando…";
    };

    recognition.onend = () => {
      active = false;
      if (statusEl) statusEl.textContent = "Voz inactiva";
    };

    recognition.onerror = () => {
      active = false;
      if (statusEl) statusEl.textContent = "Error de voz";
    };

    recognition.onresult = (event) => {
      const text = event.results[0][0].transcript.trim();
      if (statusEl) statusEl.textContent = `Escuchado: "${text}"`;

      if (text) {
        document.getElementById("searchInput").value = text;
        ORB.page = 1;
        ORB_BACKEND.buscar(text);
      }
    };
  }

  function toggle() {
    if (!recognition) {
      if (statusEl) statusEl.textContent = "Voz no soportada";
      return;
    }

    if (active) {
      recognition.stop();
      active = false;
      if (statusEl) statusEl.textContent = "Voz inactiva";
    } else {
      recognition.start();
    }
  }

  return {
    init,
    toggle
  };

})();

window.addEventListener("DOMContentLoaded", () => {
  ORB_VOZ.init();
});
