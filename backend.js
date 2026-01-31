// ============================================================
// BACKEND.JS — Conexión con el backend real
// ============================================================

window.ORB_BACKEND = (function () {

  // Endpoint real del backend
  const API_URL = "https://stock-backend-1-0upi.onrender.com/query";
  const AUTOCOMPLETE_URL = "https://stock-backend-1-0upi.onrender.com/autocomplete";

  // ------------------------------------------------------------
  // Estado de conexión
  // ------------------------------------------------------------
  function setConnectionStatus(online) {
    const pill = document.getElementById("connectionStatus");
    const label = pill.querySelector(".status-label");
    const sub = pill.querySelector(".status-sub");
    const dot = pill.querySelector(".status-dot");

    if (online) {
      label.textContent = "Conectado";
      sub.textContent = "Backend online";
      dot.style.background = "var(--success)";
    } else {
      label.textContent = "Desconectado";
      sub.textContent = "Sin respuesta";
      dot.style.background = "var(--danger)";
    }
  }

  // ------------------------------------------------------------
  // Expandir items (1 artículo → varios talles)
  // ------------------------------------------------------------
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

  // ------------------------------------------------------------
  // Búsqueda real
  // ------------------------------------------------------------
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

  // ------------------------------------------------------------
  // Autocomplete real
  // ------------------------------------------------------------
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

  // ------------------------------------------------------------
  // Ping opcional
  // ------------------------------------------------------------
  async function ping() {
    try {
      const res = await fetch(API_URL.replace("/query", "/"));
      setConnectionStatus(res.ok);
    } catch {
      setConnectionStatus(false);
    }
  }

  // ------------------------------------------------------------
  // Init
  // ------------------------------------------------------------
  function init() {
    // ping(); // opcional
  }

  return {
    init,
    buscar,
    autocomplete,
    ping
  };

})();
