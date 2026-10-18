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

Sessões em memória são perdidas ao reiniciar; recuperação de senha, exclusão de conta, mitigação de abuso e revisão completa de produção não fazem parte da demonstração local.

## Execução e qualidade

Servidores locais em loopback; PostgreSQL exclusivo em 5433. Credenciais/dados/capturas temporárias em .local/, fora do Git. A carga de cenário fictício é explícita, restrita a conta vazia e indisponível no perfil prod.

Testes Java cobrem HTTP real e domínio em H2/PostgreSQL; testes de interface usam respostas simuladas; Playwright percorre a aplicação real em desktop e viewport móvel. A CI repete as camadas com PostgreSQL e Chromium. Não houve validação em aparelho físico nem implantação pública nesta entrega.
