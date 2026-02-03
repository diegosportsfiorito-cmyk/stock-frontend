// ============================================================
// SCANNER AVANZADO — Barcode Scanner+
// ============================================================

let modoScanner = "simple";

// ------------------------------------------------------------
// PROCESAR CÓDIGO
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
  if (!input) return;
  input.value = texto;
  input.dispatchEvent(new Event("input"));
}

// ------------------------------------------------------------
// PROCESAR RETORNO DE BARCODE SCANNER+
// ------------------------------------------------------------

(function procesarRetornoNativo() {
  const params = new URLSearchParams(window.location.search);
  const code = params.get("code");

  if (code) {
    procesarCodigo(code);
    history.replaceState({}, "", window.location.origin + window.location.pathname);
  }
})();
