// ============================================================
// ESTADO GLOBAL ORB
// ============================================================
window.ORB = {
  results: [],
  view: "resumen",
  stockOnly: localStorage.getItem("stockOnly") === "true",
  favorites: new Set(JSON.parse(localStorage.getItem("favorites") || "[]")),
  sort: { field: "descripcion", dir: "asc" },
  page: 1,
  pageSize: 30,
  catalogos: null
};

function favKey(r) {
  return `${r.articulo || r.codigo}-${r.talle}`;
}

function toggleFavorite(r) {
  const key = favKey(r);
  if (ORB.favorites.has(key)) {
    ORB.favorites.delete(key);
  } else {
    ORB.favorites.add(key);
  }
  localStorage.setItem("favorites", JSON.stringify(Array.from(ORB.favorites)));
  renderResults();
}

function formatNumber(n) {
  return Number(n || 0).toLocaleString("es-AR");
}

// Filtros
function applyFilters(data) {
  const marca = document.getElementById("filterMarca").value || "";
  const rubro = document.getElementById("filterRubro").value || "";
  const talle = document.getElementById("filterTalle").value || "";

  let out = data.slice();

  if (marca) out = out.filter(r => r.marca === marca);
  if (rubro) out = out.filter(r => r.rubro === rubro);
  if (talle) out = out.filter(r => r.talle === talle);

  if (ORB.stockOnly) {
    out = out.filter(r => Number(r.stock) > 0);
  }

  return out;
}

function updateFilterOptionsFromCatalog() {
  if (!ORB.catalogos) return;

  const { marcas, rubros, talles } = ORB.catalogos;

  const selMarca = document.getElementById("filterMarca");
  const selRubro = document.getElementById("filterRubro");
  const selTalle = document.getElementById("filterTalle");

  const prevMarca = selMarca.value;
  const prevRubro = selRubro.value;
  const prevTalle = selTalle.value;

  selMarca.innerHTML = `<option value="">Marca</option>` +
    (marcas || []).map(m => `<option value="${m}">${m}</option>`).join("");

  selRubro.innerHTML = `<option value="">Rubro</option>` +
    (rubros || []).map(r => `<option value="${r}">${r}</option>`).join("");

  selTalle.innerHTML = `<option value="">Talle</option>` +
    (talles || []).map(t => `<option value="${t}">${t}</option>`).join("");

  if (prevMarca) selMarca.value = prevMarca;
  if (prevRubro) selRubro.value = prevRubro;
  if (prevTalle) selTalle.value = prevTalle;
}

// Ordenamiento
function sortData(data) {
  const { field, dir } = ORB.sort;
  const mult = dir === "asc" ? 1 : -1;

  return data.slice().sort((a, b) => {
    let va = a[field];
    let vb = b[field];

    if (["stock", "precio", "valorizado"].includes(field)) {
      va = Number(va) || 0;
      vb = Number(vb) || 0;
    } else {
      va = (va || "").toString().toUpperCase();
      vb = (vb || "").toString().toUpperCase();
    }

    if (va < vb) return -1 * mult;
    if (va > vb) return 1 * mult;
    return 0;
  });
}

// Paginación
function paginate(data) {
  const total = data.length;
  const totalPages = Math.max(1, Math.ceil(total / ORB.pageSize));

  if (ORB.page > totalPages) ORB.page = totalPages;

  const start = (ORB.page - 1) * ORB.pageSize;
  const end = start + ORB.pageSize;

  const pageData = data.slice(start, end);

  document.getElementById("pageInfo").textContent =
    `${ORB.page} / ${totalPages} (${total} resultados)`;

  return pageData;
}

// Estadísticas por rubro
function computeStatsByRubro(data) {
  const map = new Map();

  for (const r of data) {
    const rubro = r.rubro || "SIN RUBRO";
    const stock = Number(r.stock) || 0;

    if (!map.has(rubro)) {
      map.set(rubro, { rubro, articulos: new Set(), pares: 0 });
    }

    const obj = map.get(rubro);
    obj.articulos.add(r.articulo || r.codigo);
    obj.pares += stock;
  }

  return Array.from(map.values()).map(x => ({
    rubro: x.rubro,
    articulos: x.articulos.size,
    pares: x.pares
  }));
}

