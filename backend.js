// ============================================================
// BACKEND.JS — Conexión con el backend real
// ============================================================

window.ORB_BACKEND = (function () {

  const API_URL = "https://stock-backend-1-0upi.onrender.com/query";
  const AUTOCOMPLETE_URL = "https://stock-backend-1-0upi.onrender.com/autocomplete";
  const CATALOG_URL = "https://stock-backend-1-0upi.onrender.com/catalogos";

  function setConnectionStatus(online) {
    const pill = document.getElementById("connectionStatus");
    if (!pill) return;

    const label = pill.querySelector(".status-label");
    const sub = pill.querySelector(".status-sub");
    const dot = pill.querySelector(".status-dot");

    if (!label || !sub || !dot) return;

    if (online) {
      label.textContent = "Conectado";
      sub.textContent = "Backend online";
      dot.style.background = "#4fda8c";
    } else {
      label.textContent = "Desconectado";
      sub.textContent = "Sin respuesta";
      dot.style.background = "#ff4f6a";
    }
  }

  function expandItems(items) {
    const out = [];

    for (const item of items) {
      for (const t of item.talles) {
        out.push({
          articulo: item.codigo,
          descripcion: item.descripcion,
          marca: item.marca,
          rubro: item.rubro,
          color: item.color,
          talle: t.talle,
          stock: t.stock,
          precio: item.precio,
          valorizado: item.valorizado
        });
      }
    }

    return out;
  }

  async function buscar(query) {
    try {
      const res = await fetch(API_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          question: query,
          solo_stock: ORB.stockOnly
        })
      });

      if (!res.ok) throw new Error("HTTP " + res.status);

      const data = await res.json();

      if (data.tipo === "lista" && Array.isArray(data.items)) {
        ORB.results = expandItems(data.items);
      } else {
        ORB.results = [];
      }

      setConnectionStatus(true);
      ORB.page = 1;
      renderResults();

    } catch (err) {
      console.error("[BACKEND] Error:", err);
      setConnectionStatus(false);
      ORB.results = [];
      renderResults();
    }
  }

  async function autocomplete(term) {
    if (!term || term.length < 2) return [];

    try {
      const res = await fetch(`${AUTOCOMPLETE_URL}?q=${encodeURIComponent(term)}`);
      if (!res.ok) return [];
      const data = await res.json();
      return data.suggestions || [];
    } catch {
      return [];
    }
  }

  async function loadCatalogos() {
    try {
      const res = await fetch(CATALOG_URL);
      if (!res.ok) return;
      const data = await res.json();
      ORB.catalogos = data;
      if (typeof updateFilterOptionsFromCatalog === "function") {
        updateFilterOptionsFromCatalog();
      }
    } catch (err) {
      console.error("Error cargando catálogos:", err);
    }
  }

  async function ping() {
    try {
      const res = await fetch(API_URL.replace("/query", "/"));
      setConnectionStatus(res.ok);
    } catch {
      setConnectionStatus(false);
    }
  }

  function init() {
    loadCatalogos();
    // ping(); // opcional
  }

  return {
    init,
    buscar,
    autocomplete,
    ping
  };

})();

window.addEventListener("DOMContentLoaded", () => {
  ORB_BACKEND.init();
});
