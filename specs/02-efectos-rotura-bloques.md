# SPEC 02 — Efectos de rotura de bloques

> **Status:** aprobado
> **Depends on:** SPEC 01
> **Date:** 2026-08-13
> **Objective:** Dar feedback de impacto al romper un bloque mediante un estallido de partículas, un sonido sintetizado con tono distinto por fila y un texto flotante de "+10", todo puramente visual y sonoro sin alterar la lógica de juego existente.

---

## Scope

**In:**

- Estallido de partículas al romper un bloque: 10 fragmentos que salen en abanico desde el centro del bloque, con el color del bloque, caen con gravedad y se desvanecen.
- Las partículas se dibujan como cuadrados pequeños de 3x3px que reducen su opacidad a medida que se agota su vida.
- Texto flotante "+10" que aparece en el centro del bloque roto, sube y se desvanece.
- Sonido de rotura sintetizado en tiempo real con Web Audio API (`OscillatorNode` + `GainNode`), sin archivos de audio en el repositorio.
- Una frecuencia distinta por fila de bloques: las filas superiores suenan más agudas que las inferiores.
- Tecla `M` para activar/desactivar el sonido, con estado inicial activado.
- Inicialización perezosa del `AudioContext` en el primer lanzamiento de bola (espacio o click), para cumplir la política de autoplay de los navegadores.
- Tope máximo de 400 partículas simultáneas: si se excede, se descartan las más antiguas.
- Limpieza de partículas y textos flotantes al reiniciar la partida.
- Las animaciones siguen corriendo y terminan de forma natural aunque la partida pase a `win` o `gameover`.

**Out of scope (para specs futuros):**

- Screen shake o sacudida del canvas al romper un bloque.
- Estela o rastro de la bola.
- Animación de la paleta (deformación, brillo al golpear).
- Sonidos distintos para rebote en paredes, rebote en paleta, pérdida de vida, victoria o derrota.
- Música de fondo.
- Control de volumen granular o slider de volumen en la interfaz.
- Persistencia de la preferencia de silencio entre sesiones.
- Fragmentos grandes con rotación (partir el bloque en cuadrantes).

---

## Data model

```js
// Nuevas colecciones dentro de state (script.js)
const state = {
  // ...campos existentes de SPEC 01 (lives, score, status, paddle, ball, bricks)
  particles: [/* { x, y, dx, dy, size, color, life, maxLife } */],
  popups: [/* { x, y, dy, text, life, maxLife } */],
};

// Nuevo campo en cada bloque, necesario para el tono por fila
// { x, y, width, height, color, alive, row }

// Estado de audio (módulo, fuera de state)
let audioContext = null;   // se crea en el primer lanzamiento de bola
let audioMuted = false;    // alterna con la tecla M
```

Convenciones:

- Vida de las partículas y popups medida en frames, no en milisegundos, igual que las velocidades de SPEC 01.
- `life` arranca en `maxLife` y baja 1 por frame; la entidad se elimina al llegar a 0.
- Opacidad de dibujo: `life / maxLife`, de 1 (recién creada) a 0 (desaparece).
- Partículas por bloque roto: 10. Vida: 40 frames. Tamaño: 3x3px. Gravedad: 0.15 px/frame².
- Velocidad inicial de partícula: entre 1 y 3.5 px/frame, en un abanico de 360° desde el centro del bloque.
- Popup "+10": vida 35 frames, sube a 0.8 px/frame, fuente `bold 14px sans-serif` en blanco.
- Tope de partículas simultáneas: 400.
- Frecuencias por fila, de arriba a abajo: 880, 784, 698, 622 y 523 Hz.
- Sonido de rotura: onda cuadrada, duración 0.08s, ganancia inicial 0.15 con caída exponencial a silencio.
- El campo `row` del bloque es el índice de fila (0 a 4), donde 0 es la fila superior.

---

## Implementation plan

