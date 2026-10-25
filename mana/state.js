/* Shared counter rules; usable in a browser and in the dependency-free tests. */
const ManaState = (() => {
  const TYPES = ['B', 'C', 'W', 'U', 'R', 'G'];
  const LIMIT = 999999;
  const WINDOW = 3000;
  const fresh = () => ({ pools: { B: 0 }, changes: {} });
  function restore(value) {
    const pools = {};
    if (value && typeof value.pools === 'object' && value.pools) {
      for (const [type, count] of Object.entries(value.pools)) {
        if (TYPES.includes(type) && Number.isSafeInteger(count) && count >= 0 && count <= LIMIT) pools[type] = count;
      }
    }
    return Object.keys(pools).length ? { pools, changes: {} } : fresh();
  }
  function adjust(state, type, delta, now) {
    if (!Object.hasOwn(state.pools, type) || ![1, -1, 3, -3].includes(delta)) return state;
    const next = Math.max(0, Math.min(LIMIT, state.pools[type] + delta));
    const change = next - state.pools[type];
    if (change === 0) return state;
    const previous = state.changes[type];
    const continuing = previous && now - previous.at < WINDOW && Math.sign(previous.amount) === Math.sign(change);
    return {
      pools: { ...state.pools, [type]: next },
      changes: { ...state.changes, [type]: { amount: continuing ? previous.amount + change : change, at: now } }
    };
  }
  const ACTIVITY_LIMIT = 200;
  function validPools(pools) {
    return pools && typeof pools === 'object' && !Array.isArray(pools) &&
      Object.keys(pools).length > 0 && Object.keys(pools).length <= TYPES.length &&
      Object.entries(pools).every(([type, count]) => TYPES.includes(type) && Number.isSafeInteger(count) && count >= 0 && count <= LIMIT);
  }
  function restoreActivity(saved) {
    const seen = new Set();
    const entries = Array.isArray(saved?.entries) ? saved.entries.slice(-ACTIVITY_LIMIT).filter(entry => {
      if (!entry || !Number.isSafeInteger(entry.id) || entry.id < 1 || entry.id >= Number.MAX_SAFE_INTEGER || seen.has(entry.id) ||
          !['mana', 'reset', 'add', 'remove', 'undo'].includes(entry.kind) ||
          !(entry.type === null || TYPES.includes(entry.type)) ||
          (['mana', 'add', 'remove'].includes(entry.kind) && entry.type === null) ||
          !Number.isFinite(entry.at) || entry.at < 0 || typeof entry.undone !== 'boolean' ||
          !validPools(entry.before) || !validPools(entry.after)) return false;
      if (entry.kind === 'mana' && (!Object.hasOwn(entry.before, entry.type) || !Object.hasOwn(entry.after, entry.type))) return false;
      seen.add(entry.id); return true;
    }).map(entry => ({ id: entry.id, kind: entry.kind, type: entry.type, at: entry.at, undone: entry.undone,
      isHold: entry.isHold === true, before: { ...entry.before }, after: { ...entry.after } })) : [];
    const minimum = Math.max(0, ...entries.map(entry => entry.id)) + 1;
    return { entries, nextId: Number.isSafeInteger(saved?.nextId) && saved.nextId >= minimum ? saved.nextId : minimum };
  }
  function appendActivity(activity, entry) {
    return { entries: [...activity.entries, { ...entry, id: activity.nextId }].slice(-ACTIVITY_LIMIT), nextId: activity.nextId + 1 };
  }
  function recordActivity(activity, before, after, options) {
    if (options.kind === 'reset') return { activity: { entries: [], nextId: activity.nextId + 1 }, entryId: activity.nextId, merged: false };
    const type = TYPES.find(type => before[type] !== after[type]) ?? null;
    const kind = !Object.hasOwn(before, type) ? 'add' : !Object.hasOwn(after, type) ? 'remove' : 'mana';
    const previous = activity.entries.at(-1);
    const amount = kind === 'mana' ? after[type] - before[type] : 0;
    const merge = options.canMerge && kind === 'mana' && previous?.kind === 'mana' && !previous.undone && previous.type === type &&
      Math.sign(previous.after[type] - previous.before[type]) === Math.sign(amount) &&
      (options.continuingHold || (!options.isHold && !previous.isHold && options.at - previous.at < WINDOW));
    if (merge) {
      const entry = { ...previous, after: { ...after }, at: options.at };
      return { activity: { ...activity, entries: [...activity.entries.slice(0, -1), entry] }, entryId: entry.id, merged: true };
    }
    const entry = { kind, type, before: { ...before }, after: { ...after },
      at: options.at, undone: false, isHold: !!options.isHold };
    return { activity: appendActivity(activity, entry), entryId: activity.nextId, merged: false };
  }
  function undoActivity(activity, entryId, before, after, at) {
    const target = activity.entries.find(entry => entry.id === entryId);
    const marked = { ...activity, entries: activity.entries.map(entry => entry.id === entryId ? { ...entry, undone: true } : entry) };
    return appendActivity(marked, { kind: 'undo', type: target?.type ?? null, before: { ...before }, after: { ...after }, at, undone: false, isHold: false });
  }
  const total = state => Object.values(state.pools).reduce((a, b) => a + b, 0);
  return { TYPES, LIMIT, WINDOW, fresh, restore, adjust, total, restoreActivity, recordActivity, undoActivity, ACTIVITY_LIMIT };
})();
if (typeof module !== 'undefined') module.exports = ManaState;
