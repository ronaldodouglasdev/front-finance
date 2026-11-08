import { useEffect, useState } from 'react'

export default function DevMailbox({ initialEmail, autoOpen, onReset }) {
  const [open, setOpen] = useState(autoOpen)
  const [email, setEmail] = useState(initialEmail)
  const [messages, setMessages] = useState([])
  const [message, setMessage] = useState('')
  useEffect(() => { if (autoOpen) fetch('/api/dev/mail').then(response => { if (!response.ok) throw new Error('Caixa indisponível'); return response.json() }).then(setMessages).catch(() => setMessage('Não foi possível abrir a caixa de teste.')) }, [autoOpen])
  async function request(path, options) {
    const response = await fetch(`/api/dev/mail${path}`, options)
    if (!response.ok) throw new Error('Não foi possível concluir. Confira se a caixa de teste foi ativada no backend.')
    return response.json()
  }
  async function refresh() {
    try { setMessages(await request('')); setMessage('') }
    catch (error) { setMessage(error.message) }
  }
  async function generate(purpose) {
    if (!email.trim()) { setMessage('Informe o e-mail da conta de teste.'); return }
    try {
      const data = await request(`/request?purpose=${purpose}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email }) })
      setMessages(await request('')); setMessage(data.message)
    } catch (error) { setMessage(error.message) }
  }
  async function verify(token) {
    try { const data = await request('/verify', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ token }) }); setMessage(data.message) }
    catch (error) { setMessage(error.message) }
  }
  return <div className="dev-mail"><button type="button" className="auth-link" onClick={() => { setOpen(!open); if (!open) refresh() }}>{open ? 'Fechar' : 'Abrir'} caixa de e-mail de teste</button>
    {open && <div><p>Simulação local. Nenhum e-mail real é enviado; use apenas contas fictícias.</p><label>E-mail da conta de teste<input type="email" value={email} onChange={event => setEmail(event.target.value)} placeholder="teste@exemplo.com" /></label><div className="dev-mail-actions"><button type="button" onClick={() => generate('verify')}>Gerar verificação</button><button type="button" onClick={() => generate('reset')}>Gerar recuperação</button><button type="button" onClick={refresh}>Atualizar caixa</button></div>
      {message && <p role="status">{message}</p>}
      {messages.length === 0 ? <p>Nenhuma mensagem de teste.</p> : <ul>{messages.map(item => <li key={item.token}><span>{item.purpose === 'verify' ? 'Verificação' : 'Recuperação'} · {item.email}</span> <button type="button" onClick={() => item.purpose === 'verify' ? verify(item.token) : onReset(item.token)}>{item.purpose === 'verify' ? 'Verificar e-mail' : 'Redefinir senha'}</button></li>)}</ul>}

    </div>}
  </div>
}
