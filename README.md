# Conteo

Contador de inventario para el teléfono. Una sola pantalla: arriba escribes el
total esperado, al costado va lo que llevas contado en grande y lo que falta, y
abajo el botón que ocupa cerca de la mitad de la pantalla. Sin cuentas, sin
servidor, sin conexión: todo vive en el navegador del teléfono.

## Cómo se construye

```
node build.js        genera dist/ y ejecuta sus comprobaciones
node servidor.js dist 4174    previsualizar (imprime la IP para el teléfono)
node contraste.js paletas.json    contraste WCAG de la paleta
node iconos.js dist  regenera los PNG del icono
```

`build.js` termina con código 1 si algo falla, así que sirve tal cual como
comando de build en Cloudflare Pages.

## Arquitectura

```
contenido.html   la única fuente que se edita — documento completo, se abre solo
build.js         inyecta las etiquetas de app instalable y genera dist/
paletas.json     los colores; el build comprueba que el CSS no se desvíe
iconos.js        genera los PNG del icono sin dependencias
servidor.js      servidor local con los tipos MIME correctos
dist/            generado — no se edita, no va al repositorio
```

Todo el estado se guarda en `localStorage` bajo la clave `conteo.v2`: ajustes,
el nombre, el esperado, el conteo en curso y el historial (máximo 200).

## Decisiones que no conviene romper

- **El botón ocupa cerca de la mitad de la pantalla.** No es capricho: se usa de
  pie, con una mano ocupada. Es un rectángulo redondeado y no un círculo porque
  un círculo lo limita el ancho del teléfono y se queda en un cuarto de la
  pantalla. Medido: 46% del área (49% del alto) en 375×812, 33% en 360×640. Se estira
  con `flex:1` dentro de `.zona`; ponerle un alto fijo lo rompe, y por eso el
  build lo comprueba. Todo lo que se agregue a la pantalla se lo come a él.
- **Una sola pantalla, sin paso previo.** El total esperado es un campo que se
  puede escribir o corregir en cualquier momento, incluso contando. Sin total
  la app cuenta igual y dice "escribe el total".
- **Cuenta en `pointerdown`, no en `click`.** Con `click` se siente lento cuando
  vas rápido.
- **Deshacer usa una pila de deltas**, no un contador de pulsaciones: así deshace
  bien aunque hayas cambiado cuánto suma cada pulsación a mitad de camino.
- **Pasarse del total no se bloquea.** Contar de más es un dato del inventario,
  no un error de la app: se marca en rojo y se guarda la diferencia.
- **El campo del nombre vive dentro de la barra de arriba**, no en una fila
  propia: con las nueve fichas de paso y los cinco atajos de esperado, una fila
  más dejaba el botón en 39% de la pantalla.
- **Dos escalas distintas y a propósito:** los atajos de `Esperado` son números
  pelados (10, 12, 20, 50, 100) y las fichas de paso llevan signo (+1, +2, +5,
  +10, +12, +20, +50, +100, otro). Es lo único que las distingue de un vistazo.
- **Hubo un modo "conteo a ciegas"** (escondía el total mientras contabas, porque
  ver la cifra esperada empuja a cuadrarla) y se sacó al simplificar: choca con
  una pantalla cuyo primer elemento es justamente el total esperado.
- **El conteo en curso se guarda en cada pulsación.** Si se cierra la app, al
  volver sigue donde iba.

## Publicación

GitHub → Cloudflare Pages. Configuración: framework preset `None`, build command
`node build.js`, output directory `dist`.
