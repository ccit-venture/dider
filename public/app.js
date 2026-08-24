// Vanilla JS — contoh interaksi frontend ↔ API (tanpa framework)
async function ping() {
  const el = document.getElementById("status");
  try {
    const res = await fetch("/api/ping");
    const data = await res.json();
    if (el) el.textContent = data.pong ? "✅ API jalan — siap ngoding!" : "⚠️ API bermasalah";
  } catch {
    if (el) el.textContent = "❌ API tidak bisa dihubungi";
  }
}
ping();
