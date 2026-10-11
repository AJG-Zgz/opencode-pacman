# SPEC 03 — Power-pellets y fantasmas comestibles

> **Status:** Approved
> **Depends on:** SPEC 01, SPEC 02
> **Date:** 2026-10-10
> **Objective:** Añadir 4 power-pellets en las esquinas que activan 10 segundos de modo frightened con fantasmas azules comestibles.

## Scope

**In:**

- Nuevo tile `4` (power-pellet, carácter `'o'`) en `src/js/maze.js` en 4 celdas: `(1,3)`, `(26,3)`, `(1,23)`, `(26,23)`.
- Campo `frightenedTimer` en el estado de `src/js/game.js`, con `FRIGHTENED_DURATION = 600` frames (10s a 60fps).
- Comer power-pellet en `movePacman` (solo en `aligned()`): `+50` puntos, activa el timer, cuenta para `dotsRemaining` y `won`.
- Fantasmas en frightened: decisión aleatoria sobre `choices` (respeta sin-180º y callejón) y velocidad `GHOST_FRIGHTENED_SPEED = 0.06` en `src/js/game.js`.
- Colisión en frightened en `update`: `+200` puntos y respawn del fantasma comido a su `GHOST_STARTS[i]` con `exitTimer = 0`, sin perder vida.
- `resetPositions` limpia `frightenedTimer = 0`.
- Render en `src/js/render.js` desde `game.grid`: pellets grandes parpadeantes y fantasmas azules `#2121ff` con flash blanco los últimos 2s.

**Out of scope (for future specs):**

- Puntuación en cadena 200/400/800/1600 dentro del mismo fright.
- Fantasma comido convertido en ojos que vuelven al pen.
- Scatter/chase global por tiempo.
- Niveles, sonidos, high-scores, mobile, multiplayer.

## Data model

```js
// src/js/maze.js — parseTile amplía un caso, MAZE_STR cambia 4 chars '.' -> 'o'
 // '#' -> 1, '.' -> 2, '-' -> 3, 'o' -> 4, ' ' -> 0

// src/js/game.js — constantes nuevas
const POWER_PELLET_SCORE = 50;
const GHOST_EAT_SCORE = 200;
const FRIGHTENED_DURATION = 600; // 10s * 60fps
const GHOST_FRIGHTENED_SPEED = 0.0625; // 1/16: re-alinea cada 16 frames y < PACMAN_SPEED (0.125), cazables

// game amplía dos campos:
// game.frightenedTimer: frames restantes de modo azul
// game.dotsRemaining cuenta v === 2 || v === 4
// ghost amplía un campo:
// g.curSpeed: velocidad efectiva; solo conmuta en aligned()
```

Convenciones:

- Coordenadas: origen arriba-izquierda, celda `(x,y)`.
- Decisión y comida solo cuando `aligned()` (`<1e-3`), igual que ahora.
- Timer en frames, igual que `exitTimer` de SPEC 02.
- Puerta `3` y túnel fila 14 sin cambios.

## Implementation plan

1. Añadir tile `4` en `src/js/maze.js`: caso `'o'` en `parseTile` y 4 sustituciones en `MAZE_STR` (`(1,3)`, `(26,3)`, `(1,23)`, `(26,23)`). Verificación: abrir página, consola sin errores, el juego funciona igual (los `4` aún se dibujan como nada).
2. Añadir constantes, `frightenedTimer: 0` en `createGame` y conteo de dots con `v === 2 || v === 4`. Verificación: `dotsRemaining` sube en 4 respecto a antes y el juego sigue igual.
3. Comer power-pellet en `movePacman` (rama `aligned()` junto al dot): `grid = 0`, `score += 50`, `dotsRemaining--`, `frightenedTimer = 600`. Verificación: comer esquina da +50 y el timer queda en 600.
4. Modo frightened en `decideGhost` (elección aleatoria sobre `choices`) y velocidad `0.0625` (1/16) conmutada solo en `aligned()` vía `g.curSpeed` en `moveGhost`. Verificación: tras pellet los 4 deambulan lento y al azar 10s y luego retoman su `kind` de SPEC 01.
5. Colisión comestible en `update`: si `frightenedTimer > 0`, `score += 200` y respawn de ese fantasma a `GHOST_STARTS[i]` con `exitTimer = 0`; si no, como ahora. Decrementar timer cada `update` y limpiarlo en `resetPositions`. Verificación: comer azul no quita vida, el fantasma reaparece y sale; morir cancela el azul.
6. Render en `src/js/render.js`: `drawPowerPellets` (radio ~6, pulso por `frame`) y fantasmas en `#2121ff` (flash `#fff` alterno cada ~15 frames en los últimos 120). Verificación: 4 pellets grandes visibles y azules que avisan antes de expirar.

