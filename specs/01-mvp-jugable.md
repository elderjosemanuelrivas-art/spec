# SPEC 01 — MVP jugable de Arkanoid

> **Status:** aprobado
> **Depends on:** Ninguno
> **Date:** 2026-08-12
> **Objective:** Un Arkanoid mínimo pero completamente jugable: paleta controlada por teclado, bola con física básica, un único nivel de bloques, sistema de vidas y puntaje, y pantallas de victoria/derrota con reinicio.

---

## Scope

**In:**

- Canvas HTML5 con game loop vía `requestAnimationFrame`.
- Paleta controlada con flechas izquierda/derecha del teclado.
- Bola con movimiento y rebote contra paredes, paleta y bloques.
- Bola pegada a la paleta que se lanza con tecla espacio o click (al inicio de la partida y tras perder una vida).
- Velocidad de la bola aumenta progresivamente durante la partida (dificultad creciente).
- Un único nivel fijo: grid uniforme de bloques de 5 filas x 8 columnas, cada fila con un color distinto.
- Sistema de vidas: 3 vidas. Perder la bola (cae debajo del canvas) resta una vida.
- Sistema de puntaje: 10 puntos por cada bloque destruido (igual para todos), visible en un HUD en pantalla.
- Overlay de victoria ("¡Ganaste!") al destruir todos los bloques, con botón para reiniciar la partida.
- Overlay de Game Over al perder las 3 vidas, con botón para reiniciar la partida.
- Reinicio de partida: restaura vidas, score, posición de bola/paleta y bloques al estado inicial.

**Out of scope (para specs futuros):**

- Power-ups (bloques que sueltan mejoras, bola múltiple, paleta ancha, etc.).
- Sonido y música.
- High scores persistentes (localStorage u otro almacenamiento).
- Múltiples niveles o progresión entre niveles.
- Soporte de mouse o táctil para mover la paleta.
- Animaciones o efectos visuales avanzados (partículas, shaders, etc.).

---

## Data model

```js
// Estado del juego (script.js)
const state = {
  lives: 3,
  score: 0,
  status: 'ready', // 'ready' | 'playing' | 'win' | 'gameover'
  paddle: { x: 200, y: 600, width: 80, height: 12, speed: 6 },
  ball: {
    x: 240, y: 588, radius: 6,
    dx: 0, dy: 0,       // 0,0 mientras está pegada a la paleta (attached)
    speed: 4,           // magnitud de velocidad, aumenta progresivamente
    attached: true,
  },
  bricks: [/* { x, y, width, height, color, alive } */],
};
```

Convenciones:

- Origen de coordenadas: esquina superior izquierda del canvas.
- Canvas: 480x640px.
- Velocidades en píxeles/frame.
- Grid de bloques: 5 filas x 8 columnas. Un color fijo por fila, de arriba a abajo (ej. rojo, naranja, amarillo, verde, celeste).
- Puntos por bloque destruido: 10, igual para todas las filas.

---

## Implementation plan

