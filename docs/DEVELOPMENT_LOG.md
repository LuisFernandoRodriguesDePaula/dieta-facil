# Diário de desenvolvimento

## 2026-10-16 — Entrega 01: base local

Objetivo: iniciar interface, API e PostgreSQL com uma demonstração integrada e documentar como reproduzir.

Implementação: estrutura gerada com Vite e Spring Initializr, dashboard responsivo, plano fictício, catálogo de exemplo, migração SQL, repositório JPA, rota de leitura e scripts PowerShell.

Ambiente instalado: Node.js LTS, Temurin JDK 21, PostgreSQL 17 e GitHub CLI. Maven disponibilizado pelo Wrapper. Docker não é necessário para este fluxo.

Validação realizada: build TypeScript/Vite passou; dois testes Java passaram; API local e proxy do Vite retornaram as quatro refeições do PostgreSQL; saúde da API retornou UP. No navegador, foram verificadas marcação, troca de data, retorno ao dia atual e navegação para catálogo e compras. O script de banco foi validado com o cluster já iniciado. O primeiro workflow do GitHub Actions concluiu com sucesso em Linux.

GitHub autenticado na conta LuisFernandoRodriguesDePaula. Repositório do portfólio: `LuisFernandoRodriguesDePaula/dieta-facil`. Autor dos commits configurado somente neste repositório.

Pendente de ambiente: renomear a pasta física após encerrar os processos que a mantêm aberta. O nome do produto no código é Dieta Fácil. Layout com regras responsivas implementadas; revisão visual desta entrega realizada em viewport de computador, sem validação em aparelho físico.

Próxima tarefa: autenticação e modelo definitivo do domínio. Compras e preparo permanecem identificados como funcionalidades futuras.

## 2026-10-16 — P01: planejamento da evolução com estoque

Solicitação: transformar a análise de estoque, compras, preparo, validade e uso econômico da IA em um processo executável de evolução.

Escopo revisado: estoque e reposição por cobertura entram no MVP em entregas incrementais. Atualizados documento mestre, README e arquitetura; criados regras de negócio com matriz de aceite, modelo de domínio, ADR de autenticação e roadmap E02–E10.

Decisões: cadastrar dieta manualmente; diferenciar saldo conhecido/zero/desconhecido; compras só entram após recebimento confirmado; projeção por ocorrência com FEFO; movimentos transacionais/idempotentes; preparo cria saldo COOKED para evitar baixa duplicada; validade informada sem prazos gerados por IA. Sessão no servidor e CSRF planejados para E02.

Esta etapa altera apenas documentação. Nenhuma tabela, API ou funcionalidade de estoque/autenticação foi implementada. Validação: revisão de consistência e links locais, diff sem erros de whitespace; não é necessário repetir build/testes da aplicação por mudança exclusiva de Markdown.

Próxima tarefa executável: E02, começando pela migração de usuário/perfil e pelo contrato HTTP de autenticação. Detalhes em ROADMAP.md.
