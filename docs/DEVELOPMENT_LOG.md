# Diário de desenvolvimento

## 2026-10-16 — Entrega 01: base local

Objetivo: iniciar interface, API e PostgreSQL com uma demonstração integrada e documentar como reproduzir.

Implementação: estrutura gerada com Vite e Spring Initializr, dashboard responsivo, plano fictício, catálogo de exemplo, migração SQL, repositório JPA, rota de leitura e scripts PowerShell.

Ambiente instalado: Node.js LTS, Temurin JDK 21, PostgreSQL 17 e GitHub CLI. Maven disponibilizado pelo Wrapper. Docker não é necessário para este fluxo.

Validação realizada: build TypeScript/Vite passou; dois testes Java passaram; API local e proxy do Vite retornaram as quatro refeições do PostgreSQL; saúde da API retornou UP. Marcação de refeição verificada no navegador.

GitHub autenticado na conta LuisFernandoRodriguesDePaula. Repositório do portfólio: `LuisFernandoRodriguesDePaula/dieta-facil`. Autor dos commits configurado somente neste repositório.

Pendente de ambiente: renomear a pasta física após encerrar os processos que a mantêm aberta. O nome do produto no código é Dieta Fácil. Layout com regras responsivas implementadas; revisão visual desta entrega realizada em viewport de computador, sem validação em aparelho físico.

Próxima tarefa: autenticação e modelo definitivo do domínio. Compras e preparo permanecem identificados como funcionalidades futuras.
