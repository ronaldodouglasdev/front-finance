# Proposta de integração com o backend Python

Este documento é um rascunho para discussão. A API e a sincronização ainda não foram implementadas. Atualmente o aplicativo funciona com `localStorage` e não envia dados para servidores.

## Lançamento

Proposta de representação na API:

```json
{
  "id": "d3785832-318b-4b46-afca-509025857bbe",
  "description": "Supermercado",
  "category": "Alimentação",
  "type": "variable",
  "amount_cents": 5825,
  "date": "2026-11-02"
}
```

- `id`: identificador único; o front-end atual cria UUIDs para novos registros.
- `description` e `category`: textos obrigatórios.
- `type`: `income` (entrada), `fixed` (gasto fixo), `variable` (gasto variável) ou `saved` (transferência para reserva).
- `amount_cents`: valor inteiro positivo em centavos. No exemplo, 5825 significa R$ 58,25.
- `date`: data do lançamento no formato `AAAA-MM-DD`, sem horário.

O formato local e os backups atuais usam `amount` em reais, não `amount_cents`. A futura integração precisará de conversão validada em ambas as direções, sem alterar nem descartar os backups existentes. Também será necessário decidir como tratar valores locais antigos com mais de duas casas decimais.

## Operações candidatas

| Método | Rota proposta | Objetivo |
| --- | --- | --- |
| GET | `/api/transactions` | Listar lançamentos do usuário autenticado. |
| POST | `/api/transactions` | Criar um lançamento. |
| PUT | `/api/transactions/{id}` | Atualizar um lançamento existente. |
| DELETE | `/api/transactions/{id}` | Excluir um lançamento. |

Essas rotas são propostas, não contratos definitivos. Autenticação, paginação, erros, limites e regras de autorização precisam ser definidos junto com o backend. Em particular, um usuário só deve poder acessar seus próprios lançamentos.

## Offline e sincronização

A versão atual salva no navegador e funciona sem backend. Sincronização entre dispositivos exige uma estratégia explícita para fila de alterações, identificação de usuário, repetição segura, exclusões e conflitos quando duas versões forem modificadas offline. Não devemos presumir que salvar dados no servidor resolva isso automaticamente. Antes de migrar dados locais, será necessário oferecer backup e uma forma de confirmação e recuperação.

## Antes de integrar

1. Escolher o framework Python e o banco de dados.
2. Definir autenticação e isolamento dos dados de cada usuário.
3. Confirmar o contrato da API e as regras monetárias.
4. Definir sincronização e conflitos offline.
5. Implementar e testar o backend; só então conectar o front-end, preservando os dados existentes.
