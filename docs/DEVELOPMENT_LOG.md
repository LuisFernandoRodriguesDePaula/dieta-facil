# Diário de desenvolvimento

## Ponto de retorno ao encerrar a sessão

Em 2026-10-16, o usuário encerrou após E03 e solicitou retomada no dia seguinte. Estado, ambiente, preferências e primeira tarefa da E04 estão em [RETOMADA.md](RETOMADA.md). Nenhuma funcionalidade nova foi implementada neste checkpoint; mudança somente de documentação.

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

## 2026-10-17 — E04: API de dieta e agenda

Migração V4 e API autenticada para plano com revisões por data, refeições recorrentes por dia da semana, itens com quantidades exatas e agenda no fuso do perfil. Revisões usam versão global para evitar sobrescrita; refeições mantêm identidade lógica entre revisões. Refeições puladas preservam snapshot e não movimentam estoque. A edição começa hoje ou no futuro; dados de outra conta e alimentos arquivados são rejeitados.

Decisão ADR-002 registra JDBC no novo domínio, compartilhando transações com JPA, e a estratégia de bloqueio por conta para as próximas operações de estoque. Validação: 16 testes Java passaram no PostgreSQL local (incluindo três novos testes de planos); migração V4 aplicada. A base de estoque ainda será implementada.

## 2026-10-17 — E04: telas de dieta e agenda

Rotas pessoais /conta/dieta e /conta/agenda conectadas à API: refeições com horário/dias, duplicação, itens do catálogo, quantidades, unidades e referência; consulta por data e marcação/desmarcação de refeição pulada. Refeições vazias e dias ausentes são bloqueados. A conta oferece acesso às novas telas.

Validação: build TypeScript/Vite e 13 testes de interface aprovados, incluindo criação de revisão e refeição pulada sem chamada de estoque. A revisão visual em navegador e a jornada integrada serão realizadas antes de declarar a versão demonstrável concluída. Recuperação de senha e abertura pública continuam fora desta entrega.

## 2026-10-17 — E05/E08: estoque transacional

Migração V5, lotes por alimento/estado, saldo conhecido/parcial/desconhecido, armazenamento, validade com origem e datas de abertura/preparo. Entradas, descartes, preparo medido RAW → COOKED, consumo de ocorrência e estorno geram movimentos imutáveis. Repetição de chave com os mesmos dados retorna a operação existente; dados diferentes são rejeitados. Escritas são serializadas por conta, incluindo alterações do catálogo. Não há prazo de conservação inventado nem conversão automática de rendimento.

Validação: quatro testes de estoque passaram no PostgreSQL e no H2. Cobrem repetição, conflito de chave, preparo seguido de consumo sem nova baixa do cru, reversão bloqueada por saldo insuficiente, reversão após estornar consumo, isolamento entre contas, rollback integral e FEFO com lotes vencidos/sem validade. Interface ainda em integração; validação HTTP completa e navegador ficam para a conclusão da jornada demonstrável.

## 2026-10-17 — E06/E07: projeção e recebimento de compras

Migração V6, projeção diária da dieta pendente até a véspera da próxima compra, alocação FEFO por validade na data de uso e separação RAW/COOKED/AS_SOLD. Listas guardam snapshots, ajustes e versão; mudanças da dieta/estoque/saldo marcam o cálculo antigo. Recálculo preserva os ajustes dos itens remanescentes. Gerar lista e mudar seu status não movimentam estoque. Recebimentos parciais ou avulsos criam lotes somente com confirmação e chave idempotente; recebimentos estornados deixam de compor o total recebido da lista.

Validação: quatro testes adicionais passaram no PostgreSQL, incluindo duas threads simultâneas enviando a mesma entrada (um único movimento), 12 ovos com validade curta cobrindo apenas 4 dos 14 necessários, projeção/lista sem movimentos, compra parcial repetida, ajuste preservado no recálculo, estorno do recebimento e isolamento de listas. Ainda sem revisão visual da interface e sem concluir a entrega demonstrável.

## 2026-10-18 — Revisão da versão demonstrável

