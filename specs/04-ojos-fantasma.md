# SPEC 04 — Ojos que regresan a la jaula

> **Status:** Implemented
> **Depends on:** SPEC 01, SPEC 02, SPEC 03
> **Date:** 2026-10-11
> **Objective:** Al comer un fantasma azul se convierten en ojos que viajan rápido a la jaula y reaparecen con el retardo de SPEC 02.

## Scope

**In:**

- Campo `eaten` por fantasma en `src/js/game.js` (inicial `false`, se activa al ser comido en vez del respawn instantáneo de SPEC 03).
- Ojos con velocidad `EYES_SPEED = 0.25` conmutada solo en `aligned()` vía `g.curSpeed` (mismo régimen que el fix de SPEC 03).
- Navegación de ojos en `decideGhost`: target interior de la jaula `{ x: 13, y: 14 }` minimizando Manhattan sobre `choices` (respeta muros, puerta `3` y sin-180º salvo callejón).
- Sin interacción con pacman mientras `eaten` (ni matan ni dan puntos).
- Al llegar (`isInPen`): `eaten = false`, `dir = 'up'`, `exitTimer = GHOST_EXIT_DELAY[kind]` (retardo escalonado de SPEC 02).
- Render solo-ojos en `src/js/render.js`: `drawEyes` sin cuerpo, reutilizando ojos y dirección de mirada de `drawGhost`.
- `resetPositions` limpia `eaten = false`.

**Out of scope (for future specs):**

- Ojos atravesando muros en línea recta.
- Puntos por comer ojos en modo azul.
- Salida inmediata al revivir (se usa el retardo SPEC 02 por decisión del usuario).
- Cadena de puntos 200/400/800/1600.
- Niveles, sonidos, high-scores, mobile, multiplayer.

## Data model

```js
// src/js/game.js — constantes nuevas
const EYES_SPEED = 0.25; // 1/4: re-alinea cada 4 frames, más rápido que pacman
const EYES_TARGET = { x: 13, y: 14 }; // interior de la jaula (puerta 3 pasable para fantasma)

// ghost amplía un campo:
// g.eaten: true mientras viaja como ojos, false en comportamiento normal
```

Convenciones:

- Coordenadas: origen arriba-izquierda, celda `(x,y)`.
- Decisión y conmutación de velocidad solo cuando `aligned()` (`<1e-3`), igual que SPEC 03.
- Puerta `3`: bloquea a pacman, no a fantasma (los ojos entran por ella).
- `PEN`, `PEN_EXIT`, `isInPen`, `GHOST_EXIT_DELAY` de SPEC 02 sin cambios.

## Implementation plan

1. Añadir `EYES_SPEED`, `EYES_TARGET` y `eaten: false` en `createGame` (sin usarlos aún). Verificación: el juego funciona igual, comer azul sigue con respawn instantáneo.
2. Al comer azul en `update`: en vez de teletransporte, `g.eaten = true` (+200 puntos, sin tocar posición ni `exitTimer`). Verificación: el fantasma se queda quieto en el punto de captura como ojos (aún con cuerpo hasta el paso 5).
3. Rama `eaten` al inicio de `decideGhost`: target `EYES_TARGET` con Manhattan sobre `choices` (antes que frightened y SPEC 02). Velocidad `0.25` vía `g.curSpeed` en `moveGhost`. Verificación: los ojos viajan rápido hacia la puerta, la cruzan y entran a la jaula.
4. Colisión en `update`: ignorar fantasmas con `eaten` (ni quitan vida ni dan puntos). Verificación: pacman atraviesa los ojos sin efecto en ambos modos.
5. Llegada: si `eaten && isInPen(g)` → `eaten = false`, `dir = 'up'`, `exitTimer = GHOST_EXIT_DELAY[g.kind]`. Verificación: dentro revive y repite la espera/salida escalonada de SPEC 02.
6. Render en `src/js/render.js`: `drawEyes(ctx, g)` (solo ojos mirando según `g.dir`) y usarla en `draw()` cuando `g.eaten`. Verificación: en viaje solo se ven los ojos; al revivir, cuerpo y color de SPEC 01/03.
7. `resetPositions`: `eaten = false` (con el `curSpeed` y timer ya existentes). Verificación: morir con ojos en viaje los devuelve al inicio como normales.

## Acceptance criteria

- [x] El juego carga `src/index.html` sin errores en consola.
- [x] Comer un fantasma azul suma 200 puntos y lo deja como ojos en el punto de captura (sin teletransporte).
- [x] Los ojos viajan visiblemente más rápido que pacman hacia la jaula, sin atravesar muros.
- [x] Los ojos cruzan la puerta `3` y entran a la jaula.
- [x] Pacman atraviesa los ojos sin perder vida ni ganar puntos, con y sin frightened activo.
- [x] Al entrar a la jaula el fantasma recupera cuerpo, color e IA y espera su retardo escalonado de SPEC 02 antes de salir.
- [x] Morir con ojos en viaje los devuelve al inicio como fantasmas normales.
- [x] Frightened (`0.0625`, aleatorio, 600 frames), pellets, `won`/`lost`, túnel fila 14 y velocidades base siguen intactos.

## Decisions

- **Sí:** velocidad ojos `0.25` (1/4). Rápida, exacta en binario y re-alinea cada 4 frames dentro del régimen `aligned()`.
- **No:** `0.5` ni `0.1`. `0.5` apenas decide en cruces cortos; `0.1` no se distingue del fantasma normal.
- **Sí:** target interior `{ x: 13, y: 14 }` con Manhattan sobre `choices`. Reutiliza la maquinaria de `decideGhost` y la ruta entra por la puerta de forma natural.
- **No:** ojos ignorando muros. Rompe la regla de muros por actor y necesita movimiento fuera del régimen `aligned()`.
- **Sí:** sin interacción con pacman en viaje. Los ojos son efecto visual en tránsito, no actor de colisión.
- **No:** puntos extra por ojos en azul. Añade conteo y no se pidió.
- **Sí:** revivir con retardo `GHOST_EXIT_DELAY[kind]` de SPEC 02. Decisión del usuario; mantiene el escalonado pinky-blinky-inky-clyde.
- **No:** salida inmediata (`exitTimer = 0`). Era la opción simple pero rompe el escalonado acordado en SPEC 02.
- **Sí:** `drawEyes` separada reutilizando ojos de `drawGhost`. Sin cuerpo, misma mirada direccional.
- **Sí:** todo en `src/js/game.js` + `src/js/render.js`, sin tocar `maze.js`.

## Risks

| Risk | Mitigation |
| ---- | ---------- |
| Ojos dando rodeos largos por Manhattan greedy sin-180º | Aceptado: llegan igual; la jaula es destino único y el greedy no tiene mínimos locales permanentes con la regla de callejón |
| Ojos llegan por debajo y `isInPen` los revive en el borde | Aceptado: `isInPen` cubre `11–16, 12–15`; revivir ahí dentro es correcto en todos los casos |
| Frightened expira durante el viaje | Sin efecto: la rama `eaten` va antes que frightened y la velocidad es `0.25` en ambos casos |
| Múltiples ojos a la vez | Cada uno tiene su `eaten`; son independientes y no interactúan |

## What is **not** in this spec

- Ojos atravesando muros.
- Puntos por ojos.
- Salida inmediata al revivir.
- Cadena 200/400/800/1600.
- Niveles, sonidos, high-scores.
- Multiplayer, mobile, editor visual.

Cada uno de esos, si llega, va en su propio spec.
