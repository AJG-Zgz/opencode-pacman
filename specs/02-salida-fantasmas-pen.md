# SPEC 02 — Salida escalonada de fantasmas del pen

> **Status:** Aprobado
> **Depends on:** SPEC 01
> **Date:** 2026-10-09
> **Objective:** Hacer que los 4 fantasmas salgan del pen al pasillo encima de la puerta con retardo escalonado en vez de quedarse atrapados dentro.

## Scope

**In:**

- Detección `isInPen(x, y)` en `src/js/game.js` por caja de coordenadas del interior del pen.
- Campo `exitTimer` por fantasma con retardo por frames desde `createGame` y `resetPositions`, orden `pinky 0, blinky corto, inky medio, clyde largo`.
- Rebote vertical dentro del pen mientras `exitTimer > 0`, a `GHOST_SPEED=0.1`.
- Target temporal `PEN_EXIT = { x: 13, y: 11 }` cuando el fantasma está dentro del pen y su timer ya expiró, minimizando Manhattan con la regla sin-180º existente.
- Retorno a `decideGhost` normal de SPEC 01 en cuanto deja de estar en pen.
- `resetPositions` reinicia posiciones y timers, los fantasmas repiten la salida.

**Out of scope (for future specs):**

- Teletransporte o ruta forzada celda a celda que ignore `decideGhost`.
- Disparo de salida por dots comidos o mixto tiempo/dots.
- Blinky empezando fuera del pen.
- Velocidades distintas dentro/fuera del pen.
- Modos scatter/chase, frightened, power-pellets.

## Data model

```js
// src/js/game.js — añadidos, MAZE y GHOST_STARTS intactos
const PEN = { xMin: 11, xMax: 16, yMin: 13, yMax: 15 };
const PEN_EXIT = { x: 13, y: 11 }; // pasillo encima de la puerta 3
const GHOST_EXIT_DELAY = { pinky: 0, blinky: 60, inky: 180, clyde: 360 }; // frames a 60fps

// ghost amplía un solo campo:
 // g.exitTimer: frames restantes antes de poder dirigirse a PEN_EXIT
```

Convenciones:

- Coordenadas: origen arriba-izquierda, celda `(x,y)`.
- `isInPen` usa `Math.round(g.x/y)` dentro de `PEN`.
- Se considera "salido" cuando `!isInPen(g)`.
- Decisión solo cuando `aligned()` (`<1e-3`), igual que ahora.
- Puerta `3`: bloquea a pacman, no a fantasma (sin cambio).

## Implementation plan

1. Añadir `PEN`, `PEN_EXIT`, `GHOST_EXIT_DELAY`, `isInPen(game, g)` en `src/js/game.js` sin usarlos aún. Verificación: el juego carga igual, fantasmas siguen atrapados.
2. Inicializar `g.exitTimer` desde `GHOST_EXIT_DELAY[g.kind]` en `createGame` y reiniciarlo en `resetPositions`. Verificación: inspeccionar `game.ghosts` muestra `0/60/180/360`.
3. Implementar rebote de espera: si `isInPen` y `exitTimer > 0`, decrementar y mover solo vertical (mantiene `dir` si puede, si no invierte 180º). Verificación: pinky se dirige a la salida, los otros 3 rebotan arriba/abajo dentro.
4. Implementar target de salida: si `isInPen` y `exitTimer <= 0`, target = `PEN_EXIT` con selección Manhattan sobre `choices` sin-180º. Verificación: los 4 escalonados cruzan la puerta `3` y llegan al pasillo superior.
5. Conmutar a conducta SPEC 01 al salir (`!isInPen` → `ghostTarget` por `kind`). Verificación: fuera del pen blinky persigue, pinky adelanta +4, inky flanquea, clyde dispersa ≤8.

## Acceptance criteria

- [ ] El juego carga `src/index.html` sin errores en consola.
- [ ] Los 4 fantasmas empiezan dentro del pen y ninguno lo atraviesa lateralmente.
- [ ] Pinky empieza a dirigirse a la salida en el frame 0, blinky/inky/clyde rebotan verticalmente antes de su turno.
- [ ] Los 4 llegan al pasillo encima de la puerta y desde ahí retoman su `kind` de SPEC 01.
- [ ] Tras colisión con vidas restantes, `resetPositions` los devuelve al pen y repiten la misma secuencia escalonada.
- [ ] `PACMAN_SPEED=0.125`, `GHOST_SPEED=0.1`, prohibición 180º salvo callejón (más rebote de espera) y túnel fila 14 siguen funcionando.
- [ ] Comer dots, `won`/`lost`, puerta `3` bloqueando solo a pacman siguen funcionando.

## Decisions

- **Sí:** solo arreglar pathfinding con target temporal `PEN_EXIT`. Mantiene `decideGhost` y evita ruta guionada/teletransporte.
- **No:** salida guionada forzada. Más predecible pero rompe la regla de no-180º y añade camino especial.
- **Sí:** retardo por frames con `exitTimer`. Determinista y sin acoplar salida al progreso de dots.
- **No:** disparo por dots o mixto. Estilo arcade pero añade acoplamiento y dificulta verificación manual.
- **Sí:** orden `pinky-blinky-inky-clyde` con `0/60/180/360` frames. Cercano al arcade y verificable a ojo.
- **Sí:** rebote vertical en espera. Estilo arcade y evita fantasmas quietos que parecen congelados.
- **No:** quietos o persiguiendo sin salir en espera. Uno parece bug, el otro gasta decisión sin propósito.
- **Sí:** destino único `{x:13,y:11}` encima de la puerta. Una sola celda canónica, se acepta llegada a `13` o `14` en `y=11`.
- **Sí:** todo en `src/js/game.js`, sin tocar `maze.js`. `MAZE` prístino y `GHOST_STARTS` intactos reducen riesgo.
- **Sí:** repiten salida tras `resetPositions`. Consistente con empezar cada vida desde el pen.

## Risks

| Risk | Mitigation |
| ---- | ---------- |
| Timer en frames depende del fps real | Valores holgados; lo importante es el orden relativo, no segundos exactos |
| `PEN_EXIT` cae en dot y lo pisa un fantasma | Aceptado: fantasmas no comen, el dot sigue para pacman |
| Rebote necesita giro 180º prohibido fuera | Excepción solo en espera dentro del pen, documentada en código |
| Caja `PEN` desfasada del dibujo real | Verificar visualmente que `11–16, 13–15` cubre el interior y nada del pasillo |

## What is **not** in this spec

- Teletransporte o camino forzado.
- Salida por dots comidos.
- Blinky fuera desde el inicio.
- Velocidades por fantasma o dentro del pen.
- Scatter/chase, frightened, power-pellets, multiplayer, mobile, editor visual.

Cada uno de esos, si llega, va en su propio spec.
