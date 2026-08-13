# SPEC 03 — Niveles y rediseño de audio

> **Status:** aprobado
> **Depends on:** SPEC 01, SPEC 02
> **Date:** 2026-08-13
> **Objective:** Añadir tres niveles con layouts de bloques distintos que recargan las vidas al avanzar, y reorganizar el audio para que paredes y paleta usen el tono que hoy tienen los bloques mientras los bloques pasan a sonar como algo que se rompe.

---

## Scope

**In:**

- Tres niveles con layouts de bloques distintos, definidos como patrones de texto: nivel 1 grid completo (40 bloques), nivel 2 pirámide (28 bloques), nivel 3 tablero con huecos (20 bloques).
- Destruir todos los bloques de un nivel carga inmediatamente el siguiente, sin overlay intermedio.
- Al entrar a un nivel nuevo las vidas se recargan al valor inicial de 3.
- El score se acumula entre niveles: no se reinicia al avanzar.
- Al entrar a un nivel nuevo la bola se re-pega a la paleta y se relanza con espacio o click.
- Completar el nivel 3 dispara el overlay de victoria "¡Ganaste!" ya existente.
- Indicador de nivel en el HUD con el formato "Nivel: 1/3".
- Reiniciar la partida vuelve al nivel 1 con el grid completo.
- Sonido de rebote en las tres paredes del canvas (izquierda, derecha y techo) a 880 Hz, como máximo uno por frame.
- Sonido de rebote en la paleta a 523 Hz.
- Sonido nuevo de rotura de bloque: ruido blanco corto filtrado con pasa-bajos, igual para todos los bloques.
- Eliminación del tono por fila de los bloques (`BRICK_ROW_FREQUENCIES`) al quedar sin uso.
- La tecla `M` sigue silenciando todos los sonidos, incluidos los nuevos.

**Out of scope (para specs futuros):**

- Un cuarto nivel o más, y generación procedural de layouts.
- Bloques que aguantan varios golpes, bloques irrompibles o bloques especiales.
- Reiniciar la velocidad de la bola al cambiar de nivel.
- Overlay o pantalla de transición entre niveles con botón de continuar.
- Puntuación distinta por nivel o bonus por completar un nivel.
- Sonidos para pérdida de vida, victoria, derrota y cambio de nivel.
- Música de fondo y control de volumen.
- Persistencia del nivel alcanzado o del score entre sesiones.
- Screen shake, estela de la bola y animación de la paleta (siguen fuera desde SPEC 02).

---

## Data model

```js
// Layouts de nivel (script.js). '#' = bloque, '.' = hueco.
// 5 filas x 8 columnas, mismas dimensiones de grid que SPEC 01.
const LEVEL_LAYOUTS = [
  [
    '########',
    '########',
    '########',
    '########',
    '########',
  ],
  [
    '...##...',
    '..####..',
    '.######.',
    '########',
    '########',
  ],
  [
    '#.#.#.#.',
    '.#.#.#.#',
    '#.#.#.#.',
    '.#.#.#.#',
    '#.#.#.#.',
  ],
];

const TOTAL_LEVELS = LEVEL_LAYOUTS.length; // 3
const INITIAL_LIVES = 3;

// Nuevo campo en state
const state = {
  // ...campos existentes de SPEC 01 y SPEC 02
  level: 0, // índice del nivel actual: 0, 1 o 2
};

// Constantes de audio (reemplazan a BRICK_ROW_FREQUENCIES)
const WALL_SOUND_FREQUENCY = 880;
const PADDLE_SOUND_FREQUENCY = 523;
const TONE_SOUND_DURATION = 0.08;  // antes BRICK_SOUND_DURATION
const TONE_SOUND_GAIN = 0.15;      // antes BRICK_SOUND_GAIN
const BREAK_SOUND_DURATION = 0.12;
const BREAK_SOUND_GAIN = 0.3;
const BREAK_FILTER_FREQUENCY = 1200;
```

Convenciones:

