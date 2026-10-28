# Dieta Fácil 1.0 — entrega local para avaliação

Esta entrega permite demonstrar o fluxo de nutricionista e cliente com dados fictícios. Não há hospedagem permanente. Para avaliação remota temporária, use o ambiente isolado descrito em [DESIGN_REVIEW.md](DESIGN_REVIEW.md). O endereço muda ao recriar o túnel e depende do computador ligado e conectado. O link 127.0.0.1 funciona somente no computador onde o projeto está executando.

## Escopo fechado para este teste

O nutricionista convida o cliente, configura alimentos, refeições, horários, porções e alternativas permitidas e registra avaliações mensais. O cliente aceita o vínculo, consulta a dieta, escolhe alternativas autorizadas e consulta resultados. Registrar Já comi é opcional; pode ser desfeito por refeição, inclusive após recarregar a página.

Básico: estoque desativado, sem movimentação de produtos. Premium: estoque, compras e preparo opcionais, sem contratação ou cobrança nesta versão. Não ampliar esses módulos antes do feedback. A dieta fictícia é um exemplo de interface, sem prescrição individual ou equivalência nutricional calculada.

## Abrir a demonstração

1. Se os serviços estiverem parados, execute scripts/Start-Database.ps1. Em dois terminais separados, execute scripts/Start-Backend.ps1 e scripts/Start-Frontend.ps1.
2. Na pasta frontend, execute `npm.cmd run demo:check`. O comando verifica interface/API, autenticação das duas contas fictícias, vínculo ativo, dieta/histórico compartilhados e bloqueios do Básico. Não registra refeições, edita avaliações, renova convites ou muda o plano. O login cria sessões de teste, encerradas ao final.
3. Abra dois perfis de navegador diferentes, ou uma janela comum e uma privativa. Na mesma sessão, entrar em outra conta substitui o acesso anterior.
4. Entre como profissional em http://127.0.0.1:5173/entrar e abra Meus clientes. As credenciais ficam em .local/demo-professional.json.
5. No outro perfil, entre como cliente. As credenciais ficam em .local/demo-hypertrophy.json. O login abre a dieta pelo painel inicial.
6. Siga V1_VALIDATION.md e registre observações em uma cópia de FEEDBACK_V1.md.

As credenciais são privadas: não publicar ou incluir esses arquivos em um pacote. Não é necessário expor senhas no terminal para executar a verificação. O relatório .local/demo-readiness.json registra a última conferência, sem credenciais ou conteúdo da dieta; não é um monitoramento contínuo nem substitui os testes de segurança.

Se as contas não existirem, consulte o script `npm.cmd run demo:care`. Ele prepara/reutiliza contas fictícias e pode restabelecer o cenário, o vínculo e o plano Básico. Não é executado automaticamente pela conferência. Se você tiver alterado o cenário para um teste, revise antes de usá-lo novamente. Uma falha de conferência não causa reset automático.

## Demonstração curta

- Profissional: abrir cliente, mostrar dieta e alternativas, abrir avaliações mensais.
- Cliente: conferir os horários, abrir uma troca autorizada e verificar Resultados.
- Registrar duas refeições opcionais e desfazer as duas para conferir a atualização individual.
- Mostrar que o cliente não edita a dieta e que estoque/compras/preparo ficam fora do Básico.
- Recolher a primeira dificuldade observada antes de sugerir mudanças.

Para testar convites, cancelamentos e revogação, prefira novas contas fictícias; revogar o vínculo da demonstração interrompe o acesso profissional até novo convite e aceite. Reiniciar o servidor encerra sessões. Evite deixar alterações experimentais na dieta que você pretende apresentar.

## O que ainda depende de outra etapa

- Conferência humana em celular físico, zoom real e leitor de tela.
- Feedback do nutricionista e priorização das correções encontradas.
- Acesso remoto por publicação: criar as contas externas, configurar segredos e remetente e validar HTTPS, envio real de e-mail e backup. Consulte DEPLOYMENT.md.
- Antes de pacientes reais: identidade profissional, auditoria e operação/retenção de dados precisam de definição.

A conta profissional continua autodeclarada. Convites são internos, sem e-mail. Não há importação automática de dieta, cálculo nutricional, cobrança Premium ou aplicativo nativo. Não apresentar esses recursos como integrados.

## Ponto de retorno

A base funcional desta entrega é o commit f8c723d, validado na CI em https://github.com/LuisFernandoRodriguesDePaula/dieta-facil/actions/runs/39196512164. Passaram 22 testes de interface e 20 jornadas de navegador, além dos testes de servidor e do pacote de produção. Os scripts de conferência acrescentados depois dessa base são verificados separadamente no diário do projeto.

A publicação e a integração ao Portfólio permanecem separadas. Próximo marco: executar a sessão de avaliação, registrar feedback e corrigir os problemas do fluxo principal antes de acrescentar funcionalidades.
