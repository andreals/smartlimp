# Smart Limp Frontend (React + Vite)

SPA em React/TypeScript que consome a API Go (`backend/`) e substitui o
sistema PHP/jQuery anterior, mantendo todas as funcionalidades:

- Login (autenticação com JWT, senha em MD5 compatível com base atual).
- Comanda (cliente + peças + descontos/acréscimos + pontos + saldo).
- Impressão de comanda em 3 vias (cliente, lavanderia e caixa).
- Financeiro (filtro por cliente/data, comandas em aberto, situação de pagamento).
- CRUD de clientes (com busca por nomes parecidos e preenchimento por CEP).
- CRUD de pacotes, peças e usuários.

## Stack
- React 18 + TypeScript
- Vite 5
- TailwindCSS 3
- React Router 6
- Axios
- react-hot-toast

## Setup
```bash
npm install
npm run dev
```
A aplicação sobe em `http://localhost:5173` e usa o proxy do Vite para chamar
o backend em `http://localhost:8080/api`.

Para apontar diretamente para uma URL pública da API, defina:
```bash
echo "VITE_API_URL=https://sua-api.com" > .env.local
```

## Build
```bash
npm run build
npm run preview
```

## Estrutura
```
src/
  App.tsx
  main.tsx
  index.css
  contexts/AuthContext.tsx     # sessão + login
  components/                  # Layout, Spinner, EmptyState, ConfirmDialog, PageHeader
  lib/api.ts                   # axios + interceptor JWT
  lib/format.ts                # máscaras, BRL e MD5
  pages/                       # Login, Comanda, Financeiro, Clientes, Pacotes, Peças, Usuários, Impressão
  types/index.ts               # tipos compartilhados
```

## Compatibilidade com legado
- Token e usuário ficam em `localStorage` (`smartlimp:token`, `smartlimp:usuario`).
- A senha digitada é convertida em MD5 antes de ser enviada para a API,
  preservando a base de credenciais existente.
- Datas em telas seguem o padrão brasileiro `dd/mm/aaaa`, exatamente como no
  sistema PHP.
