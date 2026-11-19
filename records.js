'use strict';

// ---- Tabla de records local (top 5) ----
// Guarda en localStorage:
//   tetris.records   -> [{ name, score, lines, level, date }] (máx. 5, ordenado por score desc)
//   tetris.bestCombo -> mejor combo histórico (locks consecutivos que limpian líneas)
//   tetris.maxLines  -> máximo de líneas en una sola partida
// game.js llama a Records.onInit() desde init() y a Records.onGameOver(stats) desde endGame().

const Records = (() => {
  const MAX_ENTRIES = 5;
  const MAX_NAME = 12;
  const KEY_RECORDS = 'tetris.records';
  const KEY_COMBO = 'tetris.bestCombo';
  const KEY_LINES = 'tetris.maxLines';

  const startScreen = document.getElementById('start-screen');
  const startBtn = document.getElementById('start-btn');
  const startTable = document.getElementById('start-records');
  const startStats = document.getElementById('start-stats');

  const goPanel = document.getElementById('records-gameover');
  const goMsg = document.getElementById('record-msg');
  const goForm = document.getElementById('record-form');
  const goName = document.getElementById('record-name');
  const goTable = document.getElementById('gameover-records');
  const goStats = document.getElementById('gameover-stats');

  let pending = null; // partida terminada que aún puede guardarse en el top

  // ---- Almacenamiento ----
  function readJSON(key, fallback) {
    try {
      const raw = localStorage.getItem(key);
      return raw === null ? fallback : JSON.parse(raw);
    } catch (e) {
      return fallback;
    }
  }

  function writeJSON(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch (e) { /* almacenamiento no disponible */ }
  }

  function removeKey(key) {
    try {
      localStorage.removeItem(key);
    } catch (e) { /* almacenamiento no disponible */ }
  }

  function toInt(v) {
    const n = Math.floor(Number(v));
    return Number.isFinite(n) && n >= 0 ? n : 0;
  }

  function load() {
    const data = readJSON(KEY_RECORDS, []);
    if (!Array.isArray(data)) return [];
    return data
      .filter(r => r && typeof r === 'object')
      .map(r => ({
        name: String(r.name ?? '').slice(0, MAX_NAME) || 'Anónimo',
        score: toInt(r.score),
        lines: toInt(r.lines),
        level: toInt(r.level) || 1,
        date: typeof r.date === 'string' ? r.date : '',
      }))
      .sort((a, b) => b.score - a.score)
      .slice(0, MAX_ENTRIES);
  }

  function getStat(key) {
    return toInt(readJSON(key, 0));
  }

  // Posición (0-based) que ocuparía `score` en el top, o -1 si no entra.
  function rankFor(list, score) {
    if (score <= 0) return -1;
    let i = list.findIndex(r => score > r.score);
    if (i === -1) i = list.length;
    return i < MAX_ENTRIES ? i : -1;
  }

  // ---- Render ----
  function formatDate(iso) {
    const d = new Date(iso);
    return isNaN(d) ? '' : d.toLocaleDateString('es');
  }

  function renderTable(container, list, highlight) {
    container.replaceChildren();
    if (!list.length) {
      const empty = document.createElement('p');
      empty.className = 'records-empty';
      empty.textContent = 'Sin records todavía';
      container.appendChild(empty);
      return;
    }
    const table = document.createElement('table');
    table.className = 'records-table';
    const head = table.createTHead().insertRow();
    for (const h of ['#', 'Nombre', 'Puntos', 'Líneas', 'Nivel', 'Fecha']) {
      const th = document.createElement('th');
      th.textContent = h;
      head.appendChild(th);
    }
    const body = table.createTBody();
    list.forEach((r, i) => {
      const row = body.insertRow();
      if (i === highlight) row.className = 'highlight';
      const cells = [i + 1, r.name, r.score.toLocaleString(), r.lines, r.level, formatDate(r.date)];
      for (const value of cells) row.insertCell().textContent = value; // textContent: escapa el nombre
    });
    container.appendChild(table);
  }

  function renderStats(container) {
    container.textContent =
      `Mejor combo: ${getStat(KEY_COMBO)} · Líneas máx.: ${getStat(KEY_LINES)}`;
  }

  function renderStart() {
    renderTable(startTable, load(), -1);
    renderStats(startStats);
  }

  function makeEntry(stats, name) {
    return {
      name,
      score: toInt(stats.score),
      lines: toInt(stats.lines),
      level: toInt(stats.level) || 1,
      date: new Date().toISOString(),
    };
  }

  // ---- Hooks llamados desde game.js ----
  function onInit() {
    // Reiniciar sin pulsar "Guardar": el récord no se pierde, se guarda como "Anónimo".
    if (pending) save();
    // Quitar el foco del botón "Jugar"/"Reiniciar" para que Enter/Space no reinicien la partida.
    if (document.activeElement instanceof HTMLElement) document.activeElement.blur();
    startScreen.classList.add('hidden');
    goPanel.classList.add('hidden');
  }

  function onGameOver(stats) {
    // Estadísticas históricas: se guardan siempre.
    if (toInt(stats.bestCombo) > getStat(KEY_COMBO)) writeJSON(KEY_COMBO, toInt(stats.bestCombo));
    if (toInt(stats.lines) > getStat(KEY_LINES)) writeJSON(KEY_LINES, toInt(stats.lines));
    goName.value = '';
    showGameOver(stats);
    if (pending) goName.focus();
  }

  function showGameOver(stats) {
    const list = load();
    const rank = rankFor(list, toInt(stats.score));
    goPanel.classList.remove('hidden');
    renderStats(goStats);

    if (rank === -1) {
      pending = null;
      goMsg.textContent = '';
      goForm.classList.add('hidden');
      renderTable(goTable, list, -1);
      return;
    }

    // Entra en el top: vista previa con la fila resaltada y campo de nombre.
    pending = stats;
    goMsg.textContent = `¡Nuevo récord! Puesto #${rank + 1}`;
    const preview = list.slice();
    preview.splice(rank, 0, makeEntry(stats, '???'));
    renderTable(goTable, preview.slice(0, MAX_ENTRIES), rank);
    goForm.classList.remove('hidden');
  }

  function save() {
    if (!pending) return;
    const name = goName.value.trim().slice(0, MAX_NAME) || 'Anónimo';
    const stats = pending;
    pending = null;
    const list = load();
    const rank = rankFor(list, toInt(stats.score));
    goForm.classList.add('hidden');
    goName.blur();
    if (rank === -1) {
      goMsg.textContent = 'La puntuación ya no entra en el top 5';
      renderTable(goTable, list, -1);
      return;
    }
    list.splice(rank, 0, makeEntry(stats, name));
    const top = list.slice(0, MAX_ENTRIES);
    writeJSON(KEY_RECORDS, top);
    goMsg.textContent = `¡Guardado en el puesto #${rank + 1}!`;
    renderTable(goTable, top, rank);
    renderStart();
  }

  function clearAll() {
    if (!confirm('¿Borrar todos los records? Esta acción no se puede deshacer.')) return;
    removeKey(KEY_RECORDS);
    removeKey(KEY_COMBO);
    removeKey(KEY_LINES);
    renderStart();
    // En game over: la partida recién terminada (si no se guardó) sigue pudiendo guardarse.
    if (!goPanel.classList.contains('hidden')) {
      if (pending) {
        showGameOver(pending);
      } else {
        goMsg.textContent = '';
        renderTable(goTable, [], -1);
        renderStats(goStats);
      }
    }
  }

  // ---- Eventos ----
  goForm.addEventListener('submit', e => {
    e.preventDefault();
    save();
  });
  // Evita que las teclas escritas en el campo lleguen a los controles del juego.
  // e.repeat: una tecla mantenida (p. ej. Space de caída) no debe escribirse en el campo recién enfocado.
  goName.addEventListener('keydown', e => {
    e.stopPropagation();
    if (e.repeat) e.preventDefault();
  });
  document.querySelectorAll('.records-reset').forEach(btn => btn.addEventListener('click', clearAll));
  startBtn.addEventListener('click', () => init());

  renderStart();

  return { onInit, onGameOver, load };
})();
