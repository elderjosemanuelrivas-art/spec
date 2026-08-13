# SPEC 04 — Pausa y ayuda de teclas

> **Status:** aprobado
> **Depends on:** SPEC 01, SPEC 02
> **Date:** 2026-08-13
> **Objective:** Permitir pausar y reanudar la partida con la tecla `P`, y mostrar una leyenda de texto fija con las teclas de pausa y silencio para que el jugador sepa qué presionar.

---

## Scope

**In:**

- Tecla `P` (mayúscula o minúscula) alterna entre partida activa y pausada.
- Se puede pausar en cualquier momento de partida activa, incluso con la bola pegada a la paleta esperando el lanzamiento.
- Pausar congela: movimiento de la paleta, movimiento de la bola, colisiones, partículas, popups de puntos y el temporizador de aceleración de la bola.
- Al reanudar, el temporizador de aceleración de la bola descuenta el tiempo que estuvo en pausa, para no perder velocidad "gratis" por pausar.
- Overlay nuevo y separado para "Pausado", sin botón de reiniciar.
- Mientras está pausado, las teclas de flechas y espacio no mueven la paleta ni lanzan la bola.
- La tecla `M` (silenciar audio) sigue funcionando igual estando en pausa o no.
- Leyenda de texto fija debajo del canvas con el formato "P: Pausa · M: Sonido", visible en todo momento durante el juego.
- `P` no hace nada en los overlays terminales ("¡Ganaste!" y "Game Over").
- Reiniciar la partida desde cualquier overlay limpia cualquier estado de pausa pendiente.

**Out of scope (para specs futuros):**

- Botones clicables con el mouse para pausar o silenciar (SPEC 01 fijó controles solo por teclado; esta decisión no se reabre aquí).
- Menú de opciones o configuración accesible desde la pausa.
- Persistencia de la preferencia de mute o de la partida pausada entre sesiones.
- Animación de transición al entrar o salir de pausa.
- Ocultar o atenuar el canvas (dim/blur) detrás del overlay de pausa más allá de lo que ya hace `.overlay` (fondo semitransparente).

---

## Data model

```js
// Nuevo valor válido de state.status (script.js), además de 'ready' | 'win' | 'gameover'
// state.status: 'ready' | 'paused' | 'win' | 'gameover'

// Nueva variable de módulo, junto a startTime y lastSpeedIncreaseElapsed
let pauseStartedAt = null; // performance.now() del instante en que se pausó, o null si no está pausado
```

Convenciones:

- `'paused'` solo es alcanzable desde `'ready'` y solo vuelve a `'ready'`; nunca se pausa desde `'win'` ni `'gameover'`.
- `pauseStartedAt` se marca con `performance.now()` al pausar (evento de teclado, fuera del loop de `requestAnimationFrame`) y se usa para desplazar `startTime` al reanudar, de modo que el tiempo pausado no cuente para `SPEED_INCREASE_INTERVAL`.
- La leyenda de teclas es texto estático, no interactivo: no se generan nuevas entidades de estado para ella.

---

## Implementation plan

1. Añadir `'paused'` como valor documentado de `state.status` y la variable de módulo `pauseStartedAt = null`, junto a `startTime`/`lastSpeedIncreaseElapsed` en `script.js`. Prueba manual: recargar `index.html` sin errores en consola; `state.status` sigue en `'ready'`.
2. Implementar `togglePause()`: si `state.status === 'ready'`, pasa a `'paused'` y guarda `pauseStartedAt = performance.now()`; si `state.status === 'paused'`, suma `performance.now() - pauseStartedAt` a `startTime`, limpia `pauseStartedAt` a `null` y vuelve a `'ready'`; en cualquier otro estado no hace nada. Prueba manual: en consola, `togglePause()` cambia `state.status` entre `'ready'` y `'paused'`, y no hace nada si `state.status` es `'win'`.
3. Añadir el listener de teclado para `'p'`/`'P'` que llama a `togglePause()`, junto al de `'m'`/`'M'` existente. Prueba manual: pulsar `P` durante la partida cambia `state.status` a `'paused'`.
4. Extender el guard de `update()` para incluir `state.status === 'paused'` (además de `'win'`/`'gameover'`), y añadir el mismo chequeo al inicio de `launchBall()`. Prueba manual: pausar con la bola en movimiento, mover el mouse a las flechas y presionar espacio — la paleta y la bola no se mueven.
5. Envolver las llamadas a `updateParticles()`, `updatePopups()` y `updateDifficulty()` en `loop()` con un chequeo de `state.status !== 'paused'`. Prueba manual: romper un bloque, pausar de inmediato y ver que las partículas y el "+10" quedan congelados en el aire hasta reanudar.
6. Añadir el markup de `#pause-overlay` en `index.html`, reutilizando las clases `.overlay`/`.overlay-content` con el texto "Pausado" y sin ningún botón. Prueba manual: el elemento existe en el DOM y está oculto por defecto (clase `hidden`).
7. Implementar `syncPauseOverlay()`, que muestra `#pause-overlay` cuando `state.status === 'paused'` y lo oculta en cualquier otro caso; llamarla desde `draw()` junto a `syncOverlay()`. Prueba manual: pausar muestra "Pausado" superpuesto al canvas; reanudar lo oculta.
8. Añadir la fila `<div id="key-hints">P: Pausa · M: Sonido</div>` debajo del canvas en `index.html`, con estilo de texto pequeño y gris en `style.css`. Prueba manual: la leyenda es visible debajo del canvas en todo momento, incluso pausado o en los overlays de victoria/derrota.
9. Resetear `pauseStartedAt = null` en `restartGame()`, además de que `state.status` ya vuelve a `'ready'`. Prueba manual: pausar, reiniciar desde un overlay de Game Over sin haber reanudado antes, y confirmar que la partida nueva no arranca pausada.

