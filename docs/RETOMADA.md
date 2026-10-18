# Ponto de retorno — 2026-10-18

## Estado

Dieta Fácil tem versão demonstrável local: dieta versionada, agenda, estoque por lotes, compras por cobertura e validade, recebimentos parciais, preparo medido, consumo e estornos. A pasta física é C:\Users\Usuario\Documents\ChatGPT\Dieta Fácil; o caminho antigo Nutri Fácil não existe mais.

Repositório: https://github.com/LuisFernandoRodriguesDePaula/dieta-facil

## Demonstração de hipertrofia

O usuário autorizou uma conta de demonstração separada, preservando seus dados. Ela foi criada e carregada com cinco refeições diárias e 18 lotes para um adulto fictício de 82 kg e 1,80 m. É um exemplo de uso, sem prescrição individual ou cálculo de calorias/macronutrientes. Validades permanecem desconhecidas.

Execute `npm run demo:hypertrophy` em frontend para consultar/reutilizar essa conta. Credenciais estão em `.local/demo-hypertrophy.json`, fora do Git. Detalhes: [HYPERTROPHY_DEMO.md](HYPERTROPHY_DEMO.md).

## Execução e segurança

Use scripts Start-Database.ps1, Start-Backend.ps1 e Start-Frontend.ps1. Interface: http://127.0.0.1:5173/entrar; API: 8080; PostgreSQL exclusivo: 5433. Reiniciar a API encerra sessões. Nunca publicar `.local/`, credenciais, e-mails locais, dumps ou traces.

V1–V8 mantêm o domínio já entregue. V9 adiciona tokens de acesso, verificação de e-mail e fila criptografada de envio. Recuperação troca a senha e invalida sessões anteriores. Exclusão exige senha e EXCLUIR, remove dados da própria conta e preserva outras contas. Produção exige e-mail verificado, cookie Secure e limita tentativas por IP/rota em cada instância.

No ambiente local, mensagens são arquivos privados em `.local/mail/`; nenhum e-mail real é enviado. Produção usa Brevo por HTTPS. Não colocar chaves no código ou no chat.

## Validação e publicação

Foram executados 36 testes Java no PostgreSQL, 18 testes de interface, build e lint. A suíte de navegador cobre computador e viewport móvel, jornadas de domínio, recuperação/exclusão e acessibilidade automatizada nas sete telas pessoais e nas telas públicas. Consulte a CI do último commit para os resultados finais de H2, PostgreSQL, navegador e imagem Docker. Verificações automatizadas não equivalem a auditoria completa de acessibilidade ou teste em aparelho físico.

Backup local foi criado e restaurado em banco temporário de verificação, sem alterar o original. Script: Backup-Database.ps1. Backups externos e ensaio de restauração na hospedagem ainda dependem da ativação.

O usuário autorizou preparar uma opção sem mensalidade e informou que ainda não possui serviços. Dockerfile, render.yaml e [DEPLOYMENT.md](DEPLOYMENT.md) preparam Render Free + Neon + Brevo. Ainda não existe publicação pública: é necessário criar/conectar as contas, verificar remetente, configurar segredos e validar a URL HTTPS. Não contratar planos ou prometer gratuidade ilimitada. A imagem completa é validada na CI, pois Docker não está instalado nesta máquina.

## Próxima etapa

Concluir/consultar CI do push mais recente e ativar os serviços externos conforme DEPLOYMENT.md quando o usuário conectar suas contas. Validar cadastro, confirmação de e-mail, recuperação, cookies e backup na URL real. O projeto Portfólio é separado e não deve ser alterado nesta etapa; PROJECT_CASE.md prepara apenas o texto dentro deste repositório.

Português do Brasil; computador e celular; commits coerentes; processo documentado. Prosseguir autonomamente no escopo autorizado. Não modificar configurações globais de aprovação, não criar agentes sem autorização e não usar serviços pagos. O aplicativo não chama API de IA.

## Atualização — painel diário e trocas (V10)

