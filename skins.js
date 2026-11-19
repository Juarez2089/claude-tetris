'use strict';

// ---- Temas visuales (skins) ----
// Cada skin define `colors` (mismo índice que COLORS/PIECES: 0 = null,
// 1..7 = I,O,T,S,Z,J,L), `bg`, `grid` y `drawBlock(context, x, y, colorIndex, size, alpha)`.
// Se carga antes de game.js; game.js delega su dibujado en `activeSkin()`.

const SKIN_STORAGE_KEY = 'tetris.skin';
const DEFAULT_SKIN = 'retro';

// Aclara (amt > 0) u oscurece (amt < 0) un color hex '#rrggbb'.
function shadeColor(hex, amt) {
  const n = parseInt(hex.slice(1), 16);
  const f = v => Math.max(0, Math.min(255, Math.round(amt > 0 ? v + (255 - v) * amt : v * (1 + amt))));
  const r = f((n >> 16) & 255), g = f((n >> 8) & 255), b = f(n & 255);
  return '#' + ((1 << 24) | (r << 16) | (g << 8) | b).toString(16).slice(1);
}

function roundedRectPath(context, x, y, w, h, r) {
  context.beginPath();
  if (typeof context.roundRect === 'function') {
    context.roundRect(x, y, w, h, r);
  } else {
    context.moveTo(x + r, y);
    context.arcTo(x + w, y, x + w, y + h, r);
    context.arcTo(x + w, y + h, x, y + h, r);
    context.arcTo(x, y + h, x, y, r);
    context.arcTo(x, y, x + w, y, r);
    context.closePath();
  }
}

const SKINS = {
  retro: {
    label: 'Retro',
    bg: '#1a1a25',
    grid: '#22222e',
    colors: [null, '#4dd0e1', '#ffd54f', '#ba68c8', '#81c784', '#e57373', '#7986cb', '#ffb74d'],
    drawBlock(context, x, y, colorIndex, size, alpha) {
      if (!colorIndex) return;
      context.globalAlpha = alpha ?? 1;
      context.fillStyle = this.colors[colorIndex];
      context.fillRect(x * size + 1, y * size + 1, size - 2, size - 2);
      // highlight
      context.fillStyle = 'rgba(255,255,255,0.12)';
      context.fillRect(x * size + 1, y * size + 1, size - 2, 4);
      context.globalAlpha = 1;
    },
  },

  neon: {
    label: 'Neón',
    bg: '#000000',
    grid: '#10101c',
    colors: [null, '#00f0ff', '#fff200', '#d400ff', '#39ff14', '#ff073a', '#2979ff', '#ff8c00'],
    drawBlock(context, x, y, colorIndex, size, alpha) {
      if (!colorIndex) return;
      const color = this.colors[colorIndex];
      const px = x * size, py = y * size;
      context.save();
      context.globalAlpha = alpha ?? 1;
      context.shadowColor = color;
      context.shadowBlur = size * 0.5;
      context.strokeStyle = color;
      context.lineWidth = 2;
      context.strokeRect(px + 3, py + 3, size - 6, size - 6);
      context.fillStyle = color;
      context.globalAlpha = (alpha ?? 1) * 0.35;
      context.fillRect(px + 3, py + 3, size - 6, size - 6);
      context.restore();
      // resetear sombra por si el contexto se reutiliza sin save/restore
      context.shadowBlur = 0;
      context.shadowColor = 'transparent';
      context.globalAlpha = 1;
    },
  },

  pastel: {
    label: 'Pastel',
    bg: '#2a2733',
    grid: '#34303f',
    colors: [null, '#a8e6f0', '#fff1a8', '#dcb8f0', '#b8e6c0', '#f7b8b8', '#b8c4f0', '#ffd6a8'],
    drawBlock(context, x, y, colorIndex, size, alpha) {
      if (!colorIndex) return;
      const color = this.colors[colorIndex];
      const px = x * size + 2, py = y * size + 2, s = size - 4, r = size * 0.25;
      context.globalAlpha = alpha ?? 1;
      context.fillStyle = color;
      roundedRectPath(context, px, py, s, s, r);
      context.fill();
      context.strokeStyle = shadeColor(color, -0.2);
      context.lineWidth = 1.5;
      context.stroke();
      // brillo suave
      context.fillStyle = 'rgba(255,255,255,0.35)';
      roundedRectPath(context, px + s * 0.18, py + s * 0.14, s * 0.35, s * 0.18, s * 0.09);
      context.fill();
      context.globalAlpha = 1;
    },
  },

  pixel: {
    label: 'Pixel art',
    bg: '#14141c',
    grid: '#1e1e2a',
    colors: [null, '#3cbcfc', '#f8b800', '#b53bff', '#58d854', '#f83800', '#4040ff', '#fc7460'],
    drawBlock(context, x, y, colorIndex, size, alpha) {
      if (!colorIndex) return;
      const color = this.colors[colorIndex];
      const px = x * size, py = y * size;
      const p = Math.max(1, Math.floor(size / 10)); // tamaño de "pixel"
      const n = Math.floor(size / p);
      context.globalAlpha = alpha ?? 1;
      context.fillStyle = color;
      context.fillRect(px, py, size, size);
      // biseles: claro arriba/izquierda, oscuro abajo/derecha
      context.fillStyle = shadeColor(color, 0.45);
      context.fillRect(px, py, size, p);
      context.fillRect(px, py, p, size);
      context.fillStyle = shadeColor(color, -0.45);
      context.fillRect(px, py + size - p, size, p);
      context.fillRect(px + size - p, py, p, size);
      // textura: tramado de pixeles
      context.fillStyle = shadeColor(color, -0.18);
      for (let i = 2; i < n - 2; i++)
        for (let j = 2; j < n - 2; j++)
          if ((i + j) % 4 === 0 || (i * 3 + j) % 7 === 0)
            context.fillRect(px + i * p, py + j * p, p, p);
      // brillo en esquina
      context.fillStyle = '#ffffff';
      context.fillRect(px + p * 2, py + p * 2, p * 2, p);
      context.fillRect(px + p * 2, py + p * 3, p, p);
      // contorno
      context.fillStyle = 'rgba(0,0,0,0.6)';
      context.fillRect(px, py, size, 1);
      context.fillRect(px, py, 1, size);
      context.globalAlpha = 1;
    },
  },
};

