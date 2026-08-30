/* Genera los iconos PNG de una app instalable, sin dependencias.

   node iconos.js [carpeta-destino]

   Lleva un codificador PNG mínimo (con el zlib de Node) y un rasterizador de
   trazos con submuestreo 4x, así que los bordes salen suaves. Ventajas sobre
   exportar imágenes a mano: no entran binarios al repositorio, los iconos se
   rehacen solos si cambia el color de marca, y pesan 1-3 KB.

   PARA ADAPTARLO A OTRO PROYECTO: cambia FONDO, TINTA y TRAZOS. Los trazos van
   en coordenadas 0..1 sobre el cuadrado, cada uno [x1,y1,x2,y2], y se dibujan
   con extremos redondeados. Manténlos dentro del 60% central: Android recorta
   los iconos "maskable" en círculo o en escudo según el lanzador, y lo que
   toque los bordes se pierde.                                                */

const zlib = require("zlib");
const fs = require("fs");
const path = require("path");

const FONDO = [0x0b, 0x6e, 0x58];   /* --acento en claro */
const TINTA = [0xff, 0xff, 0xff];   /* el trazo encima */

/* una tarja: cuatro palotes y el quinto cruzado */
const TRAZOS = [
  [0.330, 0.300, 0.330, 0.700],
  [0.470, 0.300, 0.470, 0.700],
  [0.610, 0.300, 0.610, 0.700],
  [0.255, 0.720, 0.690, 0.285]
];
const GROSOR = 0.070;
const LADOS = [180, 192, 512];      /* apple-touch, manifest, manifest grande */

/* ---------- codificador PNG (color type 2, 8 bits) ---------- */
const TABLA_CRC = (() => {
  const t = new Int32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c;
  }
  return t;
})();
function crc32(buf) {
  let c = -1;
  for (let i = 0; i < buf.length; i++) c = TABLA_CRC[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ -1) >>> 0;
}
function trozo(tipo, datos) {
  const largo = Buffer.alloc(4);
  largo.writeUInt32BE(datos.length, 0);
  const cuerpo = Buffer.concat([Buffer.from(tipo, "ascii"), datos]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(cuerpo), 0);
  return Buffer.concat([largo, cuerpo, crc]);
}
function png(w, h, rgb) {
  const fila = w * 3 + 1;
  const crudo = Buffer.alloc(fila * h);
  for (let y = 0; y < h; y++) {
    crudo[y * fila] = 0;                                   /* filtro none */
    rgb.copy(crudo, y * fila + 1, y * w * 3, (y + 1) * w * 3);
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(w, 0);
  ihdr.writeUInt32BE(h, 4);
  ihdr[8] = 8;    /* profundidad */
  ihdr[9] = 2;    /* truecolor RGB */
  return Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    trozo("IHDR", ihdr),
    trozo("IDAT", zlib.deflateSync(crudo, { level: 9 })),
    trozo("IEND", Buffer.alloc(0))
  ]);
}

/* ---------- rasterizado ---------- */
function distanciaASegmento(px, py, x1, y1, x2, y2) {
  const dx = x2 - x1, dy = y2 - y1;
  const largo2 = dx * dx + dy * dy;
  let t = largo2 ? ((px - x1) * dx + (py - y1) * dy) / largo2 : 0;
  t = Math.max(0, Math.min(1, t));
  return Math.hypot(px - (x1 + t * dx), py - (y1 + t * dy));
}
function esTinta(x, y) {
  return TRAZOS.some(([x1, y1, x2, y2]) =>
    distanciaASegmento(x, y, x1, y1, x2, y2) <= GROSOR / 2);
}
function icono(lado) {
  const rgb = Buffer.alloc(lado * lado * 3);
  const M = 4;                                    /* submuestreo 4x4 */
  for (let y = 0; y < lado; y++) {
    for (let x = 0; x < lado; x++) {
      let dentro = 0;
      for (let sy = 0; sy < M; sy++) {
        for (let sx = 0; sx < M; sx++) {
          if (esTinta((x + (sx + 0.5) / M) / lado, (y + (sy + 0.5) / M) / lado)) dentro++;
        }
      }
      const a = dentro / (M * M);
      const i = (y * lado + x) * 3;
      for (let c = 0; c < 3; c++) rgb[i + c] = Math.round(FONDO[c] * (1 - a) + TINTA[c] * a);
    }
  }
  return png(lado, lado, rgb);
}

function generar(destino) {
  fs.mkdirSync(destino, { recursive: true });
  return LADOS.map(lado => {
    const nombre = `icono-${lado}.png`;
    const datos = icono(lado);
    fs.writeFileSync(path.join(destino, nombre), datos);
    return { nombre, lado, kb: +(datos.length / 1024).toFixed(1) };
  });
}

module.exports = { generar, LADOS, FONDO };

if (require.main === module) {
  generar(process.argv[2] || ".").forEach(i =>
    console.log(`${i.nombre}  ${i.lado}x${i.lado}  ${i.kb} KB`));
}
