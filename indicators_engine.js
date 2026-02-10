// ============================================================
// INDICATORS ENGINE — Actualización de métricas globales
// ============================================================
//
// payload esperado:
// {
//   articulos: number,
//   pares: number,
//   alertas: number,
//   valorizado: number
// }
//
// Este engine actualiza las tarjetas de métricas del layout.
//

function actualizarIndicadoresExternos(payload) {
  if (!payload || typeof payload !== "object") return;

  // Artículos
  if (payload.articulos !== undefined) {
    const el = document.getElementById("metric-articulos-value");
    if (el) el.textContent = payload.articulos.toLocaleString("es-AR");
  }

  // Pares
  if (payload.pares !== undefined) {
    const el = document.getElementById("metric-pares-value");
    if (el) el.textContent = payload.pares.toLocaleString("es-AR");
  }

  // Negativos (si el backend lo envía como alertas)
  if (payload.alertas !== undefined) {
    const elNeg = document.getElementById("metric-negativos-value");
    if (elNeg) elNeg.textContent = payload.alertas.toLocaleString("es-AR");
  }

  // Valorizado
  if (payload.valorizado !== undefined) {
    const el = document.getElementById("metric-valorizado-value");
    if (el) el.textContent = "$" + payload.valorizado.toLocaleString("es-AR");
  }

  console.log("Indicadores actualizados:", payload);
}

// Exponer función global
window.actualizarIndicadores = actualizarIndicadoresExternos;
