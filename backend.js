window.ORB_BACKEND = (function () {
  // Ajustá esta URL a tu backend real
  const API_URL = "https://tu-backend.com/api/buscar";

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

  async function buscar(query) {
    try {
      const res = await fetch(API_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query })
      });
      if (!res.ok) throw new Error("HTTP " + res.status);
      const data = await res.json();
      // Ajustá al formato real de tu backend
      ORB.results = Array.isArray(data) ? data : (data.resultados || []);
      setConnectionStatus(true);
      renderResults();
    } catch (e) {
      console.error("[BACKEND] Error en búsqueda:", e);
      setConnectionStatus(false);
      // fallback demo
      ORB.results = getDummyData();
      renderResults();
    }
  }

  async function ping() {
    try {
      const res = await fetch(API_URL.replace("/buscar", "/ping"));
      setConnectionStatus(res.ok);
    } catch {
      setConnectionStatus(false);
    }
  }

  function getDummyData() {
    return [
      { articulo: "12345", color: "NEGRO", talle: "40", marca: "X", rubro: "ZAPATILLA", stock: 3 },
      { articulo: "12345", color: "NEGRO", talle: "41", marca: "X", rubro: "ZAPATILLA", stock: 1 },
      { articulo: "67890", color: "BLANCO", talle: "39", marca: "Y", rubro: "ZAPATILLA", stock: 0 }
    ];
  }

  function init() {
    // Podés hacer un ping inicial si querés
    // ping();
  }

  return { init, buscar, ping, getDummyData };
})();
