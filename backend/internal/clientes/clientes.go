package clientes

import (
	"database/sql"
	"fmt"
	"net/http"
	"strings"
	"time"

	"github.com/forint/smartlimp-backend/internal/httpx"
	"github.com/forint/smartlimp-backend/internal/middleware"
	"github.com/go-chi/chi/v5"
)

type Cliente struct {
	ID                  int64           `json:"id"`
	Nome                string          `json:"nome"`
	Telefone            sql.NullString  `json:"-"`
	Celular             sql.NullString  `json:"-"`
	Logradouro          sql.NullString  `json:"-"`
	Numero              sql.NullString  `json:"-"`
	Bairro              sql.NullString  `json:"-"`
	Cidade              sql.NullString  `json:"-"`
	UF                  sql.NullString  `json:"-"`
	CEP                 sql.NullString  `json:"-"`
	Email               sql.NullString  `json:"-"`
	Tipo                string          `json:"tipo"`
	FrequenciaPagamento sql.NullString  `json:"-"`
	DiaVencimento       sql.NullInt64   `json:"-"`
	Antecipado          string          `json:"antecipado"`
	Status              string          `json:"status"`
	IDPacote            sql.NullInt64   `json:"-"`
	Pacote              sql.NullString  `json:"-"`
	TipoPacote          sql.NullString  `json:"-"`
	PrecoPacote         sql.NullFloat64 `json:"-"`
	QuantidadePacote    sql.NullInt64   `json:"-"`
}

type ClienteOut struct {
	ID                  int64    `json:"id"`
	Nome                string   `json:"nome"`
	Telefone            string   `json:"telefone"`
	Celular             string   `json:"celular"`
	Logradouro          string   `json:"logradouro"`
	Numero              string   `json:"numero"`
	Bairro              string   `json:"bairro"`
	Cidade              string   `json:"cidade"`
	UF                  string   `json:"uf"`
	CEP                 string   `json:"cep"`
	Email               string   `json:"email"`
	Tipo                string   `json:"tipo"`
	FrequenciaPagamento string   `json:"frequencia_pagamento"`
	DiaVencimento       int64    `json:"dia_vencimento"`
	Antecipado          string   `json:"antecipado"`
	Status              string   `json:"status"`
	IDPacote            *int64   `json:"id_pacote"`
	Pacote              string   `json:"pacote"`
	TipoPacote          string   `json:"tipo_pacote"`
	PrecoPacote         float64  `json:"preco_pacote"`
	QuantidadePacote    int64    `json:"quantidade_pacote"`
}

func toOut(c Cliente) ClienteOut {
	out := ClienteOut{
		ID:                  c.ID,
		Nome:                c.Nome,
		Telefone:            c.Telefone.String,
		Celular:             c.Celular.String,
		Logradouro:          c.Logradouro.String,
		Numero:              c.Numero.String,
		Bairro:              c.Bairro.String,
		Cidade:              c.Cidade.String,
		UF:                  c.UF.String,
		CEP:                 c.CEP.String,
		Email:               c.Email.String,
		Tipo:                c.Tipo,
		FrequenciaPagamento: c.FrequenciaPagamento.String,
		DiaVencimento:       c.DiaVencimento.Int64,
		Antecipado:          c.Antecipado,
		Status:              c.Status,
		Pacote:              c.Pacote.String,
		TipoPacote:          c.TipoPacote.String,
		PrecoPacote:         c.PrecoPacote.Float64,
		QuantidadePacote:    c.QuantidadePacote.Int64,
	}
	if c.IDPacote.Valid {
		v := c.IDPacote.Int64
		out.IDPacote = &v
	}
	return out
}

type Handler struct{ db *sql.DB }

func NewHandler(db *sql.DB) *Handler { return &Handler{db: db} }

const baseSelect = `SELECT
	x1.id, x1.nome, x1.telefone, x1.celular, x1.logradouro, x1.numero,
	x1.bairro, x1.cidade, x1.uf, x1.cep, x1.email, x1.tipo,
	x1.frequencia_pagamento, x1.dia_vencimento, x1.antecipado, x1.status,
	x1.id_pacote, x2.nome AS pacote, x2.tipo AS tipo_pacote,
	x2.preco AS preco_pacote, x2.quantidade AS quantidade_pacote
FROM clientes x1
LEFT JOIN pacotes x2 ON x1.id_pacote = x2.id`

