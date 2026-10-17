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

As demais rotas do documento mestre são propostas futuras. Não existem endpoints de escrita, login ou geração de compras nesta entrega.

## Contratos planejados — não implementados

As rotas abaixo orientam as próximas entregas. Contratos JSON completos e OpenAPI serão adicionados junto com a implementação e seus testes.

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

E02: cadastro recebe nome/e-mail/senha/fuso e retorna 201 sem sessão automática; login recebe credenciais e retorna 200 com perfil e cookie, nunca senha/hash; logout retorna 204; sessão ausente em recurso protegido retorna 401, CSRF inválido retorna 403. Duplicidade de e-mail e conflito de versão retornam 409; validação retorna 400. Erros de propriedade não revelam dados do outro usuário. Confirmar detalhes contra Spring Security durante E02.

Compras, ajustes, consumo, preparo e estorno exigem `Idempotency-Key`; mesma chave/payload reproduz o resultado, payload diferente retorna 409. Versão do recurso é revalidada antes da mutação. Quantidades decimais serão transmitidas como strings para evitar perda de precisão no JavaScript e normalizadas no servidor. Datas de calendário usam ISO YYYY-MM-DD; instantes usam UTC com offset explícito.

Erros usarão formato consistente com código de negócio, mensagem, campos inválidos e identificador de correlação, sem stack trace/segredos. A autorização é sempre derivada da sessão, inclusive para relações entre IDs presentes no corpo.