## Acceptance criteria

- [ ] El juego carga `src/index.html` sin errores en consola.
- [ ] Hay exactamente 4 power-pellets grandes en `(1,3)`, `(26,3)`, `(1,23)`, `(26,23)`.
- [ ] Comer un power-pellet suma 50 puntos y tiñe a los 4 fantasmas de azul durante ~10s.
- [ ] En azul los fantasmas van más lentos que pacman y se mueven al azar respetando sin-180º salvo callejón.
- [ ] Chocar un fantasma azul suma 200 puntos, lo devuelve a su inicio y pacman no pierde vida.
- [ ] Chocar sin azul quita vida y hace `resetPositions()` como antes, cancelando el azul.
- [ ] Al expirar el timer los fantasmas recuperan color e IA (`blinky` hunter, `pinky` +4, `inky` flanqueo, `clyde` umbral 8).
- [ ] `won` exige comer dots y los 4 pellets; túnel fila 14, puerta `3` y velocidades base siguen intactos.

## Decisions

- **Sí:** posiciones arcade `(1,3)`, `(26,3)`, `(1,23)`, `(26,23)`. Balance clásico y celdas ya transitables con dot.
- **No:** esquinas extremas `(1,1)`, `(26,1)`, `(1,29)`, `(26,29)`. Más pegadas al borde y menos fieles al arcade.
- **Sí:** 10 segundos (`600` frames). Decisión del usuario, más margen para cazar.
- **No:** 7s arcade ni 5s difícil. Menos margen de prueba.
- **Sí:** tile `4` con carácter `'o'` en `MAZE_STR`. Reutiliza `game.grid` y el render condicional sin estructuras paralelas.
- **No:** lista separada de pellets fuera del grid. Duplica fuente de verdad y rompe "dibujar desde `game.grid`".
- **Sí:** velocidad frightened `0.0625` (1/16). Más lenta que pacman (`0.125`) y re-alinea cada 16 frames dentro del régimen `aligned()`.
- **No:** `0.06`. No es de la forma 1/n: desde celda entera nunca vuelve a `<1e-3` de un entero, el fantasma deja de decidir y atraviesa muros.
- **Sí:** conmutar `g.curSpeed` solo en el centro (`aligned()`). Cambiar de velocidad a mitad de celda rompería el alineamiento con cualquier valor nuevo.
- **Sí:** decisión aleatoria en frightened sobre `choices`. Reutiliza la regla sin-180º existente sin IA de huida nueva.
- **No:** huida activa alejándose de pacman. Más código y más riesgo para el mismo efecto jugable.
- **Sí:** `+200` fijo por fantasma. Simple y verificable.
- **No:** cadena 200/400/800/1600. Requiere contador por fright, va en otro spec si se quiere.
- **Sí:** respawn a `GHOST_STARTS[i]` con `exitTimer = 0`. El fantasma vuelve y sale de inmediato sin quedarse rebotando.
- **No:** revivir como ojos ni teletransporte a `PEN_EXIT`. Mecánicas nuevas fuera de alcance.
- **Sí:** flash blanco los últimos 2s. Aviso visual barato con `frame`.
- **Sí:** morir cancela el fright (`resetPositions` limpia timer). Consistente con empezar cada vida desde cero.

## Risks

| Risk | Mitigation |
| ---- | ---------- |
| Timer en frames depende del fps real | 600 frames ≈ 10s a 60fps; lo exigible es orden de magnitud, no segundos exactos |
| Respawn dentro del pen podría rebotar (SPEC 02) | `exitTimer = 0` para que use target `PEN_EXIT` y salga de inmediato |
| Pellet sustituye un dot y cambia el conteo total | `dotsRemaining` cuenta `2` y `4`; `won` sigue exigiendo todo |
| Fantasma asustado pisa dots sin comerlos | Aceptado, igual que SPEC 02: los dots siguen para pacman |

## What is **not** in this spec

- Cadena de puntos 200/400/800/1600.
- Ojos que regresan al pen.
- Scatter/chase global.
- Niveles, sonidos, high-scores.
- Multiplayer, mobile, editor visual.

Cada uno de esos, si llega, va en su propio spec.