func scan(rows *sql.Rows) (Cliente, error) {
	var c Cliente
	err := rows.Scan(
		&c.ID, &c.Nome, &c.Telefone, &c.Celular, &c.Logradouro, &c.Numero,
		&c.Bairro, &c.Cidade, &c.UF, &c.CEP, &c.Email, &c.Tipo,
		&c.FrequenciaPagamento, &c.DiaVencimento, &c.Antecipado, &c.Status,
		&c.IDPacote, &c.Pacote, &c.TipoPacote, &c.PrecoPacote, &c.QuantidadePacote,
	)
	return c, err
}

func (h *Handler) List(w http.ResponseWriter, r *http.Request) {
	q := r.URL.Query()
	status := strings.TrimSpace(q.Get("status"))

	args := []any{}
	where := []string{}
	if status != "" {
		args = append(args, status)
		where = append(where, fmt.Sprintf("x1.status = $%d", len(args)))
	}

	sqlStmt := baseSelect
	if len(where) > 0 {
		sqlStmt += " WHERE " + strings.Join(where, " AND ")
	}
	sqlStmt += " ORDER BY x1.nome"

	rows, err := h.db.Query(sqlStmt, args...)
	if err != nil {
		httpx.Error(w, r, http.StatusInternalServerError, "erro ao listar clientes", err)
		return
	}
	defer rows.Close()

	out := []ClienteOut{}
	for rows.Next() {
		c, err := scan(rows)
		if err != nil {
			httpx.Error(w, r, http.StatusInternalServerError, "erro ao ler clientes", err)
			return
		}
		out = append(out, toOut(c))
	}
	httpx.JSON(w, http.StatusOK, out)
}

func (h *Handler) Get(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")
	rows, err := h.db.Query(baseSelect+" WHERE x1.id = $1", id)
	if err != nil {
		httpx.Error(w, r, http.StatusInternalServerError, "erro ao consultar cliente", err)
		return
	}
	defer rows.Close()

	if !rows.Next() {
		httpx.Error(w, r, http.StatusNotFound, "cliente não encontrado")
		return
	}
	c, err := scan(rows)
	if err != nil {
		httpx.Error(w, r, http.StatusInternalServerError, "erro ao ler cliente", err)
		return
	}
	httpx.JSON(w, http.StatusOK, toOut(c))
}

type savePayload struct {
	ID                  *int64 `json:"id,omitempty"`
	Nome                string `json:"nome"`
	IDPacote            *int64 `json:"id_pacote,omitempty"`
	Telefone            string `json:"telefone"`
	Celular             string `json:"celular"`
	Email               string `json:"email"`
	Tipo                string `json:"tipo"`
	Antecipado          string `json:"antecipado"`
	FrequenciaPagamento string `json:"frequencia_pagamento"`
	DiaVencimento       int64  `json:"dia_vencimento"`
	CEP                 string `json:"cep"`
	Numero              string `json:"numero"`
	Logradouro          string `json:"logradouro"`
	Bairro              string `json:"bairro"`
	Cidade              string `json:"cidade"`
	UF                  string `json:"uf"`
	Status              string `json:"status"`
}

func nullablePacoteID(v *int64) sql.NullInt64 {
	if v == nil || *v <= 0 {
		return sql.NullInt64{}
	}
	return sql.NullInt64{Int64: *v, Valid: true}
}

