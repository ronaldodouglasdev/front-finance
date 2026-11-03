import { useEffect, useRef, useState } from 'react'
import { registerSW } from 'virtual:pwa-register'

export default function PwaStatus() {
  const [updateReady, setUpdateReady] = useState(false)
  const [offlineReady, setOfflineReady] = useState(false)
  const updater = useRef(null)
  const [installPrompt, setInstallPrompt] = useState(null)
  useEffect(() => {
    const update = registerSW({ onNeedRefresh: () => setUpdateReady(true), onOfflineReady: () => setOfflineReady(true) })
    updater.current = update
    function onInstall(event) { event.preventDefault(); setInstallPrompt(event) }
    function onInstalled() { setInstallPrompt(null) }
    window.addEventListener('beforeinstallprompt', onInstall)
    window.addEventListener('appinstalled', onInstalled)
    return () => { window.removeEventListener('beforeinstallprompt', onInstall); window.removeEventListener('appinstalled', onInstalled) }
  }, [])
  async function install() { if (installPrompt) { await installPrompt.prompt(); setInstallPrompt(null) } }
  if (!installPrompt && !updateReady && !offlineReady) return null
  return <div className="pwa-status" role="status">
    {updateReady ? <><span>Uma nova versão está disponível. Salve qualquer formulário aberto antes de atualizar.</span><button className="text-button" onClick={() => updater.current?.(true)}>Atualizar aplicativo</button></> : offlineReady ? <><span>Aplicativo pronto para abrir sem conexão neste dispositivo.</span><button className="text-button" onClick={() => setOfflineReady(false)}>Entendi</button></> : null}
    {installPrompt && <button className="text-button" onClick={install}>Instalar aplicativo</button>}
  </div>
}
