window.ORB_UI = (function () {
  function initViewTabs() {
    document.querySelectorAll(".results-view-tab").forEach(tab => {
      tab.addEventListener("click", () => setView(tab.dataset.view));
    });
  }

  function initStockToggle() {
    document.getElementById("stockOnlyToggle").addEventListener("click", () => {
      setStockOnly(!ORB.stockOnly);
      renderResults();
    });
  }

  function initThemeToggle() {
    document.getElementById("themeToggle").addEventListener("click", () => {
      setTheme(ORB.theme === "dark" ? "light" : "dark");
    });
  }

  function initAdvancedFilters() {
    const toggle = document.getElementById("advancedFiltersToggle");
    const panel = document.getElementById("advancedFiltersPanel");
    toggle.addEventListener("click", () => {
      panel.style.display = panel.style.display === "flex" ? "none" : "flex";
    });

    document.getElementById("resetFiltersBtn").addEventListener("click", () => {
      document.getElementById("filterMarca").value = "";
      document.getElementById("filterRubro").value = "";
      document.getElementById("filterTalle").value = "";
      renderResults();
    });
  }

  function initAdmin() {
    const secret = document.getElementById("adminSecret");
    const panel = document.getElementById("adminPanel");
    let taps = 0;
    let timer = null;

    secret.addEventListener("click", () => {
      taps++;
      if (!timer) {
        timer = setTimeout(() => {
          taps = 0;
          timer = null;
        }, 1200);
      }
      if (taps >= 5) {
        panel.style.display = panel.style.display === "block" ? "none" : "block";
        taps = 0;
        clearTimeout(timer);
        timer = null;
      }
    });

    document.getElementById("adminPingBtn").addEventListener("click", () => {
      ORB_BACKEND.ping();
    });

    document.getElementById("adminDummyDataBtn").addEventListener("click", () => {
      ORB.results = ORB_BACKEND.getDummyData();
      renderResults();
    });

    document.getElementById("adminClearBtn").addEventListener("click", () => {
      ORB.results = [];
      renderResults();
    });
  }

  function initSearch() {
    const input = document.getElementById("queryInput");
    const btn = document.getElementById("searchBtn");

    btn.addEventListener("click", () => {
      const q = normalizeText(input.value.trim());
      if (!q) return;
      ORB_BACKEND.buscar(q);
    });

    input.addEventListener("keydown", e => {
      if (e.key === "Enter") btn.click();
    });
  }

  function init() {
    initViewTabs();
    initStockToggle();
    initThemeToggle();
    initAdvancedFilters();
    initAdmin();
    initSearch();
  }

  return { init };
})();
