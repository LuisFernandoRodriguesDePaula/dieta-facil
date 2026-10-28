# Dieta Fácil 1.0 — roteiro de validação com nutricionista

Estado: demonstração com dados fictícios, local ou por túnel temporário isolado conforme [DESIGN_REVIEW.md](DESIGN_REVIEW.md). A hospedagem permanente continua pendente. Este roteiro valida o uso; não confirma prontidão para prontuário clínico ou operação pública.

## Acessos de demonstração

Execute `npm run demo:care` em frontend com os servidores locais ativos. O script reutiliza a conta fictícia de hipertrofia, cria/reutiliza uma conta de nutricionista e estabelece um vínculo entre essas contas. Não usa contas pessoais.

- Cliente: credenciais privadas em `.local/demo-hypertrophy.json`; abrir http://127.0.0.1:5173/conta/dieta.
- Nutricionista: credenciais privadas em `.local/demo-professional.json`; abrir http://127.0.0.1:5173/profissional.

Use navegadores/perfis separados para manter os dois acessos simultâneos. Trocar de conta na mesma sessão exige sair antes. Não publique os arquivos de credenciais. Reiniciar a API exige novo login.

## O que testar

1. Como nutricionista, convidar um e-mail de cliente. O convite aparece dentro do aplicativo e expira após sete dias; não é enviado por e-mail nesta versão. O cliente cria sua própria conta e senha.
2. Como cliente, abrir Meu nutricionista, conferir a autorização e aceitar. Antes do aceite o profissional não consegue abrir a dieta ou as avaliações.
3. Como nutricionista, abrir o cliente: cadastrar os alimentos, montar refeições/horários/dias/porções e salvar a dieta. Em Alternativas autorizadas, configurar porções e permitir ou bloquear as trocas.
4. Como cliente, consultar Minha dieta: sem editor, sem cadastro de alimentos e sem configuração de alternativas. Escolher uma opção liberada muda somente aquela refeição/data. Não altera a prescrição recorrente. Registrar Já comi é opcional e não pede quantidades no Básico.

   Na interface atual, o progresso e a orientação de registro ficam ao final das refeições. Abra Consultar outro dia para selecionar uma data anterior e volte à data atual. O menu do cliente não apresenta Recursos Premium.
5. Como nutricionista, registrar uma avaliação mensal: peso, altura/cintura opcionais, objetivo e observações. Há um registro por mês, editável com controle de versão. Dados de meses anteriores continuam no histórico.
6. Como cliente, abrir Resultados e conferir os registros e seus autores. O cliente não preenche avaliações. Uma refeição sem registro não é interpretada como falta de adesão.
7. Como cliente, revogar o vínculo. O nutricionista perde acesso; a dieta e os resultados continuam na conta do cliente.
8. Opcional: em Recursos Premium da demonstração local, experimentar o plano, conferir os saldos e ativar estoque. Desativar congela saldos; reativar exige nova conferência. Não há desconto retroativo de refeições nem cobrança real.

   Para acessar essa área opcional diretamente, use `/conta/premium`. Ela não faz parte do menu principal do cliente nem do roteiro prioritário com o nutricionista.

9. No editor profissional, abrir Importar dieta: conferir o aviso de integração em planejamento e o campo de link desativado. Fechar por Escape e conferir retorno do foco ao botão. Nenhum link é enviado e a dieta não muda. Conferir também Expandir todas, Recolher todas e a abertura individual dos cartões.

## Perguntas para o feedback

- O cliente entende rapidamente o que comer e em qual horário?
- O profissional consegue montar uma dieta e cadastrar alternativas sem ajuda?
- Quais campos faltam na avaliação mensal? Quais podem ser removidos?
- Há botões, termos ou etapas que geram dúvida no computador ou no celular?
- Qual seria a primeira melhoria necessária para um segundo teste?

Anote a tela, a ação esperada e o que aconteceu. Use apenas dados fictícios neste teste. A verificação de identidade profissional, auditoria clínica completa, retenção operacional e publicação ainda precisam de definição antes do uso com dados reais.

## Registrar a sessão

Use [FEEDBACK_V1.md](FEEDBACK_V1.md) como ficha de observações. Registre a tarefa, se precisou de ajuda e passos para reproduzir problemas. Priorize falhas que impedem consulta da dieta, trocas autorizadas ou registro de avaliações antes de ajustes visuais.

Na revisão por teclado, abrir Trocar alimento com Enter, navegar com Tab e Shift+Tab, fechar com Escape e conferir retorno ao botão de origem. Conferir também a leitura com zoom do navegador e em aparelho físico. Os testes automatizados de reflow a 320 e 720 pixels não substituem essas verificações nem uma sessão com leitor de tela.

## Revisão do fluxo profissional — 2026-10-19

Na lista Meus clientes, teste a busca por nome (com ou sem acento) ou e-mail e os filtros Vinculados, Aguardando aceite e Convites expirados. Convites pendentes/expirados oferecem Renovar convite; isso substitui o convite anterior e abre novo prazo de sete dias, sem envio de e-mail. Cancelar convite exige confirmação; Manter convite abandona a ação. Vínculos ativos continuam acessíveis pelo cartão.

Ao editar avaliações em duas janelas, salve primeiro na segunda janela. A primeira deve rejeitar a versão antiga e manter os campos digitados. Carregar avaliação atual substitui os campos pela versão salva após a escolha explícita do profissional; copie observações que queira preservar antes dessa ação. Revise os valores antes de salvar novamente.

Se uma consulta falhar, use Tentar novamente; não é necessário sair da conta. Registrar avaliação mensal permanece indisponível enquanto o histórico não estiver carregado.

## Avaliações resumidas e catálogo

No profissional, Alimentos → Ver alimentos cadastrados abre o catálogo em um pop-up. Confira fechamento por Escape e retorno ao botão. A lista não ocupa mais a área abaixo do cadastro.

Em avaliação mensal, experimente gordura corporal, braço, coxa, panturrilha e quadril opcionais. Salve, recarregue e confira no profissional e cliente. O cartão mostra o resumo; Ver medidas e evolução expande detalhes e variação frente ao registro anterior. Para dados ausentes, espere Sem comparação. Confira a edição de um mês antigo e a recuperação de conflito sem perder os novos campos. As medidas devem ser informadas pelo profissional; não há interpretação automática.

## Editor compacto de refeições

Ao abrir uma dieta existente, conferir todos os cartões recolhidos. Abrir uma refeição e depois outra: o primeiro cartão recolhe sem apagar os campos. Nova refeição/cópia abre automaticamente. Expandir todas permite comparar, Recolher todas volta ao resumo. Salvar dieta grava todas as refeições, inclusive recolhidas. Se faltar campo obrigatório, o cartão correto deve abrir e focar o campo.

Testar os atalhos Todos os dias, Segunda a sexta e Fim de semana e o ajuste individual de dias. Em histórico, pode abrir e ler os cartões, mas os campos e salvar permanecem desativados. Importações futuras ficam recolhidas em Importar · em breve.

## Troca de dieta e navegação do acompanhamento

Ao abrir cliente, verificar nome no cabeçalho e seta Voltar aos clientes; não deve aparecer a navegação global. Ícone i abre versões por data. Consultar uma versão não muda o que o cliente vê. Alterar para esta dieta aplica o conteúdo para hoje; após sucesso, Dieta ativa aparece em verde. Edite um campo e confira que o botão volta a oferecer aplicação. Recarregue para conferir persistência. Se houver versões futuras previamente agendadas, elas permanecem na linha do tempo.