// Render vistas
function renderResumen(data) {
  const cont = document.getElementById("resultsContainer");
  cont.innerHTML = data.map(r => {
    const key = favKey(r);
    const isFav = ORB.favorites.has(key);
    const stock = Number(r.stock) || 0;

    const stockClass =
      stock <= 2 && stock > 0 ? "stock-low" :
      stock > 2 ? "stock-ok" : "";

    return `
      <div class="result-item">
        <div class="result-left">
          <div><strong>${r.articulo}</strong> - ${r.descripcion}</div>
          <div style="font-size:12px;color:#9aa2b4;">
            ${r.marca} · ${r.rubro} · Talle ${r.talle}
          </div>
        </div>

        <div class="result-right">
          <div class="${stockClass}">${stock} pares</div>
          <div style="font-size:12px;color:#9aa2b4;">
            $${formatNumber(r.precio)} · $${formatNumber(r.valorizado)}
          </div>
          <button class="fav-btn ${isFav ? "on" : ""}" data-key="${key}">★</button>
        </div>
      </div>
    `;
  }).join("");
}

function renderLista(data) {
  const cont = document.getElementById("resultsContainer");
  cont.innerHTML = data.map(r => `
    <div class="group-item">
      ${r.articulo} - ${r.descripcion} · ${r.marca} · ${r.rubro} · Talle ${r.talle} · ${r.stock} pares
    </div>
  `).join("");
}

function renderTabla(data) {
  const cont = document.getElementById("resultsContainer");

  let html = `
    <table class="table-view">
      <thead>
        <tr>
          <th>Artículo</th>
          <th>Descripción</th>
          <th>Marca</th>
          <th>Rubro</th>
          <th>Color</th>
          <th>Talle</th>
          <th>Stock</th>
          <th>Precio</th>
          <th>Valorizado</th>
        </tr>
      </thead>
      <tbody>
  `;

  for (const r of data) {
    html += `
      <tr>
        <td>${r.articulo}</td>
        <td>${r.descripcion}</td>
        <td>${r.marca}</td>
        <td>${r.rubro}</td>
        <td>${r.color}</td>
        <td>${r.talle}</td>
        <td>${r.stock}</td>
        <td>$${formatNumber(r.precio)}</td>
        <td>$${formatNumber(r.valorizado)}</td>
      </tr>
    `;
  }

  html += "</tbody></table>";
  cont.innerHTML = html;
}

function groupBy(arr, key) {
  const map = new Map();
  for (const r of arr) {
    const k = r[key] || "SIN " + key.toUpperCase();
    if (!map.has(k)) map.set(k, []);
    map.get(k).push(r);
  }
  return map;
}

function renderPorMarca(data) {
  const cont = document.getElementById("resultsContainer");
  const groups = groupBy(data, "marca");

  let html = "";
  for (const [marca, items] of groups.entries()) {
    const totalPares = items.reduce((a, r) => a + (Number(r.stock) || 0), 0);

    html += `
      <div class="group-block">
        <div class="group-header">
          <span>${marca}</span>
          <span>${items.length} artículos · ${totalPares} pares</span>
        </div>
        <div class="group-body">
          ${items.map(r => `
            <div class="group-item">
              ${r.articulo} - ${r.descripcion} · Talle ${r.talle} · ${r.stock} pares
            </div>
          `).join("")}
        </div>
      </div>
    `;
  }

  cont.innerHTML = html || "<div class='empty'>Sin resultados</div>";
}

