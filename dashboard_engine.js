// ============================================================
// DASHBOARD ENGINE — Gráfico dinámico de distribución (Torta)
// ============================================================

let chartInstance = null;

// ------------------ Construcción de datasets ------------------

function datasetPorTalle(items) {
  const map = new Map();
  items.forEach(item => {
    item.talles.forEach(t => {
      map.set(t.talle, (map.get(t.talle) || 0) + t.stock);
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
    item.talles.forEach(t => total += t.stock);
    const key = item.marca || "Sin marca";
    map.set(key, (map.get(key) || 0) + total);
  });

  const labels = Array.from(map.keys());
  const data = labels.map(l => map.get(l));

  return { labels, data };
}

function datasetPorRubro(items) {
  const map = new Map();
  items.forEach(item => {
    let total = 0;
    item.talles.forEach(t => total += t.stock);
    const key = item.rubro || "Sin rubro";
    map.set(key, (map.get(key) || 0) + total);
  });

  const labels = Array.from(map.keys());
  const data = labels.map(l => map.get(l));

  return { labels, data };
}

// ------------------ Render del gráfico ------------------

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

  chartInstance = new Chart(ctx, {
    type: "pie",
    data: {
      labels: dataset.labels,
      datasets: [
        {
          data: dataset.data,
          backgroundColor: [
            "#4fc3f7",
            "#81c784",
            "#ffb74d",
            "#e57373",
            "#ba68c8",
            "#ffd54f",
            "#4db6ac",
            "#9575cd",
            "#f06292",
            "#64b5f6",
            "#aed581",
            "#ff8a65"
          ],
          borderWidth: 1,
          borderColor: "#111827"
        }
      ]
    },
    options: {
      responsive: true,
      plugins: {
        legend: {
          position: "bottom",
          labels: {
            color: "#9ca3af",
            font: { size: 12 }
          }
        }
      }
    }
  });
}

window.actualizarDashboard = actualizarDashboard;
