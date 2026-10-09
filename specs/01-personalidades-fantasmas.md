# SPEC 01 — Cuatro fantasmas con personalidades arcade

> **Status:** Approved
> **Depends on:** (ninguna)
> **Date:** 2026-10-09
> **Objective:** Dotar al juego de 4 fantasmas con conductas distintas estilo arcade, uno de ellos (Blinky) persiguiendo agresivamente a PacMan.

## Scope

**In:**

- Ampliar `GHOST_STARTS` en `src/js/maze.js` de 2 a 4 entradas, todas dentro del pen, con `kind` fijos: `blinky`, `pinky`, `inky`, `clyde`.
- Implementar en `decideGhost` (`src/js/game.js`) una regla de target por `kind`:
  - `blinky`: target = posición de PacMan (hunter puro, agresivo).
  - `pinky`: target = PacMan + 4 celdas en `pacman.dir`.
  - `inky`: target = `2 * (pacman + 2*dir) - blinky`, con fallback a PacMan si Blinky no está disponible.
  - `clyde`: si distancia Manhattan > 8 persigue como hunter, si <= 8 elige al azar.
- Selección de dirección por minimización de Manhattan sobre `choices` (sin giro 180º salvo callejón), igual que el `hunter` actual.
- Misma velocidad para los 4 (`GHOST_SPEED=0.1`).
- Asignar nombres y colores arcade en orden: `blinky` rojo `#ff0000`, `pinky` rosa `#ffb8ff`, `inky` cian `#00ffff`, `clyde` naranja `#ffb852` (reordena `GHOST_COLORS` en `src/js/render.js`).

**Out of scope (for future specs):**

- Temporizador global scatter/chase.
- Modo frightened / power-pellets comestibles.
- Salida escalonada o con retardo del pen.
- Velocidades distintas por fantasma.
- Bug arcade de overflow en `up` (pinky apunta 4 arriba simple, sin +4 izquierda).

## Data model

```js
// src/js/maze.js
const GHOST_STARTS = [
  { x: 11, y: 14, kind: 'blinky' },
  { x: 12, y: 14, kind: 'pinky' },
  { x: 14, y: 14, kind: 'inky' },
  { x: 16, y: 14, kind: 'clyde' },
  // Posiciones exactas a ajustar a celdas transitables del pen (0) en fila 14.
  // Todas dentro del pen, salen por puerta 3 sin lógica de retardo.
];

// src/js/game.js — el objeto ghost ya existe, solo cambia el dominio de kind:
 // g.kind: 'blinky' | 'pinky' | 'inky' | 'clyde'
// g.dir, g.x, g.y, g.speed sin cambios.

// src/js/render.js
const GHOST_COLORS = ['#ff0000', '#ffb8ff', '#00ffff', '#ffb852'];
// Índice alineado con el orden de GHOST_STARTS.
```

Convenciones:

- Coordenadas: origen arriba-izquierda, celda `(x,y)`.
- Distancias en Manhattan sobre celdas redondeadas.
- Decisión de fantasma solo cuando `aligned()` (`<1e-3` del centro).

## Implementation plan

1. Ampliar `GHOST_STARTS` a 4 entradas con los `kinds` fijos en `src/js/maze.js`. Verificación: abrir página, aparecen 4 fantasmas, consola sin errores.
2. Extraer cálculo de `target(kind, game, blinky)` en `src/js/game.js` sin cambiar selección de dirección. Verificación: Blinky se comporta igual que el `hunter` actual.
3. Implementar `pinky` (target +4 en `pacman.dir`) y verificar que en pasillo recto se adelanta a PacMan.
4. Implementar `inky` (reflejo de Blinky con fallback) y `clyde` (umbral 8). Verificación: Inky flanquea, Clyde se dispersa de cerca.
5. Reordenar `GHOST_COLORS` en `src/js/render.js` al orden arcade. Verificación: rojo, rosa, cian, naranja de izquierda a derecha según `GHOST_STARTS`.

## Acceptance criteria

- [ ] El juego carga `src/index.html` sin errores en consola.
- [ ] Hay exactamente 4 fantasmas con colores rojo, rosa, cian y naranja.
- [ ] Blinky minimiza Manhattan hacia la celda de PacMan en cada cruce (persecución agresiva, sin azar).
- [ ] Pinky apunta a PacMan + 4 celdas en su dirección actual.
- [ ] Inky apunta al reflejo de Blinky sobre el punto `pacman + 2*dir`.
- [ ] Clyde persigue como hunter a distancia > 8 y elige al azar a distancia <= 8.
- [ ] Los 4 mantienen `GHOST_SPEED=0.1`, prohibición de giro 180º salvo callejón y decisión solo en `aligned()`.
- [ ] Comer puntos, colisión (`lives--`, `resetPositions`), `won`/`lost` y túnel fila 14 siguen funcionando.

## Decisions

- **Sí:** estilo clásico arcade simplificado. Da 4 conductas diferenciables con solo cambiar el target, sin IA nueva.
- **No:** 4 customs inventados. Más diseño y más riesgo de balance.
- **Sí:** Blinky siempre hunter puro. Cumple "uno persigue agresivamente" de forma verificable.
- **No:** hunter más rápido ni agresivo por rachas. Toca velocidades protegidas por `AGENTS.md`.
- **Sí:** 4 dentro del pen, libres desde frame 0. Sin estado de retardo nuevo.
- **No:** 1 fuera + 3 dentro con timer. Merece su propio spec si se quiere.
- **Sí:** misma velocidad `0.1` para los 4. La variedad es decisión, no velocidad.
- **Sí:** Pinky +4 simple en `pacman.dir`. Sin bug de overflow arcade.
- **Sí:** Inky como reflejo de Blinky con fallback a PacMan. Flanqueo real con fórmula cerrada.
- **Sí:** Clyde con umbral Manhattan 8. Número arcade, booleano y testeable a ojo.
- **Sí:** `kinds` `blinky/pinky/inky/clyde` y colores arcade. Alinea código con el original.
- **Sí:** sin modos globales scatter/chase ni frightened. Fuera de este spec.
- **Sí:** verificación manual en navegador según `AGENTS.md`. Sin tests ni logs permanentes.

## Risks

| Risk | Mitigation |
| ---- | ---------- |
| Posiciones del pen elegidas caen en pared o puerta | Elegir solo celdas `0` de la fila 14 del `MAZE` parseado; verificar visualmente que los 4 salen por la puerta `3` |
| Inky depende de Blinky y rompe si el orden cambia | Fallback explícito a posición de PacMan si Blinky no se encuentra |
| Pinky/Inky apuntan a celda con pared | Aceptado: se minimiza Manhattan hacia ese target con `choices` legales, igual que `hunter` actual |

## What is **not** in this spec

- Modos globales scatter/chase por tiempo.
- Fantasmas comestibles / frightened / power-pellets.
- Salida escalonada del pen.
- Velocidades por fantasma.
- Multiplayer, mobile, editor visual.

Cada uno de esos, si llega, va en su propio spec.
