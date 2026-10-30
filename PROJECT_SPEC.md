# Dieta Fácil — Documento mestre do projeto

> **Direção vigente — 29/10/2026:** o escopo evoluiu para acompanhamento nutricionista–cliente. O plano de implementação atual está em [docs/EVOLUCAO_PRODUTO.md](docs/EVOLUCAO_PRODUTO.md), complementado por [ADR-003](docs/decisions/ADR-003-acompanhamento-e-ia.md), nutrientes, IA, direção visual e feedback. A visão doméstica e os marcos abaixo permanecem como histórico; estoque/compras/preparo são extras opcionais. Recursos da expansão estão planejados, não implementados.

> **Objetivo deste arquivo:** servir como contexto inicial para um projeto no ChatGPT e como especificação viva para desenvolver o Dieta Fácil. Ao iniciar uma nova conversa, anexe este arquivo e peça para a IA seguir as instruções da seção **Como a IA deve colaborar**.

## 1. Visão do produto

O **Dieta Fácil** é uma aplicação de planejamento alimentar que conecta uma dieta já definida ao estoque doméstico, à previsão de consumo, às compras e ao preparo. O usuário vê o que precisa, o que tem registrado e o que pode faltar até a próxima compra.

**Revisão de escopo — 2026-10-16:** estoque, lotes, validade informada e reposição por cobertura passam a integrar o MVP, entregues em etapas. Esta decisão substitui a classificação anterior de estoque como evolução futura. Regras detalhadas em [regras de estoque e compras](docs/INVENTORY_RULES.md), [modelo de domínio](docs/DOMAIN_MODEL.md) e [plano de evolução](docs/ROADMAP.md).

**Objetivo inicial:** construir um projeto de portfólio Full Stack que demonstre domínio de React, APIs REST, Java/Spring Boot, PostgreSQL, autenticação, testes e deploy. **Visão futura:** evoluir para produto comercial com assinatura premium, sem implementar pagamentos no MVP.

### Problema que resolve

Quem segue uma dieta precisa consultar refeições, calcular o que comprar para vários dias e estimar quanto preparar. Fazer essas contas manualmente é repetitivo e propenso a erros.

### Público inicial

Pessoas que já possuem um plano alimentar e querem organizá-lo. O sistema **não prescreve dietas** nem substitui nutricionistas.

## 2. Escopo do MVP (versão 1.0)

### Funcionalidades obrigatórias

1. **Conta e autenticação:** cadastro, login, logout e proteção dos dados por usuário.
2. **Perfil e preferências:** nome, fuso horário, unidades e ciclo de compras (semanal, mensal ou período manual); dia da semana ou dia do mês configurável.
3. **Alimentos:** catálogo pessoal com nome, unidade (g, kg, ml, L, unidade) e categoria de compra.
4. **Plano alimentar:** criar refeições com nome, horário, dias da semana e alimentos/quantidades; duplicar refeições e copiar dias para facilitar o cadastro manual.
5. **Visão diária:** exibir refeições em ordem cronológica, com itens e quantidades.
6. **Lista de compras:** calcular demanda por data e descontar estoque compatível e utilizável; mostrar faltas e incertezas por categoria; preservar cálculo e ajustes; registrar compras parciais sem duplicar entradas.
7. **Frequência de compra:** classificar itens como semanais ou mensais, com possibilidade de ajuste manual.
8. **Planejamento do preparo:** somar quantidades por alimento para um intervalo de dias e apresentar o total a preparar.
9. **Interface responsiva:** boa experiência em celular e desktop, com estados de carregamento, vazio e erro.
10. **Estoque:** cadastro inicial com quantidade conhecida, zero confirmado ou desconhecida; lotes e histórico de compras, consumo, descarte e correção.
11. **Cobertura:** prever o que pode faltar até a próxima compra, sem confundir previsão com quantidade registrada.
12. **Validade e armazenamento:** datas informadas pelo usuário/rótulo, local e estado do lote; avisos dentro do aplicativo e prioridade aos lotes que vencem primeiro. Validade desconhecida deve aparecer explicitamente.
13. **Consumo e preparo confirmado:** baixar ingredientes uma única vez; preparo antecipado gera saldo de alimento preparado, vinculado à origem, para evitar nova baixa dos ingredientes ao marcar refeições.

### Fora do MVP