1. En `createBricks()` de `script.js`, añadir el campo `row: row` a cada objeto bloque. Prueba manual: en la consola del navegador, `state.bricks[0].row` devuelve `0` y `state.bricks[39].row` devuelve `4`.
2. Añadir las constantes de partículas (`PARTICLES_PER_BRICK`, `PARTICLE_LIFE`, `PARTICLE_SIZE`, `PARTICLE_GRAVITY`, `PARTICLE_SPEED_MIN`, `PARTICLE_SPEED_MAX`, `MAX_PARTICLES`) junto a las constantes existentes al inicio de `script.js`. Prueba manual: recargar la página sin errores en consola.
3. Añadir los arrays vacíos `particles` y `popups` a `state`. Prueba manual: `state.particles` y `state.popups` existen y están vacíos en consola.
4. Implementar `spawnBrickParticles(brick)`, que empuja `PARTICLES_PER_BRICK` partículas al array con posición en el centro del bloque, ángulo aleatorio en 360°, velocidad aleatoria en el rango definido y el color del bloque. Prueba manual: llamar `spawnBrickParticles(state.bricks[0])` desde la consola y verificar que `state.particles.length` es 10.
5. Implementar `updateParticles()`, que aplica la velocidad, suma la gravedad a `dy`, decrementa `life` y elimina las partículas agotadas. Prueba manual: tras el paso anterior, llamar `updateParticles()` 40 veces desde la consola y verificar que el array vuelve a estar vacío.
6. Implementar `drawParticles()`, que dibuja cada partícula como un cuadrado relleno con `ctx.globalAlpha = life / maxLife` y restaura `globalAlpha` a 1 al terminar. Prueba manual: llamar `spawnBrickParticles()` en consola y ver los cuadrados dibujados en el canvas.
7. Enganchar `spawnBrickParticles(hit)` en `checkBrickCollision()`, justo después de `hit.alive = false`, y añadir `drawParticles()` al final de `draw()`. Prueba manual: romper un bloque en el juego y ver el estallido de fragmentos de su color.
8. Llamar `updateParticles()` desde `loop()`, **fuera** del guard de `update()` que hace return en `win` y `gameover`. Prueba manual: romper el último bloque y verificar que las partículas terminan su animación con el overlay de victoria ya visible, en lugar de quedarse congeladas.
9. Aplicar el tope de `MAX_PARTICLES` en `spawnBrickParticles()`, descartando las partículas más antiguas cuando se excede. Prueba manual: llamar `spawnBrickParticles()` en bucle 100 veces desde la consola y verificar que `state.particles.length` no pasa de 400.
10. Implementar `spawnScorePopup(brick)`, `updatePopups()` y `drawPopups()` siguiendo el mismo patrón de vida en frames, con el texto "+10" subiendo desde el centro del bloque. Enganchar los tres igual que las partículas. Prueba manual: romper un bloque y ver el "+10" subiendo y desvaneciéndose sobre su posición.
11. Añadir las constantes de audio (`BRICK_ROW_FREQUENCIES`, duración, ganancia) e implementar `ensureAudioContext()`, que crea el `AudioContext` si no existe y lo reanuda si está suspendido. Llamarlo desde `launchBall()`. Prueba manual: lanzar la bola y verificar en consola que `audioContext.state` es `'running'`.
12. Implementar `playBrickSound(row)`, que crea un `OscillatorNode` de onda cuadrada con la frecuencia de la fila, lo conecta a un `GainNode` con caída exponencial y lo detiene tras la duración definida. Prueba manual: llamar `playBrickSound(0)` y `playBrickSound(4)` desde la consola y oír dos tonos de distinta altura.
13. Enganchar `playBrickSound(hit.row)` en `checkBrickCollision()`, junto al resto de efectos. Prueba manual: romper bloques de distintas filas y oír que las filas superiores suenan más agudas.
14. Añadir el manejo de la tecla `M` en el listener de `keydown` para alternar `audioMuted`, y comprobar esa bandera al inicio de `playBrickSound()`. Prueba manual: pulsar `M`, romper un bloque y no oír nada; pulsar `M` de nuevo y volver a oírlo.
15. Vaciar `state.particles` y `state.popups` en `restartGame()`. Prueba manual: romper varios bloques, reiniciar desde el overlay y verificar que no queda ninguna partícula ni "+10" en pantalla.

---

## Acceptance criteria

- [ ] Romper un bloque genera un estallido de fragmentos del mismo color que el bloque roto.
- [ ] Los fragmentos salen en direcciones distintas, caen acelerando hacia abajo y se desvanecen hasta desaparecer.
- [ ] Los fragmentos desaparecen por completo del canvas y de `state.particles` cuando se agota su vida.
- [ ] Romper un bloque muestra un "+10" en su posición que sube y se desvanece.
- [ ] El score sigue subiendo exactamente 10 puntos por bloque y la bola rebota igual que antes de este spec.
- [ ] Romper el último bloque muestra el overlay "¡Ganaste!" en el mismo frame que antes, sin esperar a que termine la animación.
- [ ] Las partículas del último bloque terminan su animación con el overlay de victoria ya visible, sin quedarse congeladas.
- [ ] Romper un bloque reproduce un sonido corto audible.
- [ ] Los bloques de las filas superiores suenan más agudos que los de las filas inferiores.
- [ ] Pulsar `M` silencia el sonido de rotura y pulsarlo otra vez lo reactiva.
- [ ] El primer lanzamiento de bola con espacio o click deja el `AudioContext` en estado `running`, sin advertencias de autoplay en la consola.
- [ ] Reiniciar la partida desde cualquier overlay deja el canvas sin partículas ni textos flotantes residuales.
- [ ] `state.particles.length` nunca supera 400 durante el juego.
- [ ] El juego no introduce dependencias externas ni archivos de audio en el repositorio.

