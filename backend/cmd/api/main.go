package main

import (
	"log"
	"net/http"
	"time"

	"github.com/forint/smartlimp-backend/internal/auth"
	"github.com/forint/smartlimp-backend/internal/cep"
	"github.com/forint/smartlimp-backend/internal/clientes"
	"github.com/forint/smartlimp-backend/internal/comandas"
	"github.com/forint/smartlimp-backend/internal/config"
	"github.com/forint/smartlimp-backend/internal/db"
	"github.com/forint/smartlimp-backend/internal/financeiro"
	mw "github.com/forint/smartlimp-backend/internal/middleware"
	"github.com/forint/smartlimp-backend/internal/pacotes"
	"github.com/forint/smartlimp-backend/internal/pecas"
	"github.com/forint/smartlimp-backend/internal/usuarios"
	"github.com/go-chi/chi/v5"
)

func main() {
	cfg := config.Load()

	tz, err := time.LoadLocation("America/Sao_Paulo")
	if err == nil {
		time.Local = tz
	}

	conn, err := db.Connect(cfg)
	if err != nil {
		log.Fatalf("falha ao conectar no banco: %v", err)
	}
	defer conn.Close()

	tm := auth.NewTokenManager(cfg.JWTSecret, cfg.JWTTTLHours)
	authH := auth.NewHandler(conn, tm)
	usuariosH := usuarios.NewHandler(conn)
	pacotesH := pacotes.NewHandler(conn)
	pecasH := pecas.NewHandler(conn)
	clientesH := clientes.NewHandler(conn)
	comandasH := comandas.NewHandler(conn)
	financeiroH := financeiro.NewHandler(conn)
	cepH := cep.NewHandler()

	r := chi.NewRouter()
	r.Use(mw.Recoverer())
	r.Use(mw.Logger())
	r.Use(mw.CORS(cfg.CORSOrigins))

	r.Get("/api/health", func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		w.Write([]byte(`{"status":"ok"}`))
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

	addr := ":" + cfg.Port
	log.Printf("Smart Limp API rodando em %s (env=%s)", addr, cfg.Env)
	if err := http.ListenAndServe(addr, r); err != nil {
		log.Fatalf("servidor finalizado: %v", err)
	}
}
