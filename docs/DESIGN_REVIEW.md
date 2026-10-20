# Revisão temporária de responsividade

Use este ambiente para compartilhar o Dieta Fácil com um designer ou avaliador usando somente dados fictícios. Ele não é a publicação definitiva. O Quick Tunnel fornece um endereço HTTPS temporário sem exigir conta/domínio: https://developers.cloudflare.com/tunnel/get-started/quick-tunnels/.

## Iniciar e encerrar

No PowerShell, na raiz do projeto:

```powershell
.\scripts\Start-DesignReview.ps1
# Opcional: duração entre 1 e 24 horas; padrão 8.
# .\scripts\Start-DesignReview.ps1 -Hours 12

# Encerrar antes do prazo:
.\scripts\Stop-DesignReview.ps1
```

O computador precisa permanecer ligado, com internet e sem suspensão. O endereço muda a cada início. A duração conta em horário absoluto; ao retomar de uma suspensão após o prazo, o processo de limpeza encerra a revisão. O serviço de túnel não garante disponibilidade; consulte a documentação oficial antes de ampliar o uso.

Para conferir somente a cópia local, use `Start-DesignReview.ps1 -LocalOnly`; isso mantém cookie local sem Secure e não cria túnel. Não publique esse modo por fora do procedimento. A versão compartilhada reinicia com cookie Secure, usa HTTPS externo e continua exigindo login/CSRF.

## O que é separado

- Banco exclusivo `dieta_facil_review` em 127.0.0.1:5433, criado vazio; nenhum dump pessoal é copiado.
- API própria em 127.0.0.1:8081, sem acesso direto pela rede local.
- Interface compilada em `.local/design-review/web/`; não expõe Vite, código-fonte ou diretório de trabalho.
- Duas contas fictícias exclusivas, com dieta, alternativas e avaliações ilustrativas. O seed só usa 8081 quando `DIETA_DESIGN_REVIEW=1`; o comportamento local anterior permanece no padrão.
- Arquivos de e-mail, configuração, credenciais, logs e relatório apenas em `.local/design-review/`, ignorado pelo Git.

O encerramento verifica identidade e horário de início dos processos antes de finalizar API, túnel e temporizador. Não interrompe o PostgreSQL compartilhado, outros serviços, nem remove os dados de revisão. Ao reiniciar, o cenário fictício existente é reutilizado; alterações já feitas pelo avaliador podem continuar presentes. Não há reset por visitante. Não use dados de pacientes reais.

## Contas e link

O endereço atual e o prazo estão em `.local/design-review/session.json`. Credenciais:

- Cliente: `.local/design-review/demo-hypertrophy.json`.
- Nutricionista: `.local/design-review/demo-professional.json`.

Compartilhe o link e os acessos de revisão diretamente com o avaliador. Não coloque essas credenciais ou o link temporário no README público. Para trocar de perfil, use Conta → Deslogar ou perfis/janelas privativas separados. Dentro do acompanhamento, a seta volta à lista de clientes, onde Conta está disponível.

Os dois acessos usam o mesmo cenário de revisão; se mais de uma pessoa editar, alterações podem ser vistas pelas outras. Permissões profissionais continuam vinculadas ao aceite. Básico fica sem estoque; simulação Premium do desenvolvimento não aparece na interface compilada. Recuperação/verificação não envia e-mail real nesta revisão. Não altere senhas para e-mails reais esperando receber mensagens.

## Conferência externa

```powershell
node .\frontend\scripts\check-design-review.mjs
```

Confere HTTPS, login dos dois perfis, Secure/HttpOnly, bloqueios e telas em 1440, 390 e 320px. Não altera dieta, avaliações, plano ou saldo. Relatório e capturas privados em `.local/design-review/`. Não substitui testes em dispositivo físico.

## Conector

O script usa `cloudflared` da distribuição oficial do GitHub, instalado só na pasta privada do projeto. `Install-ReviewConnector.ps1` fixa a versão 2026.10.1 e compara SHA-256 com o digest da distribuição antes do uso. `Start-DesignReview.ps1` também compara o executável com o manifesto antes de iniciar. O executável e o manifesto não entram no Git. Para reinstalar explicitamente:

```powershell
.\scripts\Install-ReviewConnector.ps1
```

A interface e a API são recompiladas ao iniciar. Mantenha Java 21, Node.js e PostgreSQL 17 instalados. Não há alteração global de PATH, serviço do Windows, roteador ou firewall. Encerrar a revisão retira o link do ar; a publicação permanente continua seguindo DEPLOYMENT.md.
