import { useState } from 'react'
import './Welcome.css'
import DevMailbox from './DevMailbox'

const screens = {
  login: { title: 'Bem-vindo de volta', text: 'Entre na sua conta para acompanhar suas finanças.', action: 'Entrar' },
  register: { title: 'Crie sua conta', text: 'Um novo espaço para cuidar dos seus planos.', action: 'Criar conta' },
  recover: { title: 'Recuperar senha', text: 'Informe seu e-mail para gerar instruções na caixa de teste local.', action: 'Enviar instruções' },
  verify: { title: 'Verifique seu e-mail', text: 'Informe o e-mail da conta para gerar uma mensagem de verificação na caixa de teste.', action: 'Reenviar e-mail' },
  reset: { title: 'Criar nova senha', text: 'Escolha uma nova senha para acessar sua conta.', action: 'Salvar nova senha' },
}

export default function Welcome({ onLocal }) {
  const [screen, setScreen] = useState('welcome')
  const [visible, setVisible] = useState(false)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmation, setConfirmation] = useState('')
  const [message, setMessage] = useState('')
  const [busy, setBusy] = useState(false)
  const [sessionToken, setSessionToken] = useState(null)
  const [resetToken, setResetToken] = useState(null)
  const [mailboxKey, setMailboxKey] = useState(0)
  const enabled = import.meta.env.DEV && (['login', 'register', 'recover', 'verify'].includes(screen) || (screen === 'reset' && resetToken))
  async function submit(event) {
    event.preventDefault()
    if (!enabled || busy) return
    if (['register', 'reset'].includes(screen) && password !== confirmation) { setMessage('As senhas não coincidem.'); return }
    setBusy(true); setMessage('')
    try {
      const mailRequest = screen === 'recover' || screen === 'verify'
      const url = mailRequest ? `/api/dev/mail/request?purpose=${screen === 'recover' ? 'reset' : 'verify'}` : screen === 'reset' ? '/api/dev/mail/reset' : `/api/auth/${screen}`
      const body = mailRequest ? { email } : screen === 'reset' ? { token: resetToken, password } : { email, password }
      const response = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
      if (!response.ok) {
        setMessage(response.status === 409 ? 'Não foi possível criar a conta com este e-mail.' : response.status === 401 ? 'E-mail ou senha inválidos.' : 'Não foi possível concluir. Confira os dados e tente novamente.')
        return
      }
      if (mailRequest) { setMessage('Se a conta existir, a mensagem estará na caixa de teste abaixo.'); setMailboxKey(value => value + 1) }
      else if (screen === 'reset') { setPassword(''); setConfirmation(''); setResetToken(null); setScreen('login'); setMessage('Senha alterada no teste local. Entre com a nova senha.') }
      else if (screen === 'register') { setPassword(''); setConfirmation(''); setScreen('login'); setMessage('Conta criada neste computador. Faça login para testar.') }
      else { const result = await response.json(); setPassword(''); setSessionToken(result.access_token); setScreen('signed-in') }
    } catch { setMessage('Não foi possível conectar à API local. Confira se o backend está em execução.') }
    finally { setBusy(false) }
  }
  async function logout() {
    try { await fetch('/api/auth/logout', { method: 'POST', headers: { Authorization: `Bearer ${sessionToken}` } }) }
    catch { setMessage('Não foi possível encerrar a sessão no servidor; ela expirará automaticamente.') }
    setSessionToken(null); setScreen('login')
  }
  const info = screens[screen]
  return <main className="welcome-page">
    <div className="welcome-shell">
      <div className="welcome-brand"><span aria-hidden="true">✳</span><strong>AGL Finance</strong></div>
      {screen === 'welcome' ? <section className="welcome-card" aria-labelledby="welcome-title">
        <span className="welcome-symbol" aria-hidden="true">✳</span>
        <p className="welcome-overline">UM ESPAÇO PARA SEUS PLANOS</p>
        <h1 id="welcome-title">Suas finanças,<br />do seu jeito<span>.</span></h1>
        <p className="welcome-description">Um lugar tranquilo para acompanhar seu dinheiro e dar o próximo passo com clareza.</p>
        <button className="welcome-primary" onClick={() => setScreen('login')}>Entrar ou criar uma conta <span aria-hidden="true">→</span></button>
        <button className="welcome-secondary" onClick={onLocal}>Continuar somente neste aparelho</button>
        <div className="welcome-note"><span aria-hidden="true">◇</span><p><strong>Seu espaço, sua escolha.</strong><br />No modo local, seus dados ficam neste navegador. Faça backups para guardá-los.</p></div>
      </section> : screen === 'signed-in' ? <section className="welcome-card auth-card"><p className="welcome-overline">TESTE LOCAL</p><h1>Login realizado<span>.</span></h1><p className="welcome-description">A conta foi autenticada na API deste computador. Os lançamentos do modo local ainda não estão conectados à conta e não são sincronizados.</p><button className="welcome-primary" onClick={logout}>Sair da conta</button><button className="welcome-secondary" onClick={async () => { await logout(); onLocal() }}>Sair e continuar no modo local</button></section> : <section className="welcome-card auth-card" aria-labelledby="auth-title">
        <button className="welcome-back" onClick={() => setScreen('welcome')}>← Voltar</button>
        <p className="welcome-overline">SUA CONTA</p>
        <h1 id="auth-title">{info.title}<span>.</span></h1>
        <p className="welcome-description">{info.text}</p>
        <div className="auth-notice" role="status"><strong>{enabled ? "Teste local de conta" : "Prévia do layout"}</strong><br />{enabled ? "Fluxo de teste local: as mensagens aparecem na caixa simulada, sem envio real. Não há sincronização." : "Esta função ainda não está disponível. Para usar o app agora, escolha o modo local."}</div>
        <form onSubmit={submit}>
          {screen !== 'reset' && <label>E-mail<input type="email" autoComplete="email" placeholder="voce@exemplo.com" value={email} onChange={event => setEmail(event.target.value)} required disabled={!enabled} /></label>}
          {['login', 'register', 'reset'].includes(screen) && <label>{screen === 'reset' ? 'Nova senha' : 'Senha'}<span className="password-field"><input type={visible ? 'text' : 'password'} autoComplete={screen === 'login' ? 'current-password' : 'new-password'} placeholder="Sua senha" value={password} onChange={event => setPassword(event.target.value)} minLength={12} maxLength={256} required disabled={!enabled} /><button type="button" disabled={!enabled} onClick={() => setVisible(!visible)} aria-label={visible ? "Ocultar senha" : "Mostrar senha"}>{visible ? 'Ocultar' : 'Mostrar'}</button></span></label>}
          {['register', 'reset'].includes(screen) && <label>Confirmar senha<input type="password" autoComplete="new-password" placeholder="Repita sua senha" value={confirmation} onChange={event => setConfirmation(event.target.value)} minLength={12} maxLength={256} required disabled={!enabled} /></label>}
          {screen === 'login' && <div className="auth-right"><button type="button" className="auth-link" onClick={() => setScreen('recover')}>Esqueceu sua senha?</button></div>}
          {message && <p className="form-error" role="alert">{message}</p>}<button className="welcome-primary" type="submit" disabled={!enabled || busy}>{busy ? "Aguarde..." : info.action}</button>
        </form>
        {screen === 'login' && <p className="auth-switch">Ainda não tem conta? <button className="auth-link" onClick={() => setScreen('register')}>Criar conta</button></p>}
        {screen === 'register' && <p className="auth-switch">Já tem uma conta? <button className="auth-link" onClick={() => setScreen('login')}>Entrar</button></p>}
        {screen === 'recover' && <p className="auth-switch"><button className="auth-link" onClick={() => setScreen('login')}>Voltar para o login</button></p>}
        {screen === 'verify' && <p className="auth-switch"><button className="auth-link" onClick={() => setScreen('login')}>Voltar para o login</button></p>}
        {screen === 'reset' && <p className="auth-switch"><button className="auth-link" onClick={() => setScreen('login')}>Voltar para o login</button></p>}
        <div className="auth-preview-links"><span>Prévia de telas:</span> <button onClick={() => setScreen('verify')}>Verificação de e-mail</button> · <button onClick={() => setScreen('reset')}>Nova senha</button></div>
        {import.meta.env.DEV && <DevMailbox key={mailboxKey} initialEmail={email} autoOpen={mailboxKey > 0} onReset={token => { setResetToken(token); setPassword(''); setConfirmation(''); setMessage(''); setScreen('reset') }} />}
        <button className="local-link" onClick={onLocal}>Continuar somente neste aparelho</button>
      </section>}
      <footer className="welcome-footer">Um passo de cada vez. <span>✳</span></footer>
    </div>
  </main>
}
