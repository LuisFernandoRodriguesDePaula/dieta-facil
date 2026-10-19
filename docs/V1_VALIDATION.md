# Dieta Fácil 1.0 — roteiro de validação com nutricionista

Estado: demonstração local com dados fictícios. A publicação externa continua aguardando as contas do proprietário. Este roteiro valida o uso; não confirma prontidão para prontuário clínico ou operação pública.

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
5. Como nutricionista, registrar uma avaliação mensal: peso, altura/cintura opcionais, objetivo e observações. Há um registro por mês, editável com controle de versão. Dados de meses anteriores continuam no histórico.
6. Como cliente, abrir Resultados e conferir os registros e seus autores. O cliente não preenche avaliações. Uma refeição sem registro não é interpretada como falta de adesão.
7. Como cliente, revogar o vínculo. O nutricionista perde acesso; a dieta e os resultados continuam na conta do cliente.
8. Opcional: em Recursos Premium da demonstração local, experimentar o plano, conferir os saldos e ativar estoque. Desativar congela saldos; reativar exige nova conferência. Não há desconto retroativo de refeições nem cobrança real.

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
