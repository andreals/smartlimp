# Smart Limp Backend (Go)

API REST em Go que substitui os scripts PHP do sistema legado, mantendo a
**mesma lógica de negócio** (clientes, pacotes, peças, usuários, comandas,
financeiro e impressão de comanda) e migrando o armazenamento para
**PostgreSQL (Neon Serverless)**.

## Stack
- Go 1.25+
- Chi router
- PostgreSQL via [`pgx/v5`](https://github.com/jackc/pgx) (`stdlib`)
- JWT (`golang-jwt/jwt/v5`)
- godotenv para variáveis de ambiente

## Estrutura
```
cmd/
  api            # entry point da API HTTP
  migrate        # aplica migrations SQL no Postgres
internal/
  config         # carga de variáveis de ambiente (DATABASE_URL)
  db             # conexão Postgres (pgx stdlib)
  httpx          # helpers JSON
  middleware     # CORS, logger, auth, recoverer
  auth           # login + emissão/validação JWT
  usuarios       # CRUD usuarios
  pacotes        # CRUD pacotes
  pecas          # CRUD peças
  clientes       # CRUD clientes + pontos/saldo/tipo/parecidos
  comandas       # criar/excluir comanda, impressão, pagamento
  financeiro     # relatórios financeiros
  cep            # consulta cep (proxy para postmon)
migrations/      # scripts SQL versionados (Postgres)
```

## Deploy (Railway)

O backend está pronto para **Docker** na Railway.

1. No [Railway](https://railway.app), cria um projeto e um serviço a partir deste repositório.
2. Em **Settings → Root Directory**, define `backend` (monorepo com `frontend/` na raiz).
3. Em **Variables**, configura pelo menos:
   - `DATABASE_URL` — Postgres (ex.: Neon), formato `postgresql://...?sslmode=require`
   - `JWT_SECRET` — segredo forte (não uses o valor de exemplo)
   - `CORS_ORIGINS` — URL(s) do frontend na Vercel, separadas por vírgula (ex.: `https://teu-app.vercel.app`)
   - Opcional: `JWT_TTL_HOURS`, `ENV=production`

A Railway define `PORT` automaticamente; a API já lê essa variável.

4. Primeiro deploy: após o Postgres estar acessível, corre as migrations **uma vez** (localmente com a mesma `DATABASE_URL` ou via shell one-off na Railway):

```bash
cd backend
DATABASE_URL='postgresql://...' JWT_SECRET='...' go run ./cmd/migrate
```

5. No **frontend** (Vercel ou build local), define `VITE_API_URL` com o URL público do serviço Railway **sem** path `/api` (ex.: `https://teu-servico.up.railway.app`).

Ficheiros relevantes: `Dockerfile`, `railway.json` (healthcheck em `/api/health`).

## Setup
```bash
cp .env.example .env
# ajuste DATABASE_URL no .env (Neon/Postgres)

go mod tidy

# 1) aplicar schema + seed do admin (uma única vez)
go run ./cmd/migrate

# 2) subir a API
go run ./cmd/api
```
A API sobe em `http://localhost:8080`.

> A `DATABASE_URL` deve estar no formato
> `postgresql://USER:PASS@HOST/DB?sslmode=require` (compatível com Neon).
> Login inicial: `admin` / `admin123` (criado pela migration `002_seed_admin.sql`).
> Troque a senha logo no primeiro acesso.

## Endpoints principais

### Público
- `POST /api/auth/login` — login (devolve JWT + dados do usuário)
- `GET  /api/cep/{cep}` — consulta CEP via Postmon
- `GET  /api/health` — healthcheck

### Protegido (`Authorization: Bearer <token>`)
- `GET  /api/usuarios` `?status=ativo`
- `POST /api/usuarios` (criar/editar)
- `GET  /api/usuarios/{id}`
- `GET  /api/pacotes` | `POST /api/pacotes` | `GET /api/pacotes/{id}`
- `GET  /api/pecas` | `POST /api/pecas` | `GET /api/pecas/{id}`
- `GET  /api/clientes` `?status=ativo` | `POST /api/clientes` | `GET /api/clientes/{id}`
- `GET  /api/clientes/parecidos?nome=...`
- `GET  /api/clientes/{id}/pontos`
- `GET  /api/clientes/{id}/saldo`
- `GET  /api/clientes/{id}/tipo`
- `POST /api/comandas` (cria comanda + peças + descontos + pontos)
- `DELETE /api/comandas/{id}`
- `GET  /api/comandas/{id}/impressao` (dados estruturados para impressão)
- `POST /api/comandas/{id}/pagamento`
- `GET  /api/financeiro/comandas?id_cliente=&data_inicio=dd/mm/yyyy&data_fim=dd/mm/yyyy`
- `GET  /api/financeiro/pagantes?dias=30`

## Compatibilidade
- A senha continua sendo verificada como **MD5 do texto puro**, igual ao sistema
  PHP original, evitando migração de credenciais.
- Toda a lógica de pontos, saldo, descontos e cálculo de comanda fixa/avulsa
  reproduz o `salvaComanda.php` e o `imprimeComanda.php` originais.

## Migração MySQL → PostgreSQL
- Driver substituído por `github.com/jackc/pgx/v5/stdlib`.
- Placeholders convertidos de `?` para `$1, $2, ...`.
- `IFNULL(...)` → `COALESCE(...)`.
- `IF(cond, a, b)` → `CASE WHEN cond THEN a ELSE b END`.
- `DATE_FORMAT(d, '%d/%m/%Y')` → `TO_CHAR(d, 'DD/MM/YYYY')`.
- `INSERT ... LastInsertId()` → `INSERT ... RETURNING id` com `QueryRow().Scan(&id)`.
- Buscas de cliente por nome usam `ILIKE` (case-insensitive).
- `GROUP BY` ajustado para satisfazer regra estrita do Postgres.
- Schema completo em `migrations/001_init.sql` (BIGSERIAL, NUMERIC, CHECK constraints e índices).
