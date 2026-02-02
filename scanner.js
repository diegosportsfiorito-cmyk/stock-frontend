// scanner.js

let scannerStream = null;
let scannerActive = false;
let barcodeDetector = null;

// MODO SCANNER: false = solo artículo, true = completo
function isScannerModeCompleto() {
    const sw = document.getElementById("scanner-mode-switch");
    return sw ? sw.checked : false;
}

// ------------------------------------------------------------
// PARSEO DE CÓDIGOS SEGÚN LO DEFINIDO
// ------------------------------------------------------------

function extraerArticuloDesdeCodigo(raw) {
    if (!raw) return "";
    let codigo = String(raw).trim();

    // Caso "!!" → artículo!!talle (sin color)
    if (codigo.includes("!!")) {
        const partes = codigo.split("!!");
        return partes[0].trim();
    }

    // Caso "!" → artículo!color!talle
    if (codigo.includes("!")) {
        const partes = codigo.split("!");
        return partes[0].trim();
    }

    // Caso "/" → artículo/talle[/otra cosa]
    if (codigo.includes("/")) {
        const partes = codigo.split("/");
        return partes[0].trim();
    }

    // Caso numérico largo o mixto → se usa tal cual
    return codigo;
}

function procesarCodigoLeido(rawCode) {
    const completo = isScannerModeCompleto();
    const input = document.getElementById("search-input");
    if (!input) {
        cerrarScanner();
        return;
    }

    let valorParaInput = "";

    if (completo) {
        // MODO COMPLETO: se carga TODO el contenido del código
        valorParaInput = String(rawCode).trim();
    } else {
        // MODO SOLO ARTÍCULO: se extrae solo el artículo
        valorParaInput = extraerArticuloDesdeCodigo(rawCode);
    }

    input.value = valorParaInput;

    if (typeof window.startSearch === "function") {
        window.startSearch();
    }

    cerrarScanner();
}

// ------------------------------------------------------------
// CONTROL DEL SCANNER (CÁMARA + OVERLAY)
// ------------------------------------------------------------

async function abrirScanner() {
    if (scannerActive) return;

    const overlay = document.getElementById("scanner-overlay");
    const video = document.getElementById("scanner-video");

    if (!overlay || !video) {
        console.warn("Faltan elementos del DOM para el scanner.");
        return;
    }

    overlay.style.display = "flex";

    try {
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
        btnScanner.addEventListener("click", () => {
            abrirScanner();
        });
    }

    if (btnClose) {
        btnClose.addEventListener("click", () => {
            cerrarScanner();
        });
    }

    if (modeSwitch && modeText) {
        // Por defecto: solo artículo (unchecked)
        modeSwitch.checked = false;
        modeText.textContent = "Solo artículo";

        modeSwitch.addEventListener("change", () => {
            if (modeSwitch.checked) {
                modeText.textContent = "Completo";
            } else {
                modeText.textContent = "Solo artículo";
            }
        });
    }
}

window.initScannerBindings = initScannerBindings;
window.abrirScanner = abrirScanner;
window.cerrarScanner = cerrarScanner;
