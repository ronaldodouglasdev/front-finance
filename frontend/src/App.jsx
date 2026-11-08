import { useEffect, useRef, useState } from 'react'
import Sidebar from './components/Sidebar'
import Planner, { loadPlanner, PLANNER_KEY } from './components/Planner'
import Welcome from './components/Welcome'
import PwaStatus from './components/PwaStatus'
import SummaryCards from './components/SummaryCards'
import Transactions from './components/Transactions'
import SpendingPanel from './components/SpendingPanel'
import TransactionForm from './components/TransactionForm'
import { STORAGE_KEY, loadTransactions, saveTransactions } from './storage/transactions'
import { createDemoBackup, parseDemoBackup } from './storage/demoBackup'
import { formatCents, sumCents } from './utils/money'
import { createLedgerStorage, LEDGER_KEY, withLedgerLock } from './storage/ledger'
import { undoPayment } from './utils/payment'
import { isClosed, lastClosing, makeClosing, nextMonth } from './utils/closing'
import { fixedForMonth, fixedUntil, salaryForMonth } from './utils/recurrence'
import './App.css'

const storage = createLedgerStorage(window.localStorage)
const now = new Date()
const initialMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
const examples = [
  ['Salário', 'Trabalho', 'income', 5000, '05'], ['Aluguel', 'Moradia', 'fixed', 1500, '08'],
  ['Supermercado', 'Alimentação', 'variable', 580, '10'], ['Internet', 'Moradia', 'fixed', 120, '12'],
  ['Café e almoço', 'Alimentação', 'variable', 85, '15'], ['Reserva mensal', 'Reserva', 'saved', 600, '18'],
  ['Transporte', 'Transporte', 'variable', 180, '20'],
].map(([description, category, type, amount, day], index) => ({ id: String(index + 1), description, category, type, amount, date: `${initialMonth}-${day}` }))

