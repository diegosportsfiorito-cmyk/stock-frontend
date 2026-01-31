const BACKEND_BASE = "https://stock-backend-1-0upi.onrender.com";

export async function backendQuery({ q, soloStock }) {
  const params = new URLSearchParams();
  params.set("q", q);
  params.set("solo_stock", soloStock ? "true" : "false");

  const url = `${BACKEND_BASE}/query?${params.toString()}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error("Error en backend");
  return await res.json();
}

export async function backendAutocomplete(q) {
  const url = `${BACKEND_BASE}/autocomplete?q=${encodeURIComponent(q)}`;
  const res = await fetch(url);
  if (!res.ok) return { suggestions: [] };
  return await res.json();
}

export async function backendCatalogos() {
  try {
    const url = `${BACKEND_BASE}/catalogos`;
    const res = await fetch(url);
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}
