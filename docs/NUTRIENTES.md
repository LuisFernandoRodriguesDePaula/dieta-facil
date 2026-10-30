# Nutrientes — modelo e aceite propostos

Estado: planejado, F02/F08 do [plano](EVOLUCAO_PRODUTO.md). O cadastro atual não calcula macros.

## Cadastro e preenchimento

Proposta híbrida: manual por rótulo/informação do profissional primeiro; busca de catálogo autorizado depois. Nome semelhante não basta para preencher automaticamente: distinguir descrição, marca quando relevante e estado cru/cozido/como vendido. O profissional seleciona e confirma a referência, sem correspondência silenciosa ou valores gerados pela IA.

Campos nutricionais em seção opcional do alimento: quantidade de referência positiva, unidade (g/ml/unidade), proteínas, carboidratos, gorduras (g), energia (kcal), fibra opcional, origem, identificador/versão da fonte e data de revisão. Distinguir ausente, zero conhecido e, quando a base trouxer, traço/abaixo do limite; não converter traço em zero exato. Se a fonte distinguir carboidratos disponíveis e totais, preservar definição para não misturar somas incompatíveis.

Uma referência direta por 100 ml pode ser usada em ml; base por 100 g exige densidade explícita para volume. Ovos/unidades exigem massa comestível ou referência nutricional por unidade; colher/xícara exige medida definida. Nenhuma conversão supõe ml = g. Não derivar valor de alimento cozido do cru sem método e fatores aprovados. Valores de bases são estimativas de composição, não medição daquela porção individual.

F02 não copia bases externas. A [TBCA](https://www.tbca.net.br/) é candidata, com valores por parte comestível e descrições de preparo; acesso público não estabelece, por si, permissão de redistribuição comercial. Antes de integrar, registrar licença/termos, atribuição, versão, formato, atualização e autorização quando necessária. TACO/USDA ou dados de rótulos também exigem procedência e análise de adequação. Usar dados fictícios ou fornecidos pelo profissional no piloto.

## Modelo lógico

`food_nutrient_revisions`: proprietário/organização, foodId, basis, referência, nutrientes nullable, fonte, método e versão imutável. Conversões/medidas próprias versionadas separadamente. `plan_item_nutrient_snapshots` referencia revisão e registra fatores necessários. Os nomes são proposta; numeração Flyway será a próxima livre, sem editar V1–V12 já aplicadas.

Alimentos antigos migram sem nutrientes conhecidos. Revisar o catálogo não altera silenciosamente dietas e registros históricos: nova dieta usa referência nova após revisão; a ativa pode indicar atualização disponível. Separar total da prescrição, total do dia após trocas e snapshot do registro consumido. Não apresentar dieta planejada como consumo real.

## Cálculo no servidor

Para cada nutriente: `porção convertida / referência × valor de referência`. Calcular com BigDecimal e precisão interna definida; somar antes de arredondar para exibição. Servidor é autoridade; cliente só apresenta resultado/preview consistente. Retornar completude por nutriente, itens sem referência e versão do cálculo.

Exemplo matemático fictício: referência de 100 g com 20 g de proteína → 150 g contribuem 30 g. Se outro item não tiver proteína cadastrada, o resultado é subtotal conhecido de 30 g, não total completo. Energia usa a fonte informada; estimativa 4/4/9, se oferecida, deve ser opção identificada, nunca substituir silenciosamente energia do rótulo (fibras e outros componentes podem produzir diferenças).

Somar itens principais uma única vez; alternativas não entram cumulativamente. A troca selecionada substitui somente o item/porção da ocorrência e recalcula seus nutrientes. Não criar autorização automática por igualdade de calorias/macros. Metas só são definidas pelo nutricionista; não gerar a partir de peso/objetivo sem prescrição.

## Contratos sugeridos e interface

Estender alimentos com revisão de nutrientes e adicionar consulta de totais de plano/ocorrência: `totals`, `completenessByNutrient`, `missingItems`, `sourceVersions`, `calculationVersion`. Escrita exige versão esperada; 409 preserva alterações para revisão. A migração não muda unidade nem saldos de estoque.

Card fechado: resumo pequeno de P/C/G/kcal e indicação de parcial. Ao abrir, detalhes por alimento e fonte. Resumo diário diferencia planejado de registrado. Fonte e conversões ficam no detalhe; não adicionar uma tabela extensa ao topo. Navegação e leitura não dependem apenas da cor.

## Testes de aceite

- Porção proporcional, decimais, soma antes de arredondar, quantidades/unidades inválidas.
- Zero conhecido versus ausente/traço; subtotal parcial por nutriente; alimento sem composição continua utilizável.
- Unidade com massa, volume com/sem densidade, estado incompatível e conversão ausente.
- Alternativa selecionada substitui sem duplicar; nenhuma alternativa altera permissões.
- Atualizar catálogo preserva planos/snapshots antigos; edição concorrente e isolamento entre organizações/clientes.
- Dados antigos e Básico continuam sem movimentação de estoque; totais legíveis em 320px.

Critério: dados de exemplo revisados por nutricionista, fórmulas cobertas em H2/PostgreSQL e uma jornada de cadastro → refeição → troca → total → histórico. Não ativar preenchimento por catálogo até resolver sua licença e correspondência.
