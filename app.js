// app.js

const API_URL = "/query";

let catalogoCompleto = [];
let orbState = "idle";

document.addEventListener("DOMContentLoaded", () => {
    initScannerBindings();
    initORB();
    initAdminPanel();
    initSearchBindings();
    cargarCatalogoInicial();
});

// ORB
function setOrbState(state) {
    orbState = state;
}

function initORB() {
    const orb = document.getElementById("orb");
    const input = document.getElementById("search-input");

    if (orb) {
        orb.addEventListener("click", () => {
            if (window.startSearch) startSearch();
        });
    }

    if (input) {
        input.addEventListener("keydown", (e) => {
            if (e.key === "Enter") startSearch();
        });
    }
}

// ADMIN PANEL
function applyOrbTooltipMode() {}
function initAdminPanel() {}

// BÚSQUEDA
async function startSearch() {
    const input = document.getElementById("search-input");
    const soloStock = document.getElementById("chk-solo-stock");
    const marcaSel = document.getElementById("filtro-marca");
    const rubroSel = document.getElementById("filtro-rubro");
    const talleDesde = document.getElementById("filtro-talle-desde");
    const talleHasta = document.getElementById("filtro-talle-hasta");

    const question = input.value.trim();

    const filtros_globales =
        marcaSel.value || rubroSel.value || talleDesde.value || talleHasta.value
            ? true
            : false;

    const payload = {
        question,
        solo_stock: soloStock.checked,
        filtros_globales,
        marca: marcaSel.value || null,
        rubro: rubroSel.value || null,
        talle_desde: talleDesde.value ? Number(talleDesde.value) : null,
        talle_hasta: talleHasta.value ? Number(talleHasta.value) : null
    };

    try {
        const res = await fetch(API_URL, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload)
        });

        const data = await res.json();
        renderResultados(data.items || []);
    } catch (err) {
        console.error("Error en búsqueda:", err);
    }
}

// CATALOGO INICIAL
async function cargarCatalogoInicial() {
    const payload = {
        question: "",
        solo_stock: false,
        filtros_globales: false
    };

    const res = await fetch(API_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
    });

    const data = await res.json();
    catalogoCompleto = data.items || [];

    poblarFiltrosDesdeCatalogo(catalogoCompleto);
}

function poblarFiltrosDesdeCatalogo(items) {
    const marcaSel = document.getElementById("filtro-marca");
    const rubroSel = document.getElementById("filtro-rubro");

    const marcas = new Set();
    const rubros = new Set();

    items.forEach((it) => {
        if (it.marca) marcas.add(it.marca);
        if (it.rubro) rubros.add(it.rubro);
    });

    marcaSel.innerHTML = '<option value="">Todas</option>';
    rubroSel.innerHTML = '<option value="">Todos</option>';

    Array.from(marcas).sort().forEach(m => {
        marcaSel.innerHTML += `<option value="${m}">${m}</option>`;
    });

    Array.from(rubros).sort().forEach(r => {
        rubroSel.innerHTML += `<option value="${r}">${r}</option>`;
    });
}

// FILTROS
function initSearchBindings() {
    document.getElementById("btn-aplicar-filtros")
        .addEventListener("click", startSearch);

    document.getElementById("btn-clear")
        .addEventListener("click", () => {
            document.getElementById("search-input").value = "";
            startSearch();
        });
}

// RENDER RESULTADOS
function renderResultados(items) {
    const cont = document.getElementById("results-container");

    if (!items.length) {
        cont.innerHTML = "<p>No se encontraron resultados.</p>";
        return;
    }

    cont.innerHTML = "";

    items.forEach((it) => {
        cont.innerHTML += `
        <div class="result-card">
            <div class="result-header">
                <div class="result-code">${it.codigo}</div>
                <div class="result-meta">Precio: $${it.precio}</div>
            </div>
            <div class="result-desc">${it.descripcion}</div>
            <div class="result-meta">${it.marca} · ${it.rubro} · ${it.color}</div>
            <div class="result-talles">
                Talles: ${it.talles.map(t => `${t.talle} (${t.stock})`).join(" · ")}
            </div>
        </div>`;
    });
}

window.startSearch = startSearch;