func (h *Handler) Save(w http.ResponseWriter, r *http.Request) {
	user, _ := middleware.UserFromContext(r.Context())

	var p savePayload
	if err := httpx.Decode(r, &p); err != nil {
		httpx.Error(w, r, http.StatusBadRequest, "payload inválido")
		return
	}
	if len(strings.TrimSpace(p.Nome)) < 3 ||
		len(strings.TrimSpace(p.CEP)) != 8 ||
		strings.TrimSpace(p.Numero) == "" ||
		strings.TrimSpace(p.Logradouro) == "" ||
		strings.TrimSpace(p.Bairro) == "" ||
		strings.TrimSpace(p.Cidade) == "" ||
		strings.TrimSpace(p.UF) == "" {
		httpx.Error(w, r, http.StatusBadRequest, "campos obrigatórios inválidos")
		return
	}

	idPacote := nullablePacoteID(p.IDPacote)

	if p.ID != nil && *p.ID > 0 {
		_, err := h.db.Exec(
			`UPDATE clientes SET nome=$1, id_pacote=$2, telefone=$3, celular=$4, email=$5, tipo=$6, antecipado=$7,
			 frequencia_pagamento=$8, dia_vencimento=$9, cep=$10, numero=$11, logradouro=$12, bairro=$13, cidade=$14,
			 uf=$15, status=$16 WHERE id=$17`,
			p.Nome, idPacote, p.Telefone, p.Celular, p.Email, p.Tipo, p.Antecipado,
			p.FrequenciaPagamento, p.DiaVencimento, p.CEP, p.Numero, p.Logradouro,
			p.Bairro, p.Cidade, p.UF, p.Status, *p.ID,
		)
		if err != nil {
			httpx.Error(w, r, http.StatusInternalServerError, "erro ao atualizar cliente", err)
			return
		}
		httpx.JSON(w, http.StatusOK, map[string]any{"id": *p.ID})
		return
	}

	var newID int64
	err := h.db.QueryRow(
		`INSERT INTO clientes(id_usuario, data_cadastro, nome, id_pacote, telefone, celular, email, tipo, antecipado,
		 frequencia_pagamento, dia_vencimento, cep, numero, logradouro, bairro, cidade, uf, status)
		 VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18) RETURNING id`,
		user.UserID, time.Now().Format("2006-01-02 15:04:05"),
		p.Nome, idPacote, p.Telefone, p.Celular, p.Email, p.Tipo, p.Antecipado,
		p.FrequenciaPagamento, p.DiaVencimento, p.CEP, p.Numero, p.Logradouro,
		p.Bairro, p.Cidade, p.UF, p.Status,
	).Scan(&newID)
	if err != nil {
		httpx.Error(w, r, http.StatusInternalServerError, "erro ao cadastrar cliente", err)
		return
	}
	httpx.JSON(w, http.StatusCreated, map[string]any{"id": newID})
}

type parecidoOut struct {
	ID   int64  `json:"id"`
	Nome string `json:"nome"`
}

func (h *Handler) NomesParecidos(w http.ResponseWriter, r *http.Request) {
	nome := strings.TrimSpace(r.URL.Query().Get("nome"))
	if nome == "" {
		httpx.JSON(w, http.StatusOK, []parecidoOut{})
		return
	}
	parts := strings.Fields(nome)
	if len(parts) == 0 {
		httpx.JSON(w, http.StatusOK, []parecidoOut{})
		return
	}

	conds := make([]string, 0, len(parts))
	args := make([]any, 0, len(parts))
	for i, w := range parts {
		conds = append(conds, fmt.Sprintf("nome ILIKE $%d", i+1))
		args = append(args, "%"+w+"%")
	}

	q := "SELECT id, nome FROM clientes WHERE " + strings.Join(conds, " OR ") + " ORDER BY nome"
	rows, err := h.db.Query(q, args...)
	if err != nil {
		httpx.Error(w, r, http.StatusInternalServerError, "erro ao consultar clientes", err)
		return
	}
	defer rows.Close()

	out := []parecidoOut{}
	for rows.Next() {
		var p parecidoOut
		if err := rows.Scan(&p.ID, &p.Nome); err != nil {
			httpx.Error(w, r, http.StatusInternalServerError, "erro ao ler clientes", err)
			return
		}
		out = append(out, p)
	}
	httpx.JSON(w, http.StatusOK, out)
}

func (h *Handler) Pontos(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")
	var qtd int64
	row := h.db.QueryRow(
		`SELECT COALESCE(SUM(quantidade), 0) FROM cliente_pontos WHERE id_cliente = $1 AND utilizado = 'N'`, id,
	)
	if err := row.Scan(&qtd); err != nil {
		httpx.Error(w, r, http.StatusInternalServerError, "erro ao consultar pontos", err)
		return
	}
	httpx.JSON(w, http.StatusOK, map[string]any{"quantidade": qtd})
}

func (h *Handler) Saldo(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")
	var valor float64
	row := h.db.QueryRow(
		`SELECT COALESCE(SUM(valor), 0) FROM cliente_saldo WHERE id_cliente = $1 AND utilizado = 'N'`, id,
	)
	if err := row.Scan(&valor); err != nil {
		httpx.Error(w, r, http.StatusInternalServerError, "erro ao consultar saldo", err)
		return
	}
	httpx.JSON(w, http.StatusOK, map[string]any{"valor": valor})
}

func (h *Handler) ClienteTipo(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")
	var tipo string
	row := h.db.QueryRow(`SELECT tipo FROM clientes WHERE id = $1`, id)
	if err := row.Scan(&tipo); err != nil {
		if err == sql.ErrNoRows {
			httpx.Error(w, r, http.StatusNotFound, "cliente não encontrado")
			return
		}
		httpx.Error(w, r, http.StatusInternalServerError, "erro ao consultar tipo", err)
		return
	}
	httpx.JSON(w, http.StatusOK, map[string]any{"tipo": tipo})
}
