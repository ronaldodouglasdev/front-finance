const currency = value => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value)
export default function Transactions({ entries, onEdit, onDelete, onAdd, disabled }) {
  return <section className="panel transactions" id="movimentos">
    <div className="panel-heading"><div><span className="overline">ACOMPANHE DE PERTO</span><h2>Movimentações</h2><p>Suas entradas e saídas deste mês.</p></div><button className="text-button" disabled={disabled} onClick={onAdd}>＋ Adicionar</button></div>
    <div className="table-head" aria-hidden="true"><span>DESCRIÇÃO</span><span>CATEGORIA</span><span>DATA</span><span>VALOR</span><span>AÇÕES</span></div>
    {entries.length === 0 ? <p className="empty">Nenhuma movimentação neste mês. Adicione a primeira!</p> : <ul className="transaction-list">{entries.map(entry => <li className="item" key={entry.id}>
      <div className="item-name"><span className="item-icon" aria-hidden="true">{entry.type === 'income' ? '↙' : entry.type === 'saved' ? '◇' : '↗'}</span><span>{entry.description}</span></div>
      <div className="category"><span className="tag">{entry.category}</span></div><span className="date">{entry.date.slice(8, 10)}/{entry.date.slice(5, 7)}</span>
      <span className={`money ${entry.type === 'income' ? 'positive' : ''}`}>{entry.type === 'income' ? '+' : '−'} {currency(entry.amount)}</span>
      <div className="row-actions"><button disabled={disabled} onClick={() => onEdit(entry)} aria-label={`Editar ${entry.description}`} title="Editar">✎</button><button disabled={disabled} onClick={() => onDelete(entry)} aria-label={`Excluir ${entry.description}`} title="Excluir">×</button></div>
    </li>)}</ul>}
  </section>
}
