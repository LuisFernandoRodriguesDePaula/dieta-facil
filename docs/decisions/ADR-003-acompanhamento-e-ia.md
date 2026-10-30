# ADR-003 — Evolução modular e atendimento contextual supervisionado

Data: 29/10/2026. Decisão de arquitetura aceita para orientar próximas entregas; implementação pendente.

## Contexto

O projeto passou de rotina doméstica com estoque opcional para dieta supervisionada e acompanhamento. Após disponibilização aos nutricionistas, surgiu demanda de macros; o proprietário priorizou atendimento IA, expansão inspirada na Wellts e visual leve. A base atual funciona em monólito e possui vínculo aceito entre profissional e cliente.

## Decisão

1. Preservar monólito modular Java/Spring, PostgreSQL e React; evoluir por fatias do plano F00–F13, sem migração de stack nem microserviços antecipados.
2. Introduzir escopo de organização/membro de modo incremental, preservando propriedade do cliente e relação ativa. Autorização e liberação comercial permanecem verificações distintas.
3. Nutrientes são dados versionados com origem; cálculo determinístico no servidor, incompletude explícita, histórico preservado. IA não calcula nem completa valores desconhecidos.
4. Caixa de dúvidas e orientações publicadas precedem integração real. Adotar Responses API e GPT-6 Luna como candidato inicial em modo rascunho; adapter simulado para desenvolvimento sem chave. Conversas no banco próprio, contexto mínimo e ferramentas somente de leitura; Conversations opcional após decisão de retenção.
5. O nutricionista aprova mudanças e respostas do primeiro piloto. Automação só para escopos avaliados, com desligamento e encaminhamento. Nenhuma IA modifica dieta, autoriza trocas novas ou movimenta estoque.
6. White/verde-água por tokens e acessibilidade; manter componentes aprovados e introduzir navegação somente com entregas funcionais. Plano completo inclui gestão, financeiro e integrações, mas IA começa antes desses módulos.
7. Workers/outbox no mesmo backend, idempotência e orçamento reservado antes da chamada externa. Não segurar transações do domínio aguardando provedor.

## Alternativas consideradas

- Copiar todos os módulos de uma referência imediatamente: escopo grande e sem validação; manter cobertura no backlog com entregas graduais.
- Usar IA para macros e conversões: baixa rastreabilidade; usar referências/fórmulas verificáveis.
- Chat autônomo desde a primeira entrega: erros de prescrição/privacidade; iniciar supervisionado e avaliar.
- Memória apenas no provedor: simplifica estado, mas dificulta controle de histórico/retensão; preferir banco próprio inicialmente e documentar retenção externa residual.
- Vetores/RAG de documentos como requisito: desnecessário para plano e orientações estruturados; avaliar quando houver acervo que justifique busca documental.

## Consequências

Exige modelo de fontes e snapshots, política de visibilidade, revisão profissional e avaliação contínua. Novos módulos precisam de isolamento e migração sem reescrever V1–V12. Custos e serviços externos não são contratados por esta decisão. Oportunidade comercial é hipótese, não evidência de adoção. Referências: [plano](../EVOLUCAO_PRODUTO.md), [IA](../AI_ASSISTANT.md), [nutrientes](../NUTRIENTES.md), [feedback](../FEEDBACK_EVOLUCAO.md).
