/* Verificador de contraste WCAG para una tabla de colores.

   node contraste.js paletas.json

   Elegir colores "a ojo" falla justo donde más duele: un gris secundario que
   se ve bien en el monitor del que lo eligió es ilegible en un teléfono al
   sol. Este script convierte esa duda en un sí o un no, y hace la comprobación
   completa —cada paleta, en claro y en oscuro— en un segundo.

   Formato del JSON:
   {
     "pares": [
       ["texto principal", "ink",  "surface", 4.5],
       ["botón primario",  "sobreAcc", "acc", 4.5],
       ["borde de acento", "acc",  "surface", 3.0]
     ],
     "paletas": {
       "bosque": {
         "claro":  { "ink": "#182320", "surface": "#F8F9F6", "acc": "#2E6B54", "sobreAcc": "#F8F9F6" },
         "oscuro": { "ink": "#E4E9E5", "surface": "#171C1A", "acc": "#74C69B", "sobreAcc": "#0F1312" }
       }
     }
   }

   Mínimos WCAG: 4.5 para texto normal, 3.0 para texto grande y para bordes o
   iconos que transmiten información.                                        */

const fs = require("fs");

function lum(hex) {
  const c = hex.replace("#", "").match(/.{2}/g).map(h => {
    const v = parseInt(h, 16) / 255;
    return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
}

function ratio(a, b) {
  const l1 = lum(a), l2 = lum(b);
  const [x, y] = l1 > l2 ? [l1, l2] : [l2, l1];
  return (x + 0.05) / (y + 0.05);
}

function verificar(datos) {
  const { pares, paletas } = datos;
  let fallos = 0, total = 0;

  for (const [id, modos] of Object.entries(paletas)) {
    for (const [modo, tokens] of Object.entries(modos)) {
      for (const [nombre, a, b, min] of pares) {
        total++;
        const ca = tokens[a], cb = tokens[b];
        if (!/^#[0-9A-Fa-f]{6}$/.test(ca || "") || !/^#[0-9A-Fa-f]{6}$/.test(cb || "")) {
          console.log(`✗ ${id}/${modo}  ${nombre}: falta o es inválido (${a}=${ca}, ${b}=${cb})`);
          fallos++;
          continue;
        }
        const r = ratio(ca, cb);
        if (r < min) {
          console.log(`✗ ${id}/${modo}  ${nombre}: ${r.toFixed(2)} < ${min}  (${ca} sobre ${cb})`);
          fallos++;
        }
      }
    }
  }

  console.log(fallos
    ? `\n${fallos} de ${total} comprobaciones por debajo del mínimo`
    : `Las ${total} comprobaciones pasan el contraste mínimo`);
  return fallos;
}

module.exports = { ratio, verificar };

if (require.main === module) {
  const archivo = process.argv[2];
  if (!archivo) { console.error("uso: node contraste.js paletas.json"); process.exit(2); }
  process.exit(verificar(JSON.parse(fs.readFileSync(archivo, "utf8"))) ? 1 : 0);
}