- `state.level` es un índice base 0 (0, 1, 2), igual que el campo `row` del bloque. El HUD muestra `state.level + 1`.
- Cada layout es un array de 5 strings de 8 caracteres. Solo `'#'` genera bloque; cualquier otro carácter deja hueco.
- La geometría del grid no cambia: se siguen usando `BRICK_WIDTH`, `BRICK_HEIGHT`, `BRICK_PADDING`, `BRICK_OFFSET_TOP` y `BRICK_OFFSET_LEFT` de SPEC 01.
- El color del bloque sigue saliendo de `BRICK_ROW_COLORS[row]`, así que un mismo nivel mantiene un color por fila.
- Conteo de bloques por nivel: 40, 28 y 20 respectivamente.
- Puntos por bloque: 10, iguales en todos los niveles.
- Las partículas y popups en vuelo **no** se limpian al avanzar de nivel: terminan su animación sobre el layout nuevo.
- Ganancia del ruido de rotura (0.3) mayor que la del tono (0.15) porque el ruido blanco se percibe más flojo a igual amplitud.

---

## Implementation plan

1. Extraer la constante `INITIAL_LIVES = 3` y usarla en la inicialización de `state.lives` y en `restartGame()`, en lugar del 3 hardcodeado. Prueba manual: recargar la página y ver "Vidas: 3" en el HUD.
2. Añadir `LEVEL_LAYOUTS` con los tres patrones y `TOTAL_LEVELS` al inicio de `script.js`. Prueba manual: en consola, `LEVEL_LAYOUTS.length` devuelve `3` y `LEVEL_LAYOUTS[1][0]` devuelve `'...##...'`.
3. Cambiar `createBricks()` a `createBricks(level)`, que recorre `LEVEL_LAYOUTS[level]` y solo empuja un bloque donde el carácter es `'#'`. Actualizar las dos llamadas existentes para pasar `0`. Prueba manual: el nivel 1 sigue mostrando el grid completo y `state.bricks.length` devuelve `40`.
4. Añadir `level: 0` a `state`. Prueba manual: en consola, `state.level` devuelve `0`.
5. Comprobar los otros dos layouts sin tocar la lógica de juego: en consola, `state.bricks = createBricks(1)` dibuja la pirámide con 28 bloques y `createBricks(2)` el tablero con 20. Prueba manual: los dos patrones se ven como en el data model y la bola sigue rebotando en ellos.
6. Implementar `advanceLevel()`, que incrementa `state.level`, recarga `state.lives = INITIAL_LIVES`, regenera `state.bricks = createBricks(state.level)` y llama a `attachBall()`. Prueba manual: con vidas gastadas, llamar `advanceLevel()` en consola y ver la pirámide, las vidas de vuelta a 3 y la bola pegada a la paleta.
7. Reemplazar `checkWin()` por `checkLevelComplete()`: si no quedan bloques vivos y `state.level` es el último, poner `status = 'win'`; si no, llamar a `advanceLevel()`. Actualizar la llamada en `updateBall()`. Prueba manual: romper todos los bloques del nivel 1 carga la pirámide sin overlay; romper los del nivel 3 muestra "¡Ganaste!".
8. Añadir `state.level = 0` y `state.bricks = createBricks(0)` a `restartGame()`. Prueba manual: avanzar al nivel 2, perder las 3 vidas, reiniciar desde el overlay y ver el grid completo del nivel 1.
9. Añadir `<span id="hud-level">Nivel: 1/3</span>` al `#hud` de `index.html`, capturar la referencia en `script.js` y pintarla en `updateHud()` con `state.level + 1` y `TOTAL_LEVELS`. Prueba manual: el HUD muestra "Nivel: 1/3" y cambia a "Nivel: 2/3" al superar el primer nivel, sin descolocar Score ni Vidas.
10. Generalizar `playBrickSound(row)` a `playToneSound(frequency)`, que recibe la frecuencia en lugar de leerla del array; añadir `WALL_SOUND_FREQUENCY` y `PADDLE_SOUND_FREQUENCY`, y renombrar `BRICK_SOUND_DURATION`/`BRICK_SOUND_GAIN` a `TONE_SOUND_DURATION`/`TONE_SOUND_GAIN`. Dejar la llamada de los bloques funcionando de momento. Prueba manual: en consola, `playToneSound(880)` y `playToneSound(523)` suenan a distinta altura.
11. Llamar al sonido de pared en `collideWalls()` usando una bandera local `bounced` que se activa en cualquiera de las tres ramas, reproduciendo `playToneSound(WALL_SOUND_FREQUENCY)` una sola vez al final de la función. Prueba manual: rebotar en la pared izquierda, la derecha y el techo suena una vez cada rebote, y un golpe en esquina no suena doble.
12. Llamar `playToneSound(PADDLE_SOUND_FREQUENCY)` en `collidePaddle()`, junto a `setBallDirection()`. Prueba manual: el rebote en la paleta suena más grave que el de la pared, y no suena cuando la bola pasa de largo sin tocarla.
13. Implementar `playBrickBreakSound()`: generar un `AudioBuffer` mono de `BREAK_SOUND_DURATION` segundos rellenado con ruido blanco, pasarlo por un `BiquadFilterNode` pasa-bajos a `BREAK_FILTER_FREQUENCY` y por un `GainNode` con caída exponencial desde `BREAK_SOUND_GAIN`. Prueba manual: en consola, `playBrickBreakSound()` suena a chasquido de rotura, no a tono.
14. Sustituir la llamada de audio en `checkBrickCollision()` por `playBrickBreakSound()`, y eliminar `BRICK_ROW_FREQUENCIES` y cualquier resto de `playBrickSound` al quedar sin uso. Prueba manual: romper un bloque suena a rotura, la paleta y las paredes a tono, y la tecla `M` silencia los tres.

