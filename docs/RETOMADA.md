# Ponto de retorno — 2026-10-18

## Estado

Dieta Fácil tem versão demonstrável local: dieta versionada, agenda, estoque por lotes, compras por cobertura e validade, recebimentos parciais, preparo medido, consumo e estornos. A pasta física é C:\Users\Usuario\Documents\ChatGPT\Dieta Fácil; o caminho antigo Nutri Fácil não existe mais.

Repositório: https://github.com/LuisFernandoRodriguesDePaula/dieta-facil

## Demonstração de hipertrofia

O usuário autorizou uma conta de demonstração separada, preservando seus dados. Ela foi criada e carregada com cinco refeições diárias e 18 lotes para um adulto fictício de 82 kg e 1,80 m. É um exemplo de uso, sem prescrição individual ou cálculo de calorias/macronutrientes. Validades permanecem desconhecidas.

Execute `npm run demo:hypertrophy` em frontend para consultar/reutilizar essa conta. Credenciais estão em `.local/demo-hypertrophy.json`, fora do Git. Detalhes: [HYPERTROPHY_DEMO.md](HYPERTROPHY_DEMO.md).

## Execução e segurança

Use scripts Start-Database.ps1, Start-Backend.ps1 e Start-Frontend.ps1. Interface: http://127.0.0.1:5173/entrar; API: 8080; PostgreSQL exclusivo: 5433. Reiniciar a API encerra sessões. Nunca publicar `.local/`, credenciais, e-mails locais, dumps ou traces.

V1–V8 mantêm o domínio já entregue. V9 adiciona tokens de acesso, verificação de e-mail e fila criptografada de envio. Recuperação troca a senha e invalida sessões anteriores. Exclusão exige senha e EXCLUIR, remove dados da própria conta e preserva outras contas. Produção exige e-mail verificado, cookie Secure e limita tentativas por IP/rota em cada instância.

No ambiente local, mensagens são arquivos privados em `.local/mail/`; nenhum e-mail real é enviado. Produção usa Brevo por HTTPS. Não colocar chaves no código ou no chat.

## Validação e publicação

Foram executados 36 testes Java no PostgreSQL, 18 testes de interface, build e lint. A suíte de navegador cobre computador e viewport móvel, jornadas de domínio, recuperação/exclusão e acessibilidade automatizada nas sete telas pessoais e nas telas públicas. Consulte a CI do último commit para os resultados finais de H2, PostgreSQL, navegador e imagem Docker. Verificações automatizadas não equivalem a auditoria completa de acessibilidade ou teste em aparelho físico.

Backup local foi criado e restaurado em banco temporário de verificação, sem alterar o original. Script: Backup-Database.ps1. Backups externos e ensaio de restauração na hospedagem ainda dependem da ativação.

O usuário autorizou preparar uma opção sem mensalidade e informou que ainda não possui serviços. Dockerfile, render.yaml e [DEPLOYMENT.md](DEPLOYMENT.md) preparam Render Free + Neon + Brevo. Ainda não existe publicação pública: é necessário criar/conectar as contas, verificar remetente, configurar segredos e validar a URL HTTPS. Não contratar planos ou prometer gratuidade ilimitada. A imagem completa é validada na CI, pois Docker não está instalado nesta máquina.

## Próxima etapa

Concluir/consultar CI do push mais recente e ativar os serviços externos conforme DEPLOYMENT.md quando o usuário conectar suas contas. Validar cadastro, confirmação de e-mail, recuperação, cookies e backup na URL real. O projeto Portfólio é separado e não deve ser alterado nesta etapa; PROJECT_CASE.md prepara apenas o texto dentro deste repositório.

Português do Brasil; computador e celular; commits coerentes; processo documentado. Prosseguir autonomamente no escopo autorizado. Não modificar configurações globais de aprovação, não criar agentes sem autorização e não usar serviços pagos. O aplicativo não chama API de IA.

## Atualização — painel diário e trocas (V10)

A tela /conta/dieta abre nos cartões do dia; o editor está em /conta/dieta?editar=1. /conta/agenda usa o mesmo painel. Há resumo/progresso, destaque de próxima refeição, troca de alimento com porções cadastradas, configuração de permissão e alternativas por item, confirmação de consumo e Desfazer. Painel lateral no computador e inferior no celular.

Regras podem ficar bloqueadas. A porção original faz parte da configuração: editar essa porção exige revisão das alternativas. Trocas ONCE persistem em meal_overrides; NEXT usa a revisão da dieta a partir do dia escolhido e respeita revisões futuras. Snapshots consumidos/pulados são preservados. Compras consideram as exceções e ficam desatualizadas quando a origem muda. Trocar não baixa estoque. Regras/exceções/ações são removidas na exclusão da conta.

