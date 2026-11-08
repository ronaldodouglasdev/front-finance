import { validateClosings } from '../utils/closing.js'

// Protótipo: reúne os dois conjuntos em um único registro para evitar gravações parciais.
export const LEDGER_KEY = 'agl-demo-ledger-v2'
export const ENTRY_KEY = 'meu-fluxo:transactions:v1'
export const PLAN_KEY = 'agl-demo-planner-v1'

// Apply changes from a legacy tab without overwriting independent ledger edits.
export function mergeLegacyEntries(baseRaw, currentRaw, legacyRaw) {
  const parse = raw => raw === null ? [] : JSON.parse(raw)
  const base = parse(baseRaw), current = parse(currentRaw), legacy = parse(legacyRaw)
  if (![base, current, legacy].every(Array.isArray)) throw new Error('Dados antigos inválidos')
  const keyed = rows => new Map(rows.map(row => [row.id, row]))
  const before = keyed(base), now = keyed(current), old = keyed(legacy)
  const result = new Map(now)
  for (const id of new Set([...before.keys(), ...old.keys()])) {
    const a = before.get(id), b = old.get(id), c = now.get(id)
    if (JSON.stringify(a) === JSON.stringify(b)) continue
    if (JSON.stringify(a) !== JSON.stringify(c) && JSON.stringify(b) !== JSON.stringify(c)) throw new Error('Conflito com dados da versão anterior')
    if (b === undefined) result.delete(id); else result.set(id, b)
  }
  return JSON.stringify([...result.values()])
}

export function createLedgerStorage(storage) {
  function read() {
    const raw = storage.getItem(LEDGER_KEY)
    if (raw === null) { const entries = storage.getItem(ENTRY_KEY); return { entries, planner: storage.getItem(PLAN_KEY), legacyEntries: entries } }
    const data = JSON.parse(raw)
    if (!data || data.version !== 1 || !['string','object'].includes(typeof data.entries) || !['string','object'].includes(typeof data.planner) || (data.entries !== null && typeof data.entries !== 'string') || (data.planner !== null && typeof data.planner !== 'string')) throw new Error('Armazenamento inválido')
    const legacyEntries = storage.getItem(ENTRY_KEY)
    const entries = Object.hasOwn(data, 'legacyEntries') && data.legacyEntries !== legacyEntries
      ? mergeLegacyEntries(data.legacyEntries, data.entries, legacyEntries) : data.entries
    if (entries !== data.entries && data.planner !== null) {
      const planner = JSON.parse(data.planner)
      if (planner.closings && !validateClosings(JSON.parse(entries), planner.closings)) throw new Error('Alteração antiga conflita com fechamento mensal')
    }
    return { entries, planner: data.planner, legacyEntries }

  }
  function write(data) { storage.setItem(LEDGER_KEY, JSON.stringify({ version: 1, ...data })) }
  return {
    getItem(key) { const data = read(); if (key === ENTRY_KEY) return data.entries; if (key === PLAN_KEY) return data.planner; return storage.getItem(key) },
    setItem(key, value) { if (key !== ENTRY_KEY && key !== PLAN_KEY) return storage.setItem(key, value); const data = read(); data[key === ENTRY_KEY ? 'entries' : 'planner'] = String(value); write(data) },
    removeItem(key) { if (key !== ENTRY_KEY && key !== PLAN_KEY) return storage.removeItem(key); const data = read(); data[key === ENTRY_KEY ? 'entries' : 'planner'] = null; write(data) },
    setBoth(entries, planner) { const data = read(); write({ ...data, entries, planner }) },
  }
}

// Um lock compartilhado mantém leitura, verificação e gravação na mesma seção crítica.
export function withLedgerLock(callback, onUnavailable = () => {}) {
  if (!globalThis.navigator?.locks?.request) {
    onUnavailable()
    return Promise.resolve(false)
  }
  return globalThis.navigator.locks.request('agl-demo-ledger-write', { mode: 'exclusive' }, callback).catch(() => { onUnavailable(); return false })
}
