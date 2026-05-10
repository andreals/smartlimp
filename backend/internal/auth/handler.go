package auth

import (
	"crypto/md5"
	"database/sql"
	"encoding/hex"
	"net/http"
	"strings"
	"time"

	"github.com/forint/smartlimp-backend/internal/httpx"
)

type Handler struct {
	db *sql.DB
	tm *TokenManager
}

func NewHandler(db *sql.DB, tm *TokenManager) *Handler {
	return &Handler{db: db, tm: tm}
}

type loginRequest struct {
	Login string `json:"login"`
	Senha string `json:"senha"`
}

type usuarioDTO struct {
	ID     int64  `json:"id"`
	Nome   string `json:"nome"`
	Login  string `json:"login"`
	Status string `json:"status"`
}

type loginResponse struct {
	Token     string     `json:"token"`
	ExpiresAt time.Time  `json:"expiresAt"`
	Usuario   usuarioDTO `json:"usuario"`
}

func (h *Handler) Login(w http.ResponseWriter, r *http.Request) {
	var req loginRequest
	if err := httpx.Decode(r, &req); err != nil {
		httpx.Error(w, r, http.StatusBadRequest, "payload inválido")
		return
	}
	req.Login = strings.TrimSpace(req.Login)
	req.Senha = strings.TrimSpace(req.Senha)
	if req.Login == "" || req.Senha == "" {
		httpx.Error(w, r, http.StatusBadRequest, "login e senha são obrigatórios")
		return
	}

	var (
		id          int64
		nome, login string
		senhaBanco  string
		status      string
	)
	row := h.db.QueryRow(
		`SELECT id, nome, login, senha, status FROM usuarios WHERE login = $1 LIMIT 1`,
		req.Login,
	)
	if err := row.Scan(&id, &nome, &login, &senhaBanco, &status); err != nil {
		if err == sql.ErrNoRows {
			httpx.Error(w, r, http.StatusUnauthorized, "login ou senha incorreta")
			return
		}
		httpx.Error(w, r, http.StatusInternalServerError, "erro ao consultar usuário", err)
		return
	}

	hash := md5sum(req.Senha)
	if !strings.EqualFold(hash, senhaBanco) && req.Senha != senhaBanco {
		httpx.Error(w, r, http.StatusUnauthorized, "senha inválida")
		return
	}
	if status == "inativo" {
		httpx.Error(w, r, http.StatusForbidden, "usuário inativo")
		return
	}

	token, exp, err := h.tm.Generate(id, login, nome)
	if err != nil {
		httpx.Error(w, r, http.StatusInternalServerError, "erro ao gerar token", err)
		return
	}

	httpx.JSON(w, http.StatusOK, loginResponse{
		Token:     token,
		ExpiresAt: exp,
		Usuario: usuarioDTO{
			ID:     id,
			Nome:   nome,
			Login:  login,
			Status: status,
		},
	})
}

func md5sum(s string) string {
	sum := md5.Sum([]byte(s))
	return hex.EncodeToString(sum[:])
}
