# ADR-001 — Sessão e monólito modular

Data: 2026-10-16. Estado: decisão de projeto para E02, ainda não implementada.

## Contexto

Há uma interface web React e uma API Java. Precisamos proteger dados pessoais antes de permitir cadastro de dieta/estoque, mantendo implantação e aprendizado simples.

## Decisão

Usar Spring Security com autenticação por e-mail/senha e sessão no servidor. Cookie de sessão HttpOnly, SameSite=Lax e Secure obrigatório em produção HTTPS; exceção de Secure apenas no perfil local HTTP. Não armazenar credenciais de sessão em localStorage. Usar o mecanismo de hash de senha do Spring (`PasswordEncoder`, BCrypt inicial), sem criptografia própria; calibrar o custo no ambiente de execução.

Interface e API terão a mesma origem: proxy Vite no desenvolvimento, proxy/servidor da implantação em produção. Não liberar CORS com origem genérica e credenciais.

Manter proteção CSRF nas operações de escrita, inclusive fluxo de acesso. Expor token por endpoint GET dedicado, enviá-lo em cabeçalho nas mutações e obter token atualizado após login/logout conforme integração SPA do Spring Security. Cookie de sessão continua HttpOnly; token CSRF não equivale à credencial de sessão. Login renova identidade de sessão; logout invalida a sessão. Não desativar CSRF para facilitar testes.

Uma instância e sessão em memória inicialmente: reiniciar a API exige novo login. Não adicionar Redis agora; se houver múltiplas instâncias ou requisito de sobreviver a reinícios, considerar Spring Session JDBC em decisão separada.

Módulos por funcionalidade num único back-end e banco. Operações de estoque permanecem transacionais na mesma aplicação. Não introduzir microsserviços, fila nem IA no produto para os cálculos.

## Critérios de implementação

Sem redirect HTML em chamadas API: acesso não autenticado retorna JSON 401, CSRF inválido retorna 403; erro de propriedade não deve revelar existência de recurso alheio. Normalizar e-mail e tratar concorrência no cadastro pela restrição única. Mensagem de login genérica, validação de senha e nenhum segredo em logs/respostas.

Testar pelo fluxo HTTP real: cadastro, erro de login, sessão, logout, ausência de CSRF, expiração e duas contas. O teste de cookie Secure usa perfil HTTPS/produção; não presumir que teste local valida HTTPS. Antes da abertura pública, revisar recuperação de acesso, abuso, exclusão de conta e configuração de produção em E10.

## Alternativa considerada

JWT no navegador adicionaria gestão de validade, revogação e armazenamento sem resolver uma necessidade atual. Sessão atende o aplicativo web inicial e simplifica logout/revogação. Reavaliar clientes externos quando forem necessários.

## Referência

[Spring Security — CSRF e integração com aplicações JavaScript](https://docs.spring.io/spring-security/reference/servlet/exploits/csrf.html). Conferir a API da versão gerenciada pelo Spring Boot do projeto durante E02.
