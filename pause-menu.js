'use strict';

// ---- Menú de pausa ----
// Se carga antes de game.js. Usa en tiempo de ejecución las funciones/estado
// globales de game.js (init, togglePause, paused, gameOver, level).

const PauseMenu = (() => {
  const STORAGE_KEY = 'tetris.startLevel';
  const MIN_LEVEL = 1;
  const MAX_LEVEL = 15;

  const menuEl = document.getElementById('pause-menu');
  const items = Array.from(menuEl.querySelectorAll('[data-action]'));
  const controlsEl = document.getElementById('pause-controls');
  const levelValueEl = document.getElementById('pause-level-value');
  const levelDecBtn = document.getElementById('pause-level-dec');
  const levelIncBtn = document.getElementById('pause-level-inc');

  let isOpen = false;
  let selected = 0;
  const heldKeys = new Set();

  function clampLevel(n) {
    n = Math.floor(Number(n));
    if (!Number.isFinite(n)) return MIN_LEVEL;
    return Math.min(MAX_LEVEL, Math.max(MIN_LEVEL, n));
  }

  let startLevel = MIN_LEVEL;
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored !== null) startLevel = clampLevel(stored);
  } catch (_) { /* localStorage no disponible */ }

  function setStartLevel(n) {
    startLevel = clampLevel(n);
    levelValueEl.textContent = startLevel;
    levelDecBtn.disabled = startLevel <= MIN_LEVEL;
    levelIncBtn.disabled = startLevel >= MAX_LEVEL;
    try { localStorage.setItem(STORAGE_KEY, String(startLevel)); } catch (_) { /* ignorar */ }
  }

  function select(i) {
    selected = (i + items.length) % items.length;
    items.forEach((el, idx) => el.classList.toggle('selected', idx === selected));
  }

  function open() {
    isOpen = true;
    controlsEl.classList.add('hidden');
    select(0);
    menuEl.classList.remove('hidden');
  }

  function close() {
    if (!isOpen) return;
    isOpen = false;
    menuEl.classList.add('hidden');
  }

  function activate(action) {
    switch (action) {
      case 'resume':
        if (paused) togglePause();
        break;
      case 'restart':
        init();
        break;
      case 'controls':
        controlsEl.classList.toggle('hidden');
        break;
      // 'level' se ajusta con ←/→ o con los botones −/+.
    }
  }

  const MENU_KEYS = new Set(['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Enter', 'Space', 'Escape', 'KeyP']);

  // Captura en window: se ejecuta antes del manejador de game.js (document).
  // Las teclas de juego no usadas aquí las bloquea blocksInput() en game.js.
  window.addEventListener('keydown', e => {
    if (!isOpen) return;
    heldKeys.add(e.code);
    if (e.ctrlKey || e.metaKey || e.altKey || !MENU_KEYS.has(e.code)) return;
    e.preventDefault();
    e.stopImmediatePropagation();
    if (e.repeat && (e.code === 'Escape' || e.code === 'KeyP' || e.code === 'Enter' || e.code === 'Space')) return;
    const action = items[selected].dataset.action;
    switch (e.code) {
      case 'ArrowUp':
        select(selected - 1);
        break;
      case 'ArrowDown':
        select(selected + 1);
        break;
      case 'ArrowLeft':
        if (action === 'level') setStartLevel(startLevel - 1);
        break;
      case 'ArrowRight':
        if (action === 'level') setStartLevel(startLevel + 1);
        break;
      case 'Enter':
      case 'Space':
        activate(action);
        break;
      case 'Escape':
      case 'KeyP':
        activate('resume');
        break;
    }
  }, true);

  window.addEventListener('keyup', e => { heldKeys.delete(e.code); }, true);
  window.addEventListener('blur', () => heldKeys.clear());

  items.forEach((el, idx) => {
    el.addEventListener('mouseenter', () => select(idx));
    el.addEventListener('click', e => {
      select(idx);
      activate(el.dataset.action);
      e.currentTarget.blur();
    });
  });
  levelDecBtn.addEventListener('click', e => { e.stopPropagation(); setStartLevel(startLevel - 1); levelDecBtn.blur(); });
  levelIncBtn.addEventListener('click', e => { e.stopPropagation(); setStartLevel(startLevel + 1); levelIncBtn.blur(); });

  setStartLevel(startLevel);

  return {
    open,
    close,
    getStartLevel() { return startLevel; },
    // true si una tecla de juego debe ignorarse: menú abierto, o tecla que se
    // pulsó con el menú abierto y sigue mantenida (evita movimientos al reanudar).
    blocksInput(e) {
      return isOpen || heldKeys.has(e.code);
    },
  };
})();
