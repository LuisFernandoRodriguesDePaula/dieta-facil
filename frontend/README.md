# Interface do Dieta Fácil

React + TypeScript + Vite. Consulte o README na raiz para executar a API, o banco e esta interface.

- `npm.cmd ci`: instalar dependências do lockfile.
- `npm.cmd run dev`: iniciar em http://127.0.0.1:5173.
- `npm.cmd run build`: verificar TypeScript e gerar dist.
- `npm.cmd exec prettier -- --write src`: formatar os arquivos de interface.

As refeições são carregadas de `/api/demo/schedule` pelo proxy configurado no Vite. As marcações por dia ficam somente em memória, e as telas de compras/preparo descrevem funcionalidades futuras.
