# Arquitetura inicial

O navegador executa React e consulta `/api/demo/schedule`. Durante o desenvolvimento, o proxy do Vite encaminha `/api` e `/actuator` ao Spring Boot na porta 8080. O Spring consulta o PostgreSQL por Spring Data JPA. Flyway aplica migrações e Hibernate valida o esquema, sem criá-lo automaticamente.

## Decisões

- Monorepositório: interface, API e documentação evoluem no mesmo histórico Git.
- Java 21 e Maven Wrapper: ambiente explícito, sem Maven global.
- React Router para navegação e TanStack Query para carregamento, cache e erro da API.
- PostgreSQL local em 5433 para não depender de Docker e separar o cluster deste projeto do serviço instalado em 5432.
- SQL versionado desde a primeira entrega. H2 apenas para testes rápidos.
- Demonstração de leitura antes de autenticação: nenhum endpoint recebe dados pessoais. Servidores limitados a loopback.
- Datas do navegador na demonstração; quando houver perfil, o fuso configurado pelo usuário será a referência. O plano fictício repete as mesmas refeições todos os dias.
- Marcação em memória por data: não representa histórico persistente nem funcionalidade concluída do MVP.

## Limites deliberados

`demo_meals` é uma tabela de exemplo, não o modelo definitivo do domínio. Seus itens são textos para apresentação; não são usados para cálculo. O modelo normalizado de usuários, alimentos, planos, dias e itens será implementado em migrações posteriores. Não calcular compras a partir desses textos.

Antes de CRUD pessoal: Spring Security, sessão com cookie HttpOnly, CSRF, validação e autorização de propriedade. A decisão para implementação está em ADR-001, abaixo. A API atual não está pronta para exposição pública.

## Evolução planejada em 2026-10-16

A decisão de acesso está em [ADR-001](decisions/ADR-001-auth-and-modules.md). O back-end evoluirá como monólito modular, sem IA nos cálculos, conforme [modelo de domínio](DOMAIN_MODEL.md). O banco atual ainda não contém essas entidades.

O fluxo planejado é dieta -> projeção de demanda com estoque -> lista -> recebimento real -> lote/movimento -> preparo/consumo. Projeções nunca alteram saldos. Idempotência, transações e histórico de movimentos evitam duplicidade. Detalhes e cenários de teste estão em [INVENTORY_RULES.md](INVENTORY_RULES.md); a ordem de implementação está em [ROADMAP.md](ROADMAP.md).

## E02 implementada

Migração V2 cria users. AuthService valida fuso e limite em bytes da senha, normaliza e-mail e retorna somente DTOs de perfil. Spring Security usa BCrypt, sessão em memória e proteção CSRF. O login JSON autentica pelo AuthenticationManager, executa a estratégia de renovação de sessão/CSRF e salva explicitamente o SecurityContext. O logout usa o filtro do Spring Security.

A interface usa React Hook Form/Zod e cliente HTTP compartilhado com obtenção de CSRF antes de mutações. Erros de conexão não são tratados como ausência de sessão. Dados da conta são removidos do cache ao sair ou receber 401 em alteração de perfil. Cadastro não inicia sessão automaticamente. /api/me sempre deriva a identidade da sessão; não oferece consulta por ID fornecido pelo cliente. Revalidar autorização ao criar novos módulos.

## E03 implementada

Módulo foods usa consultas por id + user_id, sem aceitar proprietário do navegador. Migração V3 cria a chave estrangeira de usuário e uma chave única (user_id, id) para futuros vínculos de domínio. Unidade preferida pode mudar apenas dentro da mesma dimensão. Arquivamento mantém o registro; não há exclusão definitiva.

Versão explícita no DTO + @Version no JPA evitam sobrescrita de alterações concorrentes. A conversão de unidades é domínio Java puro com BigDecimal, sem assumir rendimento cru/cozido. A API devolve quantidades como strings. Referência de quantidade é separada do alimento; futuros meal_items/lotes guardarão seu próprio basis.

Frontend separa tipos, página de catálogo, formulário e conversor. A consulta é vinculada ao ID da conta no cache. O módulo usa o mesmo hook de sessão da área pessoal, limpa cache em 401 e distingue erro de conexão de catálogo vazio. Detalhes de contrato em FOODS_API.md.
