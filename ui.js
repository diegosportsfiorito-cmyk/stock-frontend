// ============================================================
// UI.JS — CONTROL DE INTERFAZ COMPLETO
// ============================================================

// BÚSQUEDA
document.getElementById("btnSearch").addEventListener("click", () => {
  const q = document.getElementById("searchInput").value.trim();
  if (q) {
    ORB.page = 1;
    ORB_BACKEND.buscar(q);
  }
});

document.getElementById("searchInput").addEventListener("keydown", e => {
  if (e.key === "Enter") {
    const q = e.target.value.trim();
    if (q) {
      ORB.page = 1;
      ORB_BACKEND.buscar(q);
    }
  }
});

document.getElementById("btnClearSearch").addEventListener("click", () => {
  document.getElementById("searchInput").value = "";
  document.getElementById("autocompleteBox").style.display = "none";
});

// AUTOCOMPLETE
let acTimer = null;

document.getElementById("searchInput").addEventListener("input", () => {
  const term = document.getElementById("searchInput").value.trim();
  const box = document.getElementById("autocompleteBox");

  clearTimeout(acTimer);

  if (term.length < 2) {
    box.style.display = "none";
    return;
  }

  acTimer = setTimeout(async () => {
    const suggestions = await ORB_BACKEND.autocomplete(term);
    if (!suggestions.length) {
      box.style.display = "none";
      return;
    }

    box.innerHTML = suggestions
      .map(s => `<div class="ac-item">${s}</div>`)
      .join("");

    box.style.display = "block";
  }, 200);
});

document.getElementById("autocompleteBox").addEventListener("click", e => {
  const item = e.target.closest(".ac-item");
  if (!item) return;

  document.getElementById("searchInput").value = item.textContent;
  document.getElementById("autocompleteBox").style.display = "none";

  ORB.page = 1;
  ORB_BACKEND.buscar(item.textContent);
});

// FILTROS
["filterMarca", "filterRubro", "filterTalle"].forEach(id => {
  document.getElementById(id).addEventListener("change", () => {
    ORB.page = 1;
    renderResults();
  });
});

// MODO SOLO STOCK
document.getElementById("stockOnlyToggle").addEventListener("click", () => {
  ORB.stockOnly = !ORB.stockOnly;
  localStorage.setItem("stockOnly", ORB.stockOnly ? "true" : "false");

  document.getElementById("stockOnlyToggle").classList.toggle("active", ORB.stockOnly);

  ORB.page = 1;
  renderResults();
});

// ORDENAMIENTO
document.getElementById("sortSelect").addEventListener("change", e => {
  const [field, dir] = e.target.value.split(":");
  ORB.sort = { field, dir };
  ORB.page = 1;
  renderResults();
});

// FAVORITOS
document.addEventListener("click", e => {
  const btn = e.target.closest(".fav-btn");
  if (!btn) return;

  const key = btn.dataset.key;
  const r = ORB.results.find(x => `${x.articulo}-${x.talle}` === key);
  if (r) toggleFavorite(r);
});

document.getElementById("btnShowFavorites").addEventListener("click", () => {
  const favs = Array.from(ORB.favorites);
  const filtered = ORB.results.filter(r => favs.includes(`${r.articulo}-${r.talle}`));

  document.getElementById("resultsSubtitle").textContent =
    `${filtered.length} favoritos`;

  document.getElementById("resultsContainer").innerHTML = filtered
    .map(r => `
      <div class="result-item">
        <div class="result-left">
          <div><strong>${r.articulo}</strong> - ${r.descripcion}</div>
          <div style="font-size:12px;color:#9aa2b4;">
            ${r.marca} · ${r.rubro} · Talle ${r.talle}
          </div>
        </div>
        <div class="result-right">
          <div>${r.stock} pares</div>
          <button class="fav-btn on">★</button>
        </div>
      </div>
    `)
    .join("");
});

// EXPORTAR CSV
document.getElementById("btnExport").addEventListener("click", () => {
  exportToCSV(ORB.results);
});

// TABS DE VISTA
document.querySelectorAll(".view-tab").forEach(btn => {
  btn.addEventListener("click", () => {
    document.querySelectorAll(".view-tab").forEach(b => b.classList.remove("active"));
    btn.classList.add("active");

    ORB.view = btn.dataset.view;
    ORB.page = 1;

    renderResults();
  });
});

// PAGINACIÓN
document.getElementById("pagePrev").addEventListener("click", () => {
  if (ORB.page > 1) {
    ORB.page--;
    renderResults();
  }
});

document.getElementById("pageNext").addEventListener("click", () => {
  ORB.page++;
  renderResults();
});

// SCANNER
document.getElementById("btnOpenScanner").addEventListener("click", () => {
  ORB_SCANNER.open();
});

document.getElementById("btnCloseScanner").addEventListener("click", () => {
  ORB_SCANNER.close();
});

document.getElementById("btnToggleTorch").addEventListener("click", () => {
  ORB_SCANNER.toggleTorch();
});

document.getElementById("cameraSelect").addEventListener("change", e => {
  ORB_SCANNER.changeCamera(e.target.value);
});

document.querySelectorAll(".scanner-mode").forEach(btn => {
  btn.addEventListener("click", () => {
    document.querySelectorAll(".scanner-mode").forEach(b => b.classList.remove("active"));
    btn.classList.add("active");

    ORB_SCANNER.setMode(btn.dataset.mode);
  });
});

// VOZ
document.getElementById("btnVoice").addEventListener("click", () => {
  ORB_VOZ.toggle();
});

// CLICK FUERA DEL AUTOCOMPLETE
document.addEventListener("click", e => {
  if (!e.target.closest(".search-input-wrapper")) {
    document.getElementById("autocompleteBox").style.display = "none";
  }
});

// TEMA DÍA/NOCHE
const themeBtn = document.getElementById("themeToggle");
if (themeBtn) {
  const saved = localStorage.getItem("theme") || "dark";
  if (saved === "light") {
    document.body.classList.add("light");
    themeBtn.textContent = "Modo noche";
  } else {
    themeBtn.textContent = "Modo día";
  }

  themeBtn.addEventListener("click", () => {
    const isLight = document.body.classList.toggle("light");
    localStorage.setItem("theme", isLight ? "light" : "dark");
    themeBtn.textContent = isLight ? "Modo noche" : "Modo día";
  });
}

// MODO ADMIN: 5 clics en ORB + "ADMIN" en input
let orbClickCount = 0;
const orbLogo = document.getElementById("orbLogo");
const adminPanel = document.getElementById("adminPanel");

if (orbLogo && adminPanel) {
  orbLogo.addEventListener("click", () => {
    orbClickCount++;
    if (orbClickCount >= 5) {
      const val = (document.getElementById("searchInput").value || "").trim().toUpperCase();
      if (val === "ADMIN") {
        adminPanel.classList.remove("hidden");
      }
      orbClickCount = 0;
    }
  });
}

// INICIALIZACIÓN
window.addEventListener("DOMContentLoaded", () => {
  document.getElementById("stockOnlyToggle").classList.toggle("active", ORB.stockOnly);
  renderResults();
});
