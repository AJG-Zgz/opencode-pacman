// game.js
// Estado y reglas. Depende de globals de maze.js: MAZE, TUNNEL_ROW,
// PACMAN_START, GHOST_STARTS.

const DIRS = {
  left: { x: -1, y: 0 },
  right: { x: 1, y: 0 },
  up: { x: 0, y: -1 },
  down: { x: 0, y: 1 },
};
const OPPOSITE = { left: 'right', right: 'left', up: 'down', down: 'up' };

const PACMAN_SPEED = 0.125; // 1/8 celda/frame -> alinea cada 8 frames
const GHOST_SPEED = 0.1;    // 1/10 celda/frame

// SPEC 02 — salida escalonada del pen (paso 1: constantes sin uso aún).
// PEN incluye la fila-puerta 12: salido = y <= 11 (decisión opción 1).
const PEN = { xMin: 11, xMax: 16, yMin: 12, yMax: 15 };
const PEN_EXIT = { x: 13, y: 11 }; // pasillo encima de la puerta 3
const GHOST_EXIT_DELAY = { pinky: 0, blinky: 60, inky: 180, clyde: 360 }; // frames a 60fps

// Dentro del pen? Usa celdas redondeadas para posiciones fraccionales.
function isInPen( g ) {
  const cx = Math.round( g.x );
  const cy = Math.round( g.y );
  return cx >= PEN.xMin && cx <= PEN.xMax && cy >= PEN.yMin && cy <= PEN.yMax;
}

// Crea una partida nueva. Copia MAZE (pristino) a game.grid para poder comer
// dots sin destruir el original, y reiniciar.
function createGame() {
  const grid = MAZE.map( ( row ) => row.slice() );
  // La celda de inicio de Pacman arranca sin dot.
  grid[ PACMAN_START.y ][ PACMAN_START.x ] = 0;

  let dots = 0;
  for ( const row of grid ) for ( const v of row ) if ( v === 2 ) dots++;

  return {
    state: 'start',
    score: 0,
    lives: 3,
    dotsRemaining: dots,
    grid,
    pacman: {
      x: PACMAN_START.x,
      y: PACMAN_START.y,
      dir: 'left',
      nextDir: null,
      speed: PACMAN_SPEED,
    },
    ghosts: GHOST_STARTS.map( ( g ) => ( {
      x: g.x,
      y: g.y,
      dir: 'up',
      speed: GHOST_SPEED,
      kind: g.kind,
      exitTimer: GHOST_EXIT_DELAY[ g.kind ] || 0,
    } ) ),
  };
}

function aligned( v ) {
  return Math.abs( v - Math.round( v ) ) < 1e-3;
}

// Una celda es muro para el actor dado?
//   pacman: bloqueado por pared (1) y puerta (3)
//   ghost:  bloqueado solo por pared (1)
function isWall( grid, x, y, actor ) {
  if ( y < 0 || y >= grid.length ) return true;
  if ( x < 0 || x >= grid[ 0 ].length ) return true;
  const v = grid[ y ][ x ];
  if ( v === 1 ) return true;
  if ( v === 3 && actor === 'pacman' ) return true;
  return false;
}

// Puede el actor avanzar desde (x,y) en la direccion dir?
function canMove( grid, x, y, dir, actor ) {
  const d = DIRS[ dir ];
  if ( !d ) return false;
  const tx = x + d.x;
  const ty = y + d.y;
  // Tunel: salir por un borde en la fila del tunel siempre es valido.
  if ( ty === TUNNEL_ROW && ( tx < 0 || tx >= grid[ 0 ].length ) ) return true;
  return !isWall( grid, tx, ty, actor );
}

function wrapTunnel( a, width ) {
  if ( Math.round( a.y ) === TUNNEL_ROW ) {
    if ( a.x < 0 ) a.x += width;
    else if ( a.x >= width ) a.x -= width;
  }
}

function movePacman( game ) {
  const p = game.pacman;
  const grid = game.grid;
  const width = grid[ 0 ].length;

  if ( aligned( p.x ) && aligned( p.y ) ) {
    p.x = Math.round( p.x );
    p.y = Math.round( p.y );

    // Aplicar giro pendiente si es posible.
    if ( p.nextDir && canMove( grid, p.x, p.y, p.nextDir, 'pacman' ) ) {
      p.dir = p.nextDir;
      p.nextDir = null;
    }
    // Comer dot.
    if ( grid[ p.y ][ p.x ] === 2 ) {
      grid[ p.y ][ p.x ] = 0;
      game.score += 10;
      game.dotsRemaining--;
    }
    // Si no puede seguir, se detiene en la celda.
    if ( !canMove( grid, p.x, p.y, p.dir, 'pacman' ) ) return;
  }

  const d = DIRS[ p.dir ];
  p.x += d.x * p.speed;
  p.y += d.y * p.speed;
  wrapTunnel( p, width );
}

function ghostTarget( kind, game, blinky ) {
  const p = game.pacman;
  const px = Math.round( p.x );
  const py = Math.round( p.y );
  // Targets arcade por kind. Fallback conservador: posicion de PacMan.
  if ( !kind || kind === 'blinky' ) return { x: px, y: py };
  if ( kind === 'hunter' ) return { x: px, y: py };
  if ( kind === 'pinky' ) {
    const d = DIRS[ p.dir ] || { x: 0, y: 0 };
    return { x: px + 4 * d.x, y: py + 4 * d.y };
  }
  if ( kind === 'inky' ) {
    const d = DIRS[ p.dir ] || { x: 0, y: 0 };
    const ax = px + 2 * d.x;
    const ay = py + 2 * d.y;
    if ( !blinky ) return { x: px, y: py };
    const bx = Math.round( blinky.x );
    const by = Math.round( blinky.y );
    return { x: 2 * ax - bx, y: 2 * ay - by };
  }
  if ( kind === 'clyde' ) return { x: px, y: py };
  return { x: px, y: py };
}