function renderPorArticulo(data) {
  const cont = document.getElementById("resultsContainer");
  const groups = groupBy(data, "articulo");

  let html = "";
  for (const [art, items] of groups.entries()) {
    const totalPares = items.reduce((a, r) => a + (Number(r.stock) || 0), 0);

    html += `
      <div class="group-block">
        <div class="group-header">
          <span>${art}</span>
          <span>${items.length} talles · ${totalPares} pares</span>
        </div>
        <div class="group-body">
          ${items.map(r => `
            <div class="group-item">
              Talle ${r.talle} · ${r.stock} pares · ${r.marca} · ${r.rubro}
            </div>
          `).join("")}
        </div>
      </div>
    `;
  }

  cont.innerHTML = html || "<div class='empty'>Sin resultados</div>";
}

function renderDashboard(data) {
  const cont = document.getElementById("resultsContainer");

  const stats = computeStatsByRubro(data)
    .sort((a,b) => b.pares - a.pares)
    .slice(0, 5);

  const max = Math.max(...stats.map(s => s.pares), 1);

  cont.innerHTML = `
    <div class="dash-block">
      <div class="dash-block-title">Top rubros por pares</div>
      ${stats.map(s => `
        <div class="dash-rubro-item">
          <div>${s.rubro}</div>
          <div class="bar-row">
            <div class="bar" style="width:${(s.pares / max) * 100}%"></div>
            <span>${s.pares} pares</span>
          </div>
        </div>
      `).join("")}
    </div>
  `;
}

// Render principal
function renderResults() {
  const subtitle = document.getElementById("resultsSubtitle");

  if (!ORB.results.length) {
    subtitle.textContent = "Sin resultados. Hacé una búsqueda para empezar.";
    document.getElementById("resultsContainer").innerHTML = "";
    document.getElementById("dashArticulos").textContent = 0;
    document.getElementById("dashPares").textContent = 0;
    document.getElementById("dashAlertas").textContent = 0;
    document.getElementById("dashValorizado").textContent = "$0";
    document.getElementById("dashRubros").innerHTML = "";
    document.getElementById("pageInfo").textContent = "0 / 0 (0 resultados)";
    return;
  }

  let data = ORB.results.slice();

  updateFilterOptionsFromCatalog();
  data = applyFilters(data);
  data = sortData(data);

  const totalArt = data.length;
  const totalPares = data.reduce((a, r) => a + (Number(r.stock) || 0), 0);
  const alertas = data.filter(r => Number(r.stock) > 0 && Number(r.stock) <= 2).length;
  const totalVal = data.reduce((a, r) => a + (Number(r.valorizado) || 0), 0);

  document.getElementById("dashArticulos").textContent = totalArt;
  document.getElementById("dashPares").textContent = totalPares;
  document.getElementById("dashAlertas").textContent = alertas;
  document.getElementById("dashValorizado").textContent = "$" + formatNumber(totalVal);

  const statsRubros = computeStatsByRubro(data)
    .sort((a,b) => b.pares - a.pares)
    .slice(0, 5);

  document.getElementById("dashRubros").innerHTML = statsRubros.map(s => `
    <div class="dash-rubro-item">
      <div>${s.rubro}</div>
      <div>${s.articulos} artículos · ${s.pares} pares</div>
    </div>
  `).join("");

  const pageData = paginate(data);

  subtitle.textContent = `${data.length} resultados filtrados`;

  if (ORB.view === "resumen") renderResumen(pageData);
  else if (ORB.view === "lista") renderLista(pageData);
  else if (ORB.view === "tabla") renderTabla(pageData);
  else if (ORB.view === "marca") renderPorMarca(data);
  else if (ORB.view === "articulo") renderPorArticulo(data);
  else if (ORB.view === "dashboard") renderDashboard(data);
}

// Export CSV
function exportToCSV(data) {
  if (!data || !data.length) return;

  const headers = [
    "articulo", "descripcion", "marca", "rubro",
    "color", "talle", "stock", "precio", "valorizado"
  ];

  const rows = data.map(r => headers.map(h => (r[h] != null ? r[h] : "")));

  let csv = headers.join(";") + "\n";
  csv += rows.map(row => row.join(";")).join("\n");

  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "stock_export.csv";
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

window.exportToCSV = exportToCSV;

window.addEventListener("DOMContentLoaded", () => {
  renderResults();
});
