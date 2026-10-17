# Dieta Fácil — Documento mestre do projeto

> **Objetivo deste arquivo:** servir como contexto inicial para um projeto no ChatGPT e como especificação viva para desenvolver o Dieta Fácil. Ao iniciar uma nova conversa, anexe este arquivo e peça para a IA seguir as instruções da seção **Como a IA deve colaborar**.

## 1. Visão do produto

O **Dieta Fácil** é uma aplicação de planejamento alimentar que transforma uma dieta cadastrada pelo usuário em uma rotina prática: refeições com horários, quantidades para cozinhar e listas de compras organizadas por frequência (semanal e mensal).

**Objetivo inicial:** construir um projeto de portfólio Full Stack que demonstre domínio de React, APIs REST, Java/Spring Boot, PostgreSQL, autenticação, testes e deploy. **Visão futura:** evoluir para produto comercial com assinatura premium, sem implementar pagamentos no MVP.

### Problema que resolve

Quem segue uma dieta precisa consultar refeições, calcular o que comprar para vários dias e estimar quanto preparar. Fazer essas contas manualmente é repetitivo e propenso a erros.

### Público inicial

Pessoas que já possuem um plano alimentar e querem organizá-lo. O sistema **não prescreve dietas** nem substitui nutricionistas.

## 2. Escopo do MVP (versão 1.0)

### Funcionalidades obrigatórias

1. **Conta e autenticação:** cadastro, login, logout e proteção dos dados por usuário.
2. **Perfil e preferências:** nome, unidade de medida e quantidade padrão de dias para compras.
3. **Alimentos:** catálogo pessoal com nome, unidade (g, kg, ml, L, unidade) e categoria de compra.
4. **Plano alimentar:** criar refeições com nome, horário, dias da semana e alimentos/quantidades por refeição.
5. **Visão diária:** exibir refeições em ordem cronológica, com itens e quantidades.
6. **Lista de compras:** calcular quantidades agregadas para um período escolhido (ex.: 7 ou 30 dias), agrupadas por categoria; permitir marcar itens como comprados.
7. **Frequência de compra:** classificar itens como semanais ou mensais, com possibilidade de ajuste manual.
8. **Planejamento do preparo:** somar quantidades por alimento para um intervalo de dias e apresentar o total a preparar.
9. **Interface responsiva:** boa experiência em celular e desktop, com estados de carregamento, vazio e erro.

### Fora do MVP

- Recomendações médicas ou nutricionais automatizadas.
- Contagem precisa de calorias/macros sem base nutricional validada.
- Integrações com supermercados, preços em tempo real e delivery.
- Pagamentos, assinatura, notificações push e aplicativo nativo.
- Recursos de IA generativa dentro do produto.

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
- [ ] Implementar autenticação e isolamento de dados.
- [ ] Implementar CRUD de alimentos e planos/refeições.
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

O MVP está concluído quando um usuário consegue criar uma conta, cadastrar alimentos, configurar refeições recorrentes, visualizar a agenda de um dia, gerar uma lista de compras para um período, conferir os totais de preparo, marcar itens como comprados e acessar seus dados em outro dispositivo após login. Os cálculos devem passar nos testes de unidade e o sistema deve impedir acesso aos dados de outros usuários.

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
- Estoque doméstico e desconto automático de itens disponíveis.
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

> Quero desenvolver o **Dieta Fácil** como projeto de portfólio Full Stack e possível produto futuro. Leia integralmente o arquivo `PROJECT_SPEC.md` anexado e trate-o como documento mestre. Meu nível é básico em React e Java/Spring Boot; tenho cerca de 2 horas por dia e quero usar IA para gerar código enquanto aprendo a explicar e testar o que construo. Comece pela **Fase 0**: revise rapidamente os riscos da especificação, proponha a primeira tarefa prática e me oriente passo a passo. Não gere o projeto inteiro de uma vez. Para cada etapa, informe comandos, arquivos, código e como verificar se funcionou.

---

**Status:** especificação inicial — pronta para ser revisada e implementada incrementalmente.
