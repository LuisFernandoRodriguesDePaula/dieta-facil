# ADR-002 — Plano vigente e operações transacionais
Data: 2026-10-17. Escopo: E04–E09, demonstração local integrada.

Um plano ativo por conta, com revisões datadas. Salvar a dieta recebe a revisão completa e a versão atual; refeições preservam uma chave lógica entre revisões, duplicação cria nova chave. Revisões antigas não são editadas retroativamente. Ocorrências confirmadas guardam snapshot e chave estável usuário/refeição/data. Leituras não movimentam estoque.

Os módulos de plano e estoque usarão JdbcTemplate para SQL explícito e tabelas normalizadas, mantendo JPA nos módulos já existentes. Compartilham DataSource e transações Spring; esta escolha facilita revisar alocações e locks. Não migrar o catálogo existente sem necessidade.

Mutações bloqueiam primeiro a linha do usuário, serializando escritas da mesma conta, e depois lotes em ordem estável. É uma escolha simples para o uso doméstico inicial; medir antes de otimizar. Idempotência é persistida na mesma transação dos movimentos. Nenhum saldo negativo ou gravação parcial é aceitável.

Estoque possui três estados de conhecimento (KNOWN/UNKNOWN/PARTIAL), lotes com referência/unidade canônica e movimentos imutáveis. Projeção é separada do saldo real. Validade desconhecida é explicitada e não certifica conservação.

Demonstração local antes de qualquer deploy. Nenhuma alteração no projeto Portfólio é necessária ou autorizada por esta entrega.

