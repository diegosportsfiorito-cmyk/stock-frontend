// ============================================================
// INDICATORS ENGINE — Hook para métricas globales
// ============================================================

function actualizarIndicadoresExternos(payload) {
  // payload = { articulos, pares, alertas, valorizado }
  // Hook listo para futuras integraciones.
  console.log("Indicadores actualizados:", payload);
}

window.actualizarIndicadores = actualizarIndicadoresExternos;