Concluída a revisão de armazenamento com versão de lote, sem alteração de quantidade ou extensão automática de validade. Preferência semanal/mensal com dia configurável persiste por conta (V8). O painel usa a próxima compra; o preparo apresenta totais do período, saldo preparado coberto e necessidade restante, sem inventar rendimento. A carga fictícia opcional (V7) exige conta vazia, é transacional e não é disponibilizada no perfil prod.

Testes adicionais: HTTP real para cenário, validações aninhadas, CSRF, chave idempotente, isolamento e edição de lotes; corrida de duas retiradas (uma aceita, outra rejeitada, saldo final positivo); cálculo de 14 ovos menos 5 em estoque atravessando o mês; ciclo mensal ajustado ao último dia do mês. Padronizada a formatação dos novos módulos Java com google-java-format 1.24.0.

A suíte H2 passou com 30 testes. A suíte PostgreSQL completa anterior passou com 27 testes, seguida dos testes adicionais de concorrência/virada do mês; o teste final de preferência e a jornada final de navegador são registrados após a conclusão abaixo. Front-end: 17 testes, build e lint aprovados. Atualizadas arquitetura e contratos para distinguir implementação de visão futura. Sem alterações no projeto Portfólio, sem contratação de serviço e sem publicação do aplicativo.

Validação final da jornada: quatro casos Playwright aprovados em desktop e emulação móvel, incluindo persistência do dia de compra após recarga, confirmação de consumo, preparo medido, geração de lista sem mudança de saldo, recebimento parcial, alteração de armazenamento preservando quantidade/validade e retorno ao login após encerrar a sessão. O teste de preferências passou também no PostgreSQL. Interface de compras destaca faltas; itens já cobertos podem ser expandidos.

Estado de entrega: versão demonstrável local. As capturas finais foram revisadas; documentação, roteiro e ponto de retorno atualizados. A CI foi ampliada para Java em PostgreSQL e jornada no Chromium. Resultado remoto deve ser conferido na execução do último push. Sem aparelho físico, implantação pública ou alteração do projeto Portfólio.

## 2026-10-18 — Cenário de hipertrofia e preparação de publicação

A pedido do usuário, acrescentado cenário fictício para adulto ilustrativo de 82 kg/1,80 m: cinco refeições, 13 alimentos e 18 lotes, com referências explícitas e validades desconhecidas. A conta é separada e suas credenciais aleatórias ficam em .local/demo-hypertrophy.json, sem modificar dieta/estoque da conta pessoal. Script reutilizável em frontend/scripts/seed-hypertrophy.mjs.

Implementadas recuperação de senha, confirmação de e-mail, invalidação de sessões por versão de credencial, exclusão transacional com senha/EXCLUIR e limite básico de acesso. Tokens têm hash/validade/uso único; fila de e-mails tem cifragem, tentativas, expiração e remoção do payload após entrega. Modo local escreve arquivos privados; produção preparada para Brevo via HTTPS, pois Render Free bloqueia SMTP usual. Registro de e-mail duplicado não expõe o valor em log do Hibernate.

Teste PostgreSQL: 36 casos aprovados. Interface: 18 testes, build e lint aprovados. Axe passou nas sete telas pessoais em desktop e mobile; recuperação/exclusão também passaram após corrigir uma corrida de navegação/cache, com recarga completa ao excluir. O teste de API garante que 401 atrasado de uma sessão anterior não encerra a seguinte. Carregamento inicial foi dividido por rotas, reduzindo o pacote principal para aproximadamente 460 kB.

Backup PostgreSQL gerado e restaurado com sucesso em banco temporário; original preservado. Dockerfile e render.yaml preparados para uma única origem React/API, execução sem privilégios e 512 MB. Não há Docker instalado no Windows: a construção e o smoke test do container são verificados pela CI. A ativação real depende de contas Free Render/Neon/Brevo, credenciais e remetente confirmado. Não houve publicação nem contratação. Conteúdo para futura integração ao Portfólio fica em docs/PROJECT_CASE.md; o projeto separado não foi alterado.

## 2026-10-18 — Painel diário e substituições de refeições

