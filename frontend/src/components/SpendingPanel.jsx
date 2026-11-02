const colors = ['#719a78', '#abc6a8', '#dfbd9c', '#c9bdcf', '#e5d7ae', '#92afa9']
const currency = value => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value)

export default function SpendingPanel({ entries }) {
  const totals = entries.filter(entry => entry.type === 'fixed' || entry.type === 'variable').reduce((groups, entry) => {
    groups[entry.category] = (groups[entry.category] || 0) + entry.amount
    return groups
  }, {})
  const groups = Object.entries(totals).sort((a, b) => b[1] - a[1])
  const total = groups.reduce((sum, [, amount]) => sum + amount, 0)
  let position = 0
  const segments = groups.map(([, amount], index) => {
    const start = position
    position += amount / total * 100
    return `${colors[index % colors.length]} ${start}% ${position}%`
  })
  return (
    <section className="panel" id="categorias">
      <div className="panel-heading"><div><span className="overline">PARA ONDE VAI</span><h2>Seus gastos</h2><p>Distribuição das despesas de exemplo.</p></div></div>
      <div className="donut-wrap"><div className="donut" style={{ background: total ? `conic-gradient(${segments.join(',')})` : '#e8efe8' }}><div><small>DESPESAS</small><b>{currency(total)}</b></div></div></div>
      <div className="legend">{groups.map(([category, amount], index) => <div className="legend-row" key={category}><i style={{ background: colors[index % colors.length] }} aria-hidden="true" />{category}<strong>{currency(amount)}</strong></div>)}</div>
    </section>
  )
}
