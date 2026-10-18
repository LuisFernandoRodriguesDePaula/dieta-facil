# Ponto de retorno — 2026-10-18

## Estado

Dieta Fácil está na versão demonstrável local, com conta, catálogo, dieta versionada, agenda, estoque por lotes, compras por cobertura/validade, recebimento parcial, preparo medido, consumo, estornos e alertas.

A pasta física é C:\Users\Usuario\Documents\ChatGPT\Dieta Fácil. O caminho antigo que eventualmente aparece no contexto do chat não existe mais. Sempre use o caminho físico atual ao executar comandos.

Repositório: https://github.com/LuisFernandoRodriguesDePaula/dieta-facil

## Para experimentar

Inicie os scripts Start-Database.ps1, Start-Backend.ps1 e Start-Frontend.ps1 conforme README. Abra http://127.0.0.1:5173/conta/inicio, crie uma conta de teste e entre. Em conta vazia, carregue explicitamente o cenário fictício. Veja docs/DEMO_GUIDE.md.

API: 8080; banco exclusivo: 5433. Não presuma que processos de uma sessão anterior continuaram ativos. Sessões são perdidas ao reiniciar a API. Credenciais e banco ficam em .local/, fora do Git; nunca publicar esse diretório.

## Implementação

- V1 demonstração pública fixa, separada da conta.
- V2 usuários, acesso e perfil; V3 alimentos pessoais.
- V4 plano/revisões, refeições/dias/itens e snapshots de ocorrência.
- V5 contas de estoque, lotes, operações e movimentos.
- V6 listas e recebimentos; V7 marcador da carga fictícia; V8 ritmo semanal/mensal da conta.
- Escritas de domínio bloqueiam a conta. Saldo não negativo; tentativas repetidas usam chave idempotente.
- Projeção usa FEFO em cada dia; cru, preparado e como vendido são referências distintas.
- Preparo exige entrada e rendimento medidos. Agenda só baixa estoque ao confirmar consumo.
- Alterar armazenamento não estende a validade; alteração de lote usa versão.
- Contratos efetivos: docs/DOMAIN_API.md. Decisões: docs/decisions/ADR-002-plan-and-stock.md.

## Validação

30 testes Java passaram em H2. A suíte PostgreSQL completa passou antes dos últimos testes adicionais, que também passaram em execuções específicas: concorrência de retirada, virada do mês e persistência do ciclo. Interface: 17 testes, build e lint. Jornada Playwright: quatro casos aprovados, cobrindo fluxo completo e sessão encerrada em desktop e viewport móvel.

Revisadas capturas reais da aplicação com dados fictícios; sem teste em aparelho físico e sem auditoria completa de acessibilidade. A CI executa build/lint/interface, Java em H2 e PostgreSQL e navegador Chromium; consulte a execução do último push no GitHub. Capturas temporárias/traces ficam em .local/ e test-results/, ignorados.

## Escopo e próximos passos

A orientação mais recente do usuário é cuidar exclusivamente do Dieta Fácil. O projeto Portfólio é separado e não deve ser alterado. Publicação/contratação de hospedagem não fazem parte desta entrega.

A próxima etapa é a avaliação do usuário sobre a demonstração: usabilidade, refinamentos e prioridades. Não reiniciar E04 nem refazer funcionalidades já entregues. Antes de editar, conferir git status, commits recentes e este arquivo.

Evoluções registradas: embalagem/arredondamento comercial, agrupamento adicional de compras, receitas compostas, importação de dieta, revisão ampliada de acessibilidade e recursos de produção. Sem recuperação de senha, verificação de e-mail, exclusão de conta ou mitigação completa de abuso. Não apresentar a versão como pronta para abertura pública.

## Preferências

Português do Brasil; computador e celular; entregas funcionais, commits coerentes e processo documentado no GitHub. Prosseguir autonomamente no escopo autorizado. Não modificar configurações globais de aprovação. Não criar múltiplos agentes sem autorização aplicável. A aplicação não chama API de IA e não usa serviços pagos.
