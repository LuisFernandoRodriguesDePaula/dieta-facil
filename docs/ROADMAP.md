# Plano de evolução do Dieta Fácil

Revisão de 2026-10-16. Este backlog substitui a ordem genérica da especificação inicial. Estoque passa a integrar o MVP por decisão do usuário. Cada entrega pode ocupar várias sessões; não há promessa de concluir o MVP em um mês.

## Forma de trabalhar

- Uma entrega por vez; subdividir em tarefas pequenas e verificáveis.
- Primeiro contrato/regras, depois implementação, testes e revisão de interface, por fim commit e envio ao GitHub.
- Registrar no diário o que realmente foi executado. Não marcar como pronta uma tela que só apresenta dados de exemplo.
- Conservar demonstração separada dos dados pessoais; dados fictícios nunca migram para conta real sem ação explícita.
- Ao iniciar uma sessão, ler status, última entrega e diff. Quando iniciar outro chat, referenciar os documentos do repositório.

## Entregas e dependências

| ID | Entrega | Depende de | Situação |
|---|---|---|---|
| E01 | Base React + API Java + PostgreSQL + CI | — | Concluída, demonstração local |
| P01 | Regras, modelo e plano revisados com estoque | E01 | Documentado nesta revisão |
| E02 | Conta, login, logout e isolamento | P01 | Concluída, ambiente local |
| E03 | Catálogo pessoal e unidades | E02 | Concluída, ambiente local |
| E04 | Dieta manual e agenda recorrente | E03 | Implementada localmente |
| E05 | Estoque inicial, lotes e ajustes | E03 | Implementada localmente |
| E06 | Demanda, cobertura e lista de compras | E04 + E05 | Implementada; embalagem comercial futura |
| E07 | Confirmação de compras parciais | E06 | Implementada localmente |
| E08 | Consumo e preparo sem baixa duplicada | E04 + E05 + E07 | Implementada localmente |
| E09 | Validade, alertas e revisão da projeção | E06 + E08 | Implementada localmente |
| E10 | Qualidade final, deploy e apresentação | E02–E09 | Demonstração local; produção/publicação adiadas |

E05 já armazena validade e local de forma opcional, para evitar retrabalho. E06 já respeita datas informadas. E09 acrescenta a experiência completa de alertas e correções, sem adiar as regras básicas de validade.

## E02 — Acesso pessoal

Objetivo: uma conta acessa apenas seu perfil e futuras informações pessoais.

Tarefas em ordem:

- [x] Criar migração de users e camada de perfil, com e-mail único e fuso válido.
- [x] Configurar Spring Security, hash de senha, sessão, CSRF e respostas JSON; seguir ADR-001.
- [x] Implementar register/login/logout/me/csrf e validações; não devolver hash nem dados internos.
- [x] Implementar telas de acesso, estados de erro e rota protegida; tratar sessão expirada.
- [x] Testar autenticação HTTP real, CSRF, logout, cookie e acesso com duas contas.
- [x] Atualizar documentação, validar build/CI e registrar entrega.

Arquivos previstos: migração V2, módulo `auth`/`profile`, configuração de segurança, cliente HTTP React e telas/formulários. Introduzir somente dependências necessárias: Spring Security, React Hook Form/Zod e ferramentas de teste de interface quando houver comportamento a validar.

Aceite: cadastro/login/logout funcionam; sessão expirada retorna ao acesso; escrita sem CSRF é rejeitada; perfil de A não pode ser lido/alterado por B; demonstração identificada continua acessível sem dados pessoais. Reinício da API pode encerrar sessões nesta versão e isso deve ser informado.

## E03 — Alimentos e unidades

- [x] CRUD pessoal com categoria e frequência; arquivamento em vez de apagar histórico.
- [x] Dimensões e conversões exatas kg/g, L/ml; contagem inteira e referência separada.
- [x] Validação e isolamento por usuário, inclusive vínculos entre entidades.
- [x] Formulário simples com busca, estados vazio/erro e confirmação de arquivamento.

Aceite: alimento criado reaparece após login; não há soma de dimensões incompatíveis; outra conta não vê nem usa seu ID. Embalagem comercial opcional pode ser adicionada em E06.

## E04 — Dieta e agenda

