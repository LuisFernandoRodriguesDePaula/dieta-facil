# Caso do projeto — Dieta Fácil 1.0

Material técnico para futura apresentação no Portfólio. O projeto Portfólio separado não é alterado por este documento.

## Problema e escopo

O cliente precisa consultar o que comer, em qual horário e quais substituições foram autorizadas, sem montar a própria dieta. O nutricionista precisa organizar refeições e acompanhar os resultados mensais, com acesso restrito aos clientes que aceitaram o vínculo.

O produto começou conectando dieta a estoque, compras e preparo. A evolução do escopo colocou o acompanhamento profissional no centro e manteve esses módulos como extras opcionais. O Básico permite consultar dieta/resultados sem descontar produtos. Premium não possui contratação ou cobrança real nesta versão.

## Entrega demonstrável

- Dois perfis: convite interno, aceite e revogação. Busca de clientes e manutenção de convites.
- Edição da dieta por cartões recolhidos, seleção semanal, alternativas e aplicação com vigência para hoje.
- Histórico de versões acessível pelo ícone de informação. Consulta de uma versão não a ativa.
- Cliente somente consulta prescrição/resultados e escolhe alternativas permitidas por ocorrência.
- Avaliações mensais resumidas e expansíveis, medidas opcionais e comparação entre registros existentes.
- Registro opcional de refeição com estorno individual persistente após recarga.
- Revisão remota por túnel HTTPS, com cópia compilada e banco de dados separado contendo apenas dados fictícios.

## Decisões e evidências

| Decisão | Problema tratado | Evidência no projeto |
|---|---|---|
| Vínculo e autorização na API | Um profissional não pode editar qualquer cliente | CareWorkflowTest e jornadas de aceite/revogação |
| Versão de gravação e recuperação de conflito | Duas janelas não devem sobrescrever avaliações silenciosamente | Testes HTTP e jornada simulando gravação concorrente |
| Dieta com vigência e snapshots | Mudanças no plano não podem reescrever refeições consumidas | PlanService e testes de plano/consumo |
| Check-in separado do estoque | Registrar uma refeição no Básico não deve gerar movimentação | MealTrackingController e testes de mudança de plano/estorno |
| BigDecimal, transações e repetição segura | Entradas/saídas não podem duplicar saldo ou torná-lo negativo | Testes de estoque, concorrência e estorno |
| Campos opcionais nulos | Uma medida não informada não representa zero | V12 e testes de persistência/comparação |
| Cópia isolada de revisão | Testes do designer não devem alterar dados pessoais | Start/Stop-DesignReview e conferência HTTPS externa |

A documentação registra o motivo e o resultado das decisões; não atribui métricas de impacto ou feedback que ainda não foram medidos.

## Validação realizada

Build/lint, testes de interface, testes Java em H2 e PostgreSQL, jornadas em navegador desktop/móvel e verificação axe. A CI também constrói e inicia o pacote de produção. Consulte o resultado do commit em avaliação; aprovação automatizada não equivale a auditoria clínica ou revisão completa de segurança/acessibilidade.

A revisão temporária conferiu login/logout HTTPS nos dois perfis, Secure/HttpOnly, bloqueios e ausência de rolagem lateral nas páginas verificadas a 320, 390 e 1440px. Capturas da versão atual no README usam dados fictícios e não mostram credenciais.

## Pendências explícitas

- Feedback humano do designer e nutricionista; conferência em aparelho físico, zoom real e leitor de tela.
- Importações de dieta/avaliações/bioimpedância: somente campos reservados desativados; não há parser, integração externa ou arquivo armazenado.
- Publicação permanente, e-mails reais e backup externo ainda precisam de ativação e teste.
- Perfil profissional autodeclarado; identidade profissional, auditoria e operação/retenção precisam de definição antes de pacientes reais.
- Sem cálculo nutricional automático, equivalência nutricional calculada, aplicativo nativo ou cobrança Premium.

## Material de apresentação

README, ARCHITECTURE.md, V1_VALIDATION.md, FEEDBACK_V1.md, DESIGN_REVIEW.md e capturas v1-* em docs/images. DEVELOPMENT_LOG.md preserva a evolução; RETOMADA.md indica o estado e o próximo marco. O repositório guarda código e instruções reproduzíveis, sem senhas ou dados locais.

Não inserir um link temporário como se fosse demonstração permanente. A integração ao Portfólio continua para depois da validação da URL definitiva e da revisão da apresentação pelo proprietário.
