# Validação antes da avaliação do nutricionista — 27/10/2026

Base da aplicação: `6e1161a`. Resultado: nenhum impedimento identificado nos fluxos automatizados para uma avaliação supervisionada com dados fictícios. Não é uma declaração de prontidão para uso clínico ou produção.

## Ambiente e isolamento

Windows, Java 21, PostgreSQL 17, Node e Microsoft Edge via Playwright. API temporária em 8080 e frontend em 5173. Bancos exclusivos `dieta_facil_validation_20261027` (navegador) e `dieta_facil_integration_20261027` (testes do servidor). Contas fictícias novas por jornada; banco pessoal e contas de revisão não foram usados pelas jornadas. Sem envio de e-mail externo ou novo túnel público. Recuperação de senha validada com mensagens em arquivo local.

## Resultados

| Verificação | Resultado |
|---|---|
| Testes de interface — Vitest | 25 aprovados, 7 arquivos |
| Servidor — H2 | 48 aprovados, sem falhas/erros/ignorados |
| Servidor — PostgreSQL | 48 aprovados, sem falhas/erros/ignorados |
| Build TypeScript/Vite | Aprovado |
| Lint | Aprovado |
| Jornadas Playwright | 20 cenários distintos cobertos entre desktop e mobile, aprovados após atualização das expectativas desatualizadas |

Na primeira rodada do navegador, 16 passaram e 4 falharam porque ainda procuravam o antigo campo Arquivo de dieta e o texto de progresso substituído no redesenho. O comportamento da aplicação foi preservado: os testes passaram a verificar o modal com Link da dieta desativado e o texto atual do rodapé. Reexecutados os 4 cenários afetados e os 2 cenários de teclado/data ampliados: **6 aprovados**. Não houve repetição das outras jornadas já aprovadas, pois nenhuma implementação foi alterada nesta validação.

## Fluxos conferidos

- Cadastro, login, logout, expiração/invalidação de sessão, CSRF e cookies seguros nos testes do servidor.
- Convite, aceite, busca de clientes, renovação/cancelamento e revogação com perda de acesso profissional.
- Cadastro de alimentos, montagem e ativação de dieta, versões/histórico e controle de edição concorrente.
- Substituições permitidas e bloqueadas, consulta pelo cliente e avaliações mensais com medidas e histórico.
- Básico sem acesso ao estoque; registro opcional e estorno individual de duas refeições, inclusive após recarregar.
- Extras existentes: estoque, preparo, compras, validade e alertas.
- Recuperação de senha por mensagem local e exclusão de conta fictícia.
- Acessibilidade automatizada nas telas cobertas, navegação por teclado, Escape e retorno de foco.
- Menu do cliente sem Premium, consulta de outra data recolhida e retorno à data atual. A volta pode reutilizar cache; o teste verifica as refeições exibidas sem exigir uma requisição redundante.
- Modal Importar dieta com campo desativado e aviso de planejamento. Não importa conteúdo externo.
- Desktop e viewport móvel, incluindo verificações de reflow em 720 e 320px. São testes de navegador, não de dispositivo físico.

## Reprodução

Frontend: `npm test`, `npm run build`, `npm run lint` e `npm run test:e2e` na pasta frontend, com frontend/API locais ativos e banco de teste isolado. Testes do servidor: `mvnw.cmd -B -ntp test`; para PostgreSQL, definir SPRING_DATASOURCE_URL/USERNAME/PASSWORD somente para o banco isolado. Não direcionar a suíte para banco pessoal ou de produção.

Diagnósticos desta execução permanecem privados em `.local/validation-*.log`. Arquivos de credenciais e configurações locais não são publicados.

## O que falta para a sessão humana

1. Conferir em celular físico, zoom real e, quando possível, leitor de tela.
2. Combinar o horário e gerar o acesso temporário conforme DESIGN_REVIEW.md; computador ligado, conectado e sem suspensão.
3. Usar V1_VALIDATION.md e uma cópia de FEEDBACK_V1.md; observar a primeira dificuldade sem orientar antecipadamente.

Hospedagem permanente, entrega real de e-mail, importação e preparação operacional para dados de pacientes permanecem etapas separadas. A validação local desta rodada não inclui reconstrução de contêiner nem novo teste de HTTPS público.
