/* ============================================================
   BACKEND.JS — COMUNICACIÓN CON EL SERVIDOR
   Integración premium con ORB + voz + UI moderna
============================================================ */

const API_URL = "https://stock-backend-1-0upi.onrender.com";

/* ============================================================
   CONSULTA AL BACKEND
============================================================ */
async function consultarBackend(query, soloStock = false) {
    try {
        orbStartLoading();
        orbMoveToCenter();
        hablarBuscando(query);

        const response = await fetch(`${API_URL}/query`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                question: query,
                solo_stock: soloStock
            })
        });

        const data = await response.json();

        orbStopLoading();

        if (data.error) {
            hablarError();
            return { error: true };
        }

        if (data.items && data.items.length > 0) {
            orbMoveToTop();
            hablarResultados(data.items.length);
        } else {
            orbMoveToCenter();
        }

        return data;

    } catch (error) {
        console.error("Error al consultar backend:", error);

        orbStopLoading();
        orbMoveToCenter();
        hablarError();

        return { error: true };
    }
}

/* ============================================================
   FUNCIÓN PRINCIPAL DE BÚSQUEDA
============================================================ */
async function buscar(q, soloStock = false) {
    if (!q || q.trim().length === 0) {
        return { error: true, message: "Consulta vacía" };
    }

    return await consultarBackend(q.trim(), soloStock);
}

/* ============================================================
   EXPORTAR FUNCIONES (si se usa en módulos)
============================================================ */
// window.buscar = buscar;
