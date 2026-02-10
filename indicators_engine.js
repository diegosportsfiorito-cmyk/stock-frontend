/* INDICADORES — MÉTRICAS SUPERIORES */

function actualizarIndicadores(items) {
  const totalArticulos = items.length;

  let totalPares = 0;
  let negativos = 0;
  let sinStock = 0;
  let valorizado = 0;

  for (const item of items) {
    const stock = item.stockTotal || 0;
    const precio = item.precioPublico || 0;

    totalPares += stock;

    if (stock < 0) negativos++;
    if (stock === 0) sinStock++;

    valorizado += stock * precio;
  }

  const elArt = document.getElementById("metric-articulos-value");
  const elPares = document.getElementById("metric-pares-value");
  const elNeg = document.getElementById("metric-alertas-negativos");
  const elCero = document.getElementById("metric-alertas-cero");
  const elVal = document.getElementById("metric-valorizado-value");

  if (elArt) elArt.textContent = totalArticulos;
  if (elPares) elPares.textContent = totalPares;
  if (elNeg) elNeg.textContent = negativos;
  if (elCero) elCero.textContent = sinStock;
  if (elVal) elVal.textContent = "$" + valorizado.toLocaleString("es-AR");
}

window.actualizarIndicadores = actualizarIndicadores;
