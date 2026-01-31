import { backendQuery } from "./backend.js";
import { currentView, soloStock, setBackendStatus, setFooterStatus, loadCatalogosIntoFilters, getFilters } from "./ui.js";

const searchInput = document.getElementById("searchInput");
const btnSearch = document.getElementById("btnSearch");
const resultsContainer = document.getElementById("resultsContainer");
const resultsCount = document.getElementById("resultsCount");
const dashArticulos = document.getElementById("dashArticulos");
const dashPares = document.getElementById("dashPares");
const dashAlertas = document.getElementById("dashAlertas");
const dashValorizado = document.getElementById("dashValorizado");
const dashboardExtra = document.getElementById("dashboardExtra");
const btnPrev = document.getElementById("btnPrev");
const btnNext = document.getElementById("btnNext");

let lastResult = null;
let currentPage = 0;
const PAGE_SIZE = 20;

async function init() {
  setBackendStatus(false);
  setFooterStatus("Cargando catálogos...");
  await loadCatalogosIntoFilters();
  setFooterStatus("Listo para buscar");
  setBackendStatus(true);
}

init();

btnSearch.addEventListener("click", () => {
  doSearch();
});

searchInput.addEventListener("keydown", (e) => {
  if (e.key === "Enter") {
    e.preventDefault();
    doSearch();
  }
});

btnPrev.addEventListener("click", () => {
  if (!lastResult) return;
  if (currentPage > 0) {
    currentPage--;
    renderResults(lastResult);
  }
});

btnNext.addEventListener("click", () => {
  if (!lastResult) return;
  const totalPages = Math.ceil(lastResult.items.length / PAGE_SIZE);
  if (currentPage < totalPages - 1) {
    currentPage++;
    renderResults(lastResult);
  }
});

document.addEventListener("viewChanged", () => {
  if (lastResult) renderResults(lastResult);
});

async function doSearch() {
  const q = searchInput.value.trim();
  if (!q) return;

  setFooterStatus("Buscando...");
  btnSearch.disabled = true;

  try {
    const data = await backendQuery({ q, soloStock });
    lastResult = data;
    currentPage = 0;
    renderResults(data);
    setFooterStatus("Búsqueda completada");
    setBackendStatus(true);
  } catch (err) {
    console.error(err);
    setFooterStatus("Error al consultar backend");
    setBackendStatus(false);
  } finally {
    btnSearch.disabled = false;
  }
}

function renderResults(data) {
  if (!data || !data.items) {
    resultsContainer.innerHTML = "<p>Sin resultados.</p>";
    resultsCount.textContent = "0 resultados";
    updateDashboard([]);
    return;
  }

  const items = data.items;
  resultsCount.textContent = `${items.length} resultados`;

  updateDashboard(items);

  const filters = getFilters();
  let filtered = items.filter((r) => {
    if (filters.marca && String(r.marca || "").toUpperCase() !== filters.marca.toUpperCase()) return false;
    if (filters.rubro && String(r.rubro || "").toUpperCase() !== filters.rubro.toUpperCase()) return false;
    if (filters.talle) {
      const hasTalle = (r.talles || []).some((t) => String(t.talle) === filters.talle);
      if (!hasTalle) return false;
    }
    return true;
  });

  const q = searchInput.value.trim().toUpperCase();
  if (q) {
    const exact = filtered.filter((r) => String(r.codigo || "").toUpperCase() === q);
    if (exact.length > 0) {
      filtered = exact;
    }
  }

  const start = currentPage * PAGE_SIZE;
  const pageItems = filtered.slice(start, start + PAGE_SIZE);

  if (currentView === "resumen") {
    renderResumen(pageItems);
  } else if (currentView === "lista") {
    renderLista(filtered);
  } else if (currentView === "tabla") {
    renderTabla(filtered);
  } else if (currentView === "marca") {
    renderPorMarca(filtered);
  } else if (currentView === "articulo") {
    renderPorArticulo(filtered);
  } else if (currentView === "dashboard") {
    renderDashboardView(filtered);
  } else {
    renderResumen(pageItems);
  }
}

function updateDashboard(items) {
  const articulos = items.length;
  let pares = 0;
  let valorizado = 0;
  let alertas = 0;

  items.forEach((r) => {
    (r.talles || []).forEach((t) => {
      const stock = Number(t.stock) || 0;
      pares += stock;
      if (stock > 0 && stock <= 2) alertas += 1;
    });
    valorizado += Number(r.valorizado) || 0;
  });

  dashArticulos.textContent = articulos;
  dashPares.textContent = pares;
  dashAlertas.textContent = alertas;
  dashValorizado.textContent = `$${valorizado.toLocaleString("es-AR")}`;

  renderDashboardPie(items);
}

function renderDashboardPie(items) {
  const byRubro = computeStatsByRubro(items);
  const total = byRubro.reduce((a, s) => a + s.pares, 0) || 1;

  let angle = 0;
  const segments = [];

  byRubro.forEach((s, i) => {
    const pct = (s.pares / total) * 360;
    const color = `hsl(${i * 40}, 70%, 60%)`;
    segments.push(`${color} ${angle}deg ${angle + pct}deg`);
    angle += pct;
  });

  dashboardExtra.innerHTML = `
    <div class="pie-chart" style="--segments: ${segments.join(",")}"></div>
    <div class="dash-rubros">
      ${byRubro
        .map((s) => `<div class="dash-rubro-item">${s.rubro || "Sin rubro"} — ${s.pares} pares</div>`)
        .join("")}
    </div>
  `;
}

