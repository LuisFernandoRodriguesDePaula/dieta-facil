# Feedback, dificuldades e decisões em aberto

Registro em 29/10/2026. Relatos do proprietário, sem identificação dos avaliadores ou dados clínicos. Não atribuir consenso a todos os nutricionistas. Para novas sessões, continuar usando [FEEDBACK_V1.md](FEEDBACK_V1.md).

| ID | Evidência/origem | Decisão ou próxima ação | Estado |
|---|---|---|---|
| FB01 | Proprietário: projeto disponibilizado aos nutricionistas | Atualizar estado público; registrar cada dificuldade com tela/passos | Teste iniciado, feedback parcial |
| FB02 | Feedback de um nutricionista: macros nos produtos e soma por refeição | Nutrientes híbridos, cálculo no servidor, total diário e parcial explícito | Planejado F02; validar medidas/energia desejadas |
| FB03 | Proprietário: IA como auxiliar com contexto da dieta | Orientações publicadas, fila humana e piloto supervisionado | Planejado F03–F05 |
| FB04 | Proprietário: referência Wellts e crescimento | Acompanhamento, check-ins, CRM, agenda, financeiro, equipes, comunicação e relatórios | Backlog consolidado; não validado comercialmente |
| FB05 | Interfaces densas, títulos repetidos e refeições abertas dificultavam uso | Cards recolhíveis, título removido, ferramentas junto às abas | Implementado na base d47081e |
| FB06 | Desfazer duas refeições não atualizava corretamente em relato anterior | Preservar correção e cobertura após reload | Jornada automatizada aprovada na validação 27/10 |
| FB07 | Usuário não quer atividade obrigatória diária | Registro opcional; check-in periódico separado do registro de refeição | Invariante de produto |
| FB08 | Importação por link confundia proposta com integração pronta | Modal informa planejamento; futura importação por arquivo e revisão | Integração pendente de amostra/formato |
| FB09 | Túnel muda, expira e exige computador ligado | Serve para demonstração; hospedagem permanente antes de atendimento contínuo | Pendência operacional |
| FB10 | Ajustes de texto e prints não equivaliam sempre a código | Capturas reais separadas de mockups, mudanças aprovadas registradas | Prática adotada; manter |
| FB11 | Usuário busca baixo custo; automação pode gerar despesas | Cálculo sem IA, piloto limitado, orçamento controlado no backend | Teto e conta API ainda não definidos |
| FB12 | Branco/verde-água mais leve solicitado | Tokens candidatos e critérios de contraste | Planejado F01 |

## Perguntas e dependências

| Pergunta | Quem decide/valida | Padrão provisório | Bloqueia |
|---|---|---|---|
| Referência preferida, dados de rótulo, medidas e macros indispensáveis? | Nutricionista | Manual com fonte/referência e P/C/G/kcal; sem autoequivalência | Catálogo externo, não modelo manual |
| Qual arquivo real o WebDiet exporta como tabela? | Nutricionista e suporte do fornecedor | Usar amostra fictícia; Excel cadastral não implica dieta em Excel | Adaptador WebDiet |
| Há permissão/API oficial para integrar? | Fornecedor | Arquivo fornecido pelo profissional; não usar senha nem endpoints privados | Integração direta |
| Quanto gastar por mês e qual conta de API será usada? | Proprietário | Provedor desabilitado; adapter simulado em desenvolvimento | Chamadas reais, não caixa humana |
| Quais dúvidas podem receber resposta automática? | Nutricionistas responsáveis | Nenhuma no primeiro piloto; apenas rascunhos | LIMITED_AUTO |
| Que orientações e histórico o paciente/IA pode ver? | Profissional e responsável pelo tratamento de dados | Apenas conteúdo explicitamente publicado; notas privadas excluídas | Piloto com dados reais |
| Prazo de retenção, exclusão, base legal e fornecedores? | Responsável pelo produto com apoio especializado | Dados fictícios; minimização; não prometer conformidade | Operação real |
| Frequência e campos do check-in? | Nutricionista | Proposta semanal curta, ajustável; sem obrigatoriedade diária | F06 final |
| Clínica compartilhada, recepção ou profissional individual primeiro? | Proprietário/avaliadores | Espaço individual, arquitetura com escopo de organização | Colaboração clínica |
| Cobrança SaaS versus acompanhamento do paciente? | Proprietário | Separar contratos, sem pagamento automático agora | F10 transacional |
| WhatsApp próprio, conta comercial e canal preferido? | Proprietário | Caixa interna; integração oficial posterior | Envios externos |
| Quais problemas aparecem em celular real? | Avaliadores | Registrar aparelho, navegador, tarefa e captura fictícia | Aceite de acessibilidade em aparelho |

As dúvidas são registradas para decisão na fase correspondente; não bloqueiam toda a evolução nem representam aprovação de custos ou envio de mensagens. Antes de uma dependência real ser usada, esclarecer o ponto necessário com o proprietário.

## Importação — evidência externa

A [central oficial do WebDiet](https://ajuda.webdiet.com.br/como-exportar-os-dados-do-meu-paciente) informa Excel para dados cadastrais e exportação manual de planejamentos/avaliações/metas. Não confirmou nesta pesquisa formato estruturado da dieta nem autorização para API pública. Precisamos de amostra antes de prometer compatibilidade. Parser futuro preserva substituições e porções explícitas e marca ambiguidades; não inventa equivalências.

## Priorização após cada rodada

Registrar: tarefa, esperado/observado, frequência, impacto, origem e versão. Primeiro isolamento e erros clínicos, depois bloqueios de edição/consulta, depois ergonomia e expansão. Medir necessidade de ajuda, tempo para montar uma refeição, correções por importação e taxa de revisão das respostas IA. Não transformar opinião de um avaliador em métrica de mercado.
