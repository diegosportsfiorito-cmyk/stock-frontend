// ============================================================
// SCANNER HÍBRIDO — FOTO + DECODIFICACIÓN ZXING
// ============================================================

let modoScanner = "simple"; // simple o completo

// ------------------------------------------------------------
// INICIAR SCANNER (abre cámara nativa)
// ------------------------------------------------------------

function iniciarScanner() {
  const inputCam = document.getElementById("camera-input");
  inputCam.value = ""; // reset
  inputCam.click();
}

// ------------------------------------------------------------
// CUANDO EL USUARIO TOMA LA FOTO
// ------------------------------------------------------------

document.getElementById("camera-input").addEventListener("change", async function (e) {
  const file = e.target.files[0];
  if (!file) return;

  const img = await fileToImage(file);
  const codigo = await decodificarImagen(img);

  if (codigo) {
    procesarCodigo(codigo);
  } else {
    alert("No se pudo leer el código. Intentá acercar más la cámara.");
  }
});

// ------------------------------------------------------------
// DECODIFICAR IMAGEN CON ZXing
// ------------------------------------------------------------

async function decodificarImagen(img) {
  const codeReader = new ZXing.BrowserMultiFormatReader();

  try {
    const result = await codeReader.decodeFromImage(img);
    return result.text.trim();
  } catch (err) {
    console.warn("No se pudo decodificar:", err);
    return null;
  }
}

// ------------------------------------------------------------
// UTILIDAD: convertir archivo a imagen
// ------------------------------------------------------------

function fileToImage(file) {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.src = URL.createObjectURL(file);
  });
}

// ------------------------------------------------------------
// PROCESAR CÓDIGO SEGÚN MODO
// ------------------------------------------------------------

function procesarCodigo(codigo) {
  let resultado = codigo;

  if (modoScanner === "simple") {
    resultado = extraerArticulo(codigo);
  }

  cargarEnInput(resultado);
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

function setModoScanner(modo) {
  modoScanner = modo;
}
