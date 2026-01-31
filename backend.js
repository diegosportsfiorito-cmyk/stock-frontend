window.ORB_BACKEND = (function () {
  const API_URL = "https://stock-backend-1-0upi.onrender.com/query";

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
          solo_stock: false
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
      renderResults();

    } catch (e) {
      console.error("[BACKEND] Error:", e);
      setConnectionStatus(false);
      ORB.results = [];
      renderResults();
    }
  }

  function init() {}

  return { init, buscar };
})();
