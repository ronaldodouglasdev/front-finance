import { useEffect, useRef, useState } from 'react'
import Sidebar from './components/Sidebar'
import PwaStatus from './components/PwaStatus'
import SummaryCards from './components/SummaryCards'
import Transactions from './components/Transactions'
import SpendingPanel from './components/SpendingPanel'
import TransactionForm from './components/TransactionForm'
import { STORAGE_KEY, createBackup, parseBackup, loadTransactions, saveTransactions } from './storage/transactions'
import { formatCents, sumCents } from './utils/money'
import './App.css'

const today = new Date()
const initialMonth = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`
const examples = [
  ['Salário', 'Trabalho', 'income', 5000, '05'], ['Aluguel', 'Moradia', 'fixed', 1500, '08'],
  ['Supermercado', 'Alimentação', 'variable', 580, '10'], ['Internet', 'Moradia', 'fixed', 120, '12'],
  ['Café e almoço', 'Alimentação', 'variable', 85, '15'], ['Reserva mensal', 'Reserva', 'saved', 600, '18'],
  ['Transporte', 'Transporte', 'variable', 180, '20'],
].map(([description, category, type, amount, day], index) => ({ id: String(index + 1), description, category, type, amount, date: `${initialMonth}-${day}` }))

export default function App() {
  const [initialData] = useState(() => {
    try { const result = loadTransactions(window.localStorage); return { ...result, raw: window.localStorage.getItem(STORAGE_KEY) } }
    catch { return { entries: null, error: 'Não foi possível acessar o armazenamento deste navegador.' } }
  })
  const [entries, setEntries] = useState(() => initialData.entries ?? [])
  const [backupMessage, setBackupMessage] = useState('')
  const fileInput = useRef(null)
  const [storageError, setStorageError] = useState(initialData.error)
  const [conflict, setConflict] = useState(false)
  const lastStored = useRef(initialData.raw ?? null)
  const storageBlocked = Boolean(initialData.error) || conflict
  useEffect(() => {
    function onStorage(event) {
      if ((event.key === STORAGE_KEY || event.key === null) && event.storageArea === window.localStorage && window.localStorage.getItem(STORAGE_KEY) !== lastStored.current) setConflict(true)
    }
    window.addEventListener('storage', onStorage)
    return () => window.removeEventListener('storage', onStorage)
  }, [])
  const [month, setMonth] = useState(initialMonth)
  const [form, setForm] = useState(null)
  const currentEntries = entries.filter(entry => entry.date.startsWith(month)).sort((a, b) => b.date.localeCompare(a.date))
  const saved = sumCents(entries.filter(entry => entry.type === 'saved' && entry.date.slice(0, 7) <= month))
  const [year, monthNumber] = month.split('-').map(Number)
  const monthLabel = new Intl.DateTimeFormat('pt-BR', { month: 'long', year: 'numeric' }).format(new Date(year, monthNumber - 1, 1))
  function changeMonth(offset) {
    const date = new Date(year, monthNumber - 1 + offset, 1)
    setMonth(`${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`)
  }
  function persist(next) {
    try {
      if (window.localStorage.getItem(STORAGE_KEY) !== lastStored.current) {
        setConflict(true)
        return false
      }
      const error = saveTransactions(window.localStorage, next)
      if (error) { setStorageError(error); return false }
      lastStored.current = window.localStorage.getItem(STORAGE_KEY)
      setEntries(next)
      setStorageError(null)
      return true
    } catch {
      setStorageError('Não foi possível salvar no navegador. Nenhuma alteração foi aplicada.')
      return false
    }
  }
  function exportBackup() {
    const blob = new Blob([createBackup(entries)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `agl-finance-backup-${new Date().toISOString().slice(0, 10)}.json`
    link.click()
    setTimeout(() => URL.revokeObjectURL(url), 1000)
    setBackupMessage('Backup preparado para download. Guarde o arquivo em local seguro.')
  }
  async function importBackup(event) {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) return
    try {
      if (file.size > 5 * 1024 * 1024) throw new Error('O arquivo ultrapassa o limite de 5 MB.')
      const imported = parseBackup(await file.text())
      if (!window.confirm(`Restaurar ${imported.length} lançamento(s)? Isso substituirá todos os lançamentos atuais neste navegador. Exporte um backup antes, se quiser preservá-los.`)) return
      if (!persist(imported)) { setBackupMessage('A importação não foi aplicada; os dados salvos foram mantidos.'); return }
      setBackupMessage(`${imported.length} lançamento(s) restaurado(s) com sucesso.`)
    } catch (error) { setBackupMessage(`Não foi possível importar: ${error.message}`) }
  }
  function loadExamples() {
    if (entries.length && !window.confirm('Adicionar lançamentos de exemplo aos dados atuais?')) return
    if (persist([...entries, ...examples.map(entry => ({ ...entry, id: crypto.randomUUID(), date: `${month}-${entry.date.slice(-2)}` }))])) setBackupMessage('Exemplos adicionados. Você pode editá-los ou excluí-los.')
  }
  function saveEntry(entry) {
    const next = form.mode === 'edit' ? entries.map(item => item.id === entry.id ? entry : item) : [...entries, entry]
    if (!persist(next)) return
    setMonth(entry.date.slice(0, 7))
    setForm(null)
  }
  function deleteEntry(entry) {
    if (window.confirm(`Excluir o lançamento “${entry.description}”?`)) persist(entries.filter(item => item.id !== entry.id))
  }
  return (
    <div className="layout">
      <Sidebar />
      <main>
        <header><div><div className="eyebrow">SEU DINHEIRO, COM MAIS CLAREZA <span>✳</span></div><h1>Olá, vamos cuidar<br className="mobile-break" /> das suas finanças<span className="dot">.</span></h1><p>Suas finanças, com mais clareza.</p></div><div className="header-actions"><button className="icon-btn" onClick={() => changeMonth(-1)} aria-label="Mês anterior">‹</button><strong>{monthLabel}</strong><button className="icon-btn" onClick={() => changeMonth(1)} aria-label="Próximo mês">›</button><button className="primary" disabled={storageBlocked} onClick={() => setForm({ mode: 'new' })}>＋ Novo lançamento</button></div></header>
        <div className="notice" role={storageError || conflict ? "alert" : undefined}>{(conflict ? "Os lançamentos foram alterados em outra aba. Exporte esta versão se precisar preservá-la e atualize a página antes de continuar." : storageError) || "✦  Dados salvos apenas neste navegador. Exporte um backup para guardá-los em segurança."}</div>
        <div className="backup-actions" aria-label="Backup e exemplos">
          <button className="text-button" onClick={exportBackup} disabled={Boolean(initialData.error)}>Exportar backup</button>
          <button className="text-button" onClick={() => fileInput.current?.click()} disabled={storageBlocked}>Importar backup</button>
          <button className="text-button" onClick={loadExamples} disabled={storageBlocked}>Carregar exemplos</button>
          <input ref={fileInput} type="file" accept=".json,application/json" hidden onChange={importBackup} />
        </div>
        {backupMessage && <p className="backup-message" role="status">{backupMessage}</p>}
        <PwaStatus />
        <SummaryCards entries={currentEntries} />
        <div className="content-grid"><Transactions disabled={storageBlocked} entries={currentEntries} onEdit={entry => setForm({ mode: 'edit', entry })} onDelete={deleteEntry} onAdd={() => setForm({ mode: 'new' })} /><div className="right"><SpendingPanel entries={currentEntries} /><section className="reserve" id="reserva"><div><span className="overline">OLHANDO PARA FRENTE</span><h2>Sua reserva ✳</h2><p>Todo valor guardado é um passo na direção dos seus planos.</p><span className="reserve-label">TOTAL GUARDADO</span><strong>{formatCents(saved)}</strong><small>Acumulado até o mês selecionado</small></div><div className="reserve-art" aria-hidden="true">✳</div></section></div></div>
        <footer>Feito para você cuidar bem do seu dinheiro. <span>✳</span> <span>Dados neste navegador</span></footer>
      </main>
      {form && <TransactionForm key={form.entry?.id || 'new'} initialEntry={form.entry} month={month} onSave={saveEntry} disabled={storageBlocked} onClose={() => setForm(null)} />}
    </div>
  )
}
