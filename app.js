// app.js

const API_URL = "/query"; // ajustar si usás prefijo

// Estado simple
let catalogoCompleto = [];
let orbState = "idle"; // idle | ready | loading | error

// ------------------------------------------------------------
// INIT
// ------------------------------------------------------------

document.addEventListener("DOMContentLoaded", () => {
    initScannerBindings();
    initORB();
    initAdminPanel();
    initSearchBindings();
    cargarCatalogoInicial();
});

// ------------------------------------------------------------
// ORB
// ------------------------------------------------------------

function setOrbState(state) {
    orbState = state;
    const orb = document.getElementById("orb-button");
    if (!orb) return;

    orb.classList.remove("orb-loading", "orb-error");

    if (state === "loading") {
        orb.classList.add("orb-loading");
    } else if (state === "error") {
        orb.classList.add("orb-error");
    }
}

function initORB() {
    const orb = document.getElementById("orb-button");
    const input = document.getElementById("search-input");

    if (orb) {
        orb.addEventListener("click", () => {
            startSearch();
        });
    }

    if (input) {
        input.addEventListener("input", () => {
            const hasText = input.value.trim().length > 0;
            setOrbState(hasText ? "ready" : "idle");
        });

        input.addEventListener("keydown", (e) => {
            if (e.key === "Enter") {
                startSearch();
            }
        });
    }
}

// ------------------------------------------------------------
// ADMIN PANEL (TOOLTIPS ORB)
// ------------------------------------------------------------

function applyOrbTooltipMode(mode) {
    const wrapper = document.querySelector(".orb-tooltip-wrapper");
    if (!wrapper) return;

    wrapper.classList.remove("orb-tooltip-halo", "orb-tooltip-pulse", "orb-tooltip-hover");

    if (mode === "halo") {
        wrapper.classList.add("orb-tooltip-halo");
    } else if (mode === "pulse") {
        wrapper.classList.add("orb-tooltip-pulse");
    } else if (mode === "hover") {
        wrapper.classList.add("orb-tooltip-hover");
    }
}

function initAdminPanel() {
    const select = document.getElementById("orb-tooltip-mode");
    const panel = document.getElementById("admin-panel");

    // Atajo simple para mostrar/ocultar admin: Ctrl+Shift+A
    document.addEventListener("keydown", (e) => {
        if (e.ctrlKey && e.shiftKey && e.key.toLowerCase() === "a") {
            if (panel) {
                panel.classList.toggle("hidden");
            }
        }
    });

    const savedMode = localStorage.getItem("orbTooltipMode") || "halo";
    applyOrbTooltipMode(savedMode);

    if (select) {
        select.value = savedMode;
        select.addEventListener("change", () => {
            const mode = select.value;
            localStorage.setItem("orbTooltipMode", mode);
            applyOrbTooltipMode(mode);
        });
    }
}

// ------------------------------------------------------------
// BÚSQUEDA
// ------------------------------------------------------------

async function startSearch() {
    const input = document.getElementById("search-input");
    const soloStock = document.getElementById("solo-stock");
    const marcaSel = document.getElementById("filtro-marca");
    const rubroSel = document.getElementById("filtro-rubro");
    const talleDesde = document.getElementById("filtro-talle-desde");
    const talleHasta = document.getElementById("filtro-talle-hasta");

    if (!input) return;

    const question = input.value.trim();
    const filtros_globales =
        (marcaSel && marcaSel.value) ||
        (rubroSel && rubroSel.value) ||
        (talleDesde && talleDesde.value) ||
        (talleHasta && talleHasta.value)
            ? true
            : false;

    const payload = {
        question,
        solo_stock: soloStock ? soloStock.checked : false,
        filtros_globales,
        marca: marcaSel && marcaSel.value ? marcaSel.value : null,
        rubro: rubroSel && rubroSel.value ? rubroSel.value : null,
        talle_desde: talleDesde && talleDesde.value ? Number(talleDesde.value) : null,
        talle_hasta: talleHasta && talleHasta.value ? Number(talleHasta.value) : null
    };

    setOrbState("loading");

    try {
        const res = await fetch(API_URL, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload)
        });

        if (!res.ok) {
            throw new Error("Error HTTP " + res.status);
        }

        const data = await res.json();
        renderResultados(data.items || []);
        setOrbState("ready");
    } catch (err) {
        console.error("Error en búsqueda:", err);
        setOrbState("error");
    }
}

