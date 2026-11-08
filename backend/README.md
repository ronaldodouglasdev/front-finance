# AGL Finance — API local

API experimental FastAPI com SQLite, separada do modo local sem conta do PWA. Apenas para desenvolvimento local: há cadastro e login experimentais e isolamento por conta, mas ainda faltam recuperação e verificação de e-mail, limitação de tentativas, sincronização e integração com o front-end. Não exponha na internet e use dados fictícios.

## Iniciar no VS Code

Abra o terminal na pasta `backend`, crie e ative um ambiente virtual Python e instale as dependências de `requirements.txt`. Depois execute:

```bash
python -m uvicorn main:app --host 127.0.0.1 --port 8000
```

Abra `http://127.0.0.1:8000/docs` para explorar a API. O banco `agl_finance.sqlite3` é criado na primeira inicialização e é ignorado pelo Git.

Para executar os testes: `python -m pytest -q`. Eles usam um banco temporário próprio.

Autenticação experimental: `POST /api/auth/register`, `POST /api/auth/login`, `POST /api/auth/logout`; login retorna um token de sessão válido por 12 horas. As rotas de lançamentos exigem o token Bearer.

Rotas: `GET /api/transactions`, `POST /api/transactions`, `PUT /api/transactions/{id}` e `DELETE /api/transactions/{id}`. Valores são inteiros positivos em centavos. O servidor gera os IDs; a migração de IDs existentes e a sincronização offline ainda precisam ser projetadas.

O planejamento de autenticação, isolamento e sincronização está em `ARQUITETURA.md`. Esse documento descreve trabalho futuro; a API atual continua restrita ao desenvolvimento local.

## Caixa de e-mail simulada

A caixa é desativada por padrão. Para testes locais apenas, inicie com `AGL_DEV_MAIL=1 python -m uvicorn main:app --host 127.0.0.1 --port 8000` e abra o front-end em modo de desenvolvimento. Na tela de conta, abra a caixa de teste, informe o e-mail da conta fictícia e gere uma mensagem. Nada é enviado de verdade. As mensagens ficam na memória e desaparecem ao reiniciar. Nunca ative essa opção em servidor público: os códigos dão acesso às operações de conta. Verificação ainda não é exigida no login e não há envio real.
