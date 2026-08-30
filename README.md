# Conteo

Contador de inventario para el teléfono. Ingresas el total a contar, tocas el
botón grande y la app lleva la cuenta: cuántos van, cuántos faltan y cuánto
suma cada pulsación. Sin cuentas, sin servidor, sin conexión: todo vive en el
navegador del teléfono.

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

Todo el estado se guarda en `localStorage` bajo la clave `conteo.v1`: ajustes,
el conteo en curso y el historial (máximo 200).

## Decisiones que no conviene romper

- **El botón ocupa cerca de la mitad de la pantalla.** No es capricho: se usa de
  pie, con una mano ocupada. Es un rectángulo redondeado y no un círculo porque
  un círculo lo limita el ancho del teléfono y se queda en un cuarto de la
  pantalla. Medido: 49% del área en 375×812, 54% en 430×932, 38% en 360×640.
  El botón se estira con `flex:1` dentro de `.zona`; ponerle un alto fijo lo
  rompe, y por eso el build lo comprueba.
- **Cuenta en `pointerdown`, no en `click`.** Con `click` se siente lento cuando
  vas rápido.
- **Deshacer usa una pila de deltas**, no un contador de pulsaciones: así deshace
  bien aunque hayas cambiado cuánto suma cada pulsación a mitad de camino.
- **Pasarse del total no se bloquea.** Contar de más es un dato del inventario,
  no un error de la app: se marca en rojo y se guarda la diferencia.
- **Conteo a ciegas** (en Ajustes) esconde el total y lo que falta hasta
  terminar. Ver la cifra esperada mientras cuentas empuja a cuadrarla; es la
  razón por la que el conteo ciego es práctica estándar de inventario.
- **El conteo en curso se guarda en cada pulsación.** Si se cierra la app, al
  volver sigue donde iba.

## Publicación

GitHub → Cloudflare Pages. Configuración: framework preset `None`, build command
`node build.js`, output directory `dist`.
