# Cenário fictício: treino de hipertrofia, 82 kg e 1,80 m

Exemplo de adulto fictício para testar o Dieta Fácil. Peso e altura não bastam para definir necessidades energéticas individuais: idade, rotina de treino, gasto diário, condições de saúde e preferências não foram avaliados. Não é uma prescrição nem uma meta de superávit calórico.

O cenário distribui fontes de proteína, carboidratos, frutas, legumes e gorduras em cinco refeições. Como referência geral, o posicionamento da [ISSN sobre proteína e exercício](https://pubmed.ncbi.nlm.nih.gov/28642676/) discute 1,4–2,0 g/kg/dia para a maioria dos adultos saudáveis que se exercitam, aproximadamente 115–164 g para 82 kg. O aplicativo não calcula nutrientes; não apresenta um total exato de proteína/calorias baseado nesses itens.

| Horário | Refeição | Porções do exemplo |
|---|---|---|
| 07:30 | Café da manhã | 3 ovos; 60 g de aveia; 250 ml de leite integral; 120 g de banana sem casca |
| 10:30 | Lanche da manhã | 170 g de iogurte natural; 70 g de pão integral; 20 g de pasta de amendoim sem açúcar |
| 12:30 | Almoço | 200 g de arroz preparado; 120 g de feijão preparado; 90 g de peito de frango preparado; 100 g de brócolis preparado; 10 ml de azeite |
| 16:30 | Lanche da tarde | 120 g de banana sem casca; 30 g de aveia; 200 ml de leite integral |
| 20:00 | Jantar | 200 g de arroz preparado; 120 g de feijão preparado; 90 g de carne bovina magra preparada; 100 g de brócolis preparado; 10 ml de azeite |

Os pesos de arroz, feijão, carnes e brócolis nas refeições são preparados, não crus. O estoque mantém essas referências separadas e não inventa rendimento de cozimento.

## Dados para testar

13 alimentos e 18 lotes, incluindo ingredientes crus e porções preparadas. Todas as validades começam desconhecidas: o exemplo não deve ser interpretado como prazo de conservação. O saldo inicial permite demonstrar faltas, preparo medido, compra parcial e consumo.

Use a opção **Treino de hipertrofia · exemplo 82 kg / 1,80 m** no painel de uma conta vazia. O cenário simples anterior continua disponível. Não há substituição automática de dieta ou importação para uma conta existente.

## Conta de demonstração separada

O script npm run demo:hypertrophy, executado em frontend com os servidores locais ativos, cria uma conta fictícia independente. As credenciais aleatórias ficam somente em .local/demo-hypertrophy.json, ignorado pelo Git. Reexecutar o script reutiliza essa conta e não apaga seus testes.

Para entrar, abra esse arquivo local e copie o e-mail e a senha para a tela /entrar. A conta pessoal anterior permanece no banco, com a dieta e o estoque preservados. Não publique esse arquivo de acesso.
