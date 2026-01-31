const btnVoice = document.getElementById("btnVoice");
const voiceStatus = document.getElementById("voiceStatus");
const voiceSearchInput = document.getElementById("searchInput");
const voiceSearchButton = document.getElementById("btnSearch");

let recognition = null;
let listening = false;

if ("webkitSpeechRecognition" in window || "SpeechRecognition" in window) {
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  recognition = new SpeechRecognition();
  recognition.lang = "es-AR";
  recognition.continuous = false;
  recognition.interimResults = false;

  recognition.onstart = () => {
    listening = true;
    voiceStatus.textContent = "Escuchando...";
  };

  recognition.onend = () => {
    listening = false;
    voiceStatus.textContent = "Voz inactiva";
  };

  recognition.onerror = () => {
    listening = false;
    voiceStatus.textContent = "Error de voz";
  };

  recognition.onresult = (event) => {
    const text = event.results[0][0].transcript.trim();
    voiceSearchInput.value = text;
    voiceStatus.textContent = `Escuchado: "${text}"`;
    voiceSearchButton.click();
  };
} else {
  voiceStatus.textContent = "Voz no soportada en este dispositivo";
  btnVoice.disabled = true;
}

btnVoice.addEventListener("click", () => {
  if (!recognition) return;
  if (listening) {
    recognition.stop();
  } else {
    recognition.start();
  }
});
