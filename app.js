/* ============================================================
   CONFIGURACIÓN
============================================================ */
const BACKEND_URL = "https://stock-backend-1-0upi.onrender.com";

/* ============================================================
   ELEMENTOS DEL DOM
============================================================ */
const orb = document.getElementById("orb");
const orbContainer = document.getElementById("orb-container");
const overlay = document.getElementById("loading-overlay");

const searchInput = document.getElementById("search-input");
const searchBtn = document.getElementById("search-btn");
const soloStock = document.getElementById("solo-stock");

const resultsList = document.getElementById("results-list");
const resultsTitle = document.getElementById("results-title");

const dashArticulos = document.getElementById("dash-articulos");
const dashPares = document.getElementById("dash-pares");
const dashAlertas = document.getElementById("dash-alertas");
const dashValorizado = document.getElementById("dash-valorizado");

const toggleDark = document.getElementById("toggle-dark");
const toggleVoice = document.getElementById("toggle-voice");
const openAdmin = document.getElementById("open-admin");

/* ============================================================
   ORB — CONTROL DE ESTADOS
============================================================ */
function orbStartLoading() {
    overlay.style.display = "flex";
    orb.classList.add("orb-loading");
    hablarBuscando(searchInput.value);
}

function orbStopLoading() {
    overlay.style.display = "none";
    orb.classList.remove("orb-loading");
}

function orbMoveToTop() {
    orbContainer.classList.add("orb-top");
}

function orbMoveToCenter() {
    orbContainer.classList.remove("orb-top");
}

/* ============================================================
   BÚSQUEDA AL BACKEND
============================================================ */
async function buscarArticulo(q, soloStockFlag = false) {
    try {
        orbStartLoading();
        orbMoveToCenter();

        const response = await fetch(`${BACKEND_URL}/query`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                question: q,
                solo_stock: soloStockFlag
            })
        });

        const data = await response.json();

        orbStopLoading();

        if (data.error) {
            hablarError();
            mostrarError("Error al consultar backend");
            return;
        }

        renderResultados(data);
        actualizarDashboard(data);

        if (data.items && data.items.length > 0) {
            orbMoveToTop();
            hablarResultados(data.items.length);
        } else {
            orbMoveToCenter();
        }

    } catch (err) {
        orbStopLoading();
        orbMoveToCenter();
        hablarError();
        mostrarError("Error de conexión");
        console.error(err);
    }
}

/* ============================================================
   RENDER DE RESULTADOS
============================================================ */
function renderResultados(data) {
    resultsList.innerHTML = "";

    if (!data.items || data.items.length === 0) {
        resultsTitle.textContent = "Sin resultados";
        return;
    }

    resultsTitle.textContent = "Resultados";

    data.items.forEach(item => {
        const card = document.createElement("div");
        card.className = "result-card";

        card.innerHTML = `
            <div class="result-header">
                <div>
                    <div class="result-title">${item.codigo}</div>
                    <div class="result-sub">${item.descripcion}</div>
                </div>
                <div>
                    <strong>$${item.precio}</strong>
                </div>
            </div>

            <div class="result-sub">Marca: ${item.marca} — Rubro: ${item.rubro} — Color: ${item.color}</div>

            <div class="talle-list">
                ${item.talles.map(t => `
                    <div class="talle-item">${t.talle}: ${t.stock}</div>
                `).join("")}
            </div>

            <div class="result-sub" style="margin-top:10px;">
                Valorizado total: <strong>$${item.valorizado}</strong>
            </div>
        `;

        resultsList.appendChild(card);
    });
}

/* ============================================================
   DASHBOARD
============================================================ */
function actualizarDashboard(data) {
    if (!data.items) {
        dashArticulos.textContent = "0";
        dashPares.textContent = "0";
        dashAlertas.textContent = "0";
        dashValorizado.textContent = "$0";
        return;
    }

    dashArticulos.textContent = data.items.length;

    let totalPares = 0;
    let totalVal = 0;
    let alertas = 0;

    data.items.forEach(item => {
        item.talles.forEach(t => {
            totalPares += t.stock;
            if (t.stock < 2) alertas++;
        });
        totalVal += item.valorizado;
    });

    dashPares.textContent = totalPares;
    dashAlertas.textContent = alertas;
    dashValorizado.textContent = "$" + totalVal;
}

/* ============================================================
   ERRORES
============================================================ */
function mostrarError(msg) {
    resultsList.innerHTML = `
        <div class="result-card">
            <div class="result-title" style="color:red;">${msg}</div>
        </div>
    `;
}

/* ============================================================
   EVENTOS
============================================================ */
searchBtn.addEventListener("click", () => {
    const q = searchInput.value.trim();
    if (q.length === 0) return;
    buscarArticulo(q, soloStock.checked);
});

searchInput.addEventListener("keydown", e => {
    if (e.key === "Enter") {
        searchBtn.click();
    }
});

/* ============================================================
   MODO DÍA / NOCHE
============================================================ */
toggleDark.addEventListener("click", () => {
    document.body.classList.toggle("dark");
});

/* ============================================================
   VOZ
============================================================ */
toggleVoice.addEventListener("click", () => {
    vozActiva = !vozActiva;
    toggleVoice.textContent = vozActiva ? "Voz ON" : "Voz OFF";
});

/* ============================================================
   ADMIN
============================================================ */
openAdmin.addEventListener("click", () => {
    document.getElementById("admin-panel").style.display = "block";
});
