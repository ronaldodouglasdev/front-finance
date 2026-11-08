// Receitas recorrentes são projetadas por mês, sem limite fixo de duração.
export function salaryForMonth(plan, month) {
  if (plan.kind !== 'salary' || !plan.items?.[0] || month < plan.items[0].date.slice(0, 7)) return null
  const [year, number] = month.split('-').map(Number)
  const day = Math.min(Number(plan.items[0].date.slice(8, 10)), new Date(year, number, 0).getDate())
  return { id: `salary-${plan.id}-${month}`, date: `${month}-${String(day).padStart(2, '0')}`, cents: plan.items[0].cents, number: 1, paid: (plan.receivedMonths || []).includes(month), kind: 'salary' }
}

export function fixedForMonth(plan, month) {
  if (plan.kind !== 'fixed_rule' || !plan.items?.[0]) return null
  const start = plan.items[0].date.slice(0, 7)
  if (month < start || (plan.endDate && month > plan.endDate.slice(0, 7))) return null
  const [year, number] = month.split('-').map(Number)
  const day = Math.min(Number(plan.items[0].date.slice(8, 10)), new Date(year, number, 0).getDate())
  const date = `${month}-${String(day).padStart(2, '0')}`
  if (plan.endDate && date > plan.endDate) return null
  const changes = (plan.changes || []).filter(c => c.from <= month).sort((a,b)=>b.from.localeCompare(a.from))
  const value = plan.overrides?.[month] ?? changes[0]?.cents ?? plan.items[0].cents
  return { id: `fixed-${plan.id}-${month}`, date, cents: value, number: 1, paid: (plan.completedMonths || []).includes(month), kind: 'fixed_rule' }
}
export function fixedUntil(plan, month) {
  const start = plan.items[0].date.slice(0, 7), [sy,sm]=start.split('-').map(Number),[ey,em]=month.split('-').map(Number)
  const count=(ey-sy)*12+em-sm+1
  if (count <= 0) return []
  if (count > 2400) return []
  return Array.from({length:count},(_,index)=>{const d=new Date(sy,sm-1+index,1),key=`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`;return fixedForMonth(plan,key)}).filter(Boolean)
}

export function canStopFixed(plan, month) {
  return !(plan.completedMonths || []).some(completed => completed > month)
}
