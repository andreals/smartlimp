package pacotes

import (
	"database/sql"
	"net/http"
	"strings"
	"time"

	"github.com/forint/smartlimp-backend/internal/httpx"
	"github.com/forint/smartlimp-backend/internal/middleware"
	"github.com/go-chi/chi/v5"
)

type Pacote struct {
	ID         int64   `json:"id"`
	Nome       string  `json:"nome"`
	Tipo       string  `json:"tipo"`
	Preco      float64 `json:"preco"`
	Quantidade int     `json:"quantidade"`
}

type Handler struct{ db *sql.DB }

func NewHandler(db *sql.DB) *Handler { return &Handler{db: db} }

func (h *Handler) List(w http.ResponseWriter, r *http.Request) {
	rows, err := h.db.Query(
		`SELECT id, nome, tipo, preco, quantidade FROM pacotes ORDER BY tipo DESC, quantidade ASC`,
	)
	if err != nil {
		httpx.Error(w, r, http.StatusInternalServerError, "erro ao listar pacotes", err)
		return
	}
	defer rows.Close()

	out := []Pacote{}
	for rows.Next() {
		var p Pacote
		if err := rows.Scan(&p.ID, &p.Nome, &p.Tipo, &p.Preco, &p.Quantidade); err != nil {
			httpx.Error(w, r, http.StatusInternalServerError, "erro ao ler pacotes", err)
			return
		}
		out = append(out, p)
	}
	httpx.JSON(w, http.StatusOK, out)
}

func (h *Handler) Get(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")
	row := h.db.QueryRow(
		`SELECT id, nome, tipo, preco, quantidade FROM pacotes WHERE id = $1`, id,
	)
	var p Pacote
	if err := row.Scan(&p.ID, &p.Nome, &p.Tipo, &p.Preco, &p.Quantidade); err != nil {
		if err == sql.ErrNoRows {
			httpx.Error(w, r, http.StatusNotFound, "pacote não encontrado")
			return
		}
		httpx.Error(w, r, http.StatusInternalServerError, "erro ao ler pacote", err)
		return
	}
	httpx.JSON(w, http.StatusOK, p)
}

type savePayload struct {
	ID         *int64  `json:"id,omitempty"`
	Nome       string  `json:"nome"`
	Tipo       string  `json:"tipo"`
	Preco      float64 `json:"preco"`
	Quantidade int     `json:"quantidade"`
}

func (h *Handler) Save(w http.ResponseWriter, r *http.Request) {
	user, _ := middleware.UserFromContext(r.Context())

	var p savePayload
	if err := httpx.Decode(r, &p); err != nil {
		httpx.Error(w, r, http.StatusBadRequest, "payload inválido")
		return
	}
	if strings.TrimSpace(p.Nome) == "" || p.Preco <= 0 || p.Quantidade <= 0 {
		httpx.Error(w, r, http.StatusBadRequest, "campos obrigatórios inválidos")
		return
	}

	if p.ID != nil && *p.ID > 0 {
		_, err := h.db.Exec(
			`UPDATE pacotes SET nome = $1, tipo = $2, preco = $3, quantidade = $4 WHERE id = $5`,
			p.Nome, p.Tipo, p.Preco, p.Quantidade, *p.ID,
		)
		if err != nil {
			httpx.Error(w, r, http.StatusInternalServerError, "erro ao atualizar pacote", err)
			return
		}
		httpx.JSON(w, http.StatusOK, map[string]any{"id": *p.ID})
		return
	}

	var newID int64
	err := h.db.QueryRow(
		`INSERT INTO pacotes(id_usuario, data_cadastro, nome, tipo, preco, quantidade)
		 VALUES ($1,$2,$3,$4,$5,$6) RETURNING id`,
		user.UserID, time.Now().Format("2006-01-02 15:04:05"), p.Nome, p.Tipo, p.Preco, p.Quantidade,
	).Scan(&newID)
	if err != nil {
		httpx.Error(w, r, http.StatusInternalServerError, "erro ao cadastrar pacote", err)
		return
	}
	httpx.JSON(w, http.StatusCreated, map[string]any{"id": newID})
}
