# Evolução do Dieta Fácil — acompanhamento e atendimento assistido

Data: 29/10/2026. Estado: arquitetura e plano aprovados para orientar implementação; funcionalidades futuras descritas aqui **não estão implementadas**. A versão 1.0 permanece em avaliação. Documento principal para a evolução; o backlog antigo continua como histórico.

## Objetivo e decisões de produto

Evoluir para dieta e acompanhamento entre consultas: o nutricionista organiza o cuidado e vê quem precisa de atenção; o paciente consulta o plano, responde acompanhamentos curtos e tira dúvidas contextualizadas. Prescrição e alterações permanecem sob responsabilidade do profissional.

A Wellts é referência funcional, não uma dependência técnica ou licença para copiar sua interface. Sua apresentação pública reúne check-ins, gestão de clientes, agenda, financeiro, jornada, relatórios, equipes e assistente. Mantemos identidade e implementação próprias. Fontes oficiais consultadas em 29/10/2026: [Wellts](https://www.wellts.com.br/) e [apresentação de acompanhamento](https://nutricaosemfronteiras.com.br/wellts). Não tivemos acesso nem auditamos seu sistema interno.

Princípios mantidos: português; desktop e celular; poucos campos obrigatórios; detalhes sob demanda; registro de refeição opcional; ausência de registro não significa falta de adesão. Estoque/compras/preparo permanecem extras independentes e não voltam a ocupar o fluxo principal.

## Situação real e retorno recebido

Já existem contas e vínculos profissional–cliente, dieta versionada, alternativas autorizadas, avaliações mensais, extras de estoque e compartilhamento temporário HTTPS. Ainda não há macros, atendimento por IA, agenda de consultas, check-ins de acompanhamento, financeiro, CRM ou operação de clínica multiusuário.

O proprietário informou que disponibilizou a demonstração aos nutricionistas. O feedback recebido solicita nutrientes no alimento e totais na refeição. Atendimento por IA e a expansão inspirada na Wellts são pedidos do proprietário; não são necessidades validadas por todos os avaliadores. Ver [registro de feedback](FEEDBACK_EVOLUCAO.md).

## Mapa de capacidade e primeira versão de cada módulo

| Capacidade | Primeira versão planejada | Expansão posterior |
|---|---|---|
| Clientes e CRM | Situação do acompanhamento, último contato e pendências | Filtros, segmentos, etapas e responsáveis configuráveis |
| Dieta e nutrientes | Cadastro com referência/fonte; total por refeição/dia | Catálogo autorizado, receitas e importação revisável |
| Atendimento IA | Central de dúvidas e sugestões aprovadas pelo nutri | Respostas automáticas delimitadas e canais externos |
| Check-ins | Formulário curto configurável e periódico | Modelos, regras de lembrete e indicadores longitudinais |
| Metas | Meta definida pelo profissional, prazo e histórico | Atividades e materiais vinculados ao acompanhamento |
| Jornada | Etapas, tarefa, responsável e próxima ação | Modelos de jornada e automações revisáveis |
| Relatórios | Evolução, respostas e pendências com origem | Indicadores de operação por período/equipe |
| Agenda | Consulta, retorno, confirmação e cancelamento | Autoagendamento e sincronização Google Calendar |
| Financeiro | Plano de acompanhamento, vencimento e contas a receber | Cobrança recorrente e reconciliação por provedor |
| Organização/equipe | Associação de profissionais e papéis restritos | Delegação, unidades e gestão de colaboradores |
| Comunicação | Caixa interna e lembretes dentro do app | E-mail e WhatsApp por integrações oficiais |
| Importação | Arquivo, prévia, correção e confirmação | Adaptadores por formato/fornecedor autorizado |
| Experiência do paciente | Dieta, resultados, dúvidas e check-ins disponíveis | Materiais, atividades e notificações configuráveis |

Também entram no backlog completo, em ondas posteriores: relatórios do consultório, alertas de vencimento/renovação, modelos de acompanhamentos, personalização de marca e conteúdo. Comunidade/desafios, mencionados na apresentação pública de referência, ficam registrados como hipótese de longo prazo, opcionais, sem rankings de peso, exposição de pacientes ou competição clínica por padrão. App nativo não é requisito da primeira expansão: começamos pela web responsiva, avaliando PWA depois.

## Passo a passo e critérios de saída

Todas as entregas abaixo começam pendentes. Não há prazo prometido sem estimativa e validação do escopo. Uma fase só é concluída com código, migrações, autorização, estados de erro/vazio, testes proporcionais, captura e documentação no mesmo commit/PR.

| ID | Entrega | Dependências | Critério de saída |
|---|---|---|---|
| F00 | Consolidar feedback e cenário fictício | Base 1.0 | Registro reproduzível e prioridades; preservar dados; baseline 25 frontend/48 backend e jornadas existentes |
| F01 | Tokens visuais e estrutura de acompanhamento | F00 | Branco/verde-água; navegação acessível; painel de pendências reais, sem números ou botões fictícios |
| F02 | Nutrientes manuais e cálculo determinístico | F00 | Referência, unidade, fonte, estado e versões; parciais explícitos; totais por refeição/dia e trocas testados |
| F03 | Orientações publicadas e caixa de dúvidas | F00 | Separar notas privadas de conteúdo do paciente/IA; fila com responder, revisar e encaminhar; rastreabilidade |
| F04 | Piloto de IA supervisionada | F03; F02 enriquece, não bloqueia perguntas simples | Responses + GPT-6 Luna, ferramentas de leitura e orçamento; 100% das sugestões revisadas; avaliações de segurança e autorização |
| F05 | Atendimento automático delimitado | F04 e aprovação clínica/operacional | Somente intenções liberadas; dieta vigente verificada; encaminhamento e desligamento imediato; critérios de AI_ASSISTANT.md |
| F06 | Check-ins, metas e jornada básica | F03 | Questionário versionado, periodicidade/fuso, resposta única por ocorrência, pendência sem inferência de adesão |
| F07 | Relatórios e CRM de acompanhamento | F06 | Último contato, próxima ação e evolução com origem e datas; filtros sem pontuação clínica inventada |
| F08 | Importação e catálogo nutricional | F02; arquivo fictício e direitos definidos | Parse seguro, vinculação assistida, revisão humana; nenhuma dieta ativa substituída silenciosamente |
| F09 | Agenda e retornos | F07 | Disponibilidade/fuso, conflitos, cancelamento; integração Google opcional e isolada |
| F10 | Plano comercial e financeiro | F07 | Status calculado por registros reais; separação de plano alimentar, assinatura SaaS e contrato do acompanhamento; idempotência |
| F11 | Notificações e WhatsApp oficial | F06 e operação pública preparada | Consentimentos/preferências aplicáveis, deduplicação, retries, estado de entrega e custos medidos |
| F12 | Equipes e gestão de clínica | Isolamento preparado em F03; F07 | Permissões por organização e profissional; recepção sem acesso à dieta; auditoria e revogação testadas |
| F13 | Escala e diferenciação | Evidências das fases anteriores | Avaliar automações, marca própria, materiais/PWA e hipóteses de comunidade conforme uso e custo |

Trilhas iniciais: F01 e F02 podem avançar independentemente de F03; F04 começa assim que a caixa e as orientações existirem, sem esperar financeiro, importação ou agenda. Não precisamos de dados de macros completos para explicar horários/porções já prescritos. Nenhuma função IA gera metas ou nutrientes ausentes.

## Estrutura básica que implementaremos primeiro

Profissional: **Início · Clientes · Atendimento**. Início mostra tarefas e pendências, Clientes mantém o editor atual, Atendimento reúne dúvidas e sugestões. Dentro do cliente: Dieta, Avaliações, Acompanhamento e Orientações; ações de importação continuam discretas. Alimentos permanece acessível onde já existe durante a transição.

Paciente: **Minha dieta · Resultados · Atendimento · Conta**, com acompanhamento/check-ins exibidos quando disponíveis. Meu nutricionista e acesso à conta continuam encontráveis; não removê-los apenas para caber na tela. Atendimento só aparece quando o serviço estiver habilitado e explica se a resposta é automática ou do profissional. Agenda/Financeiro/Equipe só entram na navegação quando houver uma entrega funcional e permissão correspondente.

## Arquitetura e operação

Manter monólito modular Java/Spring + PostgreSQL + React. Novos módulos: nutrition, guidance, support, ai, followup, crm, appointments, billing e notifications. Organização/membros introduzidos por migração incremental antes do piloto de IA; profissional existente recebe espaço individual sem romper o proprietário dos dados ou o vínculo aceito do cliente. Novos recursos aplicam organização + relação ativa, não apenas clientId.

Agendamentos de check-in e notificações usam tabela de tarefas/outbox e worker no backend; transação registra a intenção, envio ocorre depois. Reexecução e webhook idempotentes, com horário/fuso, tentativas limitadas e estado final. Sem microserviços, vetor ou Redis obrigatórios no início. Chamadas externas nunca dentro de bloqueios longos de conta ou transações de domínio.

Uma assinatura de recurso não equivale a autorização: vínculo revogado remove acesso mesmo no Premium. Revogação também impede consultas IA ao antigo profissional e invalida contexto em cache. Extensões futuras não podem ativar estoque nem baixar produtos por conta própria.

Antes de pacientes reais: definir tratamento de dados com responsável, retenção/exclusão, papéis de acesso, identidade profissional, auditoria, HTTPS definitivo, backups/restauração e monitoramento de incidentes. O túnel temporário permanece restrito à avaliação fictícia; não vira infraestrutura de atendimento contínuo. A plataforma API de IA demanda conta/chave e orçamento próprios; a configuração do modelo nesta conversa de desenvolvimento não configura o modelo do aplicativo.

## Ordem da próxima implementação

1. Entregar F01 com componentes reutilizáveis e painel sem recursos simulados.
2. Entregar a primeira fatia de F02: nutrientes manuais, referência e cálculo, sem depender de licenciamento de base externa.
3. Entregar F03: orientações versionadas e pergunta/resposta humana.
4. Preparar testes de IA com casos fictícios e adaptador simulado; conectar o provedor em F04 quando chave e teto estiverem definidos.
5. Demonstrar ao nutricionista antes de ampliar a automação; priorizar correções da dieta em paralelo.

## Documentação de execução

- [Macros e composição](NUTRIENTES.md)
- [Atendimento por IA e avaliação](AI_ASSISTANT.md)
- [Direção visual e acessibilidade](DESIGN_SYSTEM.md)
- [Feedback, hipóteses e dúvidas](FEEDBACK_EVOLUCAO.md)
- [ADR-003](decisions/ADR-003-acompanhamento-e-ia.md)

Não houve alteração de código, banco, cobrança ou acionamento de API paga nesta entrega de planejamento. Integrações e recursos acima continuam futuros.
