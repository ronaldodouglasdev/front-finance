export function isPlannedIncome(item) {
  return item.kind === 'salary' || item.direction === 'income'
}
