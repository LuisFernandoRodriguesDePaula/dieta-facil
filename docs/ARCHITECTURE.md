# Arquitetura inicial

O navegador executa React e consulta `/api/demo/schedule`. Durante o desenvolvimento, o proxy do Vite encaminha `/api` e `/actuator` ao Spring Boot na porta 8080. O Spring consulta o PostgreSQL por Spring Data JPA. Flyway aplica migrações e Hibernate valida o esquema, sem criá-lo automaticamente.

## Decisões

- Monorepositório: interface, API e documentação evoluem no mesmo histórico Git.
- Java 21 e Maven Wrapper: ambiente explícito, sem Maven global.
- React Router para navegação e TanStack Query para carregamento, cache e erro da API.
- PostgreSQL local em 5433 para não depender de Docker e separar o cluster deste projeto do serviço instalado em 5432.
- SQL versionado desde a primeira entrega. H2 apenas para testes rápidos.
- Demonstração de leitura antes de autenticação: nenhum endpoint recebe dados pessoais. Servidores limitados a loopback.
- Datas do navegador na demonstração; quando houver perfil, o fuso configurado pelo usuário será a referência. O plano fictício repete as mesmas refeições todos os dias.
- Marcação em memória por data: não representa histórico persistente nem funcionalidade concluída do MVP.

## Limites deliberados

`demo_meals` é uma tabela de exemplo, não o modelo definitivo do domínio. Seus itens são textos para apresentação; não são usados para cálculo. O modelo normalizado de usuários, alimentos, planos, dias e itens será implementado em migrações posteriores. Não calcular compras a partir desses textos.

Antes de CRUD pessoal: Spring Security, sessão com cookie HttpOnly, CSRF, validação e autorização de propriedade. A escolha exata será documentada em uma decisão própria antes da implementação. A API atual não está pronta para exposição pública.
