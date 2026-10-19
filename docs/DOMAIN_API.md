# API de dieta, estoque e compras

Todas as rotas abaixo exigem sessão. A identidade vem da sessão; nenhum userId é aceito para escolher proprietário. Escritas exigem CSRF obtido em GET /api/auth/csrf e enviado no headerName retornado.

Datas de calendário: YYYY-MM-DD. Instantes: UTC. Quantidades: strings decimais positivas, até seis casas; contagem somente inteira. g/ml/unidade são as unidades de saldo. RAW, COOKED e AS_SOLD são referências distintas.

## Dieta

| Método | Rota | Corpo / efeito |
|---|---|---|
| GET | /api/plan?date=YYYY-MM-DD | Plano vigente, versão global e datas de revisões |
| PUT | /api/plan | version, effectiveFrom, meals |
| GET | /api/schedule?date=YYYY-MM-DD | Ocorrências no fuso do perfil |
| POST | /api/schedule/skip | date, mealId, skipped; sem movimento de estoque |

Refeição: id lógico opcional na criação, name, time HH:mm, days (1 segunda a 7 domingo), items. Item: foodId, quantity, unit, basis. A revisão começa hoje ou no futuro; preserva snapshots de ocorrências confirmadas/puladas. Versão desatualizada retorna 409.

## Estoque

| Método | Rota | Corpo / efeito |
|---|---|---|
| GET | /api/inventory | lots, accounts, history (100 operações recentes) |
| PUT | /api/inventory/knowledge | foodId, basis, knowledge KNOWN/UNKNOWN/PARTIAL |
| PUT | /api/inventory/lots/{id} | version, location, condition, expiry, expirySource, openedDate, preparedDate |
| POST | /api/inventory/entries | Entry; registra lote e movimento |
| POST | /api/inventory/discards | lotId, quantity, unit, reason |
| POST | /api/inventory/preparations | foodId, inputQuantity, inputUnit, output Entry |
| POST | /api/inventory/consumptions | date, mealId, items com quantidades reais |
| POST | /api/inventory/reversals | operationId; movimento compensatório |

Os cinco comandos POST de estoque exigem Idempotency-Key (8–80 letras/dígitos/hífen/underscore). Mesma chave e mesmo corpo retornam o resultado anterior; reutilização com outro corpo/tipo retorna 409. Todas as escritas são transacionais; conta bloqueada antes de consultar a chave e movimentar lotes. Saldo negativo e lote estrangeiro são rejeitados.

Entry: foodId, basis, quantity, unit, location PANTRY/FRIDGE/FREEZER, condition SEALED/OPENED/PREPARED, receivedDate, expiry opcional, expirySource LABEL/USER/ESTIMATE/UNKNOWN, openedDate e preparedDate opcionais, knowledge. Data ausente exige UNKNOWN; abertura/preparo exigem suas datas quando aplicável. Alterar armazenamento não modifica quantidade nem estende validade.

Preparo simples usa RAW e gera COOKED do mesmo alimento, com input e output medidos. Consumo usa somente a referência informada e aplica FEFO, excluindo lotes vencidos antes do dia de uso. Lotes sem validade ficam após lotes datados; não se presume segurança alimentar.

## Compras

GET /api/shopping/preferences retorna cycle, weekday, monthDay e nextPurchase no fuso do perfil. PUT na mesma rota recebe cycle WEEKLY/MONTHLY, weekday 1–7 e monthDay 1–31. A próxima data é posterior a hoje; dia mensal ausente no mês é ajustado ao último dia. O ciclo é pessoal e o período da projeção pode ser alterado manualmente.

| Método | Rota | Corpo / efeito |
|---|---|---|
| GET | /api/shopping/projection?from=...&until=... | Demanda, saldo, cobertura, falta, primeira falta e avisos |
| GET | /api/shopping/lists | Até 30 listas recentes |
| POST | /api/shopping/lists | from, until; salva snapshot sem estoque |
| GET | /api/shopping/lists/{id} | Lista, versão, ajustes, recebidos e stale |
| PUT | /api/shopping/lists/{id} | version, adjustments e status |
| POST | /api/shopping/lists/{id}/recalculate | version; mantém ajustes dos itens remanescentes |
| POST | /api/shopping/receipts | listId opcional, entry; exige Idempotency-Key |

