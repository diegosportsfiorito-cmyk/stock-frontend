let modoScanner = "simple";
let stream = null;

async function iniciarScanner() {
  const video = document.getElementById("scanner-video");

  try {
    stream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: "environment" }
    });

    video.srcObject = stream;
    video.play();

    detectarLoop(video);

  } catch (err) {
    console.error("Error cámara:", err);
    alert("No se pudo acceder a la cámara.");
  }
}

async function detectarLoop(video) {
  const detector = new BarcodeDetector({
    formats: ["ean_13", "ean_8", "code_128", "code_39", "upc_a", "upc_e"]
  });

  async function loop() {
    if (!video.srcObject) return;

    try {
      const codes = await detector.detect(video);

      if (codes.length > 0) {
        let codigo = codes[0].rawValue.trim();

        if (modoScanner === "simple") {
          codigo = extraerArticulo(codigo);
        }

        cargarEnInput(codigo);
        return; // detener después de leer
      }
    } catch (e) {
      console.warn("Error detectando:", e);
    }

    requestAnimationFrame(loop);
  }

  loop();
}

function extraerArticulo(codigo) {
  const separadores = ["/", "!"];
  let corte = codigo.length;

  separadores.forEach((sep) => {
    const pos = codigo.indexOf(sep);
    if (pos !== -1 && pos < corte) corte = pos;
  });

  return codigo.substring(0, corte);
}

function cargarEnInput(texto) {
  const input = document.getElementById("search-input");
  input.value = texto;
  input.dispatchEvent(new Event("input"));
}

function cerrarScanner() {
  const video = document.getElementById("scanner-video");
  if (stream) {
    stream.getTracks().forEach((t) => t.stop());
  }
  video.srcObject = null;
}
