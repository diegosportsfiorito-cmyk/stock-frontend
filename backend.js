window.ORB_BACKEND = (function () {
  // URL REAL DEL BACKEND
  const API_URL = "https://stock-backend-1-0upi.onrender.com/query";

  // ---------------------------------------------------------
  // ESTADO DE CONEXIÓN
  // ---------------------------------------------------------
  function setConnectionStatus(online) {
    const pill = document.getElementById("connectionStatus");
    const label = pill.querySelector(".status-label");
    const sub = pill.querySelector("div div:nth-child(2)");
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

  // ---------------------------------------------------------
  // EXPANSIÓN DE ITEMS (1 ARTÍCULO → N TALLES)
  // ---------------------------------------------------------
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

  // ---------------------------------------------------------
  // BÚSQUEDA REAL
  // ---------------------------------------------------------
  async function buscar(query) {
    try {
      const res = await fetch(API_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          question: query,
          solo_stock: ORB.stockOnly   // ← ahora sí funciona REAL
        })
      });

      if (!res.ok) throw new Error("HTTP " + res.status);

      const data = await res.json();

      // Validación del formato esperado
      if (data.tipo === "lista" && Array.isArray(data.items)) {
        ORB.results = expandItems(data.items);
      } else {
        ORB.results = [];
      }

      setConnectionStatus(true);
      renderResults();

    } catch (e) {
      console.error("[BACKEND] Error:", e);
      setConnectionStatus(false);

      // No cargamos dummy data para no confundir stock real
      ORB.results = [];
      renderResults();
    }
  }

  // ---------------------------------------------------------
  // PING (opcional)
  // ---------------------------------------------------------
  async function ping() {
    try {
      const res = await fetch(API_URL.replace("/query", "/"));
      setConnectionStatus(res.ok);
    } catch {
      setConnectionStatus(false);
    }
  }

  // ---------------------------------------------------------
  // INIT
  // ---------------------------------------------------------
  function init() {
    // Podés activar un ping inicial si querés
    // ping();
  }

  return { init, buscar, ping };
})();