---

## Acceptance criteria

- [ ] Presionar `P` durante partida activa muestra el overlay "Pausado" y congela la paleta, la bola y las partículas/popups en pantalla.
- [ ] Presionar `P` de nuevo oculta el overlay y la partida continúa exactamente desde donde quedó, sin saltos de posición.
- [ ] Mover las flechas o presionar espacio mientras está pausado no mueve la paleta ni lanza la bola.
- [ ] Se puede pausar con la bola todavía pegada a la paleta, antes del primer lanzamiento.
- [ ] Pausar por varios segundos y reanudar no dispara un aumento de velocidad de la bola atribuible al tiempo en pausa.
- [ ] La tecla `M` sigue silenciando y reactivando el audio igual estando en pausa que fuera de ella.
- [ ] Presionar `P` en el overlay de "¡Ganaste!" o "Game Over" no tiene ningún efecto.
- [ ] La leyenda "P: Pausa · M: Sonido" es visible debajo del canvas en todo momento del juego.
- [ ] Reiniciar la partida desde cualquier overlay deja la partida nueva en estado `'ready'`, nunca `'paused'`.
- [ ] El juego no introduce dependencias externas ni archivos nuevos fuera de `script.js`, `index.html` y `style.css`.

---

## Decisions

- **Sí:** pausa activada por la tecla `P`, alternando entre `'ready'` y `'paused'`. Razón: es el pedido literal del usuario.
- **Sí:** indicadores de teclas como texto informativo, no botones clicables. Razón: decisión explícita del usuario; evita reabrir la decisión de SPEC 01 de controles solo por teclado.
- **Sí:** leyenda de teclas en una fila aparte debajo del canvas. Razón: decisión explícita del usuario; no compite visualmente con el HUD de Score/Vidas/Nivel.
- **Sí:** overlay de pausa nuevo y separado, sin botón de reiniciar. Razón: decisión explícita del usuario; evita que alguien reinicie la partida por accidente pensando que reanuda.
- **Sí:** se puede pausar en cualquier momento de partida activa, incluida la bola pegada a la paleta. Razón: decisión explícita del usuario; es más consistente que restringir la pausa a un solo sub-estado.
- **Sí:** pausar congela partículas y popups, a diferencia de SPEC 02 (donde siguen animándose en `'win'`/`'gameover'`). Razón: pausa es una decisión reversible del jugador para detener el tiempo por completo, mientras que `'win'`/`'gameover'` son estados terminales donde dejar la animación en curso no afecta ninguna decisión del jugador.
- **Sí:** descontar el tiempo pausado del temporizador de aceleración de la bola. Razón: sin esto, pausar mucho tiempo dispararía un aumento de velocidad injusto apenas se reanuda; es la única forma técnicamente correcta de implementar la pausa sin efectos secundarios en la dificultad.
- **Sí:** la tecla `M` funciona igual en pausa. Razón: silenciar el audio es una preferencia independiente del estado de la partida.
- **No:** botones clicables de mouse. Razón: descartado por el usuario; mantiene la decisión de SPEC 01.
- **No:** persistencia de mute o de la partida pausada entre sesiones. Razón: el proyecto no tiene persistencia todavía; abrirla aquí arrastraría la decisión de almacenamiento a un spec que no la necesita.
- **No:** menú de opciones en la pausa. Razón: fuera del pedido del usuario; una pausa simple no necesita configuración.

---

## Identified risks

| Riesgo | Mitigación |
| --- | --- |
| Pausar y reanudar deja el temporizador de dificultad desincronizado y provoca un salto de velocidad. | `pauseStartedAt` registra el instante de pausa con `performance.now()`, y al reanudar se suma la duración pausada a `startTime` para que `updateDifficulty()` no cuente ese lapso. |
| Un usuario pulsa espacio o flechas mientras está pausado esperando que reanude, en vez de usar `P`. | La leyenda de teclas deja claro que `P` es la tecla de pausa; además el guard de `update()`/`launchBall()` asegura que ningún input de partida tiene efecto mientras está pausado. |
| El overlay de pausa se queda visible tras perder todas las vidas si se pausó justo antes de que la bola cayera. | `update()` ya no procesa `loseLife()` mientras está pausado (está dentro del guard), así que ese cruce de estados no puede ocurrir; solo se pierde la vida después de reanudar. |

---

## What is **not** in this spec

- Botones clicables de mouse para pausar o silenciar.
- Menú de opciones o configuración.
- Persistencia de mute o de partida pausada entre sesiones.
- Animación de transición al pausar o reanudar.
- Oscurecer o difuminar el canvas detrás del overlay de pausa.

Cada uno de estos, si se implementa, va en su propio spec.