export default function App() {
  const [showWelcome, setShowWelcome] = useState(true)
  const [initialData] = useState(() => {
    try { const result = loadTransactions(storage); return { ...result, planner: loadPlanner(), raw: storage.getItem(STORAGE_KEY) } }
    catch { return { entries: null, planner: { plans: [], goals: [] }, error: 'Não foi possível ler o armazenamento ou planejamento. Os dados existentes foram preservados.' } }
  })
  const [plannerData, setPlannerData] = useState(initialData.planner)
  const [entries, setEntries] = useState(() => initialData.entries ?? [])
  const [backupMessage, setBackupMessage] = useState('')
  const fileInput = useRef(null)
  const monthStrip = useRef(null)
  const [storageError, setStorageError] = useState(initialData.error)
  const [conflict, setConflict] = useState(false)
  const lastStored = useRef(initialData.raw ?? null)
  const storageBlocked = Boolean(initialData.error) || conflict
  useEffect(() => {
    function onStorage(event) {
      if ((event.key === LEDGER_KEY || event.key === STORAGE_KEY || event.key === PLANNER_KEY || event.key === null) && event.storageArea === window.localStorage) setConflict(true)
    }
    window.addEventListener('storage', onStorage)
    return () => window.removeEventListener('storage', onStorage)
  }, [])
  const [month, setMonth] = useState(initialMonth)
  const [form, setForm] = useState(null)
  useEffect(() => {
    const strip = monthStrip.current
    const selected = strip?.querySelector('[aria-current="date"]')
    if (strip && selected) strip.scrollLeft = selected.offsetLeft - strip.offsetLeft - (strip.clientWidth - selected.clientWidth) / 2
  }, [month])
  const today = new Date()
  const currentMonth = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`
  const futureMonth = month > currentMonth
  const latestClosing = lastClosing(plannerData.closings)
  const lockedMonth = isClosed(month, plannerData.closings)
  const selectedClosing = (plannerData.closings || []).find(item => item.month === month)
  const lastDay = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate()
  const maxDate = `${currentMonth}-${String(lastDay).padStart(2, '0')}`
  const currentEntries = entries.filter(entry => entry.date.startsWith(month)).sort((a, b) => b.date.localeCompare(a.date))
  const opening = entries.filter(entry => entry.date.slice(0, 7) < month).reduce((total, entry) => total + (entry.type === 'income' ? 1 : -1) * Math.round(entry.amount * 100), 0)
  const plannedEntries = plannerData.plans.flatMap(plan => (plan.kind === 'salary' ? [salaryForMonth(plan, month)].filter(Boolean) : plan.kind === 'fixed_rule' ? (plan.direction === 'income' ? [fixedForMonth(plan, month)].filter(Boolean) : fixedUntil(plan, month)) : plan.items.filter(item => item.date.slice(0, 7) <= month)).filter(item => !item.paid).map(item => ({ ...item, kind: plan.kind, direction: plan.direction, planId: plan.id, name: plan.name, category: plan.category, count: ['salary','fixed_rule'].includes(plan.kind) ? 1 : plan.items.length })))
  const saved = sumCents(entries.filter(entry => entry.type === 'saved' && entry.date.slice(0, 7) <= month))
  const [year, monthNumber] = month.split('-').map(Number)
  const monthLabel = new Intl.DateTimeFormat('pt-BR', { month: 'long', year: 'numeric' }).format(new Date(year, monthNumber - 1, 1))
  function changeMonth(offset) {
    const date = new Date(year, monthNumber - 1 + offset, 1)
    setMonth(`${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`)
  }
  async function persist(next) {
    const expected = lastStored.current
    return withLedgerLock(() => {
    try {
      if (storage.getItem(STORAGE_KEY) !== expected) {
        setConflict(true)
        return false
      }
      const rawPlanner = storage.getItem(PLANNER_KEY)
      const storedPlanner = rawPlanner === null ? { plans: [], goals: [] } : JSON.parse(rawPlanner)
      if (JSON.stringify(storedPlanner) !== JSON.stringify(plannerData)) { setBackupMessage('O planejamento mudou em outra aba. Atualize a página.'); return false }
      const previous = entries.filter(entry => isClosed(entry.date.slice(0, 7), plannerData.closings))
      const proposed = next.filter(entry => isClosed(entry.date.slice(0, 7), plannerData.closings))
      if (JSON.stringify(previous) !== JSON.stringify(proposed)) { setBackupMessage('Reabra o último fechamento antes de alterar lançamentos desse período.'); return false }
      const error = saveTransactions(storage, next)
      if (error) { setStorageError(error); return false }
      lastStored.current = storage.getItem(STORAGE_KEY)
      setEntries(next)
      setStorageError(null)
      return true
    } catch {
      setStorageError('Não foi possível salvar no navegador. Nenhuma alteração foi aplicada.')
      return false
    }
    }, () => setStorageError('Este navegador não permite gravação segura entre abas. Exporte os dados e use um navegador compatível.'))
  }
  function exportBackup() {
    const blob = new Blob([createDemoBackup(entries, plannerData)], { type: 'application/json' })
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
      const backup = parseDemoBackup(await file.text())
      const imported = backup.entries
      if (!backup.planner && (plannerData.plans.length || plannerData.goals.length || plannerData.closings?.length)) throw new Error('Este backup antigo não inclui o planejamento. Para evitar inconsistências, restaure-o em um ambiente sem compromissos e metas.')
      if (!window.confirm(`Restaurar ${imported.length} lançamento(s)? Isso substituirá os lançamentos${backup.planner ? ' e o planejamento' : ''} atuais neste navegador. Exporte um backup antes, se quiser preservá-los.`)) return
      if (backup.planner) {
        const applied = await withLedgerLock(() => {
        const oldEntries = storage.getItem(STORAGE_KEY)
        if (oldEntries !== lastStored.current) { setConflict(true); return false }
        const storedPlanner = storage.getItem(PLANNER_KEY)
        if (JSON.stringify(storedPlanner === null ? { plans: [], goals: [] } : JSON.parse(storedPlanner)) !== JSON.stringify(plannerData)) throw new Error('O planejamento mudou em outra aba. Atualize a página antes de importar.')
        storage.setBoth(JSON.stringify(imported), JSON.stringify(backup.planner))
        lastStored.current = storage.getItem(STORAGE_KEY)
        setEntries(imported); setPlannerData(backup.planner); setStorageError(null)
        return true
        }, () => setStorageError('Este navegador não permite gravação segura entre abas.'))
        if (!applied) return
      } else if (!await persist(imported)) { setBackupMessage('A importação não foi aplicada; os dados salvos foram mantidos.'); return }
      setBackupMessage(`${imported.length} lançamento(s) restaurado(s) com sucesso${backup.planner ? ', incluindo planejamento e metas' : '; planejamento e metas não foram alterados'}.`)
    } catch (error) { setBackupMessage(`Não foi possível importar: ${error.message}`) }
  }
  async function loadExamples() {
    if (futureMonth || lockedMonth) return
    if (entries.length && !window.confirm('Adicionar lançamentos de exemplo aos dados atuais?')) return
    if (await persist([...entries, ...examples.map(entry => ({ ...entry, id: crypto.randomUUID(), date: `${month}-${entry.date.slice(-2)}` }))])) setBackupMessage('Exemplos adicionados. Você pode editá-los ou excluí-los.')
  }
  async function saveEntry(entry, recurrence) {
    if (isClosed(entry.date.slice(0, 7), plannerData.closings) || (form.mode === 'edit' && isClosed(form.entry.date.slice(0, 7), plannerData.closings))) { setBackupMessage('Este período está fechado. Reabra o fechamento para alterá-lo.'); return }
    if (entry.date.slice(0, 7) > currentMonth || (form.mode === 'edit' && form.entry.date.slice(0, 7) > currentMonth)) { setBackupMessage('Lançamentos de meses futuros ainda não podem ser alterados.'); return }
    if (recurrence && form.mode === 'new') {
      await withLedgerLock(() => {
      try {
        const raw = storage.getItem(PLANNER_KEY)
        const stored = raw === null ? { plans: [], goals: [] } : JSON.parse(raw)
        if (JSON.stringify(stored) !== JSON.stringify(plannerData)) { setBackupMessage('O planejamento mudou em outra aba. Atualize a página.'); return }
        const value = Math.round(entry.amount * 100)
        if (!Number.isSafeInteger(value) || value <= 0) { setBackupMessage('Informe um valor válido.'); return }
        const rule = { id: crypto.randomUUID(), kind: 'fixed_rule', name: entry.description, category: entry.category, direction: entry.type, total: 0, endDate: recurrence.endDate, completedMonths: [], changes: [], overrides: {}, items: [{ id: crypto.randomUUID(), date: entry.date, cents: value, number: 1, paid: false }] }
        const updated = { ...plannerData, plans: [...plannerData.plans, rule] }
        storage.setItem(PLANNER_KEY, JSON.stringify(updated)); setPlannerData(updated); setMonth(entry.date.slice(0, 7)); setForm(null); setBackupMessage('Recorrência criada como previsão. Confirme a movimentação quando ocorrer.')
      } catch { setBackupMessage('Não foi possível salvar a recorrência.') }
      }, () => setStorageError('Este navegador não permite gravação segura entre abas.'))
      return
    }
    const next = form.mode === 'edit' ? entries.map(item => item.id === entry.id ? entry : item) : [...entries, entry]
    if (!await persist(next)) return
    setMonth(entry.date.slice(0, 7))
    setForm(null)
  }
  async function payPlanned(item) {
    if (storageBlocked) { setBackupMessage('Atualize a página antes de registrar o pagamento.'); return false }
    const plan = plannerData.plans.find(value => value.id === item.planId)
    const installment = plan?.kind === 'fixed_rule' ? fixedForMonth(plan, item.date.slice(0, 7)) : plan?.kind === 'salary' ? salaryForMonth(plan, item.date.slice(0, 7)) : plan?.items.find(value => value.id === item.id)
    if ((plan?.kind === 'salary' || (plan?.kind === 'fixed_rule' && plan.direction === 'income')) && item.date.slice(0, 7) > currentMonth) { setBackupMessage('O recebimento só pode ser confirmado quando o mês chegar.'); return false }
    if (!plan || !installment || installment.id !== item.id || installment.paid) { setBackupMessage('Esta parcela já foi paga ou não está disponível.'); return false }
    if (isClosed(currentMonth, plannerData.closings)) { setBackupMessage('O mês atual está fechado; reabra-o antes de registrar o pagamento.'); return false }
    const paymentId = `pagamento-${installment.id}`
    if (entries.some(entry => entry.id === paymentId)) { setBackupMessage('Este pagamento já foi registrado.'); return false }
    const date = new Date()
    const paymentDate = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
    const description = plan.kind !== 'salary' && plan.items.length > 1 ? `${plan.name} (${installment.number}/${plan.items.length})` : plan.name
    const payment = { id: paymentId, description, category: plan.category, type: (plan.kind === 'salary' || (plan.kind === 'fixed_rule' && plan.direction === 'income')) ? 'income' : plan.kind === 'fixed_rule' ? 'fixed' : plan.kind === 'recurring' || plan.kind === 'loan' ? 'fixed' : 'variable', amount: installment.cents / 100, date: paymentDate }
    const nextEntries = [...entries, payment]
    const nextPlanner = { ...plannerData, plans: plannerData.plans.map(value => value.id === plan.id ? (value.kind === 'fixed_rule' ? { ...value, completedMonths: [...(value.completedMonths || []), installment.date.slice(0, 7)] } : value.kind === 'salary' ? { ...value, receivedMonths: [...(value.receivedMonths || []), installment.date.slice(0, 7)] } : { ...value, items: value.items.map(row => row.id === installment.id ? { ...row, paid: true, paymentId, paidDate: paymentDate } : row) }) : value) }
    return withLedgerLock(() => {
    let oldEntries
    try {
      oldEntries = storage.getItem(STORAGE_KEY)
      if (oldEntries !== lastStored.current) { setConflict(true); return false }
      const oldPlanner = storage.getItem(PLANNER_KEY)
      const persistedPlanner = oldPlanner === null ? { plans: [], goals: [] } : JSON.parse(oldPlanner)
      if (JSON.stringify(persistedPlanner) !== JSON.stringify(plannerData)) { setBackupMessage('O planejamento mudou em outra aba. Atualize a página antes de pagar.'); return false }
      storage.setBoth(JSON.stringify(nextEntries), JSON.stringify(nextPlanner))
      lastStored.current = storage.getItem(STORAGE_KEY)
      setEntries(nextEntries)
      setPlannerData(nextPlanner)
      setMonth(paymentDate.slice(0, 7))
      setBackupMessage(`${payment.type === 'income' ? 'Recebimento' : 'Pagamento'} registrado em ${paymentDate.split('-').reverse().join('/')}.`)
      return true
    } catch {
      setStorageError('Não foi possível concluir o pagamento. Confira os lançamentos e o planejamento antes de tentar novamente.')
      return false
    }
    }, () => setStorageError('Este navegador não permite gravação segura entre abas.'))
  }
  async function reversePayment(entry) {
    if (isClosed(entry.date.slice(0, 7), plannerData.closings)) { setBackupMessage('Este pagamento pertence a um período fechado. Reabra o fechamento antes de desfazê-lo.'); return }
    if (storageBlocked || !window.confirm('Desfazer este pagamento ou recebimento? O lançamento será removido e a parcela voltará a ficar pendente.')) return
    await withLedgerLock(() => {
    try {
      const oldEntries = storage.getItem(STORAGE_KEY), rawPlanner = storage.getItem(PLANNER_KEY)
      if (oldEntries !== lastStored.current) { setConflict(true); return }
      const currentPlanner = rawPlanner === null ? { plans: [], goals: [] } : JSON.parse(rawPlanner)
      if (JSON.stringify(currentPlanner) !== JSON.stringify(plannerData)) { setBackupMessage('O planejamento mudou em outra aba. Atualize a página.'); return }
      const updated = undoPayment(entries, plannerData, entry.id)
      storage.setBoth(JSON.stringify(updated.entries), JSON.stringify(updated.planner))
      lastStored.current = storage.getItem(STORAGE_KEY)
      setEntries(updated.entries); setPlannerData(updated.planner)
      setBackupMessage('Pagamento desfeito. A parcela voltou a ficar pendente.')
    } catch (error) { setBackupMessage(error.message || 'Não foi possível desfazer o pagamento.') }
    }, () => setStorageError('Este navegador não permite gravação segura entre abas.'))
  }
  async function changeClosing(reopen = false) {
    if (storageBlocked) return
    const closings = plannerData.closings || []
    const last = lastClosing(closings)
    if (reopen) {
      if (!last || last.month !== month) { setBackupMessage('Apenas o fechamento mais recente pode ser reaberto.'); return }
      if (!window.confirm('Reabrir este mês? O histórico poderá ser alterado novamente.')) return
    } else {
      if (month >= currentMonth) { setBackupMessage('Somente meses anteriores ao mês atual podem ser fechados.'); return }
      if (last && month !== nextMonth(last.month)) { setBackupMessage('Feche o próximo mês em ordem ou reabra o último fechamento.'); return }
      if (!window.confirm(`Fechar ${monthLabel}? Os lançamentos até este mês ficarão protegidos contra alterações. Os compromissos pendentes continuam pendentes.`)) return
    }
    await withLedgerLock(() => {
      try {
        const rawEntries = storage.getItem(STORAGE_KEY), rawPlanner = storage.getItem(PLANNER_KEY)
        if (rawEntries !== lastStored.current || JSON.stringify(rawPlanner === null ? { plans: [], goals: [] } : JSON.parse(rawPlanner)) !== JSON.stringify(plannerData)) { setConflict(true); return }
        const updated = { ...plannerData, closings: reopen ? closings.filter(item => item.month !== month) : [...closings, makeClosing(entries, month)] }
        storage.setBoth(JSON.stringify(entries), JSON.stringify(updated))
        lastStored.current = storage.getItem(STORAGE_KEY)
        setPlannerData(updated); setStorageError(null)
        setBackupMessage(reopen ? 'Mês reaberto. Você pode corrigir os lançamentos novamente.' : 'Mês fechado. O saldo registrado será levado para os meses seguintes.')
      } catch { setStorageError('Não foi possível atualizar o fechamento. Nenhuma alteração foi aplicada.') }
    }, () => setStorageError('Este navegador não permite gravação segura entre abas.'))
  }
  async function deleteEntry(entry) {
    if (isClosed(entry.date.slice(0, 7), plannerData.closings)) { setBackupMessage('Este período está fechado.'); return }
    if (window.confirm(`Excluir o lançamento “${entry.description}”?`)) await persist(entries.filter(item => item.id !== entry.id))
  }
  if (showWelcome) return <Welcome onLocal={() => setShowWelcome(false)} />
  return (
    <div className="layout">
      <Sidebar />
      <main>
        <header><div><div className="eyebrow">SEU DINHEIRO, COM MAIS CLAREZA <span>✳</span></div><h1>Olá, vamos cuidar<br className="mobile-break" /> das suas finanças<span className="dot">.</span></h1><p>Suas finanças, com mais clareza.</p></div><div className="header-actions"><button className="icon-btn" onClick={() => changeMonth(-1)} aria-label="Mês anterior">‹</button><strong>{monthLabel}</strong><button className="icon-btn" onClick={() => changeMonth(1)} aria-label="Próximo mês">›</button><button className="primary" disabled={storageBlocked || futureMonth || lockedMonth} onClick={() => setForm({ mode: 'new' })}>＋ Novo lançamento</button></div></header>
        <div className="notice" role={storageError || conflict ? "alert" : undefined}>{(conflict ? "Os lançamentos foram alterados em outra aba. Exporte esta versão se precisar preservá-la e atualize a página antes de continuar." : storageError) || "✦ Dados salvos apenas neste navegador. Exporte um backup para guardá-los em segurança."}</div>
        <div className="backup-actions" aria-label="Backup e exemplos">
          <button className="text-button" onClick={exportBackup} disabled={Boolean(initialData.error)}>Exportar backup</button>
          <button className="text-button" onClick={() => fileInput.current?.click()} disabled={storageBlocked}>Importar backup</button>
          <button className="text-button" onClick={loadExamples} disabled={storageBlocked || futureMonth || lockedMonth}>Carregar exemplos</button>
          <input ref={fileInput} type="file" accept=".json,application/json" hidden onChange={importBackup} />
        </div>
        {backupMessage && <p className="backup-message" role="status">{backupMessage}</p>}
        <PwaStatus />
        <div className="months-header"><div><span className="overline">ACOMPANHE SUA EVOLUÇÃO</span><h2>Seus meses</h2></div><span className="muted">O saldo acompanha você</span></div>
        <div ref={monthStrip} className="months-strip" aria-label="Selecionar mês">{Array.from({length: 7}, (_, index) => {
          const date = new Date(year, monthNumber - 1 + index - 3, 1)
          const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
          const label = new Intl.DateTimeFormat('pt-BR', {month:'long', year:'numeric'}).format(date)
          return <button key={key} type="button" className={`month-tab ${key === month ? 'selected' : ''}`} aria-current={key === month ? 'date' : undefined} onClick={() => setMonth(key)}>{label}{key > currentMonth ? ' 🔒' : ''}</button>
        })}</div>
        <div className="carry-note"><span aria-hidden="true">↳</span><div><strong>Saldo que veio dos meses anteriores: {formatCents(opening)}</strong><small>Inclui valores positivos ou negativos, depois dos gastos e do dinheiro guardado.</small></div></div>
        {futureMonth && <div className="future-note" role="status">🔒 Este mês ainda não está disponível para lançamentos. Você poderá cadastrar e editar quando ele começar.</div>}
        <section className="closing-panel" aria-label="Fechamento mensal"><div><strong>{selectedClosing ? '✓ Mês fechado' : lockedMonth ? '🔒 Período protegido' : 'Fechamento mensal'}</strong><p>{selectedClosing ? `Saldo de fechamento: ${formatCents(selectedClosing.ending)}. Pendências continuam no planejamento.` : lockedMonth ? 'Este período está protegido pelo fechamento mais recente.' : 'Feche um mês encerrado para registrar seu saldo e proteger o histórico.'}</p></div>{selectedClosing && latestClosing?.month === month ? <button className="text-button" disabled={storageBlocked} onClick={() => changeClosing(true)}>Reabrir mês</button> : !lockedMonth && <button className="text-button" disabled={storageBlocked || month >= currentMonth} onClick={() => changeClosing(false)}>Fechar mês</button>}</section>
        <SummaryCards entries={currentEntries} opening={opening} />
        <div className="content-grid"><Transactions disabled={storageBlocked || futureMonth || lockedMonth} paymentDisabled={storageBlocked} currentMonth={currentMonth} onPay={payPlanned} entries={currentEntries} plannedEntries={plannedEntries} month={month} onUndo={reversePayment} onEdit={entry => setForm({ mode: 'edit', entry })} onDelete={deleteEntry} onAdd={() => setForm({ mode: 'new' })} /><div className="right"><SpendingPanel entries={currentEntries} /><section className="reserve" id="reserva"><div><span className="overline">OLHANDO PARA FRENTE</span><h2>Sua reserva ✳</h2><p>Todo valor guardado é um passo na direção dos seus planos.</p><span className="reserve-label">TOTAL GUARDADO</span><strong>{formatCents(saved)}</strong><small>Acumulado até o mês selecionado</small></div><div className="reserve-art" aria-hidden="true">✳</div></section></div></div>
        <Planner month={month} currentMonth={currentMonth} closedThrough={latestClosing?.month ?? null} entries={entries} opening={opening} data={plannerData} setData={setPlannerData} onPay={payPlanned} />
        <footer>Feito para você cuidar bem do seu dinheiro. <span>✳</span> <span>Dados neste navegador</span></footer>
      </main>
      {form && <TransactionForm key={form.entry?.id || 'new'} initialEntry={form.entry} month={month} maxDate={maxDate} onSave={saveEntry} disabled={storageBlocked} onClose={() => setForm(null)} />}
    </div>
  )
}
