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

POST /api/onboarding/scenario: conta vazia, carga explícita e única. Repetição não duplica dados. Disponível fora do perfil prod, sempre autenticado e com CSRF.

Erros: 400 validação/parâmetros; 401 sessão ausente; 403 CSRF; 404 recurso ausente ou de outra conta; 409 conflito de versão/chave/saldo/estado. Respostas não incluem senha, hash ou stack trace.