---

## Acceptance criteria

- [ ] Abrir `index.html` carga el nivel 1 con el grid completo de 40 bloques y sin errores en consola.
- [ ] El HUD muestra "Nivel: 1/3" al empezar, junto al Score y las Vidas.
- [ ] Destruir todos los bloques del nivel 1 carga el layout de pirámide sin mostrar ningún overlay.
- [ ] El nivel 2 muestra exactamente 28 bloques dispuestos en pirámide y el HUD marca "Nivel: 2/3".
- [ ] El nivel 3 muestra exactamente 20 bloques dispuestos en tablero y el HUD marca "Nivel: 3/3".
- [ ] Al entrar a un nivel nuevo las vidas vuelven a 3, incluso si se llegó con 1 vida.
- [ ] Al entrar a un nivel nuevo el score conserva los puntos de los niveles anteriores.
- [ ] Al entrar a un nivel nuevo la bola queda pegada a la paleta y no se mueve hasta pulsar espacio o hacer click.
- [ ] Destruir todos los bloques del nivel 3 muestra el overlay "¡Ganaste!" con su botón de reinicio.
- [ ] Perder las 3 vidas en cualquier nivel muestra el overlay "Game Over".
- [ ] Reiniciar desde cualquier overlay vuelve al nivel 1 con el grid completo, score 0, 3 vidas y el HUD en "Nivel: 1/3".
- [ ] Rebotar en la pared izquierda, la derecha o el techo reproduce un tono agudo, una sola vez por rebote.
- [ ] Rebotar en la paleta reproduce un tono audiblemente más grave que el de las paredes.
- [ ] Romper un bloque reproduce un chasquido de ruido, no un tono musical.
- [ ] Ningún bloque reproduce ya un tono distinto según su fila.
- [ ] Pulsar `M` silencia los tres sonidos nuevos y pulsarlo otra vez los reactiva.
- [ ] Las partículas y el "+10" de SPEC 02 siguen apareciendo al romper cada bloque en los tres niveles.
- [ ] El juego no introduce dependencias externas ni archivos de audio en el repositorio.

---

## Decisions

