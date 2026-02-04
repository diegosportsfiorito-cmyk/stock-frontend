// ============================================================
// INDICATORS ENGINE — Artículos, pares, alertas, valorizado
// ============================================================

function actualizarIndicadores(items) {
  const totalArt = items.length;

  const totalPares = items.reduce(
    (acc, it) => acc + it.talles.reduce((a, t) => a + t.stock, 0),
    0
  );

  const totalAlertas = items.filter((it) => it.alerta === true).length;

  const totalVal = items.reduce((acc, it) => acc + it.valorizado, 0);

  document.getElementById("metric-articulos").textContent = totalArt;
  document.getElementById("metric-pares").textContent = totalPares;
  document.getElementById("metric-alertas").textContent = totalAlertas;
  document.getElementById("metric-valorizado").textContent =
    "$" + Number(totalVal).toLocaleString("es-AR");
}
