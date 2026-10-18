# Arquitetura — Dieta Fácil

Monorepositório com React/TypeScript/Vite na interface, Spring Boot 4/Java 21 na API e PostgreSQL 17. O domínio é um monólito dividido por funcionalidade; não há microserviços nem IA nos cálculos.

## Interface

React Router separa a demonstração pública das rotas pessoais em /conta. TanStack Query gerencia consultas/cache por conta; login/logout limpam o cache e respostas 401 de recursos protegidos encerram a área pessoal. Formulários e ações mostram carregamento, erro e confirmação.

A demonstração pública antiga usa dados fixos de leitura e marcação em memória. O painel pessoal, agenda, estoque e compras consultam dados persistidos e não usam essa marcação.

## Persistência e transações

Flyway versiona o esquema desde a V1. Usuários e alimentos usam JPA. Planos, estoque e compras usam JdbcTemplate para deixar explícitas as consultas e movimentações do domínio, compartilhando DataSource e transações Spring. A decisão está em [ADR-002](decisions/ADR-002-plan-and-stock.md).

Escritas do domínio bloqueiam a linha da conta antes de conferir versões/chaves e alterar lotes. Esse bloqueio serializa operações domésticas da mesma conta e preserva paralelismo entre contas. Quantidades usam NUMERIC(19,6), BigDecimal e unidades canônicas; movimentos registram deltas imutáveis. Estornos criam operações compensatórias.

A chave lógica de ocorrência usa usuário, refeição lógica e data, sem revisão. Ocorrências puladas/consumidas guardam snapshot, preservando o histórico ao editar a dieta.

Compras projetam ocorrências pendentes por data e alocam saldo compatível por validade. Gerar lista não reserva nem movimenta saldo. Listas guardam snapshot, ajustes, recebimentos e impressão digital das fontes para indicar desatualização.

## Acesso

Sessão no servidor, cookie HttpOnly/SameSite e CSRF. O perfil prod exige cookie Secure. IDs são consultados com o proprietário da sessão. Veja [ADR-001](decisions/ADR-001-auth-and-modules.md).

Sessões em memória são perdidas ao reiniciar. Recuperação, confirmação de e-mail e exclusão estão implementadas; versão de credencial invalida sessões após redefinição. Tokens têm hash/validade/uso único, e-mails pendentes têm cifragem AES-GCM e tentativas. Há limite básico por IP/rota; proteção distribuída e revisão operacional completa continuam futuras.

## Execução e qualidade

Servidores locais em loopback; PostgreSQL exclusivo em 5433. Credenciais/dados/capturas temporárias em .local/, fora do Git. A carga de cenário fictício é explícita, restrita a conta vazia e indisponível no perfil prod.

Testes Java cobrem HTTP real e domínio em H2/PostgreSQL; testes de interface usam respostas simuladas; Playwright percorre a aplicação real em desktop e viewport móvel. A CI repete as camadas com PostgreSQL e Chromium. Não houve validação em aparelho físico nem implantação pública nesta entrega.


## Pacote de publicação

Docker compila React e o empacota como recursos estáticos do Spring Boot, com fallback para as rotas conhecidas da SPA. Interface e API compartilham a origem e a sessão. Container usa usuário sem privilégios e limite de memória testado na CI. O Blueprint Free do Render recebe PostgreSQL externo e credenciais de e-mail por segredo; ativação aguarda as contas do proprietário. Java e frontend não contêm chaves de provedor.

## Substituições e painel diário (V10)

O editor de revisões fica separado dos cartões de uso diário. SubstitutionService bloqueia a conta nas escritas, valida fingerprint da ocorrência e versão da regra e registra requestId para repetição segura. Regras vinculam refeição lógica, alimento/estado e porção original a alternativas explícitas. Alterar a porção desativa a permissão efetiva até revisão.

Exceções por dia ficam em meal_overrides e são mescladas à dieta vigente antes dos snapshots consumidos/pulados. A projeção usa essas ocorrências e inclui as exceções no hash de origem. Troca recorrente salva revisão; revisões futuras previamente agendadas mantêm prioridade. Desfazer verifica estado atual/versão e não movimenta estoque; estorno de consumo mantém a exceção de refeição.

Não há comparação automática de calorias/proteína nem equivalência entre alimentos. Saldos exibidos são registros por alimento/estado, sem reserva e sem garantir conservação.

## Modelo profissional e recursos (V11)

CLIENT consulta seu plano e resultados; NUTRITIONIST opera sobre clientes com vínculo aceito e ativo. O profissional não assume a sessão do cliente: endpoints com clientId verificam a relação e executam os serviços existentes sobre o proprietário correto. Escritas e revogação bloqueiam a mesma conta do cliente. Projeções de estoque não são expostas ao profissional por esses endpoints.

Permissão de plano e ativação efetiva do estoque são estados separados. O filtro HTTP bloqueia recursos desativados e edições do cliente. Escritas de estoque/compras verificam novamente a ativação dentro da transação, sob o bloqueio da conta. Migração preserva saldos e acesso dos usuários antigos; novos usuários começam no Básico.

Check-ins persistem o modo ONLY/INVENTORY. ONLY grava snapshot de refeição sem qualquer movimento; INVENTORY usa o serviço existente de consumo. O estorno respeita o modo original. Ativação não reconcilia ou baixa refeições antigas e exige conferência explícita dos saldos.

Avaliações pertencem ao cliente, com autor e versão; um registro por mês. Revogar acesso profissional preserva os dados. Remover profissional anula a referência do autor e preserva o nome; remover cliente elimina suas avaliações. Não há auditoria clínica completa ou verificação de registro profissional nesta versão de validação.
