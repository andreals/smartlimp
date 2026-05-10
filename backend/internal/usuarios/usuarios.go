package usuarios

import (
	"crypto/md5"
	"database/sql"
	"encoding/hex"
	"net/http"
	"strings"
	"time"

	"github.com/forint/smartlimp-backend/internal/httpx"
	"github.com/forint/smartlimp-backend/internal/middleware"
	"github.com/go-chi/chi/v5"
)

type Usuario struct {
	ID     int64  `json:"id"`
	Nome   string `json:"nome"`
	Login  string `json:"login"`
	Senha  string `json:"senha,omitempty"`
	Status string `json:"status"`
}

type Handler struct {
	db *sql.DB
}

func NewHandler(db *sql.DB) *Handler {
	return &Handler{db: db}
}

func (h *Handler) List(w http.ResponseWriter, r *http.Request) {
	q := r.URL.Query()
	status := strings.TrimSpace(q.Get("status"))

	args := []any{}
	where := ""
	if status != "" {
		where = " WHERE status = $1"
		args = append(args, status)
	}

	sqlStmt := "SELECT id, nome, login, senha, status FROM usuarios" + where + " ORDER BY nome"

	rows, err := h.db.Query(sqlStmt, args...)
	if err != nil {
		httpx.Error(w, r, http.StatusInternalServerError, "erro ao listar usuários", err)
		return
	}
	defer rows.Close()

	out := []Usuario{}
	for rows.Next() {
		var u Usuario
		if err := rows.Scan(&u.ID, &u.Nome, &u.Login, &u.Senha, &u.Status); err != nil {
			httpx.Error(w, r, http.StatusInternalServerError, "erro ao ler usuários", err)
			return
		}
		out = append(out, u)
	}
	httpx.JSON(w, http.StatusOK, out)
}

func (h *Handler) Get(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")
	row := h.db.QueryRow(
		`SELECT id, nome, login, senha, status FROM usuarios WHERE id = $1`, id,
	)
	var u Usuario
	if err := row.Scan(&u.ID, &u.Nome, &u.Login, &u.Senha, &u.Status); err != nil {
		if err == sql.ErrNoRows {
			httpx.Error(w, r, http.StatusNotFound, "usuário não encontrado")
			return
		}
		httpx.Error(w, r, http.StatusInternalServerError, "erro ao ler usuário", err)
		return
	}
	httpx.JSON(w, http.StatusOK, u)
}

type savePayload struct {
	ID     *int64 `json:"id,omitempty"`
	Nome   string `json:"nome"`
	Login  string `json:"login"`
	Senha  string `json:"senha"`
	Status string `json:"status"`
}

func (h *Handler) Save(w http.ResponseWriter, r *http.Request) {
	user, _ := middleware.UserFromContext(r.Context())

	var p savePayload
	if err := httpx.Decode(r, &p); err != nil {
		httpx.Error(w, r, http.StatusBadRequest, "payload inválido")
		return
	}
	if len(strings.TrimSpace(p.Nome)) < 4 ||
		len(strings.TrimSpace(p.Login)) < 3 {
		httpx.Error(w, r, http.StatusBadRequest, "campos obrigatórios incompletos")
		return
	}
	isUpdate := p.ID != nil && *p.ID > 0
	senhaNova := strings.TrimSpace(p.Senha)
	if !isUpdate && len(senhaNova) < 5 {
		httpx.Error(w, r, http.StatusBadRequest, "campos obrigatórios incompletos")
		return
	}
	if p.Status != "ativo" && p.Status != "inativo" {
		httpx.Error(w, r, http.StatusBadRequest, "status inválido")
		return
	}

	if isUpdate && senhaNova == "" {
		_, err := h.db.Exec(
			`UPDATE usuarios SET nome = $1, login = $2, status = $3 WHERE id = $4`,
			p.Nome, p.Login, p.Status, *p.ID,
		)
		if err != nil {
			httpx.Error(w, r, http.StatusInternalServerError, "erro ao atualizar usuário", err)
			return
		}
		httpx.JSON(w, http.StatusOK, map[string]any{"id": *p.ID})
		return
	}

	senha := p.Senha
	if len(senha) != 32 {
		sum := md5.Sum([]byte(senha))
		senha = hex.EncodeToString(sum[:])
	}

	if isUpdate {
		_, err := h.db.Exec(
			`UPDATE usuarios SET nome = $1, login = $2, senha = $3, status = $4 WHERE id = $5`,
			p.Nome, p.Login, senha, p.Status, *p.ID,
		)
		if err != nil {
			httpx.Error(w, r, http.StatusInternalServerError, "erro ao atualizar usuário", err)
			return
		}
		httpx.JSON(w, http.StatusOK, map[string]any{"id": *p.ID})
		return
	}

	var newID int64
	err := h.db.QueryRow(
		`INSERT INTO usuarios(id_usuario, data_cadastro, nome, login, senha, status)
		 VALUES ($1,$2,$3,$4,$5,$6) RETURNING id`,
		user.UserID, time.Now().Format("2006-01-02 15:04:05"), p.Nome, p.Login, senha, p.Status,
	).Scan(&newID)
	if err != nil {
		httpx.Error(w, r, http.StatusInternalServerError, "erro ao cadastrar usuário", err)
		return
	}
	httpx.JSON(w, http.StatusCreated, map[string]any{"id": newID})
}
