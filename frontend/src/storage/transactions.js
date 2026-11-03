// A camada de armazenamento pode ser trocada por uma API no futuro.
export const STORAGE_KEY = 'meu-fluxo:transactions:v1'
const types = new Set(['income', 'fixed', 'variable', 'saved'])

function validEntry(entry) {
  return entry && typeof entry.id === 'string' && typeof entry.description === 'string' && typeof entry.category === 'string' && types.has(entry.type) && Number.isFinite(entry.amount) && entry.amount > 0 && typeof entry.date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(entry.date)
}

export function loadTransactions(storage) {
  try {
    const raw = storage.getItem(STORAGE_KEY)
    if (raw === null) return { entries: null, error: null }
    const data = JSON.parse(raw)
    if (!Array.isArray(data) || !data.every(validEntry)) throw new Error('invalid data')
    return { entries: data, error: null }
  } catch {
    return { entries: null, error: 'Não foi possível ler os dados salvos. Os lançamentos existentes foram preservados; verifique as permissões de armazenamento do navegador.' }
  }
}

export function saveTransactions(storage, entries) {
  try {
    storage.setItem(STORAGE_KEY, JSON.stringify(entries))
    return null
  } catch {
    return 'Não foi possível salvar no navegador. Suas últimas alterações estão apenas nesta página e podem ser perdidas ao atualizá-la.'
  }
}

export function createBackup(entries) {
  return JSON.stringify({ format: 'meu-fluxo-backup', version: 1, entries }, null, 2)
}

export function parseBackup(text) {
  let backup
  try { backup = JSON.parse(text) } catch { throw new Error('O arquivo não contém JSON válido.') }
  if (!backup || backup.format !== 'meu-fluxo-backup' || backup.version !== 1 || !Array.isArray(backup.entries)) throw new Error('Formato ou versão de backup não reconhecidos.')
  const ids = new Set()
  for (const entry of backup.entries) {
    if (!validEntry(entry) || !entry.id.trim() || !entry.description.trim() || !entry.category.trim() || ids.has(entry.id)) throw new Error('O arquivo contém lançamentos inválidos ou repetidos.')
    const [year, month, day] = entry.date.split('-').map(Number)
    const date = new Date(Date.UTC(year, month - 1, day))
    if (year < 100 || date.getUTCFullYear() !== year || date.getUTCMonth() !== month - 1 || date.getUTCDate() !== day) throw new Error('O arquivo contém uma data inválida.')
    ids.add(entry.id)
  }
  return backup.entries
}
