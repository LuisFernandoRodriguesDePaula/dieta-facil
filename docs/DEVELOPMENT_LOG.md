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

## 2026-10-16 — E02: cadastro, acesso e perfil

Implementado: migração users; cadastro com e-mail normalizado, senha BCrypt e validação de fuso; login JSON, renovação de sessão/CSRF, logout e perfil GET/PATCH vinculado à sessão. Cookie HttpOnly/SameSite=Lax; perfil prod exige Secure. Interface de cadastro/login/conta com formulários validados, erros, sessão ausente/expirada e limpeza do cache pessoal.

Validação: seis testes Java passaram no fluxo padrão; cinco testes de interface passaram; build de produção passou. Quatro testes HTTP de autenticação passaram também com PostgreSQL 17 local, aplicando V2. Casos incluem duas contas, persistência entre logins, senha em hash, CSRF ausente/antigo, login inválido, e-mail duplicado, fuso inválido, senha Unicode acima de 72 bytes, logout e cookie de sessão inválido. A expiração temporal de 30 minutos não foi aguardada: o tratamento foi testado por 401 e cookie inválido. Perfil prod validou flags de cookie, não TLS real.

No navegador, login com conta fictícia criada pelos testes, atualização de nome e logout funcionaram. Formulário de cadastro revisado no desktop e em frame com viewport de 390 px, sem aparelho físico. Conta fictícia usa domínio example.invalid; screenshots não contêm dados pessoais reais. Nenhuma senha/cookie foi adicionada ao repositório.

Limites: sem recuperação de senha, verificação de e-mail ou mitigação completa de abuso para abertura pública. Sessões em memória são perdidas ao reiniciar. Catálogo/dieta/estoque pessoais ainda não existem. Próxima entrega: E03, catálogo pessoal e conversões de unidades.

## 2026-10-16 — E03: catálogo pessoal e unidades

Implementado: migração V3 foods, consultas paginadas por usuário, busca literal sem distinguir caixa, criação/edição com categoria e frequência, arquivamento/restauração e bloqueio de alteração da dimensão. Atualizações usam versão para evitar sobrescrita. APIs de leitura/escrita/arquivamento/conversão verificam o proprietário. Quantidades são convertidas com BigDecimal; o endpoint preserva a referência e rejeita dimensões incompatíveis ou contagem fracionada.

Interface: página pessoal em /conta/alimentos, formulário com validação, busca, abas de ativos/arquivados, confirmação de arquivamento com foco e teclado, restauração, conversor e estados vazio/carregando/erro. Falha por sessão expirada remove a área pessoal; conflito de versão mantém o formulário e oferece recarga explícita. Hook de sessão compartilhado com a área de acesso.

Validação: conjunto completo de 13 testes Java e 11 testes de interface aprovado; os 7 testes de alimentos/conversões também passaram no PostgreSQL local, incluindo V3. Build TypeScript/Vite aprovado. No navegador, conta fictícia cadastrou Arroz integral e Banana, arquivou/restaurou Banana e converteu 1,5 kg em 1500 g com referência RAW. Catálogo/formulário revisados em frame de 390 px, sem aparelho físico. Página temporária de QA removida.

Limites: ainda não existe estoque, dieta pessoal nem receitas. Nomes repetidos são permitidos; busca não normaliza acentos. Sem teste de carga ou corrida real de threads nesta entrega; versão desatualizada foi exercitada por HTTP. Próxima tarefa: E04 — plano alimentar, revisões, refeições, itens e agenda por dia.