Minha dieta agora abre em cartões por horário, com porções legíveis, destaque da próxima refeição e progresso do dia. O editor completo permanece em Editar dieta. Agenda usa o mesmo painel diário. Trocas abrem em painel lateral no computador e janela inferior no celular.

V10 adiciona regras por refeição/alimento/estado/porção, exceções por dia e ações de troca. Alternativas exigem porção própria, podem ser bloqueadas e não afirmam equivalência nutricional. Modos: só uma ocorrência ou revisão a partir do dia escolhido, respeitando a próxima revisão agendada. Validação de versão/fingerprint evita sobrescrever alterações concorrentes; requestId impede reaplicação em tentativas repetidas. Desfazer confere estado atual antes de reverter.

Exceções atualizam a demanda de compras e a sinalização de lista desatualizada. O estoque muda somente na confirmação de consumo; estorno devolve os lotes e preserva a exceção. Exclusão de conta remove também as novas tabelas. Regras ilustrativas foram adicionadas somente à conta fictícia existente, sem trocar alimentos ou movimentar estoque; dados pessoais preservados.

Validação: 42 testes Java aprovados no PostgreSQL isolado; 18 testes de interface, build e lint aprovados. Jornada nova validada em computador e viewport móvel, incluindo configuração, troca única/recorrente, desfazer e consumo. Verificação axe nos painéis de configuração/escolha sem violações nos critérios automatizados; sem auditoria completa ou aparelho físico. A CI do commit final executa as suítes completas e o pacote Docker.

## 2026-10-18 — Modelo 1.0: nutricionista prepara, cliente consulta

O usuário aprovou a primeira versão para avaliação por um nutricionista. V11 separa CLIENT/NUTRITIONIST, Básico/Premium e ativação efetiva do estoque. Contas novas começam em Básico com estoque desativado. A migração preserva o acesso Premium e os saldos das contas preexistentes; nenhum saldo é zerado. A conta fictícia foi colocada explicitamente no Básico para demonstrar a nova experiência.

Implementados convites internos por e-mail de cadastro, aceite e revogação pelo cliente, um vínculo profissional ativo por cliente e escopo por cliente em todas as operações profissionais. O cliente não edita dieta, catálogo ou regras e só pode escolher substituições ONCE. O nutricionista vinculado monta catálogo, dieta, alternativas e avaliações mensais com peso, medidas opcionais e observações. Resultados são somente leitura para o cliente. Acesso profissional não inclui estoque ou diário de compras.

O registro opcional Já comi usa as porções do plano, sem formulário no Básico. Sem estoque ativo, persiste o registro e não movimenta ingredientes. Com estoque ativo, exige confirmação e realiza a baixa; o modo fica registrado para o estorno não criar saldo indevido após uma mudança de plano. Reativação exige conferência de saldos e não baixa refeições retroativamente. Escritas antigas de estoque/compras também conferem a permissão sob o bloqueio transacional da conta, além do filtro HTTP.

Simulação de plano e cargas fictícias existem somente fora de prod. Nenhum checkout, cobrança ou serviço externo foi contratado. Cadastro profissional é um perfil autodeclarado para a demonstração; não foi implementada verificação de registro profissional. O roteiro de avaliação está em V1_VALIDATION.md. A publicação externa e o projeto Portfólio continuam separados.

## 2026-10-18 — Login direto ao painel e Conta simplificada

Login bem-sucedido e visita a Entrar com sessão ativa agora encaminham para /conta/inicio, que mantém o destino apropriado ao perfil. Conta usa a navegação pessoal, sem a moldura de login. Removidos o bloco Organize sua rotina, os atalhos de catálogo/estoque/compras/preparo e a nota técnica de sessão. A saída fica em Conta → Deslogar; gerenciamento de senha/exclusão continua acessível por Gerenciar senha e conta.

Validação: testes de interface para login, sessão já aberta, retorno à Conta e logout; jornada de recuperação/exclusão atualizada para passar pelo painel. Nenhuma mudança na duração ou segurança das sessões.

## 2026-10-19 — Desfazer refeições individualmente