from é inclusivo, until é a próxima compra e é exclusivo; período de até 366 dias, a partir de hoje. Apenas ocorrências pendentes geram demanda. Validade é considerada na data de cada uso. Projeção e lista não reservam nem movimentam estoque.

adjustments mapeia foodId:basis para quantidade decimal planejada. status: DRAFT, PARTIAL, COMPLETED, CANCELLED. Encerrar/cancelar não desfaz recebimentos. Cada recebimento pode conter um lote, permitindo entradas parciais e múltiplos produtos/lotes. Sem listId, é uma compra avulsa. Uma lista encerrada/cancelada rejeita novos recebimentos; uma encerrada pode ser reaberta pela edição de status.

stale indica mudanças relevantes desde o cálculo ou início do período já passado. Recalcular atualiza a necessidade com o estoque atual, mantendo ajustes manuais dos itens remanescentes. Recebidos são um registro separado; não se deve descontá-los novamente da falta recalculada.

## Cenário fictício local

POST /api/onboarding/scenario?type=basic ou type=hypertrophy: conta vazia, carga explícita e única. Repetição não duplica dados. Disponível fora do perfil prod, sempre autenticado e com CSRF.

Erros: 400 validação/parâmetros; 401 sessão ausente; 403 CSRF; 404 recurso ausente ou de outra conta; 409 conflito de versão/chave/saldo/estado. Respostas não incluem senha, hash ou stack trace.

## Uso diário e substituições — V10

`/conta/dieta` e `/conta/agenda` mostram cartões ordenados por horário, resumo do dia e confirmação de consumo. `/conta/dieta?editar=1` mantém o editor completo de revisões. O painel de troca abre ao lado no computador e pela parte inferior no celular, com foco contido e fechamento por Escape.

- GET /api/plan/substitutions?date=AAAA-MM-DD&mealId=UUID&itemIndex=N retorna fingerprint da refeição, versão da regra, permissão e alternativas com porção/unidade/estado e saldo registrado.
- PUT /api/plan/substitutions: date, mealId, itemIndex, fingerprint, version, enabled, alternatives (foodId, quantity, unit, basis). Até dez alternativas. A regra pertence ao alimento/estado de uma refeição lógica e à porção original. Alterar essa porção exige revisar a configuração. Não há equivalência nutricional automática.
- POST /api/schedule/substitute: requestId (UUID), date, mealId, itemIndex, fingerprint, ruleVersion, alternativeIndex e scope (ONCE ou NEXT). Repetir requestId com o mesmo corpo não reaplica; outro corpo gera conflito.
- POST /api/schedule/substitute/undo: actionId. Valida estado/versão antes de desfazer. Nunca desfaz silenciosamente edições posteriores.

ONCE cria uma exceção somente para aquela refeição/data. NEXT salva uma revisão da dieta a partir da data escolhida e respeita revisões futuras já agendadas; exceções individuais dos outros dias continuam preservadas. Se a refeição escolhida tem uma exceção diferente da dieta, é necessário desfazê-la antes de alterar as próximas. Registros consumidos/pulados permanecem snapshots.

Trocas só são permitidas hoje ou no futuro em refeições pendentes. Alimentos de outra conta, arquivados, repetições e unidades incompatíveis são rejeitados. Uma alternativa já presente na refeição fica indisponível. Configuração com permissão desativada mantém alternativas para futura revisão.

Exceções entram na projeção de compras e no hash que sinaliza listas desatualizadas. Trocar/configurar/desfazer troca não movimenta estoque. O consumo confirma os alimentos efetivamente previstos após a troca. Estornar consumo devolve os lotes e mantém a exceção do dia. A exclusão da conta remove também regras, exceções e ações.

O saldo mostrado considera alimento, estado, data de recebimento e vencimento conhecido. Não é reserva nem garantia de conservação; saldo desconhecido/parcial é identificado e validade desconhecida precisa ser conferida.

## Contrato da versão 1.0 — V11

Cadastro aceita role CLIENT (padrão) ou NUTRITIONIST. GET /api/me retorna role. PATCH /api/me não altera o papel, o e-mail ou o plano. Profissionais são autodeclarados nesta demonstração, sem verificação de registro profissional.

### Acompanhamento