- **Sí:** un único spec para niveles y audio. Razón: decisión explícita del usuario; los dos cambios no se pisan entre sí y se implementan en una sola pasada.
- **Sí:** tres layouts distintos definidos como patrones de texto. Razón: decisión explícita del usuario; los patrones en strings se leen igual que el dibujo del nivel, así que añadir o corregir un layout no exige tocar lógica.
- **Sí:** vidas recargadas a `INITIAL_LIVES` al avanzar. Razón: es el pedido literal del usuario.
- **Sí:** score acumulado entre niveles. Razón: decisión explícita del usuario; el score final refleja la partida completa.
- **No:** reiniciar la velocidad de la bola al cambiar de nivel. Razón: el usuario dejó esa opción sin marcar, así que la bola conserva la velocidad acumulada y el nivel 3 arranca rápido. Es la fuente de dificultad principal del spec y queda anotada como riesgo.
- **No:** overlay de transición entre niveles. Razón: el usuario dejó esa opción sin marcar; el avance es inmediato.
- **Sí:** la bola se re-pega a la paleta al entrar a un nivel nuevo. Razón: decisión explícita del usuario; reutiliza `attachBall()` y evita que el nivel arranque con la bola a media pantalla y ya acelerada.
- **Sí:** indicador de nivel en el HUD. Razón: sin él no hay forma de saber en qué nivel estás ni de verificar la progresión; el `#hud` ya es flex, así que cuesta un span y una línea. **No lo pidió el usuario explícitamente** — si sobra, se quita en la revisión de este borrador.
- **Sí:** paredes a 880 Hz y paleta a 523 Hz. Razón: decisión explícita del usuario; son dos frecuencias del array que ya existía y distinguir paleta de pared de oído ayuda a seguir la bola.
- **Sí:** un solo sonido de pared por frame mediante bandera local. Razón: `collideWalls()` evalúa X e Y por separado, así que un golpe en esquina dispararía dos veces el mismo sonido.
- **Sí:** ruido blanco filtrado para la rotura. Razón: decisión explícita del usuario; un oscilador suena a "beep" y no a algo que se quiebra, y el ruido se genera en código sin meter archivos al repositorio.
- **Sí:** el mismo sonido de rotura para todos los bloques. Razón: decisión explícita del usuario frente a la variante que variaba el brillo por fila.
- **Sí:** eliminar `BRICK_ROW_FREQUENCIES`. Razón: al mover el tono a paredes y paleta y quitar la variación por fila, el array queda sin ninguna referencia.
- **Sí:** conservar el campo `row` del bloque. Razón: aunque deje de usarse para audio, sigue determinando el color vía `BRICK_ROW_COLORS[row]`.
- **No:** limpiar partículas y popups al avanzar de nivel. Razón: SPEC 02 estableció que las animaciones terminan de forma natural; cortarlas en seco al cambiar de layout sería un retroceso.
- **No:** bloques con varios golpes de resistencia. Razón: descartado por el usuario; introduce vida por bloque, colores de daño y cambios en el score, y merece su propio spec.
- **No:** persistir el nivel alcanzado. Razón: el proyecto no tiene persistencia todavía; abrirla aquí arrastraría la decisión de almacenamiento.

---

## Identified risks

| Riesgo | Mitigación |
| --- | --- |
| El nivel 3 arranca con la bola a velocidad ya acelerada y resulta injugable. | `MAX_BALL_SPEED` la topa en 10 y la bola se re-pega a la paleta al entrar, dando margen de reacción. Si en la prueba manual resulta injusto, reiniciar la velocidad por nivel es un cambio de una línea en `advanceLevel()`. |
| Un golpe en esquina dispara el sonido de pared dos veces en el mismo frame. | Bandera local `bounced` en `collideWalls()` y una sola llamada al final de la función. |
| Rebotes muy seguidos entre paredes cercanas saturan el audio. | La duración del tono es 0.08s y cada oscilador se detiene solo; no se acumulan nodos. |
| Generar un `AudioBuffer` de ruido en cada rotura presiona el recolector de basura. | El buffer es de 0.12s mono (unos 5 KB a 44.1 kHz) y el `AudioBufferSourceNode` se libera al terminar. |
| El layout de tablero deja bloques aislados difíciles de alcanzar y el nivel 3 se alarga. | Son solo 20 bloques y las vidas se recargaron al entrar; además la velocidad acumulada acelera el barrido. |
| `createBricks(level)` recibe un índice fuera de rango si la lógica de avance falla. | `checkLevelComplete()` solo llama a `advanceLevel()` cuando `state.level` no es el último, así que el índice nunca pasa de `TOTAL_LEVELS - 1`. |

---

## What is **not** in this spec

- Más de tres niveles o layouts generados proceduralmente.
- Bloques con resistencia, irrompibles o especiales.
- Overlay de transición entre niveles.
- Reinicio de la velocidad de la bola por nivel.
- Sonidos de pérdida de vida, victoria, derrota y cambio de nivel.
- Música de fondo y control de volumen.
- Persistencia del nivel o del score entre sesiones.

Cada uno de estos, si se implementa, va en su propio spec.
