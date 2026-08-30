/* Construye dist/ a partir de contenido.html.

   contenido.html es la única fuente que se edita: es un documento completo y
   se puede abrir directo en el navegador. Este build le inyecta las etiquetas
   de aplicación instalable en el marcador <!--%%APP%%--> y genera alrededor
   el manifest, el service worker, los iconos y las cabeceras de caché.

   node build.js                                                            */

const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const iconos = require("./iconos");
const contraste = require("./contraste");

const dir = __dirname;
const distDir = path.join(dir, "dist");
const NOMBRE = "Conteo";
const TEMA = "#0B6E58";

const fuente = fs.readFileSync(path.join(dir, "contenido.html"), "utf8");

/* --- etiquetas que solo existen en la versión publicada --- */
const CABEZA_APP =
  '<link rel="manifest" href="manifest.webmanifest">\n' +
  '<link rel="apple-touch-icon" href="icono-180.png">\n' +
  '<link rel="icon" href="icono-192.png" type="image/png">\n' +
  '<meta name="theme-color" content="' + TEMA + '">\n' +
  '<meta name="mobile-web-app-capable" content="yes">\n' +
  '<meta name="apple-mobile-web-app-capable" content="yes">\n' +
  '<meta name="apple-mobile-web-app-title" content="' + NOMBRE + '">\n' +
  '<meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">\n' +
  '<script>if("serviceWorker" in navigator){addEventListener("load",function(){' +
  'navigator.serviceWorker.register("sw.js").catch(function(){});});}<\/script>';

const web = fuente.replace("<!--%%APP%%-->", () => CABEZA_APP);

fs.mkdirSync(distDir, { recursive: true });
fs.writeFileSync(path.join(distDir, "index.html"), web, "utf8");

const pngs = iconos.generar(distDir);

const manifest = {
  name: NOMBRE,
  short_name: NOMBRE,
  description: "Contador de inventario: total, contados, restantes y cuánto suma cada pulsación.",
  lang: "es",
  start_url: "./",
  scope: "./",
  display: "standalone",
  orientation: "portrait",
  background_color: "#F3F5F3",
  theme_color: TEMA,
  icons: [
    { src: "icono-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
    { src: "icono-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
    { src: "icono-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" }
  ]
};
fs.writeFileSync(path.join(distDir, "manifest.webmanifest"), JSON.stringify(manifest, null, 2), "utf8");

/* Service worker: la página va por red primero y cae al caché solo si no hay
   conexión, así una versión nueva nunca queda atrapada. Lo demás (iconos,
   manifest) va por caché primero, que casi no cambia.                      */
const sello = crypto.createHash("sha1").update(web).digest("hex").slice(0, 8);
const sw = `/* Generado por build.js — no editar a mano */
const CACHE = "conteo-${sello}";
const BASE = ["./", "./manifest.webmanifest", "./icono-180.png", "./icono-192.png", "./icono-512.png"];

self.addEventListener("install", e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(BASE)).then(() => self.skipWaiting()).catch(() => {}));
});
self.addEventListener("activate", e => {
  e.waitUntil(caches.keys()
    .then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k))))
    .then(() => self.clients.claim()));
});
self.addEventListener("fetch", e => {
  const req = e.request;
  if (req.method !== "GET") return;
  if (req.mode === "navigate") {
    e.respondWith(fetch(req)
      .then(r => { const cp = r.clone(); caches.open(CACHE).then(c => c.put("./", cp)).catch(() => {}); return r; })
      .catch(() => caches.match("./").then(hit => hit || Response.error())));
    return;
  }
  e.respondWith(caches.match(req).then(hit => hit || fetch(req).then(r => {
    if (r.ok) { const cp = r.clone(); caches.open(CACHE).then(c => c.put(req, cp)).catch(() => {}); }
    return r;
  })));
});
`;
fs.writeFileSync(path.join(distDir, "sw.js"), sw, "utf8");

/* El service worker nunca se cachea: si no, una versión vieja se queda pegada. */
fs.writeFileSync(path.join(distDir, "_headers"),
  "/sw.js\n  Cache-Control: no-cache\n/manifest.webmanifest\n  Cache-Control: no-cache\n", "utf8");

/* --- comprobaciones --- */
const probs = [];
if (!fuente.includes("<!--%%APP%%-->")) probs.push("contenido.html perdió el marcador <!--%%APP%%-->");
if (web.includes("<!--%%APP%%-->")) probs.push("quedó el marcador sin rellenar en dist/index.html");
if (!web.startsWith("<!doctype html>")) probs.push("dist/index.html no empieza con doctype");
if (!web.includes('charset="utf-8"')) probs.push("dist/index.html no declara el charset");
if (!web.includes("manifest.webmanifest")) probs.push("dist/index.html no enlaza el manifest");
if (fuente.includes("manifest.webmanifest")) probs.push("la fuente no debe enlazar el manifest: eso lo pone el build");
/* el botón vive de que la zona central se estire: si alguien le pone un alto
   fijo, deja de ocupar media pantalla y nadie lo nota hasta usarlo */
if (!web.includes(".zona{flex:1")) probs.push("la zona del botón dejó de estirarse (flex:1)");
if (!/#contador\{\s*flex:1/.test(web)) probs.push("el botón dejó de llenar su zona (flex:1)");
["contado", "total", "contador", "deshacer", "restar", "terminar", "pasosContar"]
  .forEach(id => { if (!web.includes('id="' + id + '"')) probs.push("falta el elemento #" + id); });

/* los colores del CSS y los de paletas.json tienen que seguir siendo los mismos */
const paletas = JSON.parse(fs.readFileSync(path.join(dir, "paletas.json"), "utf8"));
const claro = paletas.paletas.conteo.claro;
[["--fondo", claro.fondo], ["--acento", claro.acento], ["--tinta", claro.tinta], ["--exceso", claro.exceso]]
  .forEach(([tok, val]) => {
    if (!web.includes(tok + ":" + val)) probs.push("el CSS y paletas.json no coinciden en " + tok + " (" + val + ")");
  });
if (TEMA !== claro.acento) probs.push("theme-color no coincide con el acento claro");
if (contraste.verificar(paletas)) probs.push("hay pares de color bajo el mínimo de contraste");

console.log("dist/index.html  " + (web.length / 1024).toFixed(1) + " KB");
console.log("dist/            " + ["manifest.webmanifest", "sw.js", "_headers"]
  .concat(pngs.map(p => p.nombre + " (" + p.kb + " KB)")).join("  "));
console.log(probs.length ? "PROBLEMAS:\n - " + probs.join("\n - ") : "sin problemas");
process.exit(probs.length ? 1 : 0);
