# Arkanoid

Un clon del clásico Arkanoid hecho con HTML, CSS y JavaScript puro. Cero dependencias, cero build: se abre `index.html` en el navegador y se juega.

## Cómo jugar

Abrí `index.html` en cualquier navegador (doble click, o servido con cualquier servidor estático). No hace falta instalar nada.

**Controles:**

- `←` / `→` — mover la paleta.
- `Espacio` o click — lanzar la bola cuando está pegada a la paleta.
- `P` — pausar / reanudar.
- `M` — silenciar / activar el sonido.

## Features

- 3 niveles con layouts de bloques distintos; las vidas se recargan al pasar de nivel.
- Sistema de vidas y puntaje (10 puntos por bloque, iguales para todas las filas).
- Velocidad de la bola creciente durante la partida, con tope máximo.
- Partículas al romper bloques y texto flotante de puntaje (`+10`).
- Audio sintetizado con Web Audio API (sin archivos de sonido): tonos para pared/paleta, ruido filtrado para rotura de bloques.
- Pausa que congela el juego, las animaciones y el temporizador de dificultad.
- Pantallas de victoria y Game Over con botón de reinicio.

## Estructura del proyecto

- `index.html` — HUD, canvas del juego y overlays.
- `style.css` — estilos.
- `script.js` — toda la lógica del juego (estado, física, audio, render, loop).
- `specs/` — historial de specs que definieron cada feature (ver abajo).

## Desarrollo: specs

Este proyecto sigue un flujo spec-driven: cada feature nueva se define primero como un spec en `specs/` (con su alcance, modelo de datos, plan de implementación y criterios de aceptación) antes de tocar código. Los specs actuales:

1. `01-mvp-jugable.md` — MVP jugable: paleta, bola, un nivel, vidas y puntaje.
2. `02-efectos-rotura-bloques.md` — partículas, popups de puntaje y sonido al romper bloques.
3. `03-niveles-y-audio.md` — múltiples niveles y rediseño del audio.
4. `04-pausa-y-ayuda-de-teclas.md` — pausa y leyenda de teclas.

No hay tests automatizados ni linter configurados: la verificación es manual, jugando el juego, contra los criterios de aceptación de cada spec.

Ver `CLAUDE.md` para el detalle de arquitectura y las convenciones del repo.