- Recomendações médicas ou nutricionais automatizadas.
- Contagem precisa de calorias/macros sem base nutricional validada.
- Integrações com supermercados, preços em tempo real e delivery.
- Pagamentos, assinatura, notificações push e aplicativo nativo.
- Recursos de IA generativa dentro do produto.
- Importação de dieta por foto/PDF, leitura de código de barras e preços automáticos.
- Sugestões automáticas de prazos de conservação; conteúdo de orientação requer fonte e revisão antes de entrar no produto.

## 3. Regras de negócio fundamentais

- Uma refeição pertence a um plano alimentar e pode ocorrer em determinados dias da semana.
- Cada item da refeição contém alimento, quantidade positiva e unidade compatível.
- A lista de compras deve contabilizar **quantas vezes cada refeição ocorre dentro do intervalo selecionado**, inclusive ao atravessar semanas.
- Quantidades do mesmo alimento só podem ser somadas após conversão para uma unidade compatível (por exemplo, 1 kg + 500 g = 1,5 kg). Não converter unidades para gramas sem fator de conversão informado.
- O sistema deve distinguir **peso cru e peso cozido**. No MVP, a quantidade cadastrada é a referência; não estimar rendimento de cocção automaticamente. Caso seja necessário, cadastrar um fator de rendimento explícito e identificado como estimativa.
- Exemplo: se uma refeição usa 100 g de arroz cru todos os dias, para 7 dias a compra/preparo de referência é 700 g de arroz cru, antes de considerar estoque, perdas e arredondamentos.
- Compras semanais/mensais são uma **classificação de frequência**, não uma promessa de validade ou conservação do alimento.
- Cada usuário acessa somente seus próprios dados. IDs recebidos em APIs devem ser verificados quanto à propriedade.
- Datas devem usar fuso horário configurado pelo usuário; horários de refeição são horários locais.
- Permitir edição manual da lista gerada, preservando rastreabilidade entre quantidade calculada e ajuste manual.
- Gerar/aceitar uma lista não altera o estoque; somente confirmar quantidades realmente compradas cria entradas.
- Uma refeição agendada não altera o saldo. Registro de consumo/preparo é uma ação explícita, separada de marcação visual.
- Não converter automaticamente peso cru em cozido nem presumir validade desconhecida. Dados insuficientes geram uma previsão incompleta, identificada ao usuário.
- Compras, consumo e estornos devem ser transacionais e idempotentes; saldos nunca podem ficar negativos. Ver regras e cenários em `docs/INVENTORY_RULES.md`.

## 4. Stack recomendada

| Camada | Tecnologia |
|---|---|
| Front-end | React + TypeScript + Vite |
| UI | Tailwind CSS |
| Navegação | React Router |
| Requisições/cache | TanStack Query |
| Formulários/validação | React Hook Form + Zod |
| Back-end | Java 21 + Spring Boot |
| API | REST + JSON, documentação OpenAPI |
| Banco de dados | PostgreSQL |
| Persistência | Spring Data JPA |
| Migrações | Flyway |
| Segurança | Spring Security; estratégia de sessão/cookies HttpOnly definida antes da implementação |
| Testes | JUnit + Mockito + testes de integração; Vitest + React Testing Library |
| Ferramentas | Git, GitHub, Docker Compose (opcional no começo) |

**Princípio:** preferir bibliotecas estáveis e evitar adicionar ferramentas sem necessidade. Usar versões estáveis compatíveis no momento da implementação.

## 5. Modelo de dados inicial (a validar)

- `users`: id, name, email, password_hash, timezone, created_at.
- `foods`: id, user_id, name, base_unit, category, purchase_frequency, created_at.
- `meal_plans`: id, user_id, name, active, created_at.
- `meals`: id, meal_plan_id, name, local_time, created_at.
- `meal_days`: meal_id, weekday (1–7).
- `meal_items`: id, meal_id, food_id, quantity, unit, quantity_basis (`RAW`, `COOKED`, `AS_SOLD`).
- `shopping_lists`: id, user_id, start_date, end_date, created_at.
- `shopping_list_items`: id, shopping_list_id, food_id, calculated_quantity, adjustment_quantity, unit, checked, purchase_frequency.

**Observação:** validar cardinalidade, exclusão e integridade referencial antes de gerar as entidades. Evitar duplicação de informações deriváveis, exceto quando necessário para manter o histórico da lista.

