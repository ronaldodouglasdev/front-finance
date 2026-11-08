# Arquitetura — modo local sem conta

Decisão atualizada: o PWA continua local e sem exigir login; está em desenvolvimento uma opção futura de conta por e-mail e senha para sincronização. Os lançamentos ficam no navegador de cada dispositivo; o backup é manual. Não há sincronização automática. A API Python é um experimento local separado e não é necessária para usar o PWA.

As seções abaixo registram possibilidades futuras caso a sincronização entre dispositivos seja solicitada. Não são funcionalidades implementadas ou uma decisão de adicionar contas. A API tem cadastro, login e isolamento experimentais, mas faltam controles necessários para publicação e ela não deve ser exposta na internet.

## Autenticação e isolamento

Usar uma biblioteca ou serviço de autenticação mantido ativamente. A escolha entre contas próprias e login externo depende da preferência do produto. Contas próprias exigem cadastro, recuperação de senha, verificação de e-mail, proteção contra tentativas abusivas e gestão de sessões. Se forem armazenadas senhas, usar hashing adaptativo como Argon2id; nunca texto puro. Não colocar credenciais em arquivos do projeto. Sessões exigem HTTPS e proteção contra CSRF quando aplicável; CORS não substitui autenticação.

A identidade deve ser validada no servidor, não aceita de um identificador fornecido pelo cliente. Cada lançamento no servidor deve ter um proprietário; todas as consultas e alterações devem ser limitadas a esse proprietário. Testes devem confirmar que uma conta não consegue ler, editar ou excluir dados de outra. A API local já aplica este isolamento, que precisa de revisão adicional antes de produção.

## Migração dos dados locais

1. Manter o backup exportável antes de qualquer migração.
2. Apresentar a contagem e permitir que a pessoa escolha importar os lançamentos locais para sua conta.
3. Preservar os dados locais até a confirmação do servidor e permitir repetição sem duplicação.
4. Usar identificadores estáveis. A API atual gera IDs no servidor e precisará mudar antes da migração.
5. Converter valores em reais para centavos inteiros, validando dados antigos e preservando a compatibilidade dos backups.

## Offline e sincronização

Planejar uma fila persistente de alterações, identificadores de operação para repetição segura e versões para detectar conflitos. Manter registros de exclusão até que os dispositivos sincronizem. Apresentar conflitos ao usuário sem sobrescrever silenciosamente dados locais ou remotos. Essas garantias ainda não existem e exigem testes com vários dispositivos e perda de conexão.

## Etapas propostas

1. Escolher contas próprias ou provedor externo e o ambiente de hospedagem.
2. Implementar autenticação e propriedade dos dados na API; testar isolamento entre usuários.
3. Definir sincronização, migração e resolução de conflitos.
4. Integrar o React gradualmente, mantendo modo local e backups.
5. Testar em dois dispositivos e revisar segurança antes de publicar uma API para dados reais.