42 testes Java passaram no PostgreSQL de testes separado dieta_facil_test; não executar testes de API contra o banco pessoal nem em paralelo usando a mesma base da demonstração. 18 testes da interface, build e lint passaram. A jornada de navegador foi ampliada para 12 casos em computador/viewport móvel, incluindo troca e desfazer; consultar a CI do último push para a validação final H2/PostgreSQL/navegador/Docker.

O script demo:hypertrophy adicionou três regras ilustrativas ausentes à conta fictícia já existente. Nenhuma dieta, refeição ou quantidade de estoque foi alterada nessa conta. As credenciais permanecem no arquivo privado anterior. A publicação externa segue pendente das contas gratuitas do proprietário; o Portfólio continua separado.

## Atualização prioritária — modelo 1.0 com acompanhamento profissional (V11)

A orientação mais recente é preparar uma primeira versão para um nutricionista testar com dados fictícios e devolver feedback. O cliente consulta dieta/horários e alternativas autorizadas, sem montar refeições ou preencher avaliações. Registrar Já comi é opcional. O nutricionista vinculado edita a dieta, o catálogo e as alternativas do cliente e registra avaliações mensais.

Rotas: /profissional (clientes), /profissional/clientes/:id (catálogo, dieta e avaliações), /conta/dieta, /conta/resultados, /conta/nutricionista (convite/aceite/revogação), /conta/premium (plano/estoque opcional). O cliente não pode habilitar edição por query string. Restrições também valem na API. Convites são internos, sem envio de e-mail, por sete dias; exigem conta do cliente no mesmo e-mail e aceite. Revogação preserva dieta e resultados. Perfis profissionais ainda são autodeclarados na demonstração.

Contas novas: CLIENT por padrão, BASIC e estoque desativado. Migração preservou Premium/estoque das contas antigas sem zerar saldos. Apenas a conta fictícia de hipertrofia foi explicitamente colocada no Básico. Ativar estoque exige conferência; desativar congela saldos. Não há baixa retroativa. Check-ins guardam modo ONLY/INVENTORY, repetição segura e estorno compatível com o modo original. Simular plano é permitido apenas fora de prod e não contrata nada.

Execute `npm run demo:care` (demo:hypertrophy é um alias). Cliente reutilizado: `.local/demo-hypertrophy.json`; profissional separado: `.local/demo-professional.json`. O script preserva dieta, estoque, regras e avaliações já existentes e só completa exemplos ausentes. Foram cadastradas duas avaliações fictícias em meses distintos. Não modificar o projeto Portfólio. Roteiro para o teste: V1_VALIDATION.md.

Validação desta etapa: 45 testes Java aprovados no PostgreSQL isolado, 18 testes da interface, build/lint e jornada nova em computador/celular. A suíte de navegador foi ampliada para 14 casos. Conferir a CI do commit final para o resultado completo H2/PostgreSQL/navegador/Docker. Credenciais, arquivos de e-mail, banco e capturas privadas continuam somente em .local/.

## Ajuste de acesso

Login e sessão já aberta em /entrar encaminham para /conta/inicio (destino de acordo com o perfil). /conta é a configuração pessoal, na navegação do aplicativo, sem o bloco antigo de atalhos. Saída em Conta → Deslogar. Gerenciar senha e conta mantém acesso à recuperação, verificação e exclusão. O tempo de sessão permanece inalterado.

## Correção de 2026-10-19 — registros de refeição

Desfazer refeição agora fica em cada refeição consumida e persiste após recarregar a página. Corrigida a perda da primeira ação ao registrar duas refeições. Endpoint de consulta: GET /api/meals/checkins?date=AAAA-MM-DD, restrito à conta autenticada. Testes novos verificam isolamento, estorno independente e proteção de registros novos contra repetição de estorno antigo.

## Continuidade — validação local 1.0 (2026-10-19)

O usuário confirmou que ainda não criou Render/Neon/Brevo e quer continuar a validação local. Não iniciar publicação ou modificar o Portfólio. Mensagem de sucesso de estorno removida, com atualização apenas no cartão. Revisão local ampliou teclado e reflow em 320/720px; testes não substituem leitor de tela, zoom real ou aparelho físico. Ficha da sessão: FEEDBACK_V1.md. Próximo marco: executar V1_VALIDATION.md com o nutricionista, registrar feedback e priorizar mudanças; aguardar contas para publicação. CI da correção anterior e056940 concluída com sucesso (run 39194356375).

## Continuidade — área profissional (2026-10-19)

