window.ORB_VOZ = (function () {
  let recognition = null;
  let listening = false;

  function setVoiceListening(on) {
    listening = on;
    const dot = document.getElementById("voiceDot");
    const text = document.getElementById("voiceStatusText");
    if (on) {
      dot.classList.add("listening");
      text.textContent = "Escuchando…";
    } else {
      dot.classList.remove("listening");
      text.textContent = "Voz en espera";
    }
  }

  function initRecognition() {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) {
      console.warn("SpeechRecognition no disponible");
      return;
    }
    recognition = new SR();
    recognition.lang = "es-AR";
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;

    recognition.onstart = () => setVoiceListening(true);
    recognition.onend = () => setVoiceListening(false);
    recognition.onerror = () => setVoiceListening(false);

    recognition.onresult = e => {
      const text = e.results[0][0].transcript;
      const input = document.getElementById("queryInput");
      input.value = normalizeText(text);
      document.getElementById("searchBtn").click();
    };
  }

  function toggleListen() {
    if (!recognition) return;
    if (listening) {
      recognition.stop();
    } else {
      recognition.start();
    }
  }

  function initEvents() {
    document.getElementById("voiceBtn").addEventListener("click", () => {
      toggleListen();
    });

    document.getElementById("voiceToggleBtn").addEventListener("click", () => {
      setAutoListen(!ORB.autoListen);
      // Podés implementar auto-escucha continua si querés
    });
  }

  function init() {
    initRecognition();
    initEvents();
  }

  return { init };
})();