A tela /conta/dieta abre nos cartões do dia; o editor está em /conta/dieta?editar=1. /conta/agenda usa o mesmo painel. Há resumo/progresso, destaque de próxima refeição, troca de alimento com porções cadastradas, configuração de permissão e alternativas por item, confirmação de consumo e Desfazer. Painel lateral no computador e inferior no celular.

Regras podem ficar bloqueadas. A porção original faz parte da configuração: editar essa porção exige revisão das alternativas. Trocas ONCE persistem em meal_overrides; NEXT usa a revisão da dieta a partir do dia escolhido e respeita revisões futuras. Snapshots consumidos/pulados são preservados. Compras consideram as exceções e ficam desatualizadas quando a origem muda. Trocar não baixa estoque. Regras/exceções/ações são removidas na exclusão da conta.

42 testes Java passaram no PostgreSQL de testes separado dieta_facil_test; não executar testes de API contra o banco pessoal nem em paralelo usando a mesma base da demonstração. 18 testes da interface, build e lint passaram. A jornada de navegador foi ampliada para 12 casos em computador/viewport móvel, incluindo troca e desfazer; consultar a CI do último push para a validação final H2/PostgreSQL/navegador/Docker.

O script demo:hypertrophy adicionou três regras ilustrativas ausentes à conta fictícia já existente. Nenhuma dieta, refeição ou quantidade de estoque foi alterada nessa conta. As credenciais permanecem no arquivo privado anterior. A publicação externa segue pendente das contas gratuitas do proprietário; o Portfólio continua separado.

## Atualização prioritária — modelo 1.0 com acompanhamento profissional (V11)

A orientação mais recente é preparar uma primeira versão para um nutricionista testar com dados fictícios e devolver feedback. O cliente consulta dieta/horários e alternativas autorizadas, sem montar refeições ou preencher avaliações. Registrar Já comi é opcional. O nutricionista vinculado edita a dieta, o catálogo e as alternativas do cliente e registra avaliações mensais.

Rotas: /profissional (clientes), /profissional/clientes/:id (catálogo, dieta e avaliações), /conta/dieta, /conta/resultados, /conta/nutricionista (convite/aceite/revogação), /conta/premium (plano/estoque opcional). O cliente não pode habilitar edição por query string. Restrições também valem na API. Convites são internos, sem envio de e-mail, por sete dias; exigem conta do cliente no mesmo e-mail e aceite. Revogação preserva dieta e resultados. Perfis profissionais ainda são autodeclarados na demonstração.

Contas novas: CLIENT por padrão, BASIC e estoque desativado. Migração preservou Premium/estoque das contas antigas sem zerar saldos. Apenas a conta fictícia de hipertrofia foi explicitamente colocada no Básico. Ativar estoque exige conferência; desativar congela saldos. Não há baixa retroativa. Check-ins guardam modo ONLY/INVENTORY, repetição segura e estorno compatível com o modo original. Simular plano é permitido apenas fora de prod e não contrata nada.

Execute `npm run demo:care` (demo:hypertrophy é um alias). Cliente reutilizado: `.local/demo-hypertrophy.json`; profissional separado: `.local/demo-professional.json`. O script preserva dieta, estoque, regras e avaliações já existentes e só completa exemplos ausentes. Foram cadastradas duas avaliações fictícias em meses distintos. Não modificar o projeto Portfólio. Roteiro para o teste: V1_VALIDATION.md.

Validação desta etapa: 45 testes Java aprovados no PostgreSQL isolado, 18 testes da interface, build/lint e jornada nova em computador/celular. A suíte de navegador foi ampliada para 14 casos. Conferir a CI do commit final para o resultado completo H2/PostgreSQL/navegador/Docker. Credenciais, arquivos de e-mail, banco e capturas privadas continuam somente em .local/.

## Ajuste de acesso

Login e sessão já aberta em /entrar encaminham para /conta/inicio (destino de acordo com o perfil). /conta é a configuração pessoal, na navegação do aplicativo, sem o bloco antigo de atalhos. Saída em Conta → Deslogar. Gerenciar senha e conta mantém acesso à recuperação, verificação e exclusão. O tempo de sessão permanece inalterado.
