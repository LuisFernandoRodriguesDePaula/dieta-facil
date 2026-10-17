# Estoque, compras e preparo — regras aprovadas para implementação

Revisão: 2026-10-16. Este documento descreve comportamento planejado. A base atual continua demonstrativa.

## 1. Jornada e cadastros

1. Criar conta e confirmar o fuso sugerido pelo navegador (fallback America/Sao_Paulo).
2. Cadastrar alimentos e refeições manualmente, com duplicação e cópia de dias. Sem importação por IA no MVP.
3. Informar estoque dos alimentos: quantidade conhecida, zero confirmado ou desconhecido. Permitir pular essa etapa com previsão identificada como incompleta.
4. Escolher ciclo de compras; sugerir sete dias inicialmente. Segunda-feira é um exemplo, não uma imposição.
5. Conferir necessidade e faltas; confirmar a lista não muda o estoque.
6. Ao comprar, informar quantidades reais; confirmação cria lotes e entradas.
7. Registrar preparo/consumo e corrigir diferenças quando necessário.

Uma conta administra um estoque pessoal. Planejamento familiar fica para depois. Não exigir validade para salvar uma compra; mostrar que ela está desconhecida.

## 2. Unidades e referências

- Quantidades positivas em decimal exato (`BigDecimal`/`NUMERIC`), nunca ponto flutuante para saldos.
- Bases canônicas: g para massa, ml para volume, unidade para contagem. kg/g e L/ml são conversões exatas; não converter massa em volume sem conversão explícita.
- Contagem inteira no MVP; alimentos fracionáveis devem usar massa/volume. Embalagem é uma apresentação comercial, separada da unidade do alimento.
- Itens e lotes têm referência RAW, COOKED ou AS_SOLD. Apenas o mesmo alimento, unidade compatível e referência podem ser conciliados diretamente.
- Arroz cru não cobre arroz cozido automaticamente. Sem rendimento explícito, apresentar incompatibilidade e pedir a referência correta.
- Fatores de preparo devem identificar entradas e saída medida/informada. Não tratar estimativa como rendimento nutricional validado.

## 3. Datas e projeção

Períodos na tela incluem data inicial e final. Internamente, usar intervalo [início, fim exclusivo); segunda a domingo equivale a segunda até a segunda seguinte exclusiva. Não somar a próxima segunda duas vezes.

Horários das refeições são locais; calendário usa o fuso do perfil. Movimentos guardam instante UTC e data operacional local. Plano ativo e revisões têm vigência; alteração vale de uma data escolhida em diante e não reescreve consumo passado.

A necessidade é calculada por ocorrência real (data + refeição). Ocorrências consumidas ou explicitamente puladas não entram novamente na demanda restante. Refeição passada sem confirmação fica como pendente: o usuário escolhe consumir, pular ou reagendar; o aplicativo não baixa estoque retroativamente. Mostrar pendências separadas da previsão futura.

Algoritmo de projeção:

1. Capturar revisões do plano, saldos e eventos na versão atual.
2. Expandir as ocorrências do período e ordenar por data/hora.
3. Para cada demanda, alocar saldo projetado compatível por lote, priorizando o menor prazo conhecido (FEFO); desempatar por entrada e id.
4. Retirar da projeção lotes descartados, indisponíveis ou vencidos antes da data da demanda. Isso não remove fisicamente o saldo: gera alerta para descarte/correção.
5. Lote com validade desconhecida pode compor cenário estimado, com alocação depois dos lotes datados e aviso visível. Não rotular essa cobertura como garantida. Lote com data informada também não é certificado de segurança.
6. Registrar falta por ocorrência; agregar para compras por alimento e referência. Informar motivo: saldo insuficiente, vencimento, incompatibilidade ou informação ausente.

Data de validade informada: o lote participa do cálculo até essa data inclusive, com aviso de uso no último dia. O aplicativo não afirma que alimento está seguro; datas estimadas ou desconhecidas têm indicadores próprios. Abrir/congelar/preparar nunca estende prazo automaticamente.

Projeções são leituras: não reservam nem descontam estoque real. Listas abertas não reservam saldo. Mostrar data de cálculo e indicador de desatualização se plano/estoque mudar; recalcular explicitamente sem apagar ajustes do usuário.

## 4. Necessidade de compra

Sem validade e incompatibilidades, o caso simples é `falta = max(0, demanda - saldo utilizável)`. O caso geral deve usar a simulação por data acima, não uma subtração cega de totais.

Exemplo: 2 ovos por dia por 7 dias = 14; saldo conhecido de 5 = falta 9. Embalagem configurada com 12 unidades permite sugerir 12, mostrando sobra prevista de 3. Sem embalagem cadastrada, não inventar arredondamento. Margem de segurança padrão zero; ajuste manual fica separado do cálculo.

Cada linha guarda demanda, estoque alocado na projeção, falta calculada, ajuste manual, quantidade sugerida e quantidade efetivamente comprada. Ajuste pode reduzir a compra, mas deve indicar cobertura insuficiente. Quantidade final nunca negativa.

Estoque desconhecido não equivale a zero: mostrar necessidade bruta e solicitar conferência; pode sugerir cenário conservador, explicitamente sem desconto de estoque. Quando parte do saldo é conhecida e parte desconhecida, deduzir só a parte conhecida e manter a incerteza.

"Estoque baixo" significa falta antes da próxima compra, com data estimada da primeira falta. Ciclos semanais usam dia da semana; mensais usam dia do mês, limitando ao último dia do mês quando necessário. O intervalo manual sempre é possível. Classificações semanal/mensal por alimento são filtros, não prazos de conservação nem exclusões silenciosas da demanda.

## 5. Compras, entradas e correções

