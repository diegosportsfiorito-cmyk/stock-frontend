// ============================================================
// DASHBOARD ENGINE — Gráfico dinámico de distribución (Torta)
// ============================================================

let chartInstance = null;

// ============================================================
// Normalización de campos
// ============================================================

function normalizarCampo(v) {
  if (!v) return "—";
  const s = String(v).trim().toUpperCase();
  if (s === "NAN" || s === "NULL" || s === "UNDEFINED") return "—";
  return v;
}

// ============================================================
// Paleta dinámica suave
// ============================================================

function generarColores(n) {
  const colores = [];
  for (let i = 0; i < n; i++) {
    const hue = (i * 37) % 360;
    colores.push(`hsl(${hue}, 70%, 55%)`);
  }
  return colores;
}

// ============================================================
// Construcción de datasets
// ============================================================

function datasetPorTalle(items) {
  const map = new Map();
  items.forEach(item => {
    (item.talles || []).forEach(t => {
      const key = normalizarCampo(t.talle);
      map.set(key, (map.get(key) || 0) + t.stock);
    });
  });

  const labels = Array.from(map.keys()).sort((a, b) => Number(a) - Number(b));
  const data = labels.map(l => map.get(l));

  return { labels, data };
}

function datasetPorMarca(items) {
  const map = new Map();
  items.forEach(item => {
    let total = 0;
    (item.talles || []).forEach(t => total += t.stock);
    const key = normalizarCampo(item.marca);
    map.set(key, (map.get(key) || 0) + total);
  });

  const labels = Array.from(map.keys()).sort((a, b) => map.get(b) - map.get(a));
  const data = labels.map(l => map.get(l));

  return { labels, data };
}

function datasetPorRubro(items) {
  const map = new Map();
  items.forEach(item => {
    let total = 0;
    (item.talles || []).forEach(t => total += t.stock);
    const key = normalizarCampo(item.rubro);
    map.set(key, (map.get(key) || 0) + total);
  });

  const labels = Array.from(map.keys()).sort((a, b) => map.get(b) - map.get(a));
  const data = labels.map(l => map.get(l));

  return { labels, data };
}

// ============================================================
// Render del gráfico (mejorado)
// ============================================================

function actualizarDashboard(items) {
  const canvas = document.getElementById("stockChart");
  const modeSelect = document.getElementById("chart-mode");

  if (!canvas || !modeSelect) return;

  const mode = modeSelect.value;
  let dataset;

  if (mode === "marca") dataset = datasetPorMarca(items);
  else if (mode === "rubro") dataset = datasetPorRubro(items);
  else dataset = datasetPorTalle(items);

  const ctx = canvas.getContext("2d");

  if (chartInstance) chartInstance.destroy();

  const total = dataset.data.reduce((a, b) => a + b, 0);
  const colores = generarColores(dataset.labels.length);
  const isLight = document.body.classList.contains("light-mode");

  // Si hay demasiadas categorías, cambiar a barras automáticamente
  const tipo = dataset.labels.length > 12 ? "bar" : "pie";

  chartInstance = new Chart(ctx, {
    type: tipo,
    data: {
      labels: dataset.labels,
      datasets: [
        {
          data: dataset.data,
          backgroundColor: colores,
          borderWidth: 1,
          borderColor: isLight ? "#e5e7eb" : "#111827"
        }
      ]
    },
    options: {
      responsive: true,
      animation: {
        duration: 900,
        easing: "easeOutQuart"
      },
      plugins: {
        legend: {
          position: "bottom",
          labels: {
            color: isLight ? "#333" : "#9ca3af",
            font: { size: 12 }
          }
        },
        tooltip: {
          callbacks: {
            label: function (ctx) {
              const valor = ctx.raw;
              const pct = ((valor / total) * 100).toFixed(1);
              return `${ctx.label}: ${valor} (${pct}%)`;
            }
          }
        },
        datalabels: {
          color: isLight ? "#333" : "#fff",
          formatter: function (value) {
            const pct = (value / total) * 100;
            return pct >= 5 ? pct.toFixed(1) + "%" : "";
          },
          font: {
            weight: "bold",
            size: 11
          }
        }
      },
      scales: tipo === "bar" ? {
        x: {
          ticks: { color: isLight ? "#333" : "#9ca3af" }
        },
        y: {
          ticks: { color: isLight ? "#333" : "#9ca3af" }
        }
      } : {}
    },
    plugins: [ChartDataLabels]
  });
}

window.actualizarDashboard = actualizarDashboard;
