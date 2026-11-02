# Meu Fluxo

Protótipo PWA de controle financeiro. Os lançamentos são salvos exclusivamente no localStorage deste navegador e iniciam com dados de exemplo. Exclua os exemplos antes de inserir valores reais. O saldo é entradas menos despesas e valores guardados; a reserva acumula os lançamentos de tipo guardado até o mês selecionado.

Para desenvolver, sirva a pasta `dist` via localhost, por exemplo `python3 -m http.server 8000 --directory dist`. O service worker requer localhost ou HTTPS. Em produção, substituir a leitura e escrita em localStorage em app.js por uma camada de API para o backend Python; não há autenticação, sincronização nem backup neste protótipo.
