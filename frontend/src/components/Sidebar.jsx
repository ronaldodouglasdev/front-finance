const links = [
  ['◫', 'Visão geral', '#inicio'],
  ['⇄', 'Movimentações', '#movimentos'],
  ['◉', 'Categorias', '#categorias'],
  ['◇', 'Minha reserva', '#reserva'],
]

export default function Sidebar() {
  return (
    <aside>
      <a className="brand" href="#inicio"><span>✳</span><b>meu fluxo</b></a>
      <div className="side-label">SEU ESPAÇO</div>
      <nav aria-label="Navegação principal">
        {links.map(([icon, label, href], index) => (
          <a className={index === 0 ? 'active' : ''} href={href} key={href}>
            <span aria-hidden="true">{icon}</span> &nbsp; {label}
          </a>
        ))}
      </nav>
      <div className="side-bottom"><div className="small-icon">✳</div><strong>Um passo de cada vez.</strong><p>Pequenas escolhas constroem grandes planos.</p></div>
      <div className="profile"><span>MF</span><div><b>Meu espaço</b><small>Finanças pessoais</small></div></div>
    </aside>
  )
}
