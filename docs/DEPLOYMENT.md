# Publicação preparada — Render Free + Neon Free + Brevo Free

Estado: pacote e configuração preparados; a ativação requer contas do proprietário nos três serviços, credenciais e confirmação de remetente. Não foi criado serviço pago nem publicada uma URL fictícia.

## Opção escolhida

- Aplicação: um Web Service Docker no plano Free do Render. O mesmo endereço serve React e API Java, mantendo sessão/CSRF na mesma origem.
- Banco: PostgreSQL em um projeto Free do Neon, separado do filesystem efêmero do Render.
- E-mail: API HTTPS de e-mail transacional do Brevo Free, com remetente verificado. Não utiliza contatos/campanhas de marketing.

O [Render Free](https://render.com/docs/free) pode suspender por inatividade e tem limites de uso. Seu PostgreSQL gratuito expira em 30 dias; por isso o banco deste pacote é externo. As portas SMTP usuais são bloqueadas no Web Service Free; o envio usa HTTPS. Consulte os [limites atuais do Neon](https://neon.com/pricing) e o [plano gratuito do Brevo](https://help.brevo.com/hc/en-us/articles/208580669-FAQs-What-are-the-limits-of-the-Free-plan) antes de ativar. Não habilite upgrades, complementos ou cobrança automática para esta demonstração.

## O que já existe no repositório

- Dockerfile em três estágios: compila React, empacota Spring Boot e executa Java 21 como usuário sem privilégios.
- React Router funciona ao abrir uma rota diretamente, por exemplo /conta/preparo.
- Cookie Secure em prod, CSRF, política de conteúdo e Referrer-Policy.
- Verificação de e-mail obrigatória para novos acessos em prod.
- Tokens de confirmação/redefinição aleatórios, com hash, validade e uso único.
- Fila persistente de e-mail com conteúdo cifrado AES-GCM, tentativas e expiração; payload removido após envio.
- Limite básico por IP/rota em operações de acesso, com memória limitada e resposta 429.
- Exclusão da conta com senha atual e confirmação EXCLUIR.
- CI com imagem Docker e smoke test; não depende de Docker instalado no Windows do desenvolvedor.

## Ativação pelo proprietário

1. Crie/acesse as contas gratuitas em Render, Neon e Brevo. Conecte o GitHub ao Render para acessar o repositório dieta-facil.
2. No Neon, crie o projeto/banco e copie host, banco, usuário e senha. Use a conexão JDBC com TLS conforme o [guia Java do Neon](https://neon.com/docs/guides/java).
3. No Brevo, valide um remetente e habilite e-mail transacional. Crie uma API key com a permissão necessária para envio; não use uma chave SMTP.
4. No Render, crie um Blueprint a partir de render.yaml deste repositório. Confira explicitamente plan=free. O [formato do Blueprint](https://render.com/docs/blueprint-spec) está declarado no arquivo.
5. Preencha as variáveis abaixo no painel de segredos do serviço. Não cole valores secretos no chat, em issues ou em commits.
6. Confira a URL onrender.com atribuída, configure PUBLIC_BASE_URL com essa origem HTTPS e aguarde a implantação.
7. Valide os itens de aceite no fim deste documento antes de compartilhar com recrutadores.

| Variável | Valor |
|---|---|
| DB_URL | JDBC PostgreSQL do Neon com TLS, sem senha embutida |
| DB_USER | Usuário do banco |
| DB_PASSWORD | Senha do banco |
| PUBLIC_BASE_URL | Origem HTTPS atribuída, sem caminho ou barra final |
| BREVO_API_KEY | API key de envio transacional |
| MAIL_FROM | E-mail do remetente validado |
| MAIL_ENCRYPTION_KEY | Gerada pelo Blueprint; preservar entre implantações |

Não substitua a chave de cifragem enquanto houver e-mails pendentes sem planejar sua invalidação. Ela é separada do banco e necessária para abrir o conteúdo pendente. Revogar uma chave de e-mail no provedor interrompe envios; não altera as senhas dos usuários.

## Aceite da URL real

- /actuator/health saudável e acesso direto às rotas React funcionando.
- Cadastro com um endereço controlado pelo proprietário; mensagem recebida de verdade e confirmação do e-mail.
- Login após confirmação; senha errada e tentativas excessivas rejeitadas.
- Recuperação entregue de verdade, link de uso único e sessões anteriores encerradas.
- Cadastro de alimento, dieta, lote, compra e consumo persistindo após reinício.
- Cookie Secure/HttpOnly/SameSite, HTTPS, CSRF e origem conferidos na plataforma.
- Exclusão de uma conta de teste e ausência dos respectivos dados ativos.
- Limites, faturamento, retenção e canal de suporte revisados pelo proprietário.

A configuração local por arquivo não envia mensagens pela internet. Em prod o modo file é rejeitado. Sem as chaves do provedor, as operações que precisam enviar e-mail retornam indisponibilidade.

## Limites operacionais

O limitador básico é por instância e reinicia junto do processo; não substitui proteção de borda contra ataques distribuídos. Sessões continuam em memória e são perdidas em reinícios ou suspensão do serviço gratuito. A fila de e-mail oferece tentativas; um timeout do provedor pode produzir mensagem repetida, mas o token só pode ser consumido uma vez.

Backups locais: scripts/Backup-Database.ps1 -VerifyRestore. O script restaura em banco temporário e preserva o original. Backups da instância pública, retenção, restauração externa e revisão completa de segurança/acessibilidade precisam ser definidos antes de uso com dados reais.

A integração com o Portfólio fica após a URL real ser validada; use o material técnico de docs/PROJECT_CASE.md.
