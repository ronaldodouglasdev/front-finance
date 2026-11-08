# AGL Finance — front-end React

Base inicial do aplicativo AGL Finance, feita com React e Vite. A interface permite adicionar, editar e excluir lançamentos e navegar entre meses. Os lançamentos são salvos no localStorage do navegador após cada alteração. A primeira abertura começa com uma lista vazia; exemplos podem ser adicionados pelo botão correspondente. Exporte um backup JSON para guardá-lo em local seguro e importe-o para substituir os dados deste navegador. Os dados são locais a esse navegador e endereço, e não são sincronizados ou protegidos contra a limpeza dos dados do navegador. O PWA pode ser instalado e funciona offline após a primeira visita e o carregamento completo. O modo de uso escolhido é local e sem conta. A API Python é experimental e separada; não há integração ou sincronização automática.

## Executar

No terminal aberto nesta pasta:

```bash
npm install
npm run dev
```

Abra o endereço local mostrado pelo Vite. Para testar uma alteração, edite `src/App.jsx` e salve o arquivo. Para verificar uma versão de produção, execute `npm run build`.

O protótipo original permanece na pasta `dist` da raiz do projeto, separada desta pasta `frontend`.

## Testar o PWA

O service worker é gerado somente na versão de produção. Execute `npm run build` e depois `npm run preview`; abra o endereço informado e aguarde o aviso de que o aplicativo está pronto para uso offline. Em outro dispositivo é necessário publicar em HTTPS; localhost se refere ao próprio dispositivo. A opção de instalação depende do navegador.

## Testes automatizados

Execute `npm test` nesta pasta para verificar cálculos, armazenamento e backups. Para verificar a compilação e o código, execute `npm run build` e `npm run lint`.

## Possível integração futura

A proposta inicial para a API e as decisões ainda necessárias estão em `docs/api-proposta.md`. Nenhuma conexão com backend foi ativada.
