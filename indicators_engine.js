// ============================================================
// INDICATORS ENGINE — Actualización de métricas globales
// ============================================================
//
// payload esperado:
// {
//   articulos: number,
//   pares: number,
//   negativos: number,
//   cero: number,
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
    if (el) el.textContent = payload.articulos;
  }

  // Pares
  if (payload.pares !== undefined) {
    const el = document.getElementById("metric-pares-value");
    if (el) el.textContent = payload.pares;
  }

  // Stock negativo
  if (payload.negativos !== undefined) {
    const el = document.getElementById("metric-negativos-value");
    if (el) el.textContent = payload.negativos;
  }

  // Cero stock
  if (payload.cero !== undefined) {
    const el = document.getElementById("metric-cero-value");
    if (el) el.textContent = payload.cero;
  }

  // Valorizado
  if (payload.valorizado !== undefined) {
    const el = document.getElementById("metric-valorizado-value");
    if (el) el.textContent = "$" + payload.valorizado.toLocaleString("es-AR");
  }

  // Log para debugging
  console.log("Indicadores actualizados:", payload);
}

// Exponer función global
window.actualizarIndicadores = actualizarIndicadoresExternos;