Corrigido o controle que guardava somente a última ação: cada refeição consumida agora oferece seu próprio Desfazer refeição. GET /api/meals/checkins?date=AAAA-MM-DD recupera apenas os registros ativos da conta, incluindo consumos anteriores feitos diretamente pelo estoque. A opção permanece disponível após recarregar a página. A atualização aguarda a consulta dos registros e da agenda; o estorno usa o modo original e mantém a proteção contra repetição.

Regressão cobre duas refeições, desfazer a primeira mantendo a segunda, desfazer ambas, recarregar, registrar novamente e impedir que um estorno antigo remova o novo registro. Dados pessoais e de demonstração preservados; os testes criam contas fictícias isoladas.

## 2026-10-19 — Revisão local da versão 1.0

Por solicitação do usuário, desfazer uma refeição atualiza o cartão sem a mensagem de sucesso persistente; erros continuam visíveis. A revisão por teclado encontrou foco saindo do diálogo de troca ao completar o ciclo de Tab: o painel agora mantém o foco entre seus controles e devolve-o ao botão de origem após Escape. A largura mínima global foi ajustada a 320px para permitir reflow em telas estreitas.

Validação: 19 testes de interface, build e lint aprovados. Jornadas em computador/viewport móvel verificam Tab e Shift+Tab, Escape, retorno do foco e ausência de rolagem lateral a 320 e 720px em Dieta, Resultados, Meu nutricionista e Conta. Essa cobertura não representa auditoria completa ou teste com leitor de tela/aparelho físico. FEEDBACK_V1.md prepara o registro de uma sessão com o nutricionista. O usuário escolheu continuar a validação local; as contas externas ainda não foram criadas.

## 2026-10-19 — Continuidade da validação 1.0: área profissional

A lista de clientes ganhou busca por nome/e-mail (ignorando acentos), filtros por vínculo ativo, convite pendente e convite expirado, contagem e estados vazios distintos. Renovação usa o endpoint existente de convites e substitui o convite anterior; cancelamento usa revogação existente, com confirmação e opção de manter. Não houve mudança de tabela, permissão ou envio de e-mail. Falhas na consulta de clientes, acompanhamento, alimentos e avaliações oferecem nova tentativa.

O formulário de avaliação só abre após carregar o histórico. Conflitos de versão preservam os campos digitados e oferecem Carregar avaliação atual com aviso de substituição, permitindo revisar e salvar novamente. Jornada simula uma alteração concorrente em outro navegador e verifica a versão final na conta do cliente.

Testes novos cobrem convites expirados versus vínculos ativos, busca sem acento, recuperação da lista indisponível e erro de renovação. Contas fictícias isoladas foram usadas nas jornadas; dados pessoais e contas de demonstração não foram editados. Backup local criado e restaurado com sucesso em banco temporário, preservando o original; arquivo privado em .local/backups.

## 2026-10-19 — Preparação da entrega local

Adicionado docs/ENTREGA_V1.md com escopo fechado, acessos locais em perfis separados, roteiro curto, limites e pendências externas. README corrigido para o login direto ao painel. Nenhuma tela ou regra de domínio mudou.

Novo comando npm run demo:check verifica apenas as contas fictícias conhecidas e o ambiente local: interface, saúde da API, login/perfis, vínculo ativo, mesma dieta e histórico nos dois perfis e bloqueios do Básico. Não chama o seed nem altera refeições, avaliações, convites, plano ou saldos. Cria sessões isoladas de conferência e faz logout ao finalizar. Relatório privado em .local/demo-readiness.json não inclui credenciais ou conteúdo clínico. Falhas não disparam resets. A conferência passou e o lint passou; não foram repetidas suítes de domínio já aprovadas, pois a mudança é em documentação e ferramenta de entrega.

## Importações futuras no painel profissional — 2026-10-19

Por solicitação do usuário, foram reservados campos de arquivo desativados nas seções Dieta, Alimentos e Avaliações mensais. Nova aba Bioimpedância e relatórios contém apenas a apresentação do espaço futuro e um campo igualmente desativado. Nenhum arquivo é recebido, armazenado ou processado, e nenhuma integração com sistema externo foi implementada ou prometida. Formatos e sistemas de origem serão definidos depois de analisar exemplos autorizados. O painel do cliente continua sem upload; dieta e avaliações manuais seguem funcionando.
