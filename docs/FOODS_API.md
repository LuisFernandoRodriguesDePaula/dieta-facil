# Catálogo pessoal — E03

Implementado localmente. Tela `/conta/alimentos`, acessível por Minha conta ou pelo catálogo de demonstração. Requer login. O catálogo pessoal começa vazio e não importa os dados fictícios automaticamente.

## Dados e regras

Cada alimento guarda nome (1–120 caracteres após remoção de espaços externos), unidade preferida, categoria, frequência e versão. A unidade-base e a dimensão são derivadas:

| Código | Exibição | Dimensão | Base |
|---|---|---|---|
| G / KG | g / kg | MASS | G |
| ML / L | ml / L | VOLUME | ML |
| UNIT | unidade | COUNT | UNIT |

Categorias: PRODUCE (Hortifruti), PROTEIN (Proteínas), GRAINS (Grãos e cereais), DAIRY (Laticínios), PANTRY (Despensa), OTHER (Outros). Frequências: WEEKLY e MONTHLY; não representam validade. Nomes repetidos são permitidos nesta versão; IDs distinguem os cadastros.

Uma edição pode trocar G/KG ou ML/L, mas não a dimensão. Isso evita reinterpretar quantidades históricas quando o plano/estoque for ligado ao catálogo. Para outra dimensão, criar novo alimento. Não há exclusão definitiva: arquivamento preserva o ID; restauração volta ao catálogo ativo. Alimento arquivado não pode ser editado até ser restaurado.

## Endpoints

| Método e rota | Resultado |
|---|---|
| GET /api/foods?q=&archived=false&page=0&size=20 | Listagem paginada do usuário |
| GET /api/foods/{id} | Alimento próprio ativo ou arquivado |
| POST /api/foods | Criar alimento; 201 |
| PATCH /api/foods/{id} | Atualizar com version; 200 |
| PATCH /api/foods/{id}/archive | Arquivar/restaurar com version; 200 |
| POST /api/foods/{id}/convert | Conferir conversão; não grava estoque; 200 |

Todas as escritas exigem cookie e CSRF conforme [API.md](API.md). A identidade vem da sessão: campos userId/id enviados na criação não escolhem proprietário. ID válido de outro usuário retorna 404, assim como ID inexistente. Não existe rota DELETE (405).

Listagem aceita q até 120 caracteres, page de 0 a 100000 e size de 1 a 100. Busca por trecho literal, sem distinguir maiúsculas/minúsculas; `%` e `_` não viram curingas. Não há normalização de acentos nesta entrega. Ordenação por nome e ID. archived=true lista apenas arquivados, false apenas ativos.

Resposta da lista: `{ "items": [...], "page": 0, "totalPages": 1, "totalElements": 2 }`.

Criação:

```json
{ "name": "Arroz integral", "unit": "KG", "category": "GRAINS", "purchaseFrequency": "MONTHLY" }
```

Resposta de alimento:

```json
{
  "id": "0e33d377-a7a1-4314-a45e-203f9dffb674",
  "name": "Arroz integral",
  "unit": "KG",
  "baseUnit": "G",
  "dimension": "MASS",
  "category": "GRAINS",
  "purchaseFrequency": "MONTHLY",
  "archivedAt": null,
  "version": 0
}
```

Atualização recebe os mesmos quatro campos da criação e version da última leitura. Semântica de substituição desses campos: enviar todos, mesmo usando PATCH. Arquivamento recebe `{ "archived": true, "version": 0 }`; restauração usa false. Uma versão desatualizada retorna 409. Bloqueio otimista no banco também protege contra duas atualizações realmente concorrentes. A interface preserva o formulário em erro e oferece fechar/recarregar; não repete escrita automaticamente.

## Conversão exata

```json
{ "quantity": "1.5", "from": "KG", "to": "G", "basis": "RAW" }
```

Resultado: `{ "quantity": "1500", "unit": "G", "basis": "RAW" }`.

Entrada positiva com até 12 dígitos inteiros e 6 decimais; decimal transmitido como string. A interface aceita vírgula e envia ponto. O resultado é string exata, sem arredondamento; pode ter mais casas após conversão (0.000001 g = 0.000000001 kg). BigDecimal executa os cálculos no servidor.

Contagem exige inteiro, inclusive na API. Massa não converte em volume/contagem. A origem deve pertencer à dimensão do alimento e o destino à mesma dimensão da origem. Referência RAW/COOKED/AS_SOLD é obrigatória e mantida; não há transformação cru/cozido. A referência pertence à quantidade informada, não define um estado obrigatório para todo o alimento do catálogo.

Erros: 400 para dados/filtros/unidades inválidos; 401 sem sessão; 403 sem CSRF; 404 para recurso indisponível ao usuário; 409 para conflito de versão ou edição de arquivado. Todos os erros de aplicação seguem code/message. Campos inválidos podem incluir fields.

## Validação realizada

Treze testes Java no conjunto completo; onze testes de interface com respostas simuladas. Os sete testes de alimentos/conversão também passaram usando PostgreSQL local. Cobertura inclui persistência em nova sessão, duas contas, escolha maliciosa de proprietário, busca literal, paginação, arquivamento/restauração, conflito de versão, CSRF e conversões. Conflito de versão sequencial é testado; teste de corrida de threads fica para as operações transacionais de estoque. Não foi feito teste de carga.