---

## Decisions

- **Sí:** partículas como efecto de rotura, revirtiendo la exclusión de SPEC 01. Razón: decisión explícita del usuario; es el efecto clásico de Arkanoid y el que más impacto visual da por línea de código.
- **Sí:** sonido de rotura en este spec, revirtiendo la exclusión de SPEC 01. Razón: decisión explícita del usuario, que descartó dejarlo para un spec posterior.
- **Sí:** popup flotante de "+10" en este spec. Razón: decisión explícita del usuario; reutiliza el mismo patrón de vida en frames que las partículas, así que no añade un sistema nuevo.
- **Sí:** efecto puramente visual, sin retrasar la lógica. Razón: decisión explícita del usuario; el bloque muere al instante y la máquina de estados queda intacta, con lo que no hay riesgo de romper la jugabilidad ya aprobada.
- **Sí:** vida de las animaciones medida en frames. Razón: decisión explícita del usuario; mantiene la convención "velocidades en píxeles/frame" de SPEC 01 y evita cambiar la firma de `update()` y `draw()` para pasar el timestamp.
- **Sí:** actualizar las partículas desde `loop()` y no desde `update()`. Razón: `update()` hace return en `win` y `gameover`, así que las partículas del último bloque se congelarían justo en el momento más visible.
- **Sí:** audio sintetizado con `OscillatorNode`. Razón: decisión explícita del usuario; cumple la regla de cero dependencias del proyecto sin meter binarios ni blobs base64 en el repositorio.
- **Sí:** una frecuencia por fila. Razón: decisión explícita del usuario; da feedback de progreso hacia arriba del muro sin coste adicional de implementación.
- **Sí:** tecla `M` para silenciar. Razón: decisión explícita del usuario; un juego con sonido sin mute molesta a quien lo abre en una pestaña de fondo.
- **Sí:** nuevo campo `row` en el objeto bloque. Razón: el modelo de SPEC 01 solo guarda `color`, y deducir la fila a partir del color sería frágil si en el futuro dos filas comparten color.
- **Sí:** tope de 400 partículas descartando las más antiguas. Razón: evita degradar el framerate en rachas de roturas rápidas, y descartar las viejas es menos visible que descartar las nuevas.
- **No:** screen shake. Razón: requiere transformar el contexto y afecta al render completo, no solo a los bloques; merece su propio spec.
- **No:** sonidos para rebotes, pérdida de vida, victoria y derrota. Razón: convertiría este spec en un diseño de audio completo del juego; se define en un spec posterior.
- **No:** persistir la preferencia de silencio. Razón: SPEC 01 no introdujo persistencia y añadirla aquí abriría la decisión de almacenamiento; queda para el spec de high scores.
- **No:** fragmentos grandes con rotación. Razón: descartada por el usuario frente a las partículas; exige rotación de contexto y es más difícil de afinar.

---

## Identified risks

| Riesgo | Mitigación |
| --- | --- |
| El navegador bloquea el audio por política de autoplay y el sonido no se oye nunca. | Crear y reanudar el `AudioContext` dentro de `launchBall()`, que solo se ejecuta tras un gesto del usuario (espacio o click). |
| Muchas roturas seguidas generan cientos de partículas y bajan el framerate. | Tope duro de 400 partículas simultáneas descartando las más antiguas. |
| Las partículas se congelan al ganar porque `update()` hace return en `win`. | Actualizarlas desde `loop()`, fuera de ese guard. |
| Crear un `OscillatorNode` por bloque acumula nodos y consume memoria. | Llamar `osc.stop()` con la duración definida; los nodos detenidos son recolectados automáticamente por el navegador. |
| Partículas dibujadas con `globalAlpha` dejan el contexto alterado y afectan al resto del render. | Restaurar `ctx.globalAlpha = 1` al final de `drawParticles()` y `drawPopups()`. |

---

## What is **not** in this spec

- Screen shake o sacudida del canvas.
- Estela o rastro de la bola.
- Animación de la paleta.
- Sonidos de rebote, pérdida de vida, victoria y derrota.
- Música de fondo y control de volumen.
- Persistencia de la preferencia de silencio.

Cada uno de estos, si se implementa, va en su propio spec.
