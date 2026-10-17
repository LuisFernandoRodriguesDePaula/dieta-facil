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
| E03 | Catálogo pessoal e unidades | E02 | Próxima |
| E04 | Dieta manual e agenda recorrente | E03 | Pendente |
| E05 | Estoque inicial, lotes e ajustes | E03 | Pendente |
| E06 | Demanda, cobertura e lista de compras | E04 + E05 | Pendente |
| E07 | Confirmação de compras parciais | E06 | Pendente |
| E08 | Consumo e preparo sem baixa duplicada | E04 + E05 + E07 | Pendente |
| E09 | Validade, alertas e revisão da projeção | E06 + E08 | Pendente |
| E10 | Qualidade final, deploy e apresentação | E02–E09 | Pendente |

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

- [ ] CRUD pessoal com categoria e frequência; arquivamento em vez de apagar histórico.
- [ ] Dimensões e conversões exatas kg/g, L/ml; contagem inteira e referência separada.
- [ ] Validação e isolamento por usuário, inclusive vínculos entre entidades.
- [ ] Formulário simples com busca, estados vazio/erro e confirmação de arquivamento.

Aceite: alimento criado reaparece após login; não há soma de dimensões incompatíveis; outra conta não vê nem usa seu ID. Embalagem comercial opcional pode ser adicionada em E06.

## E04 — Dieta e agenda

- [ ] Plano, revisões com vigência, refeições, dias e itens normalizados.
- [ ] Criar/duplicar refeição, copiar dias e visualizar agenda por data.
- [ ] Regras de ocorrência e fuso; snapshots para não mudar histórico confirmado.
- [ ] Identificar refeições pendentes/puladas sem gerar consumo de estoque automaticamente.

Aceite: agenda muda corretamente por dia; revisões respeitam vigência; virada de semana/mês funciona; referências RAW/COOKED são visíveis.

## E05 — Meu estoque

- [ ] Quantidade conhecida, zero ou desconhecida, inclusive conferência parcial.
- [ ] Lotes com unidade/referência, validade opcional, origem da data, estado e local.
- [ ] Entradas iniciais, descarte e correção por movimentos, com motivo e idempotência.
- [ ] Saldo transacional não negativo, autorização e histórico.

Aceite: saldo reconcilia com movimentos; repetir operação não duplica; dois usuários não compartilham lotes; quantidades desconhecidas ficam explícitas. Não exigir preenchimento de todos os alimentos para usar o app.

## E06 — Planejar compras

- [ ] Ciclo semanal/mensal/manual e período explícito, sem dia padrão obrigatório.
- [ ] Expandir refeições e projetar alocação por data com FEFO e compatibilidade.
- [ ] Mostrar demanda, saldo considerado, falta, incertezas e primeira data de falta.
- [ ] Persistir snapshot da lista, ajustes e data de cálculo; detectar desatualização.
- [ ] Embalagem opcional e arredondamento explicado; recalcular sem apagar ajustes.

Aceite: exemplo dos 14 ovos/5 em estoque resulta em falta 9; lote vencendo antes do uso não cobre essa data; desconhecido não vira zero; gerar listas não altera estoque. Testar a matriz de regras aplicável em PostgreSQL.

## E07 — Confirmar compras

- [ ] Recebimento parcial e avulso, com quantidades reais e separação de lotes.
- [ ] Transação idempotente com confirmação revisável antes de envio.
- [ ] Estados da lista, progresso de recebimento e estorno validado.

Aceite: recebimento de 6 itens numa falta de 9 cria entrada de 6; repetir requisição não soma novamente; cancelamento da lista não apaga o que já foi recebido.

## E08 — Consumo e preparo

- [ ] Confirmar consumo por ocorrência com quantidades reais e lotes sugeridos.
- [ ] Preparo simples com entradas RAW e saída COOKED explícita, sem rendimento inventado.
- [ ] Consumir lotes preparados sem voltar a baixar ingredientes de origem.
- [ ] Tratar falta real de saldo, confirmação concorrente e estorno de preparo.
- [ ] Integrar ocorrências consumidas/puladas à demanda restante.

Aceite: preparar hoje e comer amanhã não duplica baixa; falha intermediária reverte tudo; duas saídas concorrentes não deixam saldo negativo. Receitas compostas ficam fora desta entrega.

## E09 — Validade e alertas

- [ ] Dashboard com faltas até próxima compra, lotes próximos do prazo e datas desconhecidas.
- [ ] Abrir, mover, preparar e descartar com revisão explícita de data, sem extensão automática.
- [ ] Fluxo curto para conferir saldo e corrigir divergências.
- [ ] Revisão integrada de projeção com preparados, vencimentos e listas antigas.

Aceite: avisos explicam o motivo e levam à ação; não garantem segurança alimentar; não existem prazos gerados por IA. Sem push, e-mail ou monitor externo.

## E10 — Pronto para demonstrar publicamente

- [ ] Testes de jornada completa, autorização e concorrência em PostgreSQL.
- [ ] Validação visual em computador e celular (incluindo teclado, contraste e zoom).
- [ ] Política de dados e exclusão de conta; recuperação de acesso e limites de tentativas antes de uso real.
- [ ] HTTPS, secrets de deploy, sessão/CSRF e origem de produção revisados.
- [ ] Backup e restauração do banco verificados; logs sem senhas/dados alimentares desnecessários.
- [ ] Dados de demonstração isolados, screenshots, README e vídeo/roteiro do portfólio.
- [ ] Escolher hospedagem só após medir a base; obter aceite antes de contratar serviço pago.

## Uso econômico da IA

Preferência: GPT-6.1 leve para implementação rotineira; médio para desenho de funcionalidade; revisão pontual em alto para segurança, transações e projeção. Isso é um fluxo recomendado, não mudança automática das configurações do modelo.

Sem cotas de horas/mensagens prometidas. Consultar limites disponíveis ao organizar sessões maiores; não confundir assinatura do Codex com orçamento de hospedagem ou API. A aplicação não fará chamadas de IA no MVP.

Uma sessão deve ter um objetivo, uma verificação proporcional e um registro de continuidade. Manter decisões nestes arquivos evita reexplicar o projeto e refazer implementações. Não gerar imagens nem executar múltiplos agentes sem necessidade/autorização. Não repetir testes já aprovados se nada relevante mudou.

## Decisões assumidas, revisáveis sem bloquear o início

Interface pt-BR; estoque individual; entrada manual da dieta; ciclo sugerido de sete dias; validade opcional; aviso de proximidade padrão três dias; sem rendimento automático; sem funções pagas de terceiros. Preferências serão ajustáveis pelo usuário. E02 concluída. Não há dúvida de produto bloqueando E03.
