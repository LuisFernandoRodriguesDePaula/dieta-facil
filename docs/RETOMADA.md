# Ponto de retorno — 2026-10-16

Trabalho encerrado após E03. Retomada prevista pelo usuário para 2026-10-17; sem agendamento automático.

## Estado salvo

- E01: demonstração integrada React, Spring Boot e PostgreSQL.
- E02: cadastro, login, logout e perfil pessoal com sessão HttpOnly e CSRF.
- E03: catálogo pessoal, busca, edição, arquivamento/restauração e conversões exatas.
- Último commit de implementação: `9c5a76a`.
- Repositório: https://github.com/LuisFernandoRodriguesDePaula/dieta-facil
- Árvore de trabalho limpa antes de criar este ponto de retorno.

Validação da E03: 13 testes Java, 11 testes de interface, build e GitHub Actions passaram. Os sete testes de alimentos/conversão também passaram no PostgreSQL. Interface revisada em computador e frame de 390 px, sem aparelho físico.

## Próxima entrega: E04 — dieta manual e agenda

1. Ler este arquivo, PROJECT_SPEC.md, ROADMAP.md, DOMAIN_MODEL.md e INVENTORY_RULES.md.
2. Conferir `git status` e o código atual antes de modificar arquivos.
3. Começar pelo contrato e modelo de planos, revisões com vigência, refeições, dias e itens vinculados ao catálogo pessoal. Detalhar a regra de revisão/identidade de ocorrência antes da migração.
4. Implementar em partes: persistência, API com autorização, interface e testes relevantes. Registrar commits menores e coerentes ao concluir cada parte verificável.
5. Permitir criar/duplicar refeições, copiar dias e consultar agenda por data no fuso do perfil.
6. Testar mudança de semana/mês, vigência de revisões, quantidades/unidades/referências e isolamento entre duas contas.

Não iniciar E05/estoque antes de concluir esta entrega. Agendar ou marcar refeição não deve reduzir estoque. Preservar snapshots/histórico confirmado; não alterar dados passados ao editar a dieta.

## Ambiente e cuidados ao retomar

- A pasta física ainda é `C:\Users\Usuario\Documents\ChatGPT\Nutri Fácil`; o produto chama-se Dieta Fácil. A renomeação foi bloqueada pelo Windows enquanto a pasta estava em uso.
- PostgreSQL exclusivo do projeto: 127.0.0.1:5433. Credenciais e dados ficam em `.local/`, ignorados pelo Git. Nunca publicar esse diretório.
- API: http://127.0.0.1:8080 ; interface: http://127.0.0.1:5173 . Verificar se os processos continuam ativos; não presumir que sobreviveram ao encerramento do aplicativo/computador.
- Para iniciar, usar os scripts Start-Database.ps1, Start-Backend.ps1 e Start-Frontend.ps1 conforme README.
- Sessões são perdidas ao reiniciar a API e expiram após inatividade. Usar conta fictícia para QA; a prévia foi verificada com dados de teste e não representa a conta pessoal do usuário.
- Dieta pessoal ainda não existe. `/minha-dieta` é demonstração; `/conta/alimentos` é o catálogo pessoal real.
- Recuperação de senha, verificação de e-mail e preparação para abertura pública permanecem pendentes.

## Preferências do usuário

Português do Brasil; computador e celular; aprender por entregas funcionais com explicação breve; registrar processo no GitHub para portfólio. Nas próximas etapas, preferir commits menores, com mensagens claras e validação documentada. Prosseguir sem confirmações conversacionais rotineiras dentro do escopo autorizado; permissões obrigatórias do sistema continuam aplicáveis. Não modificar configurações globais de aprovação.

## Mensagem para continuar

> Retome o Dieta Fácil pelo arquivo docs/RETOMADA.md. Continue com a E04, dieta manual e agenda recorrente, em entregas verificáveis e commits menores. Confira o estado atual antes de implementar.
