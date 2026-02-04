// ============================================================
// DASHBOARD ENGINE — Barras (talle) + Torta (marca/rubro)
// ============================================================

const chartMode = document.getElementById("chart-mode");
let chartInstance = null;

// Paleta dinámica para tortas
const PALETA = [
  "#4fc3f7", "#7c4dff", "#ff8a00", "#3dff7d",
  "#ff4f6a", "#00c4b4", "#ffd600", "#9c27b0",
  "#03a9f4", "#8bc34a", "#ff9800", "#e91e63"
];

function actualizarDashboard(items) {
  const canvas = document.getElementById("stockChart");
  if (!canvas) return;

  // Si no hay datos → limpiar dashboard
  if (!items || !items.length) {
    if (chartInstance) chartInstance.destroy();
    return;
  }

  const mode = chartMode?.value || "talle";

  // Destruir gráfico previo
  if (chartInstance) chartInstance.destroy();

  const ctx = canvas.getContext("2d");

  // ============================================================
  // MODO: TALLE (BARRAS)
  // ============================================================
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
            borderColor: "#0288d1",
            borderWidth: 1
          },
        ],
      },
      options: {
        responsive: true,
        plugins: {
          legend: { display: false }
        },
        scales: {
          y: { beginAtZero: true }
        }
      },
    });

    return;
  }

  // ============================================================
  // MODO: MARCA (TORTA)
  // ============================================================
  if (mode === "marca") {
    const marcas = {};

    items.forEach((i) => {
      if (!i.marca) return;
      marcas[i.marca] = (marcas[i.marca] || 0) + 1;
    });

    chartInstance = new Chart(ctx, {
      type: "pie",
      data: {
        labels: Object.keys(marcas),
        datasets: [
          {
            data: Object.values(marcas),
            backgroundColor: PALETA.slice(0, Object.keys(marcas).length),
          },
        ],
      },
      options: {
        responsive: true,
        plugins: {
          legend: { position: "bottom" }
        }
      }
    });

    return;
  }

  // ============================================================
  // MODO: RUBRO (TORTA)
  // ============================================================
  if (mode === "rubro") {
    const rubros = {};

    items.forEach((i) => {
      if (!i.rubro) return;
      rubros[i.rubro] = (rubros[i.rubro] || 0) + 1;
    });

    chartInstance = new Chart(ctx, {
      type: "pie",
      data: {
        labels: Object.keys(rubros),
        datasets: [
          {
            data: Object.values(rubros),
            backgroundColor: PALETA.slice(0, Object.keys(rubros).length),
          },
        ],
      },
      options: {
        responsive: true,
        plugins: {
          legend: { position: "bottom" }
        }
      }
    });

    return;
  }
}
