import { useEffect, useRef, useState } from 'react'

export default function TransactionForm({ initialEntry, month, maxDate, onSave, onClose, disabled }) {
  const dialog = useRef(null)
  const [description, setDescription] = useState(initialEntry?.description ?? '')
  const [category, setCategory] = useState(initialEntry?.category ?? '')
  const [amount, setAmount] = useState(initialEntry?.amount ?? '')
  const [date, setDate] = useState(initialEntry?.date ?? `${month}-01`)
  const [type, setType] = useState(initialEntry?.type ?? 'variable')
  const [repeat, setRepeat] = useState(false)
  const [endDate, setEndDate] = useState('')
  const [error, setError] = useState('')
  useEffect(() => { const element = dialog.current; element.showModal(); return () => element.close() }, [])
  function submit(event) {
    event.preventDefault()
    const value = Number(amount)
    if (date > maxDate) { setError('A data deve estar no mês atual ou em um mês anterior.'); return }
    if (repeat && endDate && endDate < date) { setError('A data de término não pode ser anterior ao início.'); return }
    if (!description.trim() || !category.trim() || !date || !Number.isFinite(value) || value <= 0) { setError('Preencha todos os campos e informe um valor maior que zero.'); return }
    onSave({ id: initialEntry?.id ?? crypto.randomUUID(), description: description.trim(), category: category.trim(), amount: value, date, type }, repeat ? { endDate } : null)
  }
  return <dialog ref={dialog} onCancel={event => { event.preventDefault(); onClose() }} aria-labelledby="form-title"><form onSubmit={submit}>
    <div className="modal-head"><div><span className="overline">SUAS FINANÇAS</span><h2 id="form-title">{initialEntry ? 'Editar lançamento' : 'Novo lançamento'}</h2></div><button type="button" className="icon-btn" onClick={onClose} aria-label="Fechar">×</button></div>
    <label>Descrição<input required maxLength="60" value={description} onChange={event => setDescription(event.target.value)} placeholder="Ex.: Supermercado" /></label>
    <div className="form-row"><label>Valor (R$)<input type="number" required min="0.01" step="0.01" value={amount} onChange={event => setAmount(event.target.value)} placeholder="0,00" /></label><label>Data<input type="date" required max={maxDate} value={date} onChange={event => setDate(event.target.value)} /></label></div>
    <label>Tipo<select value={type} onChange={event => { const next = event.target.value; setType(next); if (!initialEntry) setRepeat(next === 'fixed') }}><option value="income">Entrada</option><option value="fixed">Gasto fixo</option><option value="variable">Gasto variável</option><option value="saved">Dinheiro guardado</option></select></label>
    {!initialEntry && ['income','fixed'].includes(type) && <div className="repeat-option"><label><input type="checkbox" checked={repeat} onChange={event => setRepeat(event.target.checked)} /> Este lançamento é fixo e se repete mensalmente</label>{repeat && <><p>Será criado como previsto; confirme cada recebimento ou pagamento para alterar o saldo.</p><label>Data de término (opcional)<input type="date" min={date} value={endDate} onChange={event => setEndDate(event.target.value)} /></label></>}</div>}
    <label>Categoria<input required maxLength="35" value={category} onChange={event => setCategory(event.target.value)} placeholder="Ex.: Alimentação" /></label>
    {error && <p className="form-error" role="alert">{error}</p>}
    {disabled && <p className="form-error" role="alert">Os dados mudaram em outra aba. Copie as informações deste formulário e atualize a página antes de salvar.</p>}
    <button className="primary submit" type="submit" disabled={disabled}>{initialEntry ? 'Salvar alterações' : 'Salvar lançamento'}</button>
  </form></dialog>
}