function loadSkinName() {
  try {
    const saved = localStorage.getItem(SKIN_STORAGE_KEY);
    if (saved && Object.prototype.hasOwnProperty.call(SKINS, saved)) return saved;
  } catch (e) { /* localStorage no disponible */ }
  return DEFAULT_SKIN;
}

function saveSkinName(name) {
  try {
    localStorage.setItem(SKIN_STORAGE_KEY, name);
  } catch (e) { /* localStorage no disponible */ }
}

let activeSkinName = loadSkinName();

function activeSkin() {
  return SKINS[activeSkinName];
}

// Cambia la skin y redibuja tablero y vista previa al instante
// (también en pausa / game over, cuando el bucle rAF está detenido).
function setSkin(name) {
  if (!Object.prototype.hasOwnProperty.call(SKINS, name)) return;
  activeSkinName = name;
  saveSkinName(name);
  document.documentElement.dataset.skin = name;
  if (typeof draw === 'function' && typeof current !== 'undefined' && current) draw();
  if (typeof drawNext === 'function' && typeof next !== 'undefined' && next) drawNext();
}

(function setupSkinSelect() {
  document.documentElement.dataset.skin = activeSkinName;
  const select = document.getElementById('skin-select');
  if (!select) return;
  select.value = activeSkinName;
  select.addEventListener('change', () => {
    setSkin(select.value);
    select.blur(); // devolver el teclado al juego
  });
  // Evitar que las teclas del juego cambien la opción del select si tiene foco;
  // el evento sigue propagándose al listener de game.js.
  const GAME_KEYS = ['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Space', 'KeyX', 'KeyP'];
  select.addEventListener('keydown', e => {
    if (GAME_KEYS.includes(e.code)) {
      e.preventDefault();
      select.blur();
    }
  });
})();
