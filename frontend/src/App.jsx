import Sidebar from './components/Sidebar'
import SummaryCards from './components/SummaryCards'
import Transactions from './components/Transactions'
import SpendingPanel from './components/SpendingPanel'
import './App.css'

const entries = [
  { id: 1, description: 'Salário', category: 'Trabalho', type: 'income', amount: 5000, day: '05' },
  { id: 2, description: 'Aluguel', category: 'Moradia', type: 'fixed', amount: 1500, day: '08' },
  { id: 3, description: 'Supermercado', category: 'Alimentação', type: 'variable', amount: 580, day: '10' },
  { id: 4, description: 'Internet', category: 'Moradia', type: 'fixed', amount: 120, day: '12' },
  { id: 5, description: 'Café e almoço', category: 'Alimentação', type: 'variable', amount: 85, day: '15' },
  { id: 6, description: 'Reserva mensal', category: 'Reserva', type: 'saved', amount: 600, day: '18' },
  { id: 7, description: 'Transporte', category: 'Transporte', type: 'variable', amount: 180, day: '20' },
]
const format = value => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value)

const month = new Intl.DateTimeFormat('pt-BR', { month: 'long', year: 'numeric' }).format(new Date())

export default function App() {
  const saved = entries.filter(entry => entry.type === 'saved').reduce((sum, entry) => sum + entry.amount, 0)
  return (
    <div className="layout">
      <Sidebar />
      <main>
        <header><div><div className="eyebrow">SEU DINHEIRO, COM MAIS CLAREZA <span>✳</span></div><h1>Olá, vamos cuidar<br className="mobile-break" /> das suas finanças<span className="dot">.</span></h1><p>Uma visão tranquila do que importa para você.</p></div><div className="header-actions"><strong>{month}</strong></div></header>
        <div className="notice">✦ &nbsp; Esta é a interface em React com dados de exemplo. Os lançamentos serão implementados na próxima etapa.</div>
        <SummaryCards entries={entries} />
        <div className="content-grid"><Transactions entries={entries} /><div className="right"><SpendingPanel entries={entries} /><section className="reserve" id="reserva"><div><span className="overline">OLHANDO PARA FRENTE</span><h2>Sua reserva ✳</h2><p>Todo valor guardado é um passo na direção dos seus planos.</p><span className="reserve-label">TOTAL DE EXEMPLO</span><strong>{format(saved)}</strong><small>Valor ilustrativo</small></div><div className="reserve-art" aria-hidden="true">✳</div></section></div></div>
        <footer>Feito para você cuidar bem do seu dinheiro. <span>✳</span> <span>Prévia da interface</span></footer>
      </main>
    </div>
  )
}
