// Guarda os arquivos do app para abrir rápido e funcionar com internet fraca.
// As respostas (Planilha Google) nunca passam pelo cache.
const VERSAO = "tertulias-v2";
const ARQUIVOS = ["./", "index.html", "config.js", "manifest.webmanifest",
  "icons/icon-192.png", "icons/icon-512.png", "icons/apple-touch-icon.png", "icons/logo-white.png", "icons/favicon.png"];

self.addEventListener("install", (e) => {
  // guarda um por um: se algum arquivo faltar, o app continua instalável
  e.waitUntil(caches.open(VERSAO).then((c) => Promise.all(ARQUIVOS.map((a) => c.add(a).catch(() => null)))).then(() => self.skipWaiting()));
});
self.addEventListener("activate", (e) => {
  e.waitUntil(caches.keys().then((ks) => Promise.all(ks.filter((k) => k !== VERSAO).map((k) => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener("fetch", (e) => {
  const url = new URL(e.request.url);
  if (e.request.method !== "GET" || url.origin !== location.origin) return;
  // rede primeiro (pega atualizações), cache se estiver sem internet
  e.respondWith(
    fetch(e.request).then((r) => { const copia = r.clone(); caches.open(VERSAO).then((c) => c.put(e.request, copia)); return r; })
      .catch(() => caches.match(e.request).then((r) => r || caches.match("index.html")))
  );
});