- GET /api/care: vínculos e convites destinados ao cliente autenticado.
- POST /api/care/{id}/accept: aceita convite pendente não expirado destinado ao próprio e-mail. No máximo um vínculo ativo por cliente.
- POST /api/care/{id}/revoke: cliente ou profissional participante revoga/recusa o vínculo; resposta 204. Dieta e resultados permanecem com o cliente.
- GET /api/results: avaliações do próprio cliente, somente leitura.
- GET/POST /api/professional/clients: lista vínculos próprios ou cria convite (name, email). Convites internos duram sete dias e não enviam e-mail.
- GET /api/professional/clients/{client}/profile: id, nome e fuso do cliente com vínculo ativo.
- GET/PUT /api/professional/clients/{client}/plan: mesmo contrato de revisão de dieta, sempre com vínculo ativo.
- GET/POST /api/professional/clients/{client}/foods: catálogo do cliente; escrita recebe name, unit, category, purchaseFrequency.
- GET /api/professional/clients/{client}/schedule?date=AAAA-MM-DD: refeições do cliente.
- GET/PUT /api/professional/clients/{client}/plan/substitutions: mesmo contrato de alternativas. Saldos de estoque não são expostos ao profissional.
- GET/PUT /api/professional/clients/{client}/results: avaliação por mês (date, version, weight, height e waist opcionais, goal, notes). Peso em kg e medidas em cm. Datas futuras são rejeitadas. Um mês existente exige sua versão atual. Autor registrado em cada avaliação.

Toda leitura/escrita profissional verifica vínculo ativo e proprietário. Escritas bloqueiam a conta do cliente e revalidam o vínculo sob o bloqueio; a revogação usa o mesmo bloqueio. Um profissional não pode acessar clientes de outro profissional nem vincular sem aceite. Excluir a conta profissional remove vínculos e preserva avaliações do cliente com nome do autor; excluir o cliente remove seu histórico.

Cliente não pode escrever /api/plan, /api/foods ou /api/plan/substitutions. Substituições do cliente são somente ONCE e apenas entre opções liberadas; NEXT e desfazer de revisão recorrente exigem perfil profissional. O cliente não edita avaliações. Regras também são verificadas na API, independentemente da tela ou query string.

### Recursos e registro opcional de refeições

- GET /api/features: role, tier BASIC/PREMIUM, inventoryAllowed, inventoryEnabled, reviewRequired.
- POST /api/features/inventory: enabled, reviewed. Ativar exige Premium e confirmação de conferência de saldos. Desativar não zera ou movimenta saldos.
- GET /api/features/inventory-review: saldos da própria conta Premium para conferência, inclusive com controle desativado.
- POST /api/demo/features: tier BASIC/PREMIUM, apenas ambiente não prod e usuário autenticado. Simula plano, sem pagamento. Não disponível em produção.
- POST /api/meals/checkins: requestId UUID, date, mealId, items (foodId, quantity, unit, basis das porções exibidas). Divergência com a dieta atual retorna conflito, sem baixa. Resposta id/mode/message. Repetição do mesmo requestId/corpo não duplica.
- POST /api/meals/checkins/undo: id do registro próprio. Modo ONLY remove apenas o registro, mesmo após ativar estoque. Modo INVENTORY estorna a operação original e exige estoque ativo/conferido se houve desativação posterior.

BASIC ou controle desativado bloqueia /api/inventory e /api/shopping, incluindo preparo, entradas e estornos. Escritas também revalidam a ativação dentro da transação sob o bloqueio da conta. ONLY não consulta/exige/baixa estoque; INVENTORY usa as porções e os lotes existentes. Nenhuma ativação baixa refeições retroativamente. Não registrar uma refeição não significa que ela não foi realizada.

Contas novas iniciam em CLIENT/BASIC com estoque desativado. A migração preserva Premium e ativação dos usuários preexistentes para não apagar acesso/saldos. O script da demonstração muda apenas seu cliente fictício para Básico; nunca a conta pessoal.

## Medidas opcionais da avaliação (V12)

PUT /api/professional/clients/{id}/results aceita também bodyFat (0 a 100, percentual), arm, thigh, calf e hip (1 a 300, centímetros), todos opcionais com até duas casas decimais. Campos ausentes/nulos são gravados como não informados. GET profissional e GET /api/results retornam esses campos. waist continua representando a cintura em centímetros. Versão mensal e autorização permanecem obrigatórias; o cliente não ganha permissão de escrita.

A interface compara apenas valores informados com a avaliação anterior disponível, inclusive quando há meses sem avaliação. Variação de gordura é expressa em pontos percentuais. Diferenças não classificam melhora/piora ou estado nutricional. Não há cálculo automático de gordura ou integração de relatórios.