// ------------------------------------------------------------
// CATALOGO INICIAL PARA LLENAR FILTROS
// ------------------------------------------------------------

async function cargarCatalogoInicial() {
    try {
        const payload = {
            question: "",
            solo_stock: false,
            filtros_globales: false,
            marca: null,
            rubro: null,
            talle_desde: null,
            talle_hasta: null
        };

        const res = await fetch(API_URL, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload)
        });

        if (!res.ok) {
            throw new Error("Error HTTP " + res.status);
        }

        const data = await res.json();
        catalogoCompleto = data.items || [];

        poblarFiltrosDesdeCatalogo(catalogoCompleto);
    } catch (err) {
        console.error("Error cargando catálogo inicial:", err);
    }
}

function poblarFiltrosDesdeCatalogo(items) {
    const marcaSel = document.getElementById("filtro-marca");
    const rubroSel = document.getElementById("filtro-rubro");

    if (!items || !items.length) return;

    const marcas = new Set();
    const rubros = new Set();

    items.forEach((it) => {
        if (it.marca) marcas.add(it.marca);
        if (it.rubro) rubros.add(it.rubro);
    });

    if (marcaSel) {
        marcaSel.innerHTML = '<option value="">Todas</option>';
        Array.from(marcas)
            .sort()
            .forEach((m) => {
                const opt = document.createElement("option");
                opt.value = m;
                opt.textContent = m;
                marcaSel.appendChild(opt);
            });
    }

    if (rubroSel) {
        rubroSel.innerHTML = '<option value="">Todos</option>';
        Array.from(rubros)
            .sort()
            .forEach((r) => {
                const opt = document.createElement("option");
                opt.value = r;
                opt.textContent = r;
                rubroSel.appendChild(opt);
            });
    }
}

// ------------------------------------------------------------
// FILTROS BOTONES
// ------------------------------------------------------------

function initSearchBindings() {
    const btnFiltros = document.getElementById("btn-aplicar-filtros");
    const btnLimpiar = document.getElementById("btn-limpiar-filtros");

    if (btnFiltros) {
        btnFiltros.addEventListener("click", () => {
            startSearch();
        });
    }

    if (btnLimpiar) {
        btnLimpiar.addEventListener("click", () => {
            limpiarFiltros();
        });
    }
}

function limpiarFiltros() {
    const marcaSel = document.getElementById("filtro-marca");
    const rubroSel = document.getElementById("filtro-rubro");
    const talleDesde = document.getElementById("filtro-talle-desde");
    const talleHasta = document.getElementById("filtro-talle-hasta");
    const input = document.getElementById("search-input");

    if (marcaSel) marcaSel.value = "";
    if (rubroSel) rubroSel.value = "";
    if (talleDesde) talleDesde.value = "";
    if (talleHasta) talleHasta.value = "";
    if (input) input.value = "";

    renderResultados([]);
    setOrbState("idle");
}

// ------------------------------------------------------------
// RENDER RESULTADOS
// ------------------------------------------------------------

function renderResultados(items) {
    const cont = document.getElementById("results-container");
    if (!cont) return;

    if (!items || !items.length) {
        cont.innerHTML = "<p>No se encontraron resultados.</p>";
        return;
    }

    cont.innerHTML = "";

    items.forEach((it) => {
        const card = document.createElement("div");
        card.className = "result-card";

        const header = document.createElement("div");
        header.className = "result-header";

        const code = document.createElement("div");
        code.className = "result-code";
        code.textContent = it.codigo;

        const price = document.createElement("div");
        price.className = "result-meta";
        price.textContent = `Precio: $${it.precio.toLocaleString("es-AR")}`;

        header.appendChild(code);
        header.appendChild(price);

        const desc = document.createElement("div");
        desc.className = "result-desc";
        desc.textContent = it.descripcion;

        const meta = document.createElement("div");
        meta.className = "result-meta";
        meta.textContent = `${it.marca || ""} · ${it.rubro || ""} · ${it.color || ""}`;

        const talles = document.createElement("div");
        talles.className = "result-talles";
        talles.textContent =
            "Talles: " +
            (it.talles || [])
                .map((t) => `${t.talle} (${t.stock})`)
                .join(" · ");

        card.appendChild(header);
        card.appendChild(desc);
        card.appendChild(meta);
        card.appendChild(talles);

        cont.appendChild(card);
    });
}

window.startSearch = startSearch;