**Extensão aprovada:** o modelo acima era a proposta inicial. Lotes, movimentos, revisões de plano, compras e preparo estão especificados em [DOMAIN_MODEL.md](docs/DOMAIN_MODEL.md), que registra a visão do domínio; as migrações SQL e docs/DOMAIN_API.md descrevem o contrato implementado. A tabela atual `demo_meals` continua exclusivamente demonstrativa.

## 6. API REST proposta

| Método | Rota | Função |
|---|---|---|
| POST | `/api/auth/register` | Criar conta |
| POST | `/api/auth/login` | Autenticar |
| POST | `/api/auth/logout` | Encerrar sessão |
| GET | `/api/me` | Obter usuário atual |
| GET/POST | `/api/foods` | Listar/criar alimentos |
| GET/PATCH/DELETE | `/api/foods/{id}` | Consultar/editar/excluir alimento |
| GET/POST | `/api/meal-plans` | Listar/criar planos |
| GET/PATCH/DELETE | `/api/meal-plans/{id}` | Gerenciar plano |
| GET | `/api/schedule?date=YYYY-MM-DD` | Refeições de um dia |
| POST | `/api/shopping-lists/generate` | Gerar lista para intervalo |
| GET | `/api/shopping-lists/{id}` | Consultar lista |
| PATCH | `/api/shopping-lists/{id}/items/{itemId}` | Ajustar ou marcar item |
| GET | `/api/prep-summary?start=...&end=...` | Quantidades a preparar |

As rotas são **propostas iniciais**, sujeitas a refinamento. Padronizar erros, paginação, validação e códigos HTTP.

## 7. Telas do MVP

1. **Entrar / cadastrar-se** — acesso à conta.
2. **Dashboard** — resumo do dia e atalhos para compras/preparo.
3. **Minha dieta** — criar e editar refeições, dias, horários e quantidades.
4. **Alimentos** — cadastrar e gerenciar catálogo pessoal.
5. **Lista de compras** — escolher período, gerar lista, filtrar semanal/mensal, marcar comprados.
6. **Preparo** — consultar totais a preparar por período, com indicação de unidade e base crua/cozida.
7. **Configurações** — preferências e fuso horário.
8. **Meu estoque** — saldos registrados, desconhecidos, lotes, validade e ajustes.
9. **Confirmar compra** — quantidades realmente compradas e dados dos lotes.

### Direção visual

- Visual SaaS moderno, limpo, profissional e responsivo.
- Priorizar clareza das quantidades e horários, acessibilidade, contraste e navegação mobile.
- Usar componentes reutilizáveis e um sistema de espaçamento consistente.
- Evitar dashboards decorativos sem dados reais.

## 8. Estrutura sugerida do repositório

```text
Dieta Fácil/
├── README.md
├── docs/
│   ├── PROJECT_SPEC.md
│   ├── ARCHITECTURE.md
│   └── API.md
├── frontend/
│   ├── src/
│   │   ├── app/
│   │   ├── components/
│   │   ├── features/
│   │   ├── hooks/
│   │   ├── lib/
│   │   └── types/
│   └── package.json
├── backend/
│   ├── src/main/java/.../
│   ├── src/main/resources/
│   └── src/test/
├── docker-compose.yml
└── .gitignore
```

## 9. Etapas de desenvolvimento

O checklist abaixo registra as fases originais. A sequência executável revisada, incluindo estoque no MVP, está em [ROADMAP.md](docs/ROADMAP.md). Uma entrega só é concluída após cumprir seus critérios de aceite; demonstrar uma tela não conclui uma funcionalidade.

### Fase 0 — Planejamento e ambiente
- [x] Revisar escopo e regras de negócio.
- [x] Criar repositório Git e README.
- [x] Configurar React/Vite/Tailwind e Spring Boot/PostgreSQL.
- [x] Confirmar execução local de front-end e back-end.

### Fase 1 — Interface navegável
- [x] Criar layout, navegação e componentes base.
- [ ] Implementar telas com dados fictícios claramente identificados.
- [ ] Garantir responsividade e acessibilidade básica.

### Fase 2 — Back-end e persistência
- [ ] Criar esquema do banco com Flyway.
- [x] Implementar autenticação e isolamento de dados (perfil pessoal; validar propriedade novamente em cada novo módulo).
- [x] Implementar catálogo e plano/refeições pessoais, com revisões e agenda.
- [ ] Documentar API e criar testes.

