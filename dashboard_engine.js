// ============================================================
// DASHBOARD ENGINE — Barras (talle) + Torta (marca/rubro)
// ============================================================

const chartMode = document.getElementById("chart-mode");
let chartInstance = null;

function actualizarDashboard(items) {
  if (!items.length) return;

  const mode = chartMode.value;
  const ctx = document.getElementById("stockChart");

  if (chartInstance) chartInstance.destroy();

  if (mode === "talle") {
    const tallesMap = {};

    items.forEach((item) => {
      item.talles.forEach((t) => {
        tallesMap[t.talle] = (tallesMap[t.talle] || 0) + t.stock;
      });
    });

    chartInstance = new Chart(ctx, {
      type: "bar",
      data: {
        labels: Object.keys(tallesMap),
        datasets: [
          {
            label: "Stock por talle",
            data: Object.values(tallesMap),
            backgroundColor: "#4fc3f7",
          },
        ],
      },
      options: { responsive: true },
    });
  }

  if (mode === "marca") {
    const marcas = {};

    items.forEach((i) => {
      marcas[i.marca] = (marcas[i.marca] || 0) + 1;
    });

    chartInstance = new Chart(ctx, {
      type: "pie",
      data: {
        labels: Object.keys(marcas),
        datasets: [
          {
            data: Object.values(marcas),
            backgroundColor: ["#4fc3f7", "#7c4dff", "#ff8a00", "#3dff7d"],
          },
        ],
      },
    });
  }

  if (mode === "rubro") {
    const rubros = {};

    items.forEach((i) => {
      rubros[i.rubro] = (rubros[i.rubro] || 0) + 1;
    });

    chartInstance = new Chart(ctx, {
      type: "pie",
      data: {
        labels: Object.keys(rubros),
        datasets: [
          {
            data: Object.values(rubros),
            backgroundColor: ["#4fc3f7", "#7c4dff", "#ff8a00", "#3dff7d"],
          },
        ],
      },
    });
  }
}
