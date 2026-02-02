// scanner.js

let scannerStream = null;
let scannerActive = false;
let barcodeDetector = null;

// IDs esperados en el DOM:
// - input de búsqueda:        #search-input
// - overlay del scanner:      #scanner-overlay
// - video del scanner:        #scanner-video
// - botón cerrar/cancelar:    #scanner-close
// - selector de modo scanner: #scanner-mode (values: "solo_articulo", "completo", "automatico")

function getScannerMode() {
    const el = document.getElementById("scanner-mode");
    if (!el) return "automatico";
    const val = el.value || el.dataset.mode;
    return val || "automatico";
}

// ------------------------------------------------------------
// PARSEO DE CÓDIGOS SEGÚN LO QUE DEFINIMOS
// ------------------------------------------------------------

function extraerArticuloDesdeCodigo(raw) {
    if (!raw) return "";

    let codigo = String(raw).trim();

    // 1) Caso "!!" → artículo sin color, luego talle (con o sin decimales)
    //    576609064!!28.5  → artículo = 576609064
    if (codigo.includes("!!")) {
        const partes = codigo.split("!!");
        return partes[0].trim();
    }

    // 2) Caso "!" → artículo!color!talle
    //    C209964-C410!AZUL!39 → artículo = C209964-C410
    if (codigo.includes("!")) {
        const partes = codigo.split("!");
        return partes[0].trim();
    }

    // 3) Caso "/" → artículo/talle[/otra cosa]
    //    ADYS700171-WG1/35   → artículo = ADYS700171-WG1
    //    H02978/36.5         → artículo = H02978
    //    CC35271/38/9        → artículo = CC35271
    if (codigo.includes("/")) {
        const partes = codigo.split("/");
        return partes[0].trim();
    }

    // 4) Caso solo numérico largo (EAN, interno, etc.)
    //    2521470219110, 2511470288124, 100201098
    //    Lo dejamos tal cual, el backend matchea por Artículo.
    return codigo;
}

// ------------------------------------------------------------
// APLICAR MODO DE LECTURA
// ------------------------------------------------------------

function procesarCodigoLeido(rawCode) {
    const mode = getScannerMode();
    let valorParaInput = "";

    switch (mode) {
        case "completo":
            // MODO COMPLETO: se carga TODO el contenido del código
            valorParaInput = String(rawCode).trim();
            break;

        case "solo_articulo":
            // MODO SOLO ARTÍCULO: se extrae solo el artículo
            valorParaInput = extraerArticuloDesdeCodigo(rawCode);
            break;

        case "automatico":
        default:
            // MODO AUTOMÁTICO: detecta artículo y lo carga al input
            // (la inteligencia fina la hace el backend con la búsqueda)
            valorParaInput = extraerArticuloDesdeCodigo(rawCode);
            break;
    }

    const input = document.getElementById("search-input");
    if (input) {
        input.value = valorParaInput;
    }

    // Disparar la búsqueda principal si existe
    if (typeof window.buscar === "function") {
        window.buscar();
    } else if (typeof window.startSearch === "function") {
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
        // BarcodeDetector si está disponible
        if ("BarcodeDetector" in window) {
            barcodeDetector = new BarcodeDetector({
                formats: ["ean_13", "ean_8", "code_128", "code_39", "qr_code", "upc_a", "upc_e"]
            });
        } else {
            barcodeDetector = null;
            console.warn("BarcodeDetector no soportado en este dispositivo.");
            // Podrías mostrar un mensaje en pantalla si querés
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
                const rawCode = barcodes[0].rawValue || barcodes[0].cornerPoints?.rawValue || "";
                if (rawCode) {
                    procesarCodigoLeido(rawCode);
                    return; // se cierra en procesarCodigoLeido
                }
            }
        } catch (err) {
            console.error("Error en BarcodeDetector:", err);
        }
    } else {
        // Si no hay BarcodeDetector, podrías implementar otro método o mostrar mensaje.
    }

    requestAnimationFrame(() => loopScanner(video));
}

// ------------------------------------------------------------
// BINDINGS DE BOTONES
// ------------------------------------------------------------

function initScannerBindings() {
    const btnScanner = document.getElementById("btn-scanner");
    const btnClose = document.getElementById("scanner-close");

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
}

// Llamar a esto desde tu app.js cuando el DOM esté listo
window.initScannerBindings = initScannerBindings;
window.abrirScanner = abrirScanner;
window.cerrarScanner = cerrarScanner;
