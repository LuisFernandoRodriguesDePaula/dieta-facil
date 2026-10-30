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

## Recuperação e privacidade

POST /api/auth/forgot-password e /api/auth/resend-verification recebem email, exigem CSRF e retornam 202 com resposta genérica para conta conhecida/desconhecida. Links têm token aleatório no fragmento do navegador, armazenado como hash no banco, com validade de 30 minutos (RESET) ou 24 horas (VERIFY).

POST /api/auth/reset-password recebe token e password; POST /api/auth/verify-email recebe token. Cada link só pode ser usado uma vez. Trocar senha encerra as sessões anteriores no próximo acesso. Em prod, e-mail confirmado é exigido antes de criar uma sessão.

GET /api/account/status retorna a situação da própria conta. DELETE /api/account exige senha atual e confirmation=EXCLUIR, remove os dados ativos e encerra a sessão. A proteção CSRF permanece obrigatória. Em prod, os endpoints de acesso têm limite básico de 20 tentativas por IP/rota a cada 15 minutos.

A fila de e-mail é cifrada e persistida no PostgreSQL, com tentativas e expiração. Payload é apagado após envio. No ambiente local, a saída é arquivo privado; em produção, usa API HTTPS do Brevo. Ativação real está em DEPLOYMENT.md.

## Nutrientes manuais — primeira fatia

Profissional com vínculo ativo: GET /api/professional/clients/{client}/foods/{food}/nutrients?basis=AS_SOLD retorna lista vazia ou revisão atual. PUT no mesmo caminho recebe basis, referenceQuantity positiva, unit compatível, protein/carbs/fat/energy nullable e não negativos, source obrigatória até 250 caracteres e version (0 no primeiro cadastro). Campos numéricos até 12 dígitos inteiros e 6 decimais; unidades seguem regras existentes. Cria nova revisão; versão obsoleta retorna 409. Cliente não escreve; alimento de outra conta ou vínculo ausente/revogado não concede acesso.

GET /api/professional/clients/{client}/nutrient-preview?date=AAAA-MM-DD retorna name, known (subtotais por nutriente) e missing (contagens por nutriente) por refeição, seguido do total do dia quando houver refeições. Usa composição atual e ocorrências com trocas; não é consumo nem snapshot histórico. Fonte externa e equivalência não são inferidas. Detalhes em NUTRIENTES.md.