- [x] Plano, revisões com vigência, refeições, dias e itens normalizados.
- [x] Criar/duplicar refeição incluindo seus dias e visualizar agenda por data.
- [x] Regras de ocorrência e fuso; snapshots para não mudar histórico confirmado.
- [x] Identificar refeições pendentes/puladas sem gerar consumo de estoque automaticamente.

Aceite: agenda muda corretamente por dia; revisões respeitam vigência; virada de semana/mês funciona; referências RAW/COOKED são visíveis.

## E05 — Meu estoque

- [x] Quantidade conhecida, zero ou desconhecida, inclusive conferência parcial.
- [x] Lotes com unidade/referência, validade opcional, origem da data, estado e local.
- [x] Entradas iniciais, descarte e correção por movimentos, com motivo e idempotência.
- [x] Saldo transacional não negativo, autorização e histórico.

Aceite: saldo reconcilia com movimentos; repetir operação não duplica; dois usuários não compartilham lotes; quantidades desconhecidas ficam explícitas. Não exigir preenchimento de todos os alimentos para usar o app.

## E06 — Planejar compras

- [x] Ciclo semanal/mensal/manual e período explícito, sem dia padrão obrigatório.
- [x] Expandir refeições e projetar alocação por data com FEFO e compatibilidade.
- [x] Mostrar demanda, saldo considerado, falta, incertezas e primeira data de falta.
- [x] Persistir snapshot da lista, ajustes e data de cálculo; detectar desatualização.
- [x] Recalcular sem apagar ajustes dos itens remanescentes.
- [ ] Evolução opcional: embalagem comercial e arredondamento explicado.

Aceite: exemplo dos 14 ovos/5 em estoque resulta em falta 9; lote vencendo antes do uso não cobre essa data; desconhecido não vira zero; gerar listas não altera estoque. Testar a matriz de regras aplicável em PostgreSQL.

## E07 — Confirmar compras

- [x] Recebimento parcial e avulso, com quantidades reais e separação de lotes.
- [x] Transação idempotente com confirmação revisável antes de envio.
- [x] Estados da lista, progresso de recebimento e estorno validado.

Aceite: recebimento de 6 itens numa falta de 9 cria entrada de 6; repetir requisição não soma novamente; cancelamento da lista não apaga o que já foi recebido.

## E08 — Consumo e preparo

- [x] Confirmar consumo por ocorrência com quantidades reais e alocação FEFO.
- [x] Preparo simples com entradas RAW e saída COOKED explícita, sem rendimento inventado.
- [x] Consumir lotes preparados sem voltar a baixar ingredientes de origem.
- [x] Tratar falta real de saldo, confirmação concorrente e estorno de preparo.
- [x] Integrar ocorrências consumidas/puladas à demanda restante.

Aceite: preparar hoje e comer amanhã não duplica baixa; falha intermediária reverte tudo; duas saídas concorrentes não deixam saldo negativo. Receitas compostas ficam fora desta entrega.

## E09 — Validade e alertas

- [x] Dashboard com faltas até a próxima compra, lotes próximos do prazo e datas desconhecidas.
- [x] Abrir, mover, preparar e descartar com revisão explícita de data, sem extensão automática.
- [x] Fluxo curto para conferir saldo e corrigir divergências.
- [x] Revisão integrada de projeção com preparados, vencimentos e listas antigas.

Aceite: avisos explicam o motivo e levam à ação; não garantem segurança alimentar; não existem prazos gerados por IA. Sem push, e-mail ou monitor externo.

## E10 — Demonstração local e preparação futura de produção

- [x] Testes de jornada completa, autorização e concorrência em PostgreSQL.
- [x] Jornada e layout em computador e viewport móvel, sem aparelho físico.
- [ ] Revisão ampliada de acessibilidade: teclado, contraste, zoom e tecnologias assistivas.
- [x] Exclusão de conta, recuperação, confirmação de e-mail e limite básico de tentativas.
- [ ] Revisar retenção, política operacional e proteção de borda antes de uso real.
- [ ] HTTPS, secrets de deploy, sessão/CSRF e origem de produção revisados.
- [x] Backup e restauração local verificados em banco temporário; erro SQL de autenticação sem detalhes de e-mail no log.
- [ ] Ativar e testar backup externo e sua retenção.
- [x] Carga fictícia explícita em conta vazia, screenshots, README e roteiro do Dieta Fácil.
- Integração com o projeto Portfólio: fora desta entrega, por orientação do usuário.
- [x] Preparar opção Free: Render + Neon + Brevo HTTPS, sem contratação paga.
- [ ] Ativar contas externas, validar HTTPS/e-mails reais e integrar ao Portfólio após a URL real.

