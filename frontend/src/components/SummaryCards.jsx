const currency = value => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value)

export default function SummaryCards({ entries }) {
  const total = types => entries.filter(entry => types.includes(entry.type)).reduce((sum, entry) => sum + entry.amount, 0)
  const income = total(['income'])
  const fixed = total(['fixed'])
  const variable = total(['variable'])
  const saved = total(['saved'])
  const cards = [
    { label: 'Saldo disponível', value: income - fixed - variable - saved, detail: 'Depois dos gastos e do que você guardou', style: 'balance', icon: '↗' },
    { label: 'Entradas', value: income, detail: 'Sua renda no mês', style: 'green', icon: '↙' },
    { label: 'Despesas', value: fixed + variable, detail: `${currency(fixed)} fixos · ${currency(variable)} variáveis`, style: 'orange', icon: '↗' },
    { label: 'Guardado no mês', value: saved, detail: 'Um carinho para o futuro', style: 'purple', icon: '◇' },
  ]
  return (
    <section id="inicio">
      <div className="section-heading"><div><span className="overline">SEU RESUMO</span><h2>O seu mês em números</h2></div><span className="muted">Dados de demonstração</span></div>
      <div className="cards">{cards.map(card => (
        <article className={`card ${card.style === 'balance' ? 'balance' : ''}`} key={card.label}>
          <div className="card-top"><span>{card.label}</span><span className={card.style === 'balance' ? '' : `chip ${card.style}`} aria-hidden="true">{card.icon}</span></div>
          <div className="amount">{currency(card.value)}</div><div className="card-foot">{card.detail}</div>
        </article>
      ))}</div>
    </section>
  )
}
