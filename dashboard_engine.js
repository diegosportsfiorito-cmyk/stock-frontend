// ============================================================
// DASHBOARD ENGINE — Gráficos por talle / marca / rubro
// Compatible con app_core_v3.js y backend actual
// ============================================================

let stockChart = null;

// ------------------------------------------------------------
// PREPARAR DATOS SEGÚN MODO
// ------------------------------------------------------------
function prepararDatos(items, modo) {
  const conteo = {};

  for (const item of items) {
    // TALLE
    if (modo === "talle") {
      if (Array.isArray(item.talles)) {
        for (const t of item.talles) {
          const talle = t.talle;
          const cant = t.stock || 0;
          if (!conteo[talle]) conteo[talle] = 0;
          conteo[talle] += cant;
        }
      }
    }

    // MARCA
    else if (modo === "marca") {
      const m = item.marca || "Sin marca";
      const total = Array.isArray(item.talles)
        ? item.talles.reduce((acc, t) => acc + t.stock, 0)
        : 0;

      if (!conteo[m]) conteo[m] = 0;
      conteo[m] += total;
    }

    // RUBRO
    else if (modo === "rubro") {
      const r = item.rubro || "Sin rubro";
      const total = Array.isArray(item.talles)
        ? item.talles.reduce((acc, t) => acc + t.stock, 0)
        : 0;

      if (!conteo[r]) conteo[r] = 0;
      conteo[r] += total;
    }
  }

  return {
    labels: Object.keys(conteo),
    valores: Object.values(conteo),
  };
}

// ------------------------------------------------------------
// ACTUALIZAR DASHBOARD
// ------------------------------------------------------------
function actualizarDashboard(items) {
  const modo = document.getElementById("chart-mode")?.value || "talle";
  const ctx = document.getElementById("stockChart");

  if (!ctx) return;

  const { labels, valores } = prepararDatos(items, modo);

  // Tipo de gráfico según modo
  let tipo = "pie";
  if (modo === "marca") tipo = "bar";
  if (modo === "rubro") tipo = "line";

  if (stockChart) stockChart.destroy();

  stockChart = new Chart(ctx, {
    type: tipo,
    data: {
      labels,
      datasets: [
        {
          label: "Stock",
          data: valores,
          backgroundColor: generarColores(labels.length),
          borderColor: "#fff",
          borderWidth: 1,
          tension: 0.3,
        },
      ],
    },
    options: {
      responsive: true,
      plugins: {
        legend: {
          position: "bottom",
          labels: {
            color: "#ccc",
            font: { size: 11 },
          },
        },
      },
      scales:
        tipo !== "pie"
          ? {
              x: { ticks: { color: "#ccc" } },
              y: { ticks: { color: "#ccc" } },
            }
          : {},
    },
  });
}

// ------------------------------------------------------------
// GENERAR PALETA DE COLORES
// ------------------------------------------------------------
function generarColores(n) {
  const colores = [];
  for (let i = 0; i < n; i++) {
    const h = Math.floor((360 / n) * i);
    colores.push(`hsl(${h}, 70%, 55%)`);
  }
  return colores;
}

// Exponer función global
window.actualizarDashboard = actualizarDashboard;
