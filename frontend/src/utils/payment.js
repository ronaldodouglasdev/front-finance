// Reverte apenas lançamentos gerados por uma ocorrência identificável.
export function undoPayment(entries, planner, paymentId) {
  const record = entries.find(entry => entry.id === paymentId)
  if (!record || !paymentId.startsWith('pagamento-')) throw new Error('Pagamento não encontrado.')
  let matches = 0
  const plans = planner.plans.map(plan => {
    if (plan.kind === 'fixed_rule' || plan.kind === 'salary') {
      const field = plan.kind === 'salary' ? 'receivedMonths' : 'completedMonths'
      const prefix = plan.kind === 'salary' ? 'salary' : 'fixed'
      const found = (plan[field] || []).filter(month => paymentId === `pagamento-${prefix}-${plan.id}-${month}`)
      if (found.length !== 1) return plan
      matches++
      return { ...plan, [field]: plan[field].filter(month => month !== found[0]) }
    }
    const index = plan.items.findIndex(item => item.paid && item.paymentId === paymentId)
    if (index < 0) return plan
    matches++
    return { ...plan, items: plan.items.map((item, i) => i === index ? { ...item, paid: false, paymentId: undefined, paidDate: undefined } : item) }
  })
  if (matches !== 1) throw new Error('Não foi possível localizar a parcela vinculada. Os dados foram preservados.')
  return { entries: entries.filter(entry => entry.id !== paymentId), planner: { ...planner, plans } }
}