function decideGhost( game, g ) {
  const grid = game.grid;
  const p = game.pacman;

  const options = Object.keys( DIRS ).filter(
    ( dir ) => dir !== OPPOSITE[ g.dir ] && canMove( grid, g.x, g.y, dir, 'ghost' )
  );
  // Sin salida (callejon): permitir el giro de 180.
  const choices = options.length ? options : [ '' + OPPOSITE[ g.dir ] ];

  // SPEC 02 paso 4 — dentro del pen con timer expirado: target temporal PEN_EXIT.
  // Minimiza Manhattan con la misma regla sin-180º; al salir retoma SPEC 01.
  if ( isInPen( g ) && ( g.exitTimer || 0 ) <= 0 ) {
    let best = choices[ 0 ];
    let bestDist = Infinity;
    for ( const dir of choices ) {
      const d = DIRS[ dir ];
      const dist = Math.abs( ( g.x + d.x ) - PEN_EXIT.x ) + Math.abs( ( g.y + d.y ) - PEN_EXIT.y );
      if ( dist < bestDist ) {
        bestDist = dist;
        best = dir;
      }
    }
    g.dir = best;
    return;
  }

  // Clyde: cerca (<=8 Manhattan) se dispersa al azar, lejos persigue como hunter.
  if ( g.kind === 'clyde' ) {
    const px0 = Math.round( p.x );
    const py0 = Math.round( p.y );
    const dist0 = Math.abs( Math.round( g.x ) - px0 ) + Math.abs( Math.round( g.y ) - py0 );
    if ( dist0 <= 8 ) {
      g.dir = choices[ Math.floor( Math.random() * choices.length ) ];
      return;
    }
  }

  if ( g.kind === 'hunter' || g.kind === 'blinky' || g.kind === 'pinky' || g.kind === 'inky' || g.kind === 'clyde' ) {
    const blinky = game.ghosts.find( ( o ) => o.kind === 'blinky' ) || null;
    const target = ghostTarget( g.kind, game, blinky );
    const px = target.x;
    const py = target.y;
    let best = choices[ 0 ];
    let bestDist = Infinity;
    for ( const dir of choices ) {
      const d = DIRS[ dir ];
      const nx = g.x + d.x;
      const ny = g.y + d.y;
      const dist = Math.abs( nx - px ) + Math.abs( ny - py );
      if ( dist < bestDist ) {
        bestDist = dist;
        best = dir;
      }
    }
    g.dir = best;
  } else {
    g.dir = choices[ Math.floor( Math.random() * choices.length ) ];
  }
}

function moveGhost( game, g ) {
  const grid = game.grid;
  const width = grid[ 0 ].length;

  // SPEC 02 paso 3 — espera en el pen: rebote vertical hasta que expire exitTimer.
  if ( isInPen( g ) && ( g.exitTimer || 0 ) > 0 ) {
    g.exitTimer--;
    if ( aligned( g.x ) && aligned( g.y ) ) {
      g.x = Math.round( g.x );
      g.y = Math.round( g.y );
      // Solo vertical y sin cruzar la puerta: los destinos deben seguir en el
      // pen para que la espera no se convierta en una salida anticipada
      // (p. ej. inky arranca en la columna de la puerta).
      const want = ( g.dir === 'up' || g.dir === 'down' ) ? g.dir : 'up';
      const staysIn = ( dir ) => {
        const d0 = DIRS[ dir ];
        return canMove( grid, g.x, g.y, dir, 'ghost' ) &&
          isInPen( { x: g.x + d0.x, y: g.y + d0.y } );
      };
      if ( staysIn( want ) ) {
        g.dir = want;
      } else if ( staysIn( OPPOSITE[ want ] ) ) {
        g.dir = OPPOSITE[ want ];
      } else {
        return;
      }
    }
    const d = DIRS[ g.dir ];
    g.x += d.x * g.speed;
    g.y += d.y * g.speed;
    return;
  }

  if ( aligned( g.x ) && aligned( g.y ) ) {
    g.x = Math.round( g.x );
    g.y = Math.round( g.y );
    decideGhost( game, g );
    if ( !canMove( grid, g.x, g.y, g.dir, 'ghost' ) ) return;
  }

  const d = DIRS[ g.dir ];
  g.x += d.x * g.speed;
  g.y += d.y * g.speed;
  wrapTunnel( g, width );
}

function resetPositions( game ) {
  const p = game.pacman;
  p.x = PACMAN_START.x;
  p.y = PACMAN_START.y;
  p.dir = 'left';
  p.nextDir = null;
  game.ghosts.forEach( ( g, i ) => {
    g.x = GHOST_STARTS[ i ].x;
    g.y = GHOST_STARTS[ i ].y;
    g.dir = 'up';
    g.exitTimer = GHOST_EXIT_DELAY[ g.kind ] || 0;
  } );
}

function collides( a, b ) {
  return Math.abs( a.x - b.x ) < 0.5 && Math.abs( a.y - b.y ) < 0.5;
}

function update( game ) {
  movePacman( game );
  game.ghosts.forEach( ( g ) => moveGhost( game, g ) );

  for ( const g of game.ghosts ) {
    if ( collides( game.pacman, g ) ) {
      game.lives--;
      if ( game.lives <= 0 ) {
        game.state = 'lost';
        return;
      }
      resetPositions( game );
      break;
    }
  }

  if ( game.dotsRemaining <= 0 ) game.state = 'won';
}

window.createGame = createGame;
window.update = update;
window.DIRS = DIRS;