Busca/filtros na lista, renovação/cancelamento confirmado de convites, nova tentativa em consultas e recuperação explícita de conflito de avaliação implementados. Próximo teste humano deve incluir os cenários complementares de V1_VALIDATION.md; usar FEEDBACK_V1.md. Nenhuma migração ou alteração de contas pessoais/demonstração. Contas externas ainda pendentes; seguir local. Backup desta etapa restaurado em base temporária com sucesso. Não repetir criação de funcionalidades já implementadas antes de receber o feedback; o próximo marco continua sendo a sessão com o nutricionista.

## Entrega local consolidada — 2026-10-19

Começar por ENTREGA_V1.md. npm run demo:check em frontend confere contas fictícias e ambiente, sem preparar/resetar dados, e salva relatório privado em .local/demo-readiness.json. Conferência passou. O próximo marco continua sendo avaliação humana com nutricionista; publicação aguarda contas externas por escolha do usuário. Não acrescentar módulos para substituir esse teste. Credenciais continuam privadas em .local/.

## Importações — escopo reservado (2026-10-19)

Painel profissional possui campos desativados de importação de dieta, alimentos e avaliações e aba Bioimpedância e relatórios. São somente placeholders por orientação expressa do usuário. Não há backend de arquivos, extração de PDF, integração externa nem relatórios de bioimpedância disponíveis no cliente. Próxima definição dessa funcionalidade: obter exemplos de formatos e confirmar sistemas de origem antes de implementar. Não apresentar como importação funcional.

## Avaliações e catálogo — V12 (2026-10-19)

Catálogo profissional: unidade compacta, ações à direita e lista em Ver alimentos cadastrados (diálogo). Avaliações: resumo mensal e expansão de medidas/variações. Novos campos opcionais persistidos: bodyFat (%), arm/thigh/calf/hip (cm), além de cintura já existente. Percentual é informado pelo profissional, sem estimativa ou importação. Comparação com registro anterior disponível, gordura em pontos percentuais; valores ausentes sem comparação. Campos antigos preservados. Backup pré-migração validado. API reiniciada para aplicar V12; sessões anteriores precisam de novo login.

## Editor minimalista e cartões recolhidos (2026-10-19)

Refeições existentes começam fechadas. Cabeçalho resume nome, horário, dias e alimentos; abre uma por vez, preserva rascunho, permite expandir/recolher todas. Nova/cópia abrem; erro de campo obrigatório abre a refeição antes de focar. Dias estilizados com atalhos. Textos redundantes removidos, Salvar dieta substitui Salvar revisão, vigência permanece. Importações reservadas em detalhes recolhidos. Não há mudança de backend ou dados. Verificar o editor profissional no desktop e celular conforme V1_VALIDATION.md; publicação e feedback humano seguem pendentes.

## Cabeçalho do cliente e ativação (2026-10-19)

Dentro do acompanhamento profissional, cabeçalho com nome do cliente, abas e seta Voltar aos clientes; navegação geral só na lista. Histórico no ícone Informações e versões da dieta. No profissional, botão Alterar para esta dieta salva com effectiveFrom=hoje e vira Dieta ativa após conferir o plano vigente; mudanças locais voltam ao estado aplicável. Selecionar versão pelo diálogo apenas consulta; botão aplica para hoje. Datas passadas continuam sem edição direta e revisões futuras existentes são preservadas. Editor legado mantém sua seleção por data. Testes desktop/mobile verificam conteúdo ativo pela API.

## Revisão externa temporária de design (2026-10-19)

Veja DESIGN_REVIEW.md. Start-DesignReview.ps1 cria/reutiliza banco dieta_facil_review separado e contas fictícias exclusivas, compila app e publica via túnel HTTPS temporário. Padrão 8h com encerramento automático; Stop-DesignReview.ps1 encerra antecipadamente. Link atual/prazo/credenciais somente em .local/design-review/, nunca no Git. API8081 e static build; não expor Vite nem banco pessoal. O endereço anterior deixa de funcionar após encerrar e reiniciar. Mensagens são locais e somente dados fictícios devem ser usados. Testes externos em 1440/390/320px aprovados para os dois perfis; ainda aguardar feedback humano do designer. Hospedagem permanente e Portfólio continuam separados.

## Apresentação 1.0 atualizada — 2026-10-20

Usuário respondeu Ainda não testamos ao perguntar sobre a revisão do designer. Não inventar feedback nem ampliar módulos para substituir essa avaliação. README e PROJECT_CASE agora apresentam o fluxo profissional/cliente, imagens atuais e limites; ROADMAP prioriza sessão humana, correções e depois ativação permanente quando houver contas. Portfólio separado não foi alterado. Conferência externa repetida sem renovar o link ou alterar dados de revisão; seguir o prazo original registrado em session.json. Capturas públicas v1-* são fictícias e não contêm credenciais. Próximo marco permanece o teste do designer e do nutricionista, com FEEDBACK_V1.md.
