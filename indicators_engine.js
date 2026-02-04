// ============================================================
// INDICATORS ENGINE — Artículos, pares, alertas, valorizado
// ============================================================

function actualizarIndicadores(items) {
  const elArt = document.getElementById("metric-articulos");
  const elPares = document.getElementById("metric-pares");
  const elAlertas = document.getElementById("metric-alertas");
  const elVal = document.getElementById("metric-valorizado");

  if (!elArt || !elPares || !elAlertas || !elVal) return;

  // Total artículos
  const totalArt = items.length;

  // Total pares (sumatoria de todos los talles)
  const totalPares = items.reduce(
    (acc, it) => acc + it.talles.reduce((a, t) => a + t.stock, 0),
    0
  );

  // ALERTAS REALES: talles con stock 0 o 1
  let totalAlertas = 0;
  items.forEach((it) => {
    it.talles.forEach((t) => {
      if (t.stock <= 1) totalAlertas++;
    });
  });

  // Total valorizado
  const totalVal = items.reduce((acc, it) => acc + it.valorizado, 0);

  // Render
  elArt.textContent = totalArt;
  elPares.textContent = totalPares;
  elAlertas.textContent = totalAlertas;
  elVal.textContent = "$" + Number(totalVal).toLocaleString("es-AR");

  // ============================================================
  // INDICADORES CLICKEABLES
  // ============================================================

  // Artículos → muestra todos
  elArt.onclick = () => {
    AppCore.renderResultados(AppCore.state.items);
  };

  // Pares → muestra todos
  elPares.onclick = () => {
    AppCore.renderResultados(AppCore.state.items);
  };

  // Alertas → filtra solo talles críticos
  elAlertas.onclick = () => {
    const criticos = [];

    AppCore.state.items.forEach((it) => {
      const tallesCriticos = it.talles.filter((t) => t.stock <= 1);

      if (tallesCriticos.length > 0) {
        criticos.push({
          ...it,
          talles: tallesCriticos
        });
      }
    });

    AppCore.renderResultados(criticos);
  };

  // Valorizado → muestra todos
  elVal.onclick = () => {
    AppCore.renderResultados(AppCore.state.items);
  };
}
