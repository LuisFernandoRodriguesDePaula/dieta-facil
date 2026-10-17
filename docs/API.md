# API da primeira entrega

## GET /api/demo/schedule

Retorna HTTP 200 com `demo: true`, aviso de dados fictícios e quatro refeições em ordem de horário. Cada refeição tem `id`, `name`, `time`, `description` e `items` (lista de textos).

```json
{
  "demo": true,
  "notice": "Plano fictício para demonstrar o aplicativo. Não é uma recomendação alimentar.",
  "meals": [
    { "id": 1, "name": "Café da manhã", "time": "07:30", "description": "Comece o dia com calma", "items": ["Ovos mexidos · 2 unidades"] }
  ]
}
```

O exemplo abrevia a lista. Não recebe parâmetros de data: o plano é fixo e demonstrativo.

## GET /actuator/health

Verifica a aplicação e sua conexão com o banco. Retorna `status: UP` quando saudável. Não expõe detalhes de conexão.

A E02 adicionou os endpoints de autenticação e perfil descritos abaixo. Geração de compras, estoque e preparo permanecem propostas futuras.

## Autenticação implementada (E02) e próximos contratos

As rotas E02 abaixo estão implementadas. As rotas E05 em diante ainda não existem. O contrato OpenAPI de acesso está em [openapi-auth.yml](openapi-auth.yml).

| Entrega | Método/rota propostos | Efeito |
|---|---|---|
| E02 | GET /api/auth/csrf | Obter token para escrita; renovar após login/logout |
| E02 | POST /api/auth/register | Criar conta; depois encaminhar ao login |
| E02 | POST /api/auth/login | Criar sessão; retornar perfil público da própria conta |
| E02 | POST /api/auth/logout | Invalidar sessão |
| E02 | GET /api/me | Consultar perfil da sessão |
| E02 | PATCH /api/me | Alterar nome/fuso; não permitir mudar identidade/propriedade por payload |
| E05 | GET /api/inventory | Consultar saldos, conhecimento e lotes |
| E05 | POST /api/inventory/adjustments | Conferência inicial, correção ou descarte com motivo |
| E06 | POST /api/shopping-lists/generate | Persistir snapshot da projeção; não movimentar estoque |
| E06 | POST /api/shopping-lists/{id}/recalculate | Recalcular preservando ajustes, sem entrada no estoque |
| E07 | POST /api/purchases | Confirmar recebimento avulso ou ligado à lista; criar lotes/movimentos |
| E08 | POST /api/meal-occurrences/{id}/consumption | Confirmar consumo real uma vez |
| E08 | POST /api/preparations | Transformar lotes de entrada em lote preparado |
| E07–E08 | POST /api/stock-operations/{id}/reversal | Estorno validado, sem apagar histórico |

E02: cadastro recebe nome/e-mail/senha/fuso e retorna 201 sem sessão automática; login recebe credenciais e retorna 200 com perfil e cookie, nunca senha/hash; logout retorna 204; sessão ausente em recurso protegido retorna 401, CSRF inválido retorna 403. Duplicidade de e-mail e conflito de versão retornam 409; validação retorna 400. Erros de propriedade não revelam dados do outro usuário. CSRF é obtido por GET /api/auth/csrf; enviar o campo token no cabeçalho indicado por headerName. Após login/logout, obter um novo token. Requisições devem manter o cookie da sessão.

Compras, ajustes, consumo, preparo e estorno exigem `Idempotency-Key`; mesma chave/payload reproduz o resultado, payload diferente retorna 409. Versão do recurso é revalidada antes da mutação. Quantidades decimais serão transmitidas como strings para evitar perda de precisão no JavaScript e normalizadas no servidor. Datas de calendário usam ISO YYYY-MM-DD; instantes usam UTC com offset explícito.

Erros E02 usam code/message e, quando aplicável, fields, sem stack trace ou senha/hash. Identificador de correlação permanece pendente para observabilidade antes da abertura pública. A autorização é sempre derivada da sessão, inclusive para relações entre IDs presentes no corpo.
