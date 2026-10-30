# Direção visual — branco e verde-água

Estado: proposta para F01, não tema já aplicado. Objetivo: aparência leve e acolhedora, com contraste e hierarquia suficientes para atendimento profissional. Manter os cards de refeições aprovados e a edição progressiva.

## Tokens candidatos

| Token | Valor proposto | Uso |
|---|---|---|
| background | #F8FBFA | Fundo geral quase branco |
| surface | #FFFFFF | Cards e formulários |
| accent-soft | #E6F4EF | Seleção discreta e agrupamentos |
| primary | #256653 | Ações principais com texto branco |
| text | #18332C | Texto principal |
| text-muted | #4D665E | Texto secundário |
| border | #CBDCD5 | Separação visual decorativa |
| control-border | #718D82 | Candidato para limites de campos |

Cores são candidatas: medir contraste nos componentes finais antes do aceite. Verde-água claro é superfície, não texto claro sobre branco. Garantir WCAG AA para texto normal (4,5:1), texto grande e elementos aplicáveis (3:1), foco visível e distinção sem depender de cor. Erro/sucesso precisam de texto e ícone. Bordas decorativas e limites essenciais de controle têm requisitos diferentes.

## Composição

- Escala de espaçamento 4/8/12/16/24/32px; cantos 12–16px e sombras mínimas.
- Fonte de corpo legível, preferencialmente a pilha de sistema existente; experimentar uniformizar títulos após comparação com a versão atual, sem troca global arbitrária.
- Uma ação primária por contexto. Campos avançados recolhidos; fonte dos nutrientes e histórico em detalhe. Avisos de erro e dados incompletos nunca escondidos por estética.
- Profissional: Início, Clientes e Atendimento primeiro; módulos adicionais só quando funcionais. Dentro do cliente, nome e abas com ferramentas à direita no desktop; no móvel, quebra organizada sem sobreposição.
- Atendimento: pergunta, origem da informação e encaminhamento visíveis; rascunho IA separado da mensagem enviada. Aprovar/editar/encaminhar no contexto, com confirmação quando necessário.
- Paciente: refeições antes de resumos; dúvidas em linguagem comum; autor da resposta explícito. Conta e saída permanecem acessíveis no aplicativo (não reproduzir cortes usados somente em prints de divulgação).

## Estados e acessibilidade

Cada componente cobre carregando, vazio, erro recuperável, sem permissão, offline e sucesso. Carregamento não substitui formulário apagando alterações. Evitar layout móvel que transforma todas as ações em ícones sem nome. Alvos de toque preferencialmente 44×44px, rótulos persistentes, mensagens associadas aos campos, diálogos com foco contido/retornado e Escape.

Respeitar prefers-reduced-motion; teclado e leitores de tela; zoom/reflow 320px e 200–400%; foco não encoberto. Abas, quando implementadas como tabs, seguem semântica e teclado completos; não adicionar role=tab só pela aparência. Gráficos têm resumo/tabela equivalente. Não usar notificações transitórias como única confirmação de ação.

## Aceite da primeira aplicação do tema

Capturas comparativas antes/depois em 1440, 390 e 320px, axe, teclado, contraste medido, sem rolagem lateral e sem perda de ações. Testar aparelho físico/TalkBack ou VoiceOver quando disponível; registrar explicitamente se pendente. Só substituir screenshots no README por capturas da implementação, identificando mockups como propostas. Não publicar dados reais de pacientes.

## Primeira aplicação — referência visual Wellts

Aplicado tema inicial próprio nos painéis CareLayout em 29/10/2026. Referência analisada visualmente e por estilos públicos: https://nutricaosemfronteiras.com.br/wellts . Aproveitados princípios de fundo branco, tipografia escura forte, verde profundo e turquesa nas ações, com cards leves e respiro. Não foram copiados logo, ilustrações, textos promocionais, depoimentos, dados comerciais ou templates de código. O tema é localizado aos painéis, sem redesenhar a landing pública antiga nesta entrega. Tokens anteriores continuam como proposta; a primeira aplicação usa primary #08786c, ação turquesa #20d6bd e superfícies #f1faf6. Próximas revisões devem consolidar os tokens antes de ampliar o tema.

Validação: build, lint, ausência de overflow e axe nas telas Clientes, Início e Atendimento em 1440 e 320px. Não substitui validação em aparelho físico.

## Tema global e regra 60/30/10 — 29/10/2026

Tema transferido para src/global-theme.css e aplicado no elemento raiz, cobrindo acesso, demonstração, paciente e consultório. Direção atual solicitada: três cores de superfície da marca — branco #FFFFFF (aproximadamente 60%), verde-claro #E6F7EF (30%) e esmeralda #08786C (10%). Proporções guiam hierarquia visual, não medição exata por pixel em todas as rotas. Esmeralda concentra ações/seleções; verde-claro agrupa apoio; branco mantém fundo e cards. Texto preserva tons escuros para legibilidade, e estados semânticos de segurança mantêm significado. Eliminado o turquesa vibrante anterior como quarta cor de marca.

Tema inclui campos, foco, navegação, cards, diálogos e adaptações móveis. Verificação global anterior: 20 rotas em 1440/320px (incluindo áreas bloqueadas do Básico), axe em acesso/dieta/painel; 25 testes aprovados. Ajuste final 60/30/10 validado com build e lint e conferência de contraste das ações. Não equivale a teste físico ou auditoria integral de cada fluxo Premium.

## Navegação clicável — estados de interação

Menu dos módulos: fundo verde-claro por opção; borda esmeralda no hover; selecionado esmeralda com texto branco e aria-current=page. Setas decorativas indicam navegação e peso tipográfico reforça seleção. Alvos de pelo menos 44px e foco visível permanecem. Cards de conteúdo não ganham cursor de ação. Os mesmos estados servem ao consultório e ao acompanhamento do paciente. Verificação em Edge 1440/320px nos dois perfis: navegação com Enter, seleção atual, contraste axe e reflow aprovados; build e lint aprovados.