### Fase 3 — Integração e regras de negócio
- [ ] Integrar telas às APIs reais.
- [ ] Implementar cálculo de ocorrências por período.
- [ ] Implementar conversões válidas de unidades.
- [ ] Gerar lista de compras e resumo de preparo.
- [ ] Permitir ajustes e marcação de itens.

### Fase 4 — Qualidade e portfólio
- [ ] Testar cenários normais, limites e erros.
- [ ] Corrigir problemas de segurança e validação.
- [ ] Criar dados demonstrativos sem dados pessoais reais.
- [ ] Fazer deploy e registrar screenshots.
- [ ] Escrever README com arquitetura, decisões, testes e demonstração.

**Ritmo sugerido:** sessões de aproximadamente 2 horas por dia. Priorizar entregas pequenas e funcionais em vez de prazos artificiais.

## 10. Critérios de aceite do MVP

O MVP está concluído quando um usuário consegue criar uma conta, cadastrar sua dieta, informar o estoque, ver a demanda até a próxima compra, gerar uma lista com faltas justificadas, confirmar compras parciais, registrar preparo/consumo sem baixa duplicada e consultar lotes e alertas de validade. Os dados devem persistir entre dispositivos após login. Devem passar os cenários de `docs/INVENTORY_RULES.md`, inclusive autorização, concorrência e quantidades desconhecidas.

### Testes essenciais de cálculo

- Uma refeição diária de 100 g por 7 dias gera 700 g.
- Uma refeição apenas às segundas-feiras conta corretamente no intervalo de datas.
- 1 kg + 500 g resulta em 1,5 kg, sem perder precisão.
- Alimentos de unidades incompatíveis não são agregados silenciosamente.
- Intervalos inclusivos e virada de mês são tratados corretamente.
- Um usuário não consegue ler/editar listas de outro usuário.

## 11. Evolução futura (não implementar agora)

- Aplicativo mobile (React Native/Expo, a avaliar).
- Compartilhamento de listas e planejamento familiar.
- Compartilhamento do estoque entre membros da família e planejamento conjunto.
- Preços de supermercados e estimativa de custo.
- Integração com profissionais de nutrição, mediante consentimento.
- Importação de dietas, receitas e equivalências nutricionais verificadas.
- Plano premium e assinaturas, após validação do uso real.

## 12. Como a IA deve colaborar

**Papel:** atuar como desenvolvedor sênior mentor e parceiro de implementação, sem substituir a compreensão do desenvolvedor iniciante.

1. Respeitar este documento como especificação-base; indicar conflitos e propor decisões antes de alterar o escopo.
2. Trabalhar em **uma tarefa pequena por vez**, com objetivo, arquivos envolvidos, implementação, comandos e teste de validação.
3. Antes de gerar muitos arquivos, explicar a estrutura e solicitar confirmação de decisões arquiteturais importantes.
4. Fornecer código completo e executável para os arquivos alterados, com caminhos explícitos; não inventar dependências nem APIs.
5. Explicar brevemente **por que** cada solução foi escolhida, com foco em aprendizado de React, Java e Spring Boot.
6. Não afirmar que executou testes ou comandos se não os executou. Informar o que precisa ser verificado localmente.
7. Se houver erro, investigar primeiro a mensagem e a causa provável; não reescrever o projeto inteiro sem necessidade.
8. Considerar segurança, autenticação, autorização, validação, privacidade e acessibilidade desde o início.
9. Não introduzir IA, pagamentos ou outras funções futuras antes da conclusão do MVP.
10. Ao final de cada etapa, atualizar checklist, resumir alterações e sugerir um commit Git descritivo.

### Prompt para iniciar um novo chat do projeto

> Continue o **Dieta Fácil**. Leia `PROJECT_SPEC.md`, `docs/ROADMAP.md` e `docs/DEVELOPMENT_LOG.md`. Verifique o estado do código e selecione a primeira entrega pendente, respeitando suas dependências. Quero entregas funcionais com uma explicação breve para aprender React e Java/Spring Boot. Não implemente todo o backlog de uma vez. Informe alterações, validações e limitações reais.

---

**Status — 2026-10-18:** versão demonstrável local com conta, catálogo, dieta, agenda, estoque, compras, preparo, consumo e alertas. Ciclo de compra pessoal e cenário fictício opcional implementados. Contratos efetivos em docs/DOMAIN_API.md; roteiro em docs/DEMO_GUIDE.md. Publicação, produção e integração com Portfólio estão adiadas por orientação do usuário.
