# AGENTS.md

Repo vanilla sin build, sin tests, sin linter, sin `package.json`. No añadir toolchain salvo que lo pida un spec aprobado.

## Run

- Entrada: `src/index.html`. Abrir directo en navegador o servir estático, ej. `npx serve src`.
- Sin comandos de build/test. Verificación = abrir página, consola sin errores, mover con flechas, comer puntos, chocar, ganar/perder.

## Arquitectura (no-modules, orden importa)

`src/index.html` carga en este orden estricto vía globals `window.*`, no ES modules:

1. `src/js/maze.js` → expone `MAZE`, `TUNNEL_ROW=14`, `PACMAN_START`, `GHOST_STARTS`
2. `src/js/game.js` → expone `createGame`, `update`, `DIRS`; consume los globals de `maze.js`
3. `src/js/render.js` → expone `draw`; consume `DIRS`, `game.grid`
4. `src/js/main.js` → `requestAnimationFrame(loop)` + teclado + overlay

No reordenar ni convertir a `import/export` sin spec.

## Reglas que rompen si se tocan (`src/js/game.js`, `src/js/maze.js`)

- `MAZE` es prístino, nunca mutar. `createGame()` lo copia a `game.grid`; los dots se comen en `game.grid`.
- Tiles: `1` pared, `2` dot, `3` puerta pen, `0` transitable. Mapa `28x31`, origen arriba-izquierda.
- Muros por actor: pacman bloqueado por `1` y `3`; fantasma solo por `1` (puede salir del pen).
- Solo girar/comer/decidir fantasma cuando `aligned()` (`<1e-3` del centro). Pacman usa `nextDir` pendiente, no giro inmediato.
- Velocidades: `PACMAN_SPEED=0.125`, `GHOST_SPEED=0.1`. No igualar.
- Túnel solo en fila `14` (`wrapTunnel`); `canMove` permite salir del borde solo ahí.
- Fantasmas: prohibido giro 180º salvo callejón; `hunter` minimiza Manhattan a pacman, `random` elige al azar.
- Colisión `<0.5` en x e y → `lives--`, `resetPositions()`, `lost` con `0` vidas; `won` con `dotsRemaining<=0`.

## Render (`src/js/render.js`)

- Canvas fijo `560x620`, `TILE=20`. Dibujar desde `game.grid`, nunca desde `MAZE`, o no se ven dots comidos.
- `showOverlay()` en `main.js` reescribe `overlay.innerHTML`; reatachar `action-btn → startGame` cada vez.
- `keydown` solo setea `pacman.nextDir` si `state==='playing'`.

## Spec-driven workflow (`.agents/skills/`)

- `/spec` nunca escribe código, solo `specs/NN-slug.md` en estado `Draft`. `/spec-impl` solo corre si el estado significa `Approved` (`Aprobado`, etc.).
- `specs/` aún no existe; `template.md` en `.agents/skills/spec/template.md` manda la estructura.
- `/spec-impl` crea/cambia a rama `spec-NN-slug` (flag `AutoCreateBranch` en `specs/.spec-config.yml`, default `true`), implementa paso a paso con pausa para revisar diff, nunca commitea solo.
