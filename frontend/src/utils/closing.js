import { sumCents, toCents } from './money.js'

export function lastClosing(closings = []) {
  return closings.reduce((latest, item) => !latest || item.month > latest.month ? item : latest, null)
}
export function isClosed(month, closings = []) {
  const latest = lastClosing(closings)
  return Boolean(latest && month <= latest.month)
}
export function nextMonth(month) {
  const [year, number] = month.split('-').map(Number)
  return number === 12 ? `${year + 1}-01` : `${year}-${String(number + 1).padStart(2, '0')}`
}
export function makeClosing(entries, month, closedAt = new Date().toISOString()) {
  const opening = entries.filter(entry => entry.date.slice(0, 7) < month).reduce((sum, entry) => sum + (entry.type === 'income' ? 1 : -1) * toCents(entry.amount), 0)
  const selected = entries.filter(entry => entry.date.slice(0, 7) === month)
  const total = types => sumCents(selected.filter(entry => types.includes(entry.type)))
  const income = total(['income']), expenses = total(['fixed', 'variable']), saved = total(['saved'])
  const ending = opening + income - expenses - saved
  if (![opening, income, expenses, saved, ending].every(Number.isSafeInteger)) throw new Error('Os valores ultrapassam o limite seguro para fechamento.')
  return { month, closedAt, opening, income, expenses, saved, ending }
}
export function validateClosings(entries, closings) {
  if (!Array.isArray(closings)) return false
  const sorted = [...closings].sort((a,b) => String(a?.month).localeCompare(String(b?.month)))
  for (let index = 0; index < sorted.length; index++) {
    const row = sorted[index]
    if (!row || typeof row.month !== 'string' || !/^\d{4}-(0[1-9]|1[0-2])$/.test(row.month) || typeof row.closedAt !== 'string' || !Number.isFinite(Date.parse(row.closedAt))) return false
    if (index > 0 && row.month !== nextMonth(sorted[index - 1].month)) return false
    let expected
    try { expected = makeClosing(entries, row.month, row.closedAt) } catch { return false }
    if (!['opening','income','expenses','saved','ending'].every(key => Number.isSafeInteger(row[key]) && row[key] === expected[key])) return false
  }
  return true
}