## Uso econômico da IA

Preferência: GPT-6.1 leve para implementação rotineira; médio para desenho de funcionalidade; revisão pontual em alto para segurança, transações e projeção. Isso é um fluxo recomendado, não mudança automática das configurações do modelo.

Sem cotas de horas/mensagens prometidas. Consultar limites disponíveis ao organizar sessões maiores; não confundir assinatura do Codex com orçamento de hospedagem ou API. A aplicação não fará chamadas de IA no MVP.

Uma sessão deve ter um objetivo, uma verificação proporcional e um registro de continuidade. Manter decisões nestes arquivos evita reexplicar o projeto e refazer implementações. Não gerar imagens nem executar múltiplos agentes sem necessidade/autorização. Não repetir testes já aprovados se nada relevante mudou.

## Decisões assumidas, revisáveis sem bloquear o início

Interface pt-BR; estoque individual; entrada manual da dieta; ciclo sugerido de sete dias; validade opcional; aviso de proximidade padrão três dias; sem rendimento automático; sem funções pagas de terceiros. Ciclo e dia de compras já são salvos por conta; o período também pode ser manual. E04–E09 implementadas na versão demonstrável local. Produção, publicação e funcionalidades opcionais permanecem separadas. Detalhes em DEMO_GUIDE.md e RETOMADA.md.

## Painel diário e alternativas — entregue

- [x] Cartões por horário, progresso e próxima refeição em Minha dieta/Agenda.
- [x] Editor completo separado do uso diário.
- [x] Alternativas por alimento/refeição com porção explícita e permissão de troca.
- [x] Troca única ou revisão para as próximas, respeitando revisões agendadas.
- [x] Desfazer com validação de estado e versão; confirmação/estorno de consumo.
- [x] Exceções refletidas na demanda e na sinalização de compras desatualizadas.
- [x] Painel lateral/inferior, teclado, verificações axe e jornadas em dois tamanhos de tela.

## Entrega de validação 1.0

- [x] Área de nutricionista e área de cliente; convites internos, aceite e revogação.
- [x] Catálogo, plano e alternativas editados pelo profissional vinculado; consulta pelo cliente.
- [x] Resultados mensais registrados pelo profissional, com medidas opcionais e histórico.
- [x] Básico sem estoque; Premium com controle opcional, saldos preservados e conferência ao reativar.
- [x] Registro opcional de refeição separado da baixa de estoque, sem desconto retroativo.
- [x] Duas contas fictícias e roteiro V1_VALIDATION.md para feedback.
- [ ] Receber feedback de um nutricionista e priorizar a próxima revisão.
- [ ] Antes de uso clínico real: identidade profissional, auditoria e operação/retenção de dados definidas.


### Revisão local complementar — 2026-10-19

- [x] Ciclo de foco com Tab/Shift+Tab no painel de troca e retorno após Escape.
- [x] Reflow a 320/720px nas telas principais do cliente, em navegador automatizado.
- [x] Ficha de feedback para a sessão com o nutricionista (FEEDBACK_V1.md).
- [ ] Teste humano com leitor de tela, zoom real e aparelho físico; revisão ampliada de acessibilidade permanece aberta.
- Publicação aguarda contas externas; usuário optou por continuar a validação local.

### Refinamento do acompanhamento profissional — 2026-10-19

- [x] Busca por nome/e-mail e filtros por situação na lista de clientes.
- [x] Renovação e cancelamento confirmado de convites pendentes/expirados.
- [x] Estados vazios e nova tentativa em consultas do acompanhamento.
- [x] Recuperação explícita de conflito de avaliação, preservando rascunho até carregar a versão atual.
- [ ] Sessão humana com nutricionista e feedback continuam pendentes.