function computeStatsByRubro(items) {
  const map = new Map();
  items.forEach((r) => {
    const rubro = r.rubro || "Sin rubro";
    let entry = map.get(rubro);
    if (!entry) {
      entry = { rubro, pares: 0 };
      map.set(rubro, entry);
    }
    (r.talles || []).forEach((t) => {
      entry.pares += Number(t.stock) || 0;
    });
  });
  return Array.from(map.values()).sort((a, b) => b.pares - a.pares);
}

function renderResumen(items) {
  resultsContainer.innerHTML = items
    .map((r) => {
      const pares = (r.talles || []).reduce((a, t) => a + (Number(t.stock) || 0), 0);
      return `
      <div class="result-card">
        <div class="result-main-line">
          ${r.codigo || ""} - ${r.descripcion || ""}
        </div>
        <div class="result-sub-line">
          ${r.marca || ""} - ${r.rubro || ""} - ${r.color || "" || ""}
        </div>
        <div class="result-meta-line">
          ${pares} pares · $${(r.precio || 0).toLocaleString("es-AR")} · $${(r.valorizado || 0).toLocaleString("es-AR")}
        </div>
      </div>
    `;
    })
    .join("");
}

function renderLista(items) {
  const groups = groupBy(items, "codigo");

  let html = `
    <table class="table-view">
      <thead>
        <tr>
          <th>Artículo</th>
          <th>Descripción</th>
          <th>Total pares</th>
        </tr>
      </thead>
      <tbody>
  `;

  for (const [art, rows] of groups.entries()) {
    const descripcion = rows[0].descripcion || "";
    const totalPares = rows.reduce(
      (a, r) => a + (r.talles || []).reduce((x, t) => x + (Number(t.stock) || 0), 0),
      0
    );

    html += `
      <tr>
        <td>${art}</td>
        <td>${descripcion}</td>
        <td>${totalPares}</td>
      </tr>
    `;
  }

  html += "</tbody></table>";
  resultsContainer.innerHTML = html;
}

function renderTabla(items) {
  let html = `
    <table class="table-view">
      <thead>
        <tr>
          <th>Artículo</th>
          <th>Descripción</th>
          <th>Marca</th>
          <th>Rubro</th>
          <th>Color</th>
          <th>Pares</th>
          <th>Lista</th>
          <th>Valorizado</th>
        </tr>
      </thead>
      <tbody>
  `;

  items.forEach((r) => {
    const pares = (r.talles || []).reduce((a, t) => a + (Number(t.stock) || 0), 0);
    html += `
      <tr>
        <td>${r.codigo || ""}</td>
        <td>${r.descripcion || ""}</td>
        <td>${r.marca || ""}</td>
        <td>${r.rubro || ""}</td>
        <td>${r.color || ""}</td>
        <td>${pares}</td>
        <td>$${(r.precio || 0).toLocaleString("es-AR")}</td>
        <td>$${(r.valorizado || 0).toLocaleString("es-AR")}</td>
      </tr>
    `;
  });

  html += "</tbody></table>";
  resultsContainer.innerHTML = html;
}

function renderPorMarca(items) {
  const map = new Map();
  items.forEach((r) => {
    const marca = r.marca || "Sin marca";
    let entry = map.get(marca);
    if (!entry) {
      entry = { marca, pares: 0, valorizado: 0 };
      map.set(marca, entry);
    }
    (r.talles || []).forEach((t) => {
      entry.pares += Number(t.stock) || 0;
    });
    entry.valorizado += Number(r.valorizado) || 0;
  });

  const rows = Array.from(map.values()).sort((a, b) => b.pares - a.pares);

  let html = `
    <table class="table-view">
      <thead>
        <tr>
          <th>Marca</th>
          <th>Pares</th>
          <th>Valorizado</th>
        </tr>
      </thead>
      <tbody>
  `;

  rows.forEach((r) => {
    html += `
      <tr>
        <td>${r.marca}</td>
        <td>${r.pares}</td>
        <td>$${r.valorizado.toLocaleString("es-AR")}</td>
      </tr>
    `;
  });

  html += "</tbody></table>";
  resultsContainer.innerHTML = html;
}

function renderPorArticulo(items) {
  const groups = groupBy(items, "codigo");

  let html = `
    <table class="table-view">
      <thead>
        <tr>
          <th>Artículo</th>
          <th>Descripción</th>
          <th>Pares</th>
          <th>Valorizado</th>
        </tr>
      </thead>
      <tbody>
  `;

  for (const [art, rows] of groups.entries()) {
    const descripcion = rows[0].descripcion || "";
    let pares = 0;
    let valorizado = 0;
    rows.forEach((r) => {
      (r.talles || []).forEach((t) => {
        pares += Number(t.stock) || 0;
      });
      valorizado += Number(r.valorizado) || 0;
    });

    html += `
      <tr>
        <td>${art}</td>
        <td>${descripcion}</td>
        <td>${pares}</td>
        <td>$${valorizado.toLocaleString("es-AR")}</td>
      </tr>
    `;
  }

  html += "</tbody></table>";
  resultsContainer.innerHTML = html;
}

function renderDashboardView(items) {
  renderResumen(items);
}

function groupBy(items, key) {
  const map = new Map();
  items.forEach((r) => {
    const k = r[key] || "";
    if (!map.has(k)) map.set(k, []);
    map.get(k).push(r);
  });
  return map;
}
