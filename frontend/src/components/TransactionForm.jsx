import { useEffect, useRef, useState } from 'react'

export default function TransactionForm({ initialEntry, month, onSave, onClose, disabled }) {
  const dialog = useRef(null)
  const [description, setDescription] = useState(initialEntry?.description ?? '')
  const [category, setCategory] = useState(initialEntry?.category ?? '')
  const [amount, setAmount] = useState(initialEntry?.amount ?? '')
  const [date, setDate] = useState(initialEntry?.date ?? `${month}-01`)
  const [type, setType] = useState(initialEntry?.type ?? 'variable')
  const [error, setError] = useState('')
  useEffect(() => { const element = dialog.current; element.showModal(); return () => element.close() }, [])
  function submit(event) {
    event.preventDefault()
    const value = Number(amount)
    if (!description.trim() || !category.trim() || !date || !Number.isFinite(value) || value <= 0) { setError('Preencha todos os campos e informe um valor maior que zero.'); return }
    onSave({ id: initialEntry?.id ?? crypto.randomUUID(), description: description.trim(), category: category.trim(), amount: value, date, type })
  }
  return <dialog ref={dialog} onCancel={event => { event.preventDefault(); onClose() }} aria-labelledby="form-title"><form onSubmit={submit}>
    <div className="modal-head"><div><span className="overline">SUAS FINANÇAS</span><h2 id="form-title">{initialEntry ? 'Editar lançamento' : 'Novo lançamento'}</h2></div><button type="button" className="icon-btn" onClick={onClose} aria-label="Fechar">×</button></div>
    <label>Descrição<input required maxLength="60" value={description} onChange={event => setDescription(event.target.value)} placeholder="Ex.: Supermercado" /></label>
    <div className="form-row"><label>Valor (R$)<input type="number" required min="0.01" step="0.01" value={amount} onChange={event => setAmount(event.target.value)} placeholder="0,00" /></label><label>Data<input type="date" required value={date} onChange={event => setDate(event.target.value)} /></label></div>
    <label>Tipo<select value={type} onChange={event => setType(event.target.value)}><option value="income">Entrada</option><option value="fixed">Gasto fixo</option><option value="variable">Gasto variável</option><option value="saved">Dinheiro guardado</option></select></label>
    <label>Categoria<input required maxLength="35" value={category} onChange={event => setCategory(event.target.value)} placeholder="Ex.: Alimentação" /></label>
    {error && <p className="form-error" role="alert">{error}</p>}
    {disabled && <p className="form-error" role="alert">Os dados mudaram em outra aba. Copie as informações deste formulário e atualize a página antes de salvar.</p>}
    <button className="primary submit" type="submit" disabled={disabled}>{initialEntry ? 'Salvar alterações' : 'Salvar lançamento'}</button>
  </form></dialog>
}
