let scannerActivo = false;
let selectedDeviceId = null;

function startScannerInterno1(onClose) {
  iniciarScanner("environment", onClose);
}

function startScannerInterno2(onClose) {
  iniciarScanner("user", onClose);
}

function iniciarScanner(facingMode, onClose) {
  if (scannerActivo) return;

  scannerActivo = true;

  const codeReader = new ZXing.BrowserMultiFormatReader();
  const overlay = document.getElementById("scanner-overlay");

  if (overlay) overlay.classList.remove("hidden");

  codeReader
    .listVideoInputDevices()
    .then((videoInputDevices) => {
      let deviceId = null;

      if (selectedDeviceId) {
        deviceId = selectedDeviceId;
      } else {
        const cam = videoInputDevices.find((d) =>
          d.label.toLowerCase().includes(facingMode)
        );
        deviceId = cam ? cam.deviceId : videoInputDevices[0]?.deviceId;
      }

      return codeReader.decodeFromVideoDevice(
        deviceId,
        "scanner-overlay",
        (result, err) => {
          if (result) {
            const text = result.text || "";
            if (window.AppCore && AppCore.els && AppCore.els.searchInput) {
              AppCore.els.searchInput.value = text;
            }
            if (overlay) overlay.classList.add("hidden");
            codeReader.reset();
            scannerActivo = false;
            if (onClose) onClose();
            if (window.AppCore) AppCore.buscar(true);
          }
        }
      );
    })
    .catch(() => {
      if (overlay) overlay.classList.add("hidden");
      scannerActivo = false;
      if (onClose) onClose();
      if (window.AppCore) AppCore.showToast("Error iniciando scanner");
    });
}

function startScannerExternoPreferido(onClose) {
  const apps = [
    "zxing://scan",
    "intent://scan/#Intent;scheme=zxing;package=com.google.zxing.client.android;end",
    "https://zxing.appspot.com/scan"
  ];

  for (const url of apps) {
    window.location.href = url;
  }

  setTimeout(() => {
    if (onClose) onClose();
  }, 1500);
}

function startScannerExternoSelector(onClose) {
  const opciones = [
    "zxing://scan",
    "https://zxing.appspot.com/scan",
    "intent://scan/#Intent;scheme=zxing;package=com.google.zxing.client.android;end"
  ];

  const elegido = prompt(
    "Elegí una opción:\n1) ZXing App\n2) ZXing Web\n3) ZXing Intent"
  );

  const idx = parseInt(elegido) - 1;
  if (opciones[idx]) {
    window.location.href = opciones[idx];
  }

  setTimeout(() => {
    if (onClose) onClose();
  }, 1500);
}

window.startScannerInterno1 = startScannerInterno1;
window.startScannerInterno2 = startScannerInterno2;
window.startScannerExternoPreferido = startScannerExternoPreferido;
window.startScannerExternoSelector = startScannerExternoSelector;
