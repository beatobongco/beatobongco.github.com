(() => {
  const $ = id => document.getElementById(id);
  const metadata = {
    B: ['Black', '\ue602', '#afa3b5'], C: ['Colorless', '\ue904', '#b9b8bc'],
    W: ['White', '\ue600', '#ede1b8'], U: ['Blue', '\ue601', '#9cc0d3'],
    R: ['Red', '\ue603', '#d99a89'], G: ['Green', '\ue604', '#9eb99d']
  };
  const KEY = 'mana-counter-v1';
  let state = ManaState.fresh(), history = [], activity = ManaState.restoreActivity(null), lastGroup = null, theme = 'temple', installPrompt;
  const tell = message => { $('notice').textContent = message; };
  try {
    const saved = JSON.parse(localStorage.getItem(KEY));
    state = ManaState.restore(saved);
    activity = ManaState.restoreActivity(saved?.activity);
    if (saved?.theme === 'plain') theme = 'plain';
    const background = localStorage.getItem(KEY + '-background');
    if (background && /^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/=]+$/.test(background)) {
      $('backdrop').style.backgroundImage = `url("${background}")`;
    } else if (theme === 'plain') $('backdrop').style.backgroundImage = 'none';
  } catch { tell('Saved state couldn’t be read. Counting still works for this session.'); }
  function save() {
    try { localStorage.setItem(KEY, JSON.stringify({ pools: state.pools, theme, activity })); }
    catch { tell('This browser couldn’t save your changes. Keep this tab open to retain your pool.'); }
  }
  function commit(next, structural = false, group = null, kind = 'mana') {
    if (next === state) return;
    tell('');
    const latest = activity.entries.at(-1);
    const recorded = ManaState.recordActivity(activity, state.pools, next.pools, {
      at: Date.now(), kind, isHold: !!group, continuingHold: !!group && group === lastGroup,
      canMerge: !!latest && history.at(-1)?.entryId === latest.id
    });
    if (!recorded.merged) {
      history.push({ state: structuredClone(state), entryId: recorded.entryId });
      if (history.length > 50) history.shift();
    }
    activity = recorded.activity;
    lastGroup = group; state = next; save(); if (structural) draw(); update(); renderActivity();
  }
  function renderActivity() {
    const list = $('activity-entries'), atTop = list.scrollTop < 4, oldHeight = list.scrollHeight, oldTop = list.scrollTop;
    list.replaceChildren();
    const sum = pools => Object.values(pools).reduce((a, b) => a + b, 0);
    for (const entry of [...activity.entries].reverse()) {
      const name = entry.type ? metadata[entry.type][0].toLowerCase() : '';
      const amount = entry.kind === 'mana' ? entry.after[entry.type] - entry.before[entry.type] : 0;
      const label = entry.kind === 'mana' ? `${amount > 0 ? 'Added' : 'Spent'} ${Math.abs(amount)} ${name}` :
        entry.kind === 'add' ? `Added ${name} pool` : entry.kind === 'remove' ? `Removed ${name} pool` :
        entry.kind === 'reset' ? 'Reset all mana' : 'Undid previous action';
      const row = document.createElement('li'); row.className = 'activity-row'; row.classList.toggle('undone', entry.undone);
      const text = document.createElement('span'); text.textContent = label;
      if (entry.undone) { const mark = document.createElement('small'); mark.textContent = 'Undone'; text.append(' ', mark); }
      const values = document.createElement('span'); values.className = 'activity-values';
      values.textContent = entry.kind === 'mana' ? `${entry.before[entry.type]} → ${entry.after[entry.type]}` : `${sum(entry.before)} → ${sum(entry.after)} total`;
      row.title = `Before: ${Object.entries(entry.before).map(([type, count]) => metadata[type][0] + ' ' + count).join(', ')}. After: ${Object.entries(entry.after).map(([type, count]) => metadata[type][0] + ' ' + count).join(', ')}.`;
      row.append(text, values); list.append(row);
    }
    if (!activity.entries.length) { const empty = document.createElement('li'); empty.className = 'activity-empty'; empty.textContent = 'Your mana changes will appear here.'; list.append(empty); }
    list.scrollTop = atTop ? 0 : oldTop + list.scrollHeight - oldHeight;
    $('clear-history').disabled = !activity.entries.length;
  }
  function pip(type) {
    const span = document.createElement('span'); span.className = 'pip';
    span.setAttribute('aria-hidden', 'true'); span.textContent = metadata[type][1];
    span.style.setProperty('--pip', metadata[type][2]); return span;
  }
  const cancelPresses = () => document.querySelectorAll('.step').forEach(button => button.dispatchEvent(new Event('cancelpress')));
  window.addEventListener('blur', cancelPresses);
  document.addEventListener('visibilitychange', () => { if (document.hidden) cancelPresses(); });
  function draw() {
    cancelPresses();
    $('pools').replaceChildren();
    for (const type of Object.keys(state.pools)) {
      const name = metadata[type][0];
      const panel = document.createElement('article'); panel.className = 'pool'; panel.dataset.type = type;
      panel.setAttribute('aria-label', name + ' mana');
      const head = document.createElement('div'); head.className = 'pool-head';
      const label = document.createElement('span'); label.className = 'pool-name'; label.textContent = name;
      head.append(pip(type), label);
      const badge = document.createElement('span'); badge.className = 'change'; badge.id = 'change-' + type;
      const controls = document.createElement('div'); controls.className = 'pool-controls';
      for (const delta of [-1, 1]) {
        const button = document.createElement('button'); button.className = 'step';
        button.textContent = delta < 0 ? '−' : '+'; button.dataset.delta = delta;
        button.setAttribute('aria-label', (delta < 0 ? 'Spend one ' : 'Add one ') + name.toLowerCase() + ' mana');
        button.setAttribute('aria-describedby', 'press-hint');
        button.title = 'Tap for 1 · Hold to repeat 3';
        ManaPress.bind(button, (amount, group) => commit(ManaState.adjust(state, type, delta * amount, Date.now()), false, group));
        controls.append(button);
        if (delta < 0) {
          const count = document.createElement('output'); count.id = 'count-' + type; count.className = 'count';
          count.setAttribute('aria-live', 'polite'); count.setAttribute('aria-label', name + ' mana');
          const display = document.createElement('div'); display.className = 'count-display';
          const value = document.createElement('div'); value.className = 'count-value';
          value.append(count, badge); display.append(value); controls.append(display);
        }
      }
      const remove = document.createElement('button'); remove.className = 'remove quiet'; remove.textContent = '×';
      remove.hidden = Object.keys(state.pools).length === 1;
      remove.setAttribute('aria-label', 'Remove ' + name.toLowerCase() + ' pool');
      remove.title = 'Remove ' + name.toLowerCase() + ' pool';
      remove.addEventListener('click', () => {
        const pools = { ...state.pools }, changes = { ...state.changes }; delete pools[type]; delete changes[type];
        commit({ pools, changes }, true); tell(name + ' pool removed. Undo restores it.'); $('add').focus();
      });
      const actions = document.createElement('div'); actions.className = 'pool-actions';
      const undo = document.createElement('button'); undo.className = 'undo'; undo.textContent = '↶ Undo';
      undo.setAttribute('aria-label', 'Undo latest action'); undo.title = 'Undo latest action across all pools';
      undo.addEventListener('click', undoLast); actions.append(undo, remove); head.append(actions);
      panel.append(head, controls); $('pools').append(panel);
    }
    $('add').hidden = Object.keys(state.pools).length === ManaState.TYPES.length;
  }
  function update() {
    for (const [type, count] of Object.entries(state.pools)) {
      $('count-' + type).textContent = count;
      $('count-' + type).style.fontSize = count >= 10000 ? 'clamp(24px,7vw,42px)' : '';
      const panel = $('count-' + type).closest('.pool');
      panel.querySelector('[data-delta="-1"]').disabled = count === 0;
      panel.querySelector('[data-delta="1"]').disabled = count === ManaState.LIMIT;
      const change = state.changes[type], badge = $('change-' + type);
      badge.textContent = change ? (change.amount > 0 ? '+' : '') + change.amount : '';
      badge.classList.toggle('negative', !!change && change.amount < 0);
      badge.classList.toggle('stale', !!change && Date.now() - change.at >= ManaState.WINDOW);
    }
    $('total').textContent = ManaState.total(state);
    $('total').style.fontSize = ManaState.total(state) >= 10000 ? 'clamp(28px,7vw,44px)' : '';
    document.querySelectorAll('.undo').forEach(button => { button.disabled = !history.length; });
    $('reset').disabled = ManaState.total(state) === 0 && !activity.entries.length;
  }
  $('reset').addEventListener('click', () => {
    commit({ pools: Object.fromEntries(Object.keys(state.pools).map(type => [type, 0])), changes: {} }, false, null, 'reset');
    tell('Mana and recent activity cleared. Undo restores the mana.');
  });
  function undoLast() {
    if (!history.length) return;
    const previous = history.pop();
    activity = ManaState.undoActivity(activity, previous.entryId, state.pools, previous.state.pools, Date.now());
    lastGroup = null; state = previous.state; save(); draw(); update(); renderActivity(); tell('Last action undone.');
  }
  $('clear-history').addEventListener('click', () => {
    cancelPresses(); activity = { ...activity, entries: [] }; lastGroup = null; save(); update(); renderActivity(); tell('Activity cleared. Your mana pool is unchanged.');
  });
  $('add').addEventListener('click', () => {
    $('type-options').replaceChildren();
    for (const type of ManaState.TYPES.filter(type => !Object.hasOwn(state.pools, type))) {
      const button = document.createElement('button'); button.append(pip(type), metadata[type][0]);
      button.addEventListener('click', () => {
        commit({ pools: { ...state.pools, [type]: 0 }, changes: { ...state.changes } }, true);
        $('types-dialog').close(); $('count-' + type).closest('.pool').querySelector('[data-delta="1"]').focus();
      }); $('type-options').append(button);
    }
    $('types-dialog').showModal();
  });
  $('appearance').addEventListener('click', () => $('appearance-dialog').showModal());
  $('help').addEventListener('click', () => $('help-dialog').showModal());
  document.querySelectorAll('.close').forEach(button => button.addEventListener('click', () => button.closest('dialog').close()));
  document.querySelectorAll('[data-theme]').forEach(button => button.addEventListener('click', () => {
    theme = button.dataset.theme; $('backdrop').style.backgroundImage = theme === 'plain' ? 'none' : '';
    try { localStorage.removeItem(KEY + '-background'); } catch { tell('Appearance couldn’t be saved.'); }
    save(); tell('Background updated.');
  }));
  $('background').addEventListener('change', async event => {
    const file = event.target.files[0]; if (!file) return;
    if (!['image/png', 'image/jpeg', 'image/webp'].includes(file.type) || file.size > 10 * 1024 * 1024) {
      tell('Choose a PNG, JPEG or WebP image smaller than 10 MB.'); return;
    }
    let bitmap;
    try {
      bitmap = await createImageBitmap(file);
      const scale = Math.min(1, 1600 / Math.max(bitmap.width, bitmap.height));
      const canvas = document.createElement('canvas'); canvas.width = Math.max(1, Math.round(bitmap.width * scale)); canvas.height = Math.max(1, Math.round(bitmap.height * scale));
      canvas.getContext('2d').drawImage(bitmap, 0, 0, canvas.width, canvas.height);
      const data = canvas.toDataURL('image/jpeg', .8);
      // Save before displaying so a failed write cannot silently replace the saved background.
      localStorage.setItem(KEY + '-background', data);
      $('backdrop').style.backgroundImage = `url("${data}")`; tell('Your background is saved on this device.');
    } catch { tell('This image couldn’t be read or saved. Try a smaller image.'); }
    finally { bitmap?.close(); event.target.value = ''; }
  });
  window.addEventListener('beforeinstallprompt', event => { event.preventDefault(); installPrompt = event; $('install').hidden = false; });
  $('install').addEventListener('click', async () => {
    if (!installPrompt) return; await installPrompt.prompt(); installPrompt = null; $('install').hidden = true;
  });
  // Avoid silently overwriting a game from another tab.
  window.addEventListener('storage', event => { if (event.key === KEY) tell('Another tab changed its pool. This tab keeps your current game; avoid using both at once.'); });
  draw(); update(); renderActivity(); setInterval(update, 300);
  const status = $('offline-status');
  if (location.protocol === 'file:' || window.MANA_STANDALONE) status.textContent = 'Offline copy · saved on this device';
  else if ('serviceWorker' in navigator && window.isSecureContext) {
    navigator.serviceWorker.register('sw.js').then(() => navigator.serviceWorker.ready)
      .then(() => { status.textContent = 'Ready offline · saved on this device'; })
      .catch(() => { status.textContent = 'Offline setup unavailable · download a copy'; });
  } else status.textContent = 'Download a copy for offline use';
})();
