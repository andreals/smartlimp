package pecas

import (
	"database/sql"
	"net/http"
	"strings"
	"time"

	"github.com/forint/smartlimp-backend/internal/httpx"
	"github.com/forint/smartlimp-backend/internal/middleware"
	"github.com/go-chi/chi/v5"
)

type Peca struct {
	ID                int64   `json:"id"`
	Nome              string  `json:"nome"`
	ValorPassar       float64 `json:"valor_passar"`
	ValorLavar        float64 `json:"valor_lavar"`
	ValorLavarPassar  float64 `json:"valor_lavarpassar"`
	ValorTingir       float64 `json:"valor_tingir"`
	EntraPacote       string  `json:"entra_pacote"`
}

type Handler struct{ db *sql.DB }

func NewHandler(db *sql.DB) *Handler { return &Handler{db: db} }

func (h *Handler) List(w http.ResponseWriter, r *http.Request) {
	rows, err := h.db.Query(
		`SELECT id, nome, valor_passar, valor_lavar, valor_lavarpassar, valor_tingir, entra_pacote FROM pecas ORDER BY nome`,
	)
	if err != nil {
		httpx.Error(w, r, http.StatusInternalServerError, "erro ao listar peças", err)
		return
	}
	defer rows.Close()

	out := []Peca{}
	for rows.Next() {
		var p Peca
		if err := rows.Scan(&p.ID, &p.Nome, &p.ValorPassar, &p.ValorLavar, &p.ValorLavarPassar, &p.ValorTingir, &p.EntraPacote); err != nil {
			httpx.Error(w, r, http.StatusInternalServerError, "erro ao ler peças", err)
			return
		}
		out = append(out, p)
	}
	httpx.JSON(w, http.StatusOK, out)
}

func (h *Handler) Get(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")
	row := h.db.QueryRow(
		`SELECT id, nome, valor_passar, valor_lavar, valor_lavarpassar, valor_tingir, entra_pacote FROM pecas WHERE id = $1`, id,
	)
	var p Peca
	if err := row.Scan(&p.ID, &p.Nome, &p.ValorPassar, &p.ValorLavar, &p.ValorLavarPassar, &p.ValorTingir, &p.EntraPacote); err != nil {
		if err == sql.ErrNoRows {
			httpx.Error(w, r, http.StatusNotFound, "peça não encontrada")
			return
		}
		httpx.Error(w, r, http.StatusInternalServerError, "erro ao ler peça", err)
		return
	}
	httpx.JSON(w, http.StatusOK, p)
}

type savePayload struct {
	ID                *int64  `json:"id,omitempty"`
	Nome              string  `json:"nome"`
	ValorPassar       float64 `json:"valor_passar"`
	ValorLavar        float64 `json:"valor_lavar"`
	ValorLavarPassar  float64 `json:"valor_lavarpassar"`
	ValorTingir       float64 `json:"valor_tingir"`
	EntraPacote       string  `json:"entra_pacote"`
}

func (h *Handler) Save(w http.ResponseWriter, r *http.Request) {
	user, _ := middleware.UserFromContext(r.Context())

	var p savePayload
	if err := httpx.Decode(r, &p); err != nil {
		httpx.Error(w, r, http.StatusBadRequest, "payload inválido")
		return
	}
	if len(strings.TrimSpace(p.Nome)) < 4 || p.ValorPassar <= 0 || p.ValorLavar <= 0 || p.ValorLavarPassar <= 0 || p.ValorTingir <= 0 {
		httpx.Error(w, r, http.StatusBadRequest, "campos obrigatórios inválidos")
		return
	}
	if p.EntraPacote != "S" && p.EntraPacote != "N" {
		httpx.Error(w, r, http.StatusBadRequest, "entra_pacote inválido")
		return
	}

	if p.ID != nil && *p.ID > 0 {
		_, err := h.db.Exec(
			`UPDATE pecas SET nome = $1, valor_passar = $2, valor_lavar = $3, valor_lavarpassar = $4, valor_tingir = $5, entra_pacote = $6 WHERE id = $7`,
			p.Nome, p.ValorPassar, p.ValorLavar, p.ValorLavarPassar, p.ValorTingir, p.EntraPacote, *p.ID,
		)
		if err != nil {
			httpx.Error(w, r, http.StatusInternalServerError, "erro ao atualizar peça", err)
			return
		}
		httpx.JSON(w, http.StatusOK, map[string]any{"id": *p.ID})
		return
	}

	var newID int64
	err := h.db.QueryRow(
		`INSERT INTO pecas(id_usuario, data_cadastro, nome, valor_passar, valor_lavar, valor_lavarpassar, valor_tingir, entra_pacote)
		 VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING id`,
		user.UserID, time.Now().Format("2006-01-02 15:04:05"), p.Nome, p.ValorPassar, p.ValorLavar, p.ValorLavarPassar, p.ValorTingir, p.EntraPacote,
	).Scan(&newID)
	if err != nil {
		httpx.Error(w, r, http.StatusInternalServerError, "erro ao cadastrar peça", err)
		return
	}
	httpx.JSON(w, http.StatusCreated, map[string]any{"id": newID})
}
