let stockChart = null;

function prepararDatos(items, modo) {
  const conteo = {};

  for (const item of items) {
    if (modo === "talle") {
      const talles = item.talles || {};
      for (const t in talles) {
        const cant = talles[t] || 0;
        if (!conteo[t]) conteo[t] = 0;
        conteo[t] += cant;
      }
    } else if (modo === "marca") {
      const m = item.marca || "Sin marca";
      if (!conteo[m]) conteo[m] = 0;
      conteo[m] += item.stockTotal || 0;
    } else if (modo === "rubro") {
      const r = item.rubro || "Sin rubro";
      if (!conteo[r]) conteo[r] = 0;
      conteo[r] += item.stockTotal || 0;
    }
  }

  const labels = Object.keys(conteo);
  const valores = Object.values(conteo);

  return { labels, valores };
}

function actualizarDashboard(items) {
  const modo = document.getElementById("chart-mode")?.value || "talle";
  const ctx = document.getElementById("stockChart");

  if (!ctx) return;

  const { labels, valores } = prepararDatos(items, modo);

  if (stockChart) {
    stockChart.destroy();
  }

  stockChart = new Chart(ctx, {
    type: "pie",
    data: {
      labels,
      datasets: [
        {
          data: valores,
          backgroundColor: generarColores(labels.length),
          borderWidth: 1,
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
    },
  });
}

function generarColores(n) {
  const colores = [];
  for (let i = 0; i < n; i++) {
    const h = Math.floor((360 / n) * i);
    colores.push(`hsl(${h}, 70%, 55%)`);
  }
  return colores;
}

window.actualizarDashboard = actualizarDashboard;
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
