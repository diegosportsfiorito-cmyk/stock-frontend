// ===============================
//  SCANNER — Versión Definitiva
// ===============================

let scannerActivo = false;
let modoScanner = "simple"; 
// valores posibles: "simple" o "completo"

// Detectar soporte
const soportaBarcode = ('BarcodeDetector' in window);

// Inicializar scanner
async function iniciarScanner() {
    if (!soportaBarcode) {
        console.warn("BarcodeDetector no disponible en este navegador.");
        return;
    }

    try {
        const detector = new BarcodeDetector({ formats: ['code_128', 'ean_13', 'ean_8', 'code_39', 'qr_code'] });

        scannerActivo = true;

        async function escanear() {
            if (!scannerActivo) return;

            try {
                const video = document.querySelector("#scanner-video");
                const barcodes = await detector.detect(video);

                if (barcodes.length > 0) {
                    const codigo = barcodes[0].rawValue.trim();
                    procesarCodigo(codigo);
                }
            } catch (err) {
                console.error("Error en detección:", err);
            }

            requestAnimationFrame(escanear);
        }

        escanear();

    } catch (err) {
        console.error("Error iniciando scanner:", err);
    }
}

// Procesar según modo
function procesarCodigo(codigo) {
    let resultado = codigo;

    if (modoScanner === "simple") {
        resultado = extraerArticulo(codigo);
    }

    cargarEnInput(resultado);
}

// Extraer solo el artículo (antes del primer / o !)
function extraerArticulo(codigo) {
    const separadores = ['/', '!'];
    let corte = codigo.length;

    separadores.forEach(sep => {
        const pos = codigo.indexOf(sep);
        if (pos !== -1 && pos < corte) corte = pos;
    });

    return codigo.substring(0, corte);
}

// Cargar en el input principal
function cargarEnInput(texto) {
    const input = document.querySelector("#input-busqueda");
    input.value = texto;
    input.dispatchEvent(new Event("input"));
}

// Cambiar modo desde UI
function setModoScanner(nuevoModo) {
    modoScanner = nuevoModo; // "simple" o "completo"
}
