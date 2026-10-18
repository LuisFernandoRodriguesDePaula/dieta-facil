# Roteiro da demonstração local — Dieta Fácil

A versão demonstrável conecta conta, catálogo, dieta, agenda, estoque, compras, preparo e alertas. O foco desta entrega é executar localmente. A publicação e a integração com o projeto Portfólio ficam para depois, conforme orientação do usuário.

## Preparar

1. Inicie banco, API e interface pelos scripts descritos no README.
2. Abra http://127.0.0.1:5173/cadastro e crie uma conta de teste.
3. Entre e abra **Meu painel** no perfil, ou acesse /conta/inicio.
4. Em uma conta vazia, clique em **Carregar cenário fictício** e confirme.

A carga é opcional, transacional e feita uma vez por conta. Ela não substitui dados existentes. Cria cinco alimentos, quatro refeições diárias e sete lotes, com quantidades e datas fictícias. Não representa recomendação alimentar nem prazo de conservação. O endpoint da carga está desabilitado no perfil prod.

## Demonstrar o fluxo

1. **Painel:** veja próximas validades, lotes sem data e primeira falta até a próxima compra.
2. **Dieta:** veja horários, dias e quantidades; duplique uma refeição ou salve uma revisão para uma data futura. Estado cru, preparado e como vendido permanecem separados.
3. **Agenda:** confirme o café da manhã. Os ovos passam de oito para seis, e a aveia de 500 para 460 g. Marcar como pulada não movimenta estoque.
4. **Preparo:** escolha Arroz, informe 200 g crus utilizados e 600 g de rendimento preparado. O saldo cru cai de 1000 para 800 g, e surge um novo lote preparado de 600 g. Esse rendimento é um exemplo medido, não uma conversão automática.
5. **Compras:** salve seu ritmo semanal/mensal e dia de compra, calcule até a próxima compra, ajuste as datas e salve uma lista. Essa ação não altera estoque. Confira faltas, cobertura, incertezas e validades.
6. **Recebimento:** na lista selecionada, registre uma quantidade realmente comprada. A lista passa a recebida parcialmente e o lote entra no estoque. Recalcule a necessidade após a entrada.
7. **Estoque:** confira o histórico, descarte uma quantidade ou estorne uma operação. Um estorno que criaria saldo negativo é rejeitado.
8. **Armazenamento:** mova um lote para outro local. A validade permanece a informada; uma correção de data exige edição explícita.
9. Saia e entre novamente para mostrar a persistência dos dados.

A sugestão mantém cru e preparado separados. Se a dieta está em gramas preparadas e você tem o ingrediente cru, registre o preparo medido antes de recalcular. O sistema não inventa rendimento para sugerir uma compra em outra referência.

## O que esta versão não promete

- Hospedagem pública, integração com o Portfólio ou acesso pela internet.
- Entrega real de e-mail sem ativar o provedor, nem proteção completa contra abuso distribuído. Recuperação, confirmação e exclusão funcionam localmente; os links ficam em .local/mail.
- Receitas compostas, importação de dieta, leitura de rótulos, nutrientes ou recomendações nutricionais.
- Validade automática, garantia de segurança alimentar ou notificações externas.
- Reserva de produtos ao gerar uma lista; duas listas podem mostrar necessidades semelhantes.
- Validação em aparelho físico. Os testes móveis usam viewport e emulação de navegador.

Sessões expiram após inatividade e são perdidas quando a API reinicia. O histórico da tela mostra até 100 operações recentes; os registros permanecem no banco. Os campos de ajustes são quantidades exatas; embalagem comercial e arredondamento ficam para uma evolução posterior.

## Verificar

- Interface: build, 18 testes de componente/cliente e lint.
- API: suíte Java com H2 e PostgreSQL, incluindo HTTP real, autorização, CSRF e concorrência.
- Navegador: Playwright, jornada completa e sessão encerrada, nos projetos desktop e mobile.
- As capturas usam contas fictícias. Logs, credenciais, banco e traces ficam fora do Git.

## Evolução de acesso e publicação

Use /recuperar-senha para pedir redefinição ou confirmação. No ambiente local, o e-mail é um arquivo privado em .local/mail. A exclusão fica em /conta/seguranca, exige a senha atual e a palavra EXCLUIR. O cenário de hipertrofia está em HYPERTROPHY_DEMO.md e a publicação em DEPLOYMENT.md.

## Painel de refeições e trocas

Abra Minha dieta para consultar o dia em cartões por horário. Use Editar dieta para alterar horários, dias e porções do plano completo.

Em Trocar alimento, escolha o ingrediente e uma alternativa previamente cadastrada. Se não houver opção, Configurar alternativas e porções permite vincular até dez opções, cada uma com quantidade, unidade e estado próprios. Desmarcar Permitir trocas bloqueia o uso dessas opções. Alterar a porção original exige revisar as alternativas.

Escolha Só nesta refeição ou Nesta e nas próximas (até a próxima revisão agendada). A mensagem de sucesso oferece Desfazer. Confirmar consumo abre a conferência de porções e só então baixa o estoque; o Desfazer desse registro devolve o estoque.

No exemplo de hipertrofia, executar `npm run demo:hypertrophy` também cadastra alternativas ilustrativas que ainda não existem nessa conta separada: ovos → frango no café, frango → carne no almoço e carne → frango no jantar. São porções de demonstração, sem afirmar equivalência nutricional. Não substitui regras já configuradas nem altera estoque/dieta pessoal.

## Versão 1.0 para feedback profissional

O fluxo principal mudou para nutricionista → convite/aceite → catálogo/dieta/alternativas → consulta pelo cliente → avaliações mensais. Ver V1_VALIDATION.md. O cliente não usa mais o editor de dieta ou catálogo. O registro opcional Já comi no Básico não pede porções nem movimenta estoque.

`npm run demo:care` prepara as duas contas de exemplo. `demo:hypertrophy` é um alias para o mesmo roteiro. A conta fictícia anterior e seus saldos são preservados; é explicitamente colocada no Básico, com estoque congelado. Credenciais do profissional ficam em .local/demo-professional.json. Use perfis de navegador separados para testar simultaneamente.

Os recursos Premium podem ser simulados somente na demonstração local; não há cobrança. Ao ativar controle, confirme os saldos preservados. Não são descontadas refeições anteriores. A publicação pública continua pendente da configuração externa.