- Lista passa por rascunho, em compras, parcialmente recebida, concluída ou cancelada. Concluir não significa que todos os itens foram recebidos.
- Marcar visualmente uma linha não dá entrada. A ação "Confirmar compra" exige quantidade real por item e pode agrupar várias linhas em uma transação.
- Registrar recebimento parcial; compras adicionais usam novos identificadores. Duplo clique ou repetição da mesma solicitação retorna o mesmo recebimento, sem somar novamente.
- Cada recebimento cria lotes separados quando validade/local/estado diferirem; compras avulsas também são permitidas.
- Histórico de movimentos é imutável: correção usa movimento compensatório com motivo e vínculo à origem. Não apagar compras para corrigir saldo.
- Não permitir estornar uma compra se isso tornar negativo o lote já consumido. Solicitar reconciliação explícita; nunca reverter consumos silenciosamente.
- Alimento referenciado é arquivado, não excluído com cascata sobre histórico.

## 6. Saídas e preparo antecipado

Agendar ou marcar uma refeição como vista não altera saldo. Para registrar consumo, mostrar ingredientes, quantidades e lotes propostos; permitir correção antes de confirmar. Referenciar a ocorrência para impedir repetição.

Consumo direto usa lotes disponíveis da mesma referência. Uma refeição COOKED sem saldo preparado não baixa lote RAW automaticamente: oferecer registrar o preparo com entradas e saída explícitas, ou informar incompatibilidade.

Preparo antecipado é uma transformação atômica: baixa os lotes de ingredientes escolhidos e cria lote(s) preparado(s), com alimento/referência de saída e quantidade final informada. O usuário informa validade do preparado ou aceita deixá-la desconhecida. No MVP, suportar preparo de um alimento por operação (ex.: frango cru para frango preparado); receitas compostas e rateio nutricional ficam fora.

Ao consumir uma refeição com esse alimento preparado, baixar o lote preparado; nunca os ingredientes de origem novamente. A projeção primeiro cobre as ocorrências com lotes preparados. Planejamento de preparo pode mostrar entradas necessárias apenas com transformação explícita; sem ela, listar necessidades COOKED separadamente. Não deduzir equivalências a partir de texto ou misturar RAW/COOKED.

Desfazer preparo só é possível se os lotes de saída ainda puderem ser revertidos sem saldo negativo; reverter entradas e saídas juntas, com rastreabilidade. Descarte reduz saldo; editar local/estado não reduz saldo e mantém histórico.

## 7. Validade e armazenamento

Guardar data de compra, validade, origem da data (rótulo, usuário ou estimativa explícita), estado (fechado, aberto, preparado), local (despensa, geladeira, congelador) e datas de abertura/preparo.

Nunca preencher prazos universais por categoria. Mudar estado/local pede revisão do prazo, sem inventar uma nova data. Notificar dentro do aplicativo; push e tarefas externas não entram no MVP. O aviso "vence em breve" terá janela configurável (padrão de interface: 3 dias), sem representar prazo seguro de conservação.

Orientações de conservação ficam para uma entrega posterior: texto revisado, fonte, data da revisão, condições de aplicação e distinção de estimativa versus validade do rótulo. Sem geração de prazo por IA em tempo real.

## 8. Integridade e autorização

Toda operação filtra pelo usuário autenticado; IDs de lote, alimento, lista e ocorrência devem ter propriedade compatível. Movimentos e atualização de saldo ocorrem na mesma transação, bloqueando os lotes afetados em ordem determinística. Conflito de versão exige recarregar; nenhuma saída pode gerar saldo negativo.

Operações de compra, consumo, preparo e estorno recebem chave de idempotência com unicidade por usuário e operação. Mesma chave com payload diferente retorna conflito. O resultado persistido é reutilizado inclusive após reinício do processo.

Lotes guardam saldo materializado para validação transacional; movimentos são a trilha de origem e devem reconciliar com o saldo. Uma falha intermediária reverte toda a operação. Projeção trabalha com uma visão consistente; a confirmação de saída sempre revalida o saldo real.

## 9. Matriz mínima de aceite

| Caso | Resultado esperado |
|---|---|
| 2 ovos/dia por 7 dias, saldo 5 | Demanda 14, falta 9 |
| Segunda a domingo, refeição só segunda | Uma ocorrência |
| Intervalo com duas segundas | Duas ocorrências |
| Virada de mês, ano ou fuso | Datas locais e limites corretos |
| 1 kg + 500 g | 1500 g, sem erro de ponto flutuante |
| g versus ml; RAW versus COOKED | Sem conciliação automática |
| Quantidade desconhecida | Aviso de previsão incompleta, não zero confirmado |
| Lote vence antes da demanda | Não cobre essa demanda; saldo real continua até descarte |
| Validade desconhecida ou no último dia | Cenário/aviso explícito |
| Dois lotes com validades diferentes | Primeiro alocar o que vence antes |
| Gerar duas listas iguais | Nenhum movimento nem reserva de estoque |
| Confirmar 6 ovos da lista de 9 | Entrada 6, lista parcial, falta recalculável |
| Repetir recebimento com mesma chave | Nenhuma segunda entrada |
| Mesma chave com outro payload | Conflito |
| Consumo direto repetido | Uma única saída |
| Preparo RAW -> COOKED seguido de refeição | Ingredientes baixados uma vez; depois baixa do preparado |
| Duas saídas concorrentes acima do saldo | Uma é rejeitada; saldo nunca negativo |
| Estorno de lote já consumido | Bloqueio/reconciliação; não gerar negativo |
| Plano ou saldo muda após gerar lista | Lista sinalizada como desatualizada; ajustes preservados |
| Refeição pulada ou já consumida | Sem demanda futura duplicada |
| Outro usuário informa ID válido | Nenhuma leitura ou alteração de dados alheios |
