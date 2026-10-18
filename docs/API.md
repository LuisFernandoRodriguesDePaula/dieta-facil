# API do Dieta Fácil

Contratos pessoais implementados: [catálogo e conversões](FOODS_API.md) e [dieta, estoque, compras e cenário fictício](DOMAIN_API.md).

## Conta

| Método | Rota | Efeito |
|---|---|---|
| GET | /api/auth/csrf | Token e nome do cabeçalho para escrita |
| POST | /api/auth/register | Nome, e-mail, senha e fuso; retorna 201 sem login automático |
| POST | /api/auth/login | Credenciais; retorna perfil e cria sessão |
| POST | /api/auth/logout | Invalida sessão; retorna 204 |
| GET | /api/me | Perfil da própria sessão |
| PATCH | /api/me | Altera nome e fuso |

O [OpenAPI de autenticação](openapi-auth.yml) detalha os corpos. Login renova sessão e CSRF; obtenha um token novo após login/logout. Mantenha o cookie. Sessão ausente em recurso protegido retorna 401; CSRF inválido retorna 403. E-mail duplicado e conflito de versão retornam 409; validação retorna 400.

Senhas não são retornadas. O proprietário é sempre derivado da sessão, inclusive ao vincular IDs. Cookie HttpOnly e SameSite=Lax; o perfil prod também exige Secure.

## Demonstração pública de leitura

GET /api/demo/schedule retorna demo=true, aviso de dados fictícios e quatro refeições fixas em ordem de horário. Não representa dieta pessoal, não recebe data e não movimenta estoque.

A carga funcional de exemplo da conta usa POST /api/onboarding/scenario, com autenticação e CSRF, somente fora do perfil prod.

## Saúde

GET /actuator/health verifica a aplicação e o banco, retornando status=UP quando saudáveis, sem expor credenciais.

## Convenções

Erros usam code/message e, quando aplicável, fields. Quantidades são transmitidas como strings decimais; datas de calendário usam YYYY-MM-DD e instantes usam UTC. Detalhes de idempotência e versões estão em DOMAIN_API.md. Identificador de correlação e observabilidade completa permanecem evoluções para produção.
