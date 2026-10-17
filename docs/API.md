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