1. Crear `index.html` con un elemento `<canvas>` de 480x640, enlazando `style.css` y `script.js`. Prueba manual: abrir `index.html`, ver el canvas vacío sin errores en consola.
2. Crear `style.css` con estilos básicos (centrar canvas, fondo oscuro). Prueba manual: el canvas se ve centrado en la página.
3. En `script.js`, implementar el game loop con `requestAnimationFrame` que limpia y redibuja el canvas en cada frame. Prueba manual: sin errores en consola, loop corriendo de forma continua.
4. Implementar la paleta: dibujo, movimiento con flechas izquierda/derecha, límites del canvas. Prueba manual: mover la paleta con el teclado sin que se salga del canvas.
5. Implementar la bola en estado `attached: true` (sigue a la paleta) y su lanzamiento con espacio o click, con velocidad inicial fija. Prueba manual: la bola sigue a la paleta antes de lanzar; al presionar espacio, comienza a moverse.
6. Implementar el rebote de la bola contra paredes (izquierda, derecha, arriba) y contra la paleta. Prueba manual: la bola rebota correctamente sin atravesar los bordes ni la paleta.
7. Implementar la pérdida de vida cuando la bola cae debajo del canvas: resta una vida y vuelve a `attached: true`, o dispara `status: 'gameover'` si `lives` llega a 0. Prueba manual: dejar caer la bola y verificar que resta una vida y se reengancha, o pasa a Game Over en la última vida.
8. Implementar el grid de bloques (5x8, colores por fila) y su dibujo en el canvas. Prueba manual: se ven los bloques de colores al cargar la partida.
9. Implementar la colisión bola-bloque: al chocar, el bloque pasa a `alive: false`, deja de dibujarse, la bola rebota y se suman 10 puntos al score. Prueba manual: romper un bloque y verificar que desaparece, la bola rebota y el score sube en 10.
10. Implementar el aumento progresivo de la velocidad de la bola (incrementar `ball.speed` cada cierto número de golpes o cada X segundos de partida). Prueba manual: jugar varios minutos y notar que la bola se mueve más rápido que al inicio.
11. Implementar el HUD (vidas y score) dibujado sobre el canvas o como HTML superpuesto. Prueba manual: el HUD refleja vidas y score actualizados en tiempo real.
12. Implementar la detección de victoria (todos los bloques con `alive: false`): cambia `status` a `'win'` y muestra un overlay "¡Ganaste!" con botón de reinicio. Prueba manual: romper todos los bloques y ver el overlay de victoria.
13. Implementar la detección de Game Over (`lives === 0`): cambia `status` a `'gameover'` y muestra un overlay "Game Over" con botón de reinicio. Prueba manual: perder las 3 vidas y ver el overlay de Game Over.
14. Implementar la función de reinicio que restaura `state` a sus valores iniciales (vidas, score, bloques, posición de bola y paleta) y vuelve a `status: 'ready'`. Prueba manual: desde cualquier overlay, hacer click en reiniciar y verificar que la partida vuelve al estado inicial jugable.

---

## Acceptance criteria

- [ ] Abrir `index.html` en el navegador carga el juego sin errores en la consola.
- [ ] Las flechas izquierda/derecha mueven la paleta sin que se salga de los límites del canvas.
- [ ] Presionar espacio (o click) lanza la bola cuando está pegada a la paleta.
- [ ] La bola rebota correctamente contra paredes y paleta sin atravesarlas.
- [ ] Romper un bloque lo elimina del canvas y suma exactamente 10 puntos al score.
- [ ] El score y las vidas se muestran actualizados en todo momento en el HUD.
- [ ] Perder la bola resta una vida y la vuelve a pegar a la paleta si quedan vidas.
- [ ] Perder la bola con 0 vidas restantes muestra el overlay "Game Over" con botón de reinicio.
- [ ] Destruir todos los bloques muestra el overlay "¡Ganaste!" con botón de reinicio.
- [ ] El botón de reinicio en cualquier overlay restaura vidas, score, bloques y posiciones al estado inicial.
- [ ] La velocidad de la bola aumenta de forma perceptible a medida que avanza la partida.

---

## Decisions

- **Sí:** un único nivel fijo (5x8 bloques). Razón: mantener el MVP mínimo y jugable de punta a punta; niveles adicionales quedan para un spec futuro.
- **No:** power-ups en este spec. Razón: agregan un sistema de efectos y drops que merece su propio diseño; se define en un spec posterior una vez el MVP esté aprobado.
- **No:** sonido/música. Razón: no es esencial para validar el gameplay base.
- **No:** high scores persistentes. Razón: no hay necesidad de persistencia entre sesiones para un MVP jugable.
- **Sí:** lanzamiento manual de la bola (espacio/click). Razón: es el estándar clásico de Arkanoid y da control al jugador tras perder una vida.
- **Sí:** velocidad de bola progresiva. Razón: decisión explícita del usuario, da sensación de dificultad creciente sin necesitar power-ups ni niveles adicionales.
- **Sí:** puntos iguales por bloque (10 pts). Razón: simplicidad, decisión explícita del usuario.
- **Sí:** controles solo por teclado (sin mouse/táctil). Razón: decisión explícita del usuario, reduce el alcance de implementación.

---

## What is **not** in this spec

- Power-ups (bloques con mejoras, bola múltiple, paleta ancha, etc.).
- Sonido y música.
- High scores persistentes.
- Múltiples niveles o progresión entre niveles.
- Soporte de mouse o táctil.

Cada uno de estos, si se implementa, va en su propio spec.
