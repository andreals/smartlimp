package server

import (
	"database/sql"
	"net/http"

	"github.com/forint/smartlimp-backend/internal/auth"
	"github.com/forint/smartlimp-backend/internal/cep"
	"github.com/forint/smartlimp-backend/internal/clientes"
	"github.com/forint/smartlimp-backend/internal/comandas"
	"github.com/forint/smartlimp-backend/internal/config"
	"github.com/forint/smartlimp-backend/internal/financeiro"
	mw "github.com/forint/smartlimp-backend/internal/middleware"
	"github.com/forint/smartlimp-backend/internal/pacotes"
	"github.com/forint/smartlimp-backend/internal/pecas"
	"github.com/forint/smartlimp-backend/internal/usuarios"
	"github.com/go-chi/chi/v5"
)

// New monta o handler HTTP com todas as rotas da API.
func New(cfg *config.Config, db *sql.DB) http.Handler {
	tm := auth.NewTokenManager(cfg.JWTSecret, cfg.JWTTTLHours)
	authH := auth.NewHandler(db, tm)
	usuariosH := usuarios.NewHandler(db)
	pacotesH := pacotes.NewHandler(db)
	pecasH := pecas.NewHandler(db)
	clientesH := clientes.NewHandler(db)
	comandasH := comandas.NewHandler(db)
	financeiroH := financeiro.NewHandler(db)
	cepH := cep.NewHandler()

	r := chi.NewRouter()
	r.Use(mw.Recoverer())
	r.Use(mw.Logger())
	r.Use(mw.CORS(cfg.CORSOrigins))

	r.Get("/api/health", func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		_, _ = w.Write([]byte(`{"status":"ok"}`))
	})

	r.Post("/api/auth/login", authH.Login)
	r.Get("/api/cep/{cep}", cepH.Buscar)

	r.Group(func(r chi.Router) {
		r.Use(mw.RequireAuth(tm))

		r.Route("/api/usuarios", func(r chi.Router) {
			r.Get("/", usuariosH.List)
			r.Post("/", usuariosH.Save)
			r.Get("/{id}", usuariosH.Get)
		})

		r.Route("/api/pacotes", func(r chi.Router) {
			r.Get("/", pacotesH.List)
			r.Post("/", pacotesH.Save)
			r.Get("/{id}", pacotesH.Get)
		})

		r.Route("/api/pecas", func(r chi.Router) {
			r.Get("/", pecasH.List)
			r.Post("/", pecasH.Save)
			r.Get("/{id}", pecasH.Get)
		})

		r.Route("/api/clientes", func(r chi.Router) {
			r.Get("/", clientesH.List)
			r.Post("/", clientesH.Save)
			r.Get("/parecidos", clientesH.NomesParecidos)
			r.Get("/{id}", clientesH.Get)
			r.Get("/{id}/pontos", clientesH.Pontos)
			r.Get("/{id}/saldo", clientesH.Saldo)
			r.Get("/{id}/tipo", clientesH.ClienteTipo)
		})

		r.Route("/api/comandas", func(r chi.Router) {
			r.Post("/", comandasH.Save)
			r.Delete("/{id}", comandasH.Delete)
			r.Get("/{id}/impressao", comandasH.Impressao)
			r.Post("/{id}/pagamento", comandasH.Pagamento)
		})

		r.Route("/api/financeiro", func(r chi.Router) {
			r.Get("/comandas", financeiroH.Comandas)
			r.Get("/pagantes", financeiroH.Pagantes)
			r.Get("/dashboard", financeiroH.Dashboard)
		})
	})

	return r
}
