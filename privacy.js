const root = document.documentElement;
let lang = "";
try { lang = localStorage.getItem("lang") || ""; } catch {}
root.lang = (lang || navigator.language || "es").toLowerCase().startsWith("en") ? "en" : "es";
document.getElementById("copyId").addEventListener("click", async () => {
  let id = "";
  try { id = localStorage.getItem("vid") || ""; } catch {}
  const msg = document.getElementById("copyMsg"), en = root.lang === "en";
  if (!id) { msg.textContent = en ? "No identifier in this browser." : "No hay identificador en este navegador."; return; }
  try { await navigator.clipboard.writeText(id); msg.textContent = en ? "Copied." : "Copiado."; }
  catch { msg.textContent = id; }
});
