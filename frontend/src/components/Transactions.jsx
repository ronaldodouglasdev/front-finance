const currency = value => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value)

export default function Transactions({ entries }) {
  return (
    <section className="panel transactions" id="movimentos">
      <div className="panel-heading"><div><span className="overline">ACOMPANHE DE PERTO</span><h2>Movimentações</h2><p>Exemplos de entradas e saídas deste mês.</p></div></div>
      <div className="table-head" aria-hidden="true"><span>DESCRIÇÃO</span><span>CATEGORIA</span><span>DATA</span><span>VALOR</span></div>
      <ul className="transaction-list">{entries.map(entry => (
        <li className="item" key={entry.id}>
          <div className="item-name"><span className="item-icon" aria-hidden="true">{entry.type === 'income' ? '↙' : entry.type === 'saved' ? '◇' : '↗'}</span><span>{entry.description}</span></div>
          <div className="category"><span className="tag">{entry.category}</span></div>
          <span className="date">{entry.day}</span>
          <span className={`money ${entry.type === 'income' ? 'positive' : ''}`}>{entry.type === 'income' ? '+' : '−'} {currency(entry.amount)}</span>
        </li>
      ))}</ul>
    </section>
  )
}
