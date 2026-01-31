import { backendCatalogos } from "./backend.js";

export let currentView = "resumen";
export let soloStock = false;
export let adminMode = false;

const btnSoloStock = document.getElementById("btnSoloStock");
const viewButtons = document.querySelectorAll(".view-btn");
const adminPanel = document.getElementById("adminPanel");
const orbLogo = document.getElementById("orbLogo");
const searchInput = document.getElementById("searchInput");
const modeSwitch = document.getElementById("modeSwitch");
const modeLabel = document.getElementById("modeLabel");
const backendStatusDot = document.getElementById("backendStatusDot");
const backendStatusText = document.getElementById("backendStatusText");
const footerStatus = document.getElementById("footerStatus");

const marcaFilter = document.getElementById("marcaFilter");
const rubroFilter = document.getElementById("rubroFilter");
const talleFilter = document.getElementById("talleFilter");

let orbClickCount = 0;
let orbClickTimer = null;

btnSoloStock.addEventListener("click", () => {
  soloStock = !soloStock;
  btnSoloStock.classList.toggle("active", soloStock);
});

viewButtons.forEach((btn) => {
  btn.addEventListener("click", () => {
    viewButtons.forEach((b) => b.classList.remove("active"));
    btn.classList.add("active");
    currentView = btn.dataset.view;
    document.dispatchEvent(new CustomEvent("viewChanged", { detail: { view: currentView } }));
  });
});

orbLogo.addEventListener("click", () => {
  orbClickCount += 1;
  if (orbClickTimer) clearTimeout(orbClickTimer);
  orbClickTimer = setTimeout(() => {
    orbClickCount = 0;
  }, 3000);

  if (orbClickCount >= 5 && searchInput.value.trim().toUpperCase() === "ADMIN") {
    adminMode = !adminMode;
    adminPanel.style.display = adminMode ? "block" : "none";
    footerStatus.textContent = adminMode ? "Modo administrador activado" : "Modo administrador desactivado";
    orbClickCount = 0;
  }
});

modeSwitch.addEventListener("change", () => {
  const isNight = modeSwitch.checked;
  document.body.classList.toggle("night-mode", isNight);
  modeLabel.textContent = isNight ? "Modo noche" : "Modo día";
});

export function setBackendStatus(online) {
  backendStatusDot.classList.toggle("online", online);
  backendStatusDot.classList.toggle("offline", !online);
  backendStatusText.textContent = online ? "Conectado" : "Desconectado";
}

export function setFooterStatus(text) {
  footerStatus.textContent = text;
}

export async function loadCatalogosIntoFilters() {
  const data = await backendCatalogos();
  if (!data) return;

  fillSelect(marcaFilter, data.marcas, "Marca");
  fillSelect(rubroFilter, data.rubros, "Rubro");
  fillSelect(talleFilter, data.talles, "Talle");
}

function fillSelect(select, items, label) {
  const current = select.value;
  select.innerHTML = "";
  const opt = document.createElement("option");
  opt.value = "";
  opt.textContent = label;
  select.appendChild(opt);

  items.forEach((item) => {
    if (!item) return;
    const o = document.createElement("option");
    o.value = item;
    o.textContent = item;
    select.appendChild(o);
  });

  if (items.includes(current)) {
    select.value = current;
  }
}

export function getFilters() {
  return {
    marca: marcaFilter.value || "",
    rubro: rubroFilter.value || "",
    talle: talleFilter.value || "",
  };
}
