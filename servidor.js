/* Servidor estático para previsualizar en local y desde el teléfono.

   node servidor.js [carpeta] [puerto]
     por defecto: carpeta actual, puerto 4173
     desde el teléfono en la misma Wi-Fi: http://<ip-del-pc>:<puerto>

   Los tipos MIME importan más de lo que parece: un service worker servido
   como text/plain no se registra y un manifest tampoco se lee. Un servidor
   "simple" que responde todo como texto plano hace fallar cosas que en
   producción funcionan bien, y se pierde media hora buscando el error donde
   no está.                                                                 */

const http = require("http");
const fs = require("fs");
const path = require("path");
const os = require("os");

const dir = path.resolve(process.argv[2] || ".");
const PUERTO = Number(process.argv[3]) || 4173;

const TIPOS = {
  ".html": "text/html; charset=utf-8",
  ".js":   "text/javascript; charset=utf-8",
  ".mjs":  "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".webmanifest": "application/manifest+json; charset=utf-8",
  ".css":  "text/css; charset=utf-8",
  ".svg":  "image/svg+xml",
  ".png":  "image/png",
  ".jpg":  "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".ico":  "image/x-icon",
  ".woff2":"font/woff2",
  ".woff": "font/woff",
  ".txt":  "text/plain; charset=utf-8",
  ".pdf":  "application/pdf"
};

http.createServer((req, res) => {
  let ruta = decodeURIComponent(req.url.split("?")[0]);
  if (ruta.endsWith("/")) ruta += "index.html";

  const archivo = path.join(dir, ruta);
  if (!archivo.startsWith(dir)) { res.writeHead(403); return res.end("prohibido"); }

  fs.readFile(archivo, (err, datos) => {
    if (err) { res.writeHead(404); return res.end("no encontrado"); }
    res.writeHead(200, {
      "Content-Type": TIPOS[path.extname(archivo).toLowerCase()] || "application/octet-stream",
      /* sin caché: en desarrollo una versión vieja pegada confunde más que ayuda */
      "Cache-Control": "no-cache"
    });
    res.end(datos);
  });
}).listen(PUERTO, () => {
  console.log("sirviendo " + dir);
  console.log("  local:    http://localhost:" + PUERTO);
  for (const [nombre, redes] of Object.entries(os.networkInterfaces())) {
    for (const r of redes || []) {
      if (r.family === "IPv4" && !r.internal) {
        console.log("  teléfono: http://" + r.address + ":" + PUERTO + "   (" + nombre + ")");
      }
    }
  }
});
