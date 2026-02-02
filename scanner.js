// ============================================================
// SCANNER.JS — COMPLETO Y COMPATIBLE CON TU UI ORIGINAL
// ============================================================

let scannerStream = null;
let scannerActive = false;
let barcodeDetector = null;

// ------------------------------------------------------------
// MODO SCANNER (SOLO ARTÍCULO / COMPLETO)
// ------------------------------------------------------------

function isScannerModeCompleto() {
    const sw = document.getElementById("scanner-mode-switch");
    return sw ? sw.checked : false;
}

// ------------------------------------------------------------
// PROCESAR CÓDIGO LEÍDO
// ------------------------------------------------------------

function procesarCodigoLeido(raw) {
    const input = document.getElementById("search-input");
    if (!input) return;

    const completo = isScannerModeCompleto();
    let valor = raw.trim();

    if (!completo) {
        // SOLO ARTÍCULO
        if (valor.includes("!!")) valor = valor.split("!!")[0];
        else if (valor.includes("!")) valor = valor.split("!")[0];
        else if (valor.includes("/")) valor = valor.split("/")[0];
    }

    input.value = valor;

    if (window.startSearch) startSearch();
    cerrarScanner();
}

// ------------------------------------------------------------
// ABRIR SCANNER
// ------------------------------------------------------------

async function abrirScanner() {
    const overlay = document.getElementById("scanner-overlay");
    const video = document.getElementById("scanner-video");

    if (!overlay || !video) {
        console.error("Faltan elementos del scanner en el DOM.");
        return;
    }

    overlay.style.display = "flex";

    try {
        // BarcodeDetector nativo
        if ("BarcodeDetector" in window) {
            barcodeDetector = new BarcodeDetector({
                formats: ["ean_13", "ean_8", "code_128", "code_39", "qr_code", "upc_a", "upc_e"]
            });
        } else {
            barcodeDetector = null;
            console.warn("BarcodeDetector no soportado.");
        }

        scannerStream = await navigator.mediaDevices.getUserMedia({
            video: { facingMode: "environment" }
        });

        video.srcObject = scannerStream;
        await video.play();

        scannerActive = true;
        loopScanner(video);

    } catch (err) {
        console.error("No se pudo acceder a la cámara:", err);
        overlay.style.display = "none";
        scannerActive = false;
    }
}

// ------------------------------------------------------------
// CERRAR SCANNER
// ------------------------------------------------------------

function cerrarScanner() {
    const overlay = document.getElementById("scanner-overlay");
    const video = document.getElementById("scanner-video");

    scannerActive = false;

    if (video) {
        video.pause();
        video.srcObject = null;
    }

    if (scannerStream) {
        scannerStream.getTracks().forEach(t => t.stop());
        scannerStream = null;
    }

    if (overlay) {
        overlay.style.display = "none";
    }
}

// ------------------------------------------------------------
// LOOP DE DETECCIÓN
// ------------------------------------------------------------

async function loopScanner(video) {
    if (!scannerActive) return;

    if (barcodeDetector) {
        try {
            const barcodes = await barcodeDetector.detect(video);
            if (barcodes && barcodes.length > 0) {
                const rawCode = barcodes[0].rawValue || "";
                if (rawCode) {
                    procesarCodigoLeido(rawCode);
                    return;
                }
            }
        } catch (err) {
            console.error("Error en BarcodeDetector:", err);
        }
    }

    requestAnimationFrame(() => loopScanner(video));
}

// ------------------------------------------------------------
// BINDINGS
// ------------------------------------------------------------

function initScannerBindings() {
    const btnScanner = document.getElementById("btn-scanner");
    const btnClose = document.getElementById("scanner-close");
    const modeSwitch = document.getElementById("scanner-mode-switch");
    const modeText = document.getElementById("scanner-mode-text");

    if (btnScanner) {
        btnScanner.addEventListener("click", abrirScanner);
    }

    if (btnClose) {
        btnClose.addEventListener("click", cerrarScanner);
    }

    if (modeSwitch && modeText) {
        modeSwitch.checked = false;
        modeText.textContent = "Solo artículo";

        modeSwitch.addEventListener("change", () => {
            modeText.textContent = modeSwitch.checked ? "Completo" : "Solo artículo";
        });
    }
}

window.initScannerBindings = initScannerBindings;
window.abrirScanner = abrirScanner;
window.cerrarScanner = cerrarScanner;
