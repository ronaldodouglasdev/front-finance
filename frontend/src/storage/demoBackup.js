import { validateClosings } from '../utils/closing.js'
import { createBackup, parseBackup } from './transactions.js'

function isDate(value) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false
  const [y,m,d] = value.split('-').map(Number), date = new Date(Date.UTC(y,m-1,d))
  return y >= 100 && date.getUTCFullYear() === y && date.getUTCMonth() === m-1 && date.getUTCDate() === d
}
const positive = n => Number.isSafeInteger(n) && n > 0
const id = value => typeof value === 'string' && value.trim().length > 0
function validPlanner(planner) {
  if (!planner || !Array.isArray(planner.plans) || !Array.isArray(planner.goals)) return false
  const planIds = new Set(), itemIds = new Set(), goalIds = new Set(), contributionIds = new Set()
  for (const p of planner.plans) {
    if (!id(p.id) || planIds.has(p.id) || !id(p.name) || !id(p.category) || !['single','installment','recurring','loan','salary','fixed_rule'].includes(p.kind) || !Array.isArray(p.items) || p.items.length < 1 || p.items.length > 360 || !Number.isSafeInteger(p.total) || p.total < 0) return false
    if (p.kind === 'salary' && (!Array.isArray(p.receivedMonths) || p.receivedMonths.some(m => typeof m !== 'string' || !/^\d{4}-(0[1-9]|1[0-2])$/.test(m)) || new Set(p.receivedMonths).size !== p.receivedMonths.length)) return false
    if (p.kind === 'fixed_rule') {
      const monthPattern = /^\d{4}-(0[1-9]|1[0-2])$/
      if (!['income', 'fixed'].includes(p.direction) || (p.endDate !== '' && !isDate(p.endDate)) || !Array.isArray(p.completedMonths) || p.completedMonths.some(m => typeof m !== 'string' || !monthPattern.test(m)) || new Set(p.completedMonths).size !== p.completedMonths.length || !Array.isArray(p.changes) || p.changes.some(c => !c || typeof c.from !== 'string' || !monthPattern.test(c.from) || !positive(c.cents)) || !p.overrides || typeof p.overrides !== 'object' || Array.isArray(p.overrides) || Object.entries(p.overrides).some(([m, value]) => !monthPattern.test(m) || !positive(value))) return false
    }
    planIds.add(p.id)
    for (const x of p.items) {
      if (!id(x.id) || itemIds.has(x.id) || !isDate(x.date) || !positive(x.cents) || !Number.isSafeInteger(x.number) || x.number < 1 || typeof x.paid !== 'boolean') return false
      itemIds.add(x.id)
    }
  }
  for (const g of planner.goals) {
    if (!id(g.id) || goalIds.has(g.id) || !id(g.name) || !positive(g.target) || !Number.isSafeInteger(g.monthly) || g.monthly < 0 || (g.deadline !== '' && !isDate(g.deadline)) || !Array.isArray(g.contributions)) return false
    goalIds.add(g.id)
    for (const c of g.contributions) {
      if (!id(c.id) || contributionIds.has(c.id) || !isDate(c.date) || !positive(c.cents)) return false
      contributionIds.add(c.id)
    }
  }
  return true
}
function validLinks(entries, planner) {
  const linked = new Map()
  for (const plan of planner.plans) {
    const ids = plan.kind === 'fixed_rule' ? (plan.completedMonths || []).map(month => `pagamento-fixed-${plan.id}-${month}`)
      : plan.kind === 'salary' ? (plan.receivedMonths || []).map(month => `pagamento-salary-${plan.id}-${month}`)
      : plan.items.filter(item => item.paymentId).map(item => item.paymentId)
    for (const paymentId of ids) linked.set(paymentId, (linked.get(paymentId) || 0) + 1)
  }
  const records = new Map(entries.map(entry => [entry.id, entry]))
  for (const [id, count] of linked) if (count !== 1 || !records.has(id)) return false
  for (const entry of entries) if (entry.id.startsWith('pagamento-') && !linked.has(entry.id)) return false
  return true
}
export function createDemoBackup(entries, planner) {
  const legacy = JSON.parse(createBackup(entries))
  return JSON.stringify({ ...legacy, version: 2, planner }, null, 2)
}
export function parseDemoBackup(text) {
  let data
  try { data = JSON.parse(text) } catch { throw new Error('O arquivo não contém JSON válido.') }
  if (data?.format !== 'meu-fluxo-backup') throw new Error('Formato de backup não reconhecido.')
  if (data.version === 1) return { entries: parseBackup(text), planner: null }
  if (data.version !== 2 || !validPlanner(data.planner)) throw new Error('Planejamento inválido ou versão de backup não reconhecida.')
  const entries = parseBackup(JSON.stringify({ format: data.format, version: 1, entries: data.entries }))
  if (data.planner.closings !== undefined && !validateClosings(entries, data.planner.closings)) throw new Error('Os fechamentos não correspondem ao histórico do backup.')
  if (!validLinks(entries, data.planner)) throw new Error('Os pagamentos e compromissos do backup não correspondem entre si.')
  return { entries, planner: data.planner }
}
