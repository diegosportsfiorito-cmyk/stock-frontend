// Estado global
window.ORB = {
  theme: localStorage.getItem("theme") || "dark",
  scannerMode: localStorage.getItem("scannerMode") || "3",
  stockOnly: localStorage.getItem("stockOnly") === "true",
  autoListen: localStorage.getItem("autoListen") === "true",
  currentView: "resumen",
  results: []
};

const beep = new Audio();
beep.src = "data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEAESsAACJWAAACABAAZGF0YQAAAAA=";

function setTheme(mode) {
  ORB.theme = mode;
  document.documentElement.setAttribute("data-theme", mode);
  localStorage.setItem("theme", mode);
  const toggle = document.getElementById("themeToggle");
  if (mode === "light") toggle.classList.add("on");
  else toggle.classList.remove("on");
}

function setScannerMode(mode) {
  ORB.scannerMode = mode;
  localStorage.setItem("scannerMode", mode);
  document.querySelectorAll(".scanner-segment").forEach(btn => {
    btn.classList.toggle("active", btn.dataset.mode === mode);
  });
}

function setStockOnly(on) {
  ORB.stockOnly = on;
  localStorage.setItem("stockOnly", on ? "true" : "false");
  document.getElementById("stockOnlyToggle").classList.toggle("active", on);
}

function setAutoListen(on) {
  ORB.autoListen = on;
  localStorage.setItem("autoListen", on ? "true" : "false");
  document.getElementById("voiceToggleBtn").classList.toggle("active", on);
}

function setView(view) {
  ORB.currentView = view;
  document.querySelectorAll(".results-view-tab").forEach(tab => {
    tab.classList.toggle("active", tab.dataset.view === view);
  });
  renderResults();
}

function normalizeText(text) {
  if (!text) return "";
  let t = text.toLowerCase();
  t = t.replace(/\bvendas\b/g, "ventas");
  t = t.replace(/\bvenda\b/g, "venta");
  return t;
}

function procesarCodigoEscaneado(raw) {
  if (!raw) return "";
  const partes = raw.trim().split(/\s+/);
  const articulo = partes[0] || "";
  let color = null;
  let talle = null;

  for (const p of partes) {
    if (/^\d+([.,]\d+)?$/.test(p)) talle = p.replace(",", ".");
  }
  for (const p of partes) {
    if (!/^\d/.test(p) && p !== articulo) color = p.toUpperCase();
  }

  if (ORB.scannerMode === "1") return articulo;
  if (ORB.scannerMode === "2") return `${articulo}/${color || ""}/${talle || ""}`;
  if (ORB.scannerMode === "3") {
    if (talle || color) return `${articulo}/${color || ""}/${talle || ""}`;
    return articulo;
  }
  return articulo;
}

function renderResults() {
  const container = document.getElementById("resultsContainer");
  const summary = document.getElementById("resultsSummary");
  const metricArt = document.getElementById("metricArticulos");
  const metricPares = document.getElementById("metricPares");
  const metricAlertas = document.getElementById("metricAlertas");

  const data = ORB.results || [];
  if (!data.length) {
    container.innerHTML = `<div style="font-size:11px;color:var(--text-soft);padding:6px;">Sin resultados todavía.</div>`;
    summary.textContent = "Sin resultados.";
    metricArt.textContent = "0";
    metricPares.textContent = "0";
    metricAlertas.textContent = "0";
    return;
  }

  const filtered = ORB.stockOnly ? data.filter(r => (r.stock || 0) > 0) : data.slice();
  const totalArt = filtered.length;
  const totalPares = filtered.reduce((acc, r) => acc + (r.stock || 0), 0);
  const alertas = filtered.filter(r => (r.stock || 0) > 0 && (r.stock || 0) <= 2).length;

  summary.textContent = `${totalArt} artículos · ${totalPares} pares · ${alertas} alertas`;
  metricArt.textContent = String(totalArt);
  metricPares.textContent = String(totalPares);
  metricAlertas.textContent = String(alertas);

  if (ORB.currentView === "resumen") {
    container.innerHTML = filtered.map(r => {
      const stockClass = (r.stock || 0) <= 2 ? "stock-low" : "stock-ok";
      return `
        <div style="padding:6px 8px;border-radius:10px;border:1px solid var(--border-soft);margin-bottom:4px;background:rgba(255,255,255,0.02);display:flex;justify-content:space-between;align-items:center;gap:8px;">
          <div style="font-size:11px;">
            <div style="font-weight:600;">${r.articulo || ""} ${r.color || ""}</div>
            <div style="font-size:10px;color:var(--text-soft);">Talle ${r.talle || "-"} · ${r.marca || ""} · ${r.rubro || ""}</div>
          </div>
          <div style="text-align:right;font-size:11px;">
            <div class="${stockClass}">${r.stock || 0} pares</div>
            <div style="font-size:10px;color:var(--text-soft);">Depósito</div>
          </div>
        </div>
      `;
    }).join("");
    return;
  }

  if (ORB.currentView === "tabla") {
    const rows = filtered.map(r => {
      const stockClass = (r.stock || 0) <= 2 ? "stock-low" : "stock-ok";
      return `
        <tr>
          <td>${r.articulo || ""}</td>
          <td>${r.color || ""}</td>
          <td>${r.talle || ""}</td>
          <td>${r.marca || ""}</td>
          <td>${r.rubro || ""}</td>
          <td class="${stockClass}">${r.stock || 0}</td>
        </tr>
      `;
    }).join("");

    container.innerHTML = `
      <div style="overflow:auto;">
        <table class="results-table">
          <thead>
            <tr>
              <th>Artículo</th>
              <th>Color</th>
              <th>Talle</th>
              <th>Marca</th>
              <th>Rubro</th>
              <th>Stock</th>
            </tr>
          </thead>
          <tbody>${rows}</tbody>
        </table>
      </div>
    `;
    return;
  }

  if (ORB.currentView === "talles") {
    const porTalle = {};
    for (const r of filtered) {
      const key = r.talle || "-";
      porTalle[key] = (porTalle[key] || 0) + (r.stock || 0);
    }
    const tallesOrdenados = Object.keys(porTalle).sort((a, b) => {
      const na = parseFloat(a.replace(",", ".")) || 0;
      const nb = parseFloat(b.replace(",", ".")) || 0;
      return na - nb;
    });

    const rows = tallesOrdenados.map(t => {
      const stock = porTalle[t];
      const stockClass = stock <= 2 ? "stock-low" : "stock-ok";
      return `
        <tr>
          <td>${t}</td>
          <td class="${stockClass}">${stock}</td>
        </tr>
      `;
    }).join("");

    container.innerHTML = `
      <div style="overflow:auto;">
        <table class="results-table">
          <thead>
            <tr>
              <th>Talle</th>
              <th>Stock total</th>
            </tr>
          </thead>
          <tbody>${rows}</tbody>
        </table>
      </div>
    `;
  }
}

// Init
window.addEventListener("DOMContentLoaded", () => {
  setTheme(ORB.theme);
  setScannerMode(ORB.scannerMode);
  setStockOnly(ORB.stockOnly);
  setAutoListen(ORB.autoListen);

  ORB_UI.init();
  ORB_SCANNER.init();
  ORB_VOZ.init();
  ORB_BACKEND.init();

  renderResults();
});
