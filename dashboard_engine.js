// ============================================================
// DASHBOARD ENGINE — Gráficos por talle / marca / rubro
// Versión corregida y optimizada para layout móvil + UI Engine
// ============================================================

let stockChart = null;

// ------------------------------------------------------------
// PREPARAR DATOS SEGÚN MODO
// ------------------------------------------------------------
function prepararDatos(items, modo) {
  const conteo = {};

  for (const item of items) {
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

    else if (modo === "marca") {
      const m = item.marca || "Sin marca";
      const total = Array.isArray(item.talles)
        ? item.talles.reduce((acc, t) => acc + t.stock, 0)
        : 0;

      if (!conteo[m]) conteo[m] = 0;
      conteo[m] += total;
    }

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
  const canvas = document.getElementById("stockChart");

  if (!canvas) return;

  // Fix: asegurar que el canvas se ajuste al contenedor
  canvas.style.width = "100%";
  canvas.style.height = "100%";

  const { labels, valores } = prepararDatos(items, modo);

  // Tipo de gráfico según modo
  let tipo = "pie";
  if (modo === "marca") tipo = "bar";
  if (modo === "rubro") tipo = "line";

  // Destruir gráfico previo
  if (stockChart) {
    try {
      stockChart.destroy();
    } catch (_) {}
  }

  // Colores adaptados a modo día/noche
  const isLight = document.body.classList.contains("light-mode");
  const textColor = isLight ? "#222" : "#ccc";

  stockChart = new Chart(canvas, {
    type: tipo,
    data: {
      labels,
      datasets: [
        {
          label: "Stock",
          data: valores,
          backgroundColor: generarColores(labels.length),
          borderColor: isLight ? "#000" : "#fff",
          borderWidth: 1,
          tension: 0.3,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false, // Fix móvil
      plugins: {
        legend: {
          position: "bottom",
          labels: {
            color: textColor,
            font: { size: 11 },
          },
        },
      },
      scales:
        tipo !== "pie"
          ? {
              x: {
                ticks: { color: textColor, maxRotation: 45, minRotation: 0 },
                grid: { color: isLight ? "#ddd" : "#444" },
              },
              y: {
                ticks: { color: textColor },
                grid: { color: isLight ? "#ddd" : "#444" },
              },
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

// ------------------------------------------------------------
// EVENTOS: CAMBIO DE MODO
// ------------------------------------------------------------
document.getElementById("chart-mode")?.addEventListener("change", () => {
  if (window.AppCore?.state?.items) {
    actualizarDashboard(AppCore.state.items);
  }
});

// Exponer función global
window.actualizarDashboard = actualizarDashboard;
