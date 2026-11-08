import { toCents } from './money.js'
import { fixedForMonth, fixedUntil, salaryForMonth } from './recurrence.js'

export function advanceMonth(month, offset) {
  const [year, number] = month.split('-').map(Number)
  const date = new Date(year, number - 1 + offset, 1)
  return `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}`
}

export function projectMonths(plans, month, balance, periods = 4, entries = []) {
  let projected = balance
  return Array.from({ length: periods }, (_, offset) => {
    const key = advanceMonth(month, offset)
    let expense = 0, income = 0, count = 0
    for (const plan of plans) {
      let list
      if (plan.kind === 'salary') list = [salaryForMonth(plan, key)].filter(Boolean)
      else if (plan.kind === 'fixed_rule') list = plan.direction === 'income' ? [fixedForMonth(plan, key)].filter(Boolean) : offset === 0 ? fixedUntil(plan, key) : [fixedForMonth(plan, key)].filter(Boolean)
      else list = plan.items.filter(item => offset === 0 ? item.date.slice(0, 7) <= key : item.date.startsWith(key))
      for (const item of list) {
        if (item.paid) continue
        if (plan.kind === 'salary' || (plan.kind === 'fixed_rule' && plan.direction === 'income')) income += item.cents
        else expense += item.cents
        count++
      }
    }
    const actual = offset === 0 ? 0 : entries.filter(entry => entry.date.startsWith(key)).reduce((sum, entry) => sum + (entry.type === 'income' ? 1 : -1) * toCents(entry.amount), 0)
    projected += actual + income - expense
    return { key, total: expense, income, count, projection: projected }
  })
}
