# Material do projeto para futura integração ao Portfólio

## Dieta Fácil

Aplicativo Full Stack que conecta um plano alimentar ao estoque doméstico, às compras e ao preparo. React/TypeScript, Java 21/Spring Boot, PostgreSQL e testes em camadas.

## Problema demonstrado

Uma pessoa precisa de 14 ovos no período e tem 5 em estoque: a projeção indica falta de 9. Um lote que vence antes de parte do consumo não cobre esses dias. Gerar uma lista não aumenta estoque; receber produtos aumenta. Preparar um ingrediente baixa o cru e cria saldo preparado, que será usado no consumo sem outra baixa do cru.

## Decisões que podem ser apresentadas

- Referências RAW/COOKED/AS_SOLD explícitas e BigDecimal para quantidades.
- Revisões de dieta e identidade estável de ocorrência, com snapshots de histórico.
- Alocação por validade em cada data de uso.
- Transações com bloqueio por conta, idempotência e estornos.
- Sessão/CSRF, confirmação de e-mail, recuperação de senha e exclusão da conta.
- Testes HTTP, concorrência PostgreSQL, navegador desktop/móvel e axe.
- Empacotamento de interface e API no mesmo endereço, em Docker.

## Material

README, docs/DEMO_GUIDE.md, docs/HYPERTROPHY_DEMO.md, docs/ARCHITECTURE.md e capturas em docs/images. O cenário de hipertrofia é fictício e separado da conta pessoal.

URL pública: pendente de ativação e validação das contas externas. Não usar um endereço de exemplo como demonstração publicada.

Este arquivo prepara o conteúdo; o repositório separado do Portfólio não foi alterado.
