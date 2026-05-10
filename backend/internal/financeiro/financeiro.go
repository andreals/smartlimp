package financeiro

import (
	"database/sql"
	"net/http"
	"strconv"
	"strings"
	"time"

	"github.com/forint/smartlimp-backend/internal/httpx"
)

type ComandaResumo struct {
	ID               int64   `json:"id"`
	IDCliente        int64   `json:"id_cliente"`
	Numero           int64   `json:"numero"`
	Data             string  `json:"data"`
	Nome             string  `json:"nome"`
	Valor            float64 `json:"valor"`
	Quantidade       int64   `json:"quantidade"`
	EfetuouPagamento string  `json:"efetuou_pagamento"`
}

type Handler struct{ db *sql.DB }

func NewHandler(db *sql.DB) *Handler { return &Handler{db: db} }

func parseBRDate(s string) (string, error) {
	if s == "" {
		return "", nil
	}
	parts := strings.Split(s, "/")
	if len(parts) != 3 {
		return "", nil
	}
	return parts[2] + "-" + parts[1] + "-" + parts[0], nil
}

func (h *Handler) Comandas(w http.ResponseWriter, r *http.Request) {
	q := r.URL.Query()
	idCliente := strings.TrimSpace(q.Get("id_cliente"))
	dataInicio, _ := parseBRDate(strings.TrimSpace(q.Get("data_inicio")))
	dataFim, _ := parseBRDate(strings.TrimSpace(q.Get("data_fim")))

	if idCliente == "" || dataInicio == "" || dataFim == "" {
		httpx.JSON(w, http.StatusOK, []ComandaResumo{})
		return
	}

	rows, err := h.db.Query(`
		SELECT x1.id, x3.nome, x1.numero, x1.id_cliente, x1.efetuou_pagamento,
		       TO_CHAR(x1.data, 'DD/MM/YYYY') AS data,
		       SUM(x2.valor_peca*x2.quantidade) AS valor, SUM(x2.quantidade) AS quantidade
		FROM comandas x1
		JOIN comanda_pecas x2 ON x1.id = x2.id_comanda
		JOIN clientes x3 ON x3.id = x1.id_cliente
		WHERE x3.id = $1 AND x1.data BETWEEN $2 AND $3
		GROUP BY x1.id, x3.nome, x1.numero, x1.id_cliente, x1.efetuou_pagamento, x1.data`,
		idCliente, dataInicio, dataFim,
	)
	if err != nil {
		httpx.Error(w, r, http.StatusInternalServerError, "erro ao consultar comandas", err)
		return
	}
	defer rows.Close()

	out := []ComandaResumo{}
	for rows.Next() {
		var c ComandaResumo
		var nome sql.NullString
		var efet sql.NullString
		if err := rows.Scan(&c.ID, &nome, &c.Numero, &c.IDCliente, &efet, &c.Data, &c.Valor, &c.Quantidade); err != nil {
			httpx.Error(w, r, http.StatusInternalServerError, "erro ao ler comandas", err)
			return
		}
		c.Nome = nome.String
		c.EfetuouPagamento = efet.String

		ad, _ := h.db.Query(`SELECT valor, tipo FROM comanda_adicionais WHERE id_comanda = $1`, c.ID)
		if ad != nil {
			for ad.Next() {
				var v float64
				var t string
				if err := ad.Scan(&v, &t); err == nil {
					if t == "acrescimo" {
						c.Valor += v
					} else {
						c.Valor -= v
					}
				}
			}
			ad.Close()
		}

		var saldo sql.NullFloat64
		_ = h.db.QueryRow(
			`SELECT COALESCE(SUM(valor), 0) FROM cliente_saldo WHERE id_cliente = $1 AND id_comandautilizou = $2`,
			c.IDCliente, c.ID,
		).Scan(&saldo)
		c.Valor -= saldo.Float64

		out = append(out, c)
	}

	httpx.JSON(w, http.StatusOK, out)
}

func (h *Handler) Pagantes(w http.ResponseWriter, r *http.Request) {
	q := r.URL.Query()
	dias, err := strconv.Atoi(strings.TrimSpace(q.Get("dias")))
	if err != nil || dias <= 0 {
		dias = 30
	}

	limite := time.Now().AddDate(0, 0, -dias).Format("2006-01-02")
	hoje := time.Now().Format("2006-01-02")

	rows, err := h.db.Query(`
		SELECT x1.id, x3.nome, x1.numero, x1.id_cliente, x1.efetuou_pagamento,
		       TO_CHAR(x1.data, 'DD/MM/YYYY') AS data,
		       SUM(x2.valor_peca*x2.quantidade) AS valor, SUM(x2.quantidade) AS quantidade
		FROM comandas x1
		JOIN comanda_pecas x2 ON x1.id = x2.id_comanda
		JOIN clientes x3 ON x3.id = x1.id_cliente
		WHERE x1.data BETWEEN $1 AND $2 AND x1.efetuou_pagamento = 'N'
		GROUP BY x1.id, x3.nome, x1.numero, x1.id_cliente, x1.efetuou_pagamento, x1.data`,
		limite, hoje,
	)
	if err != nil {
		httpx.Error(w, r, http.StatusInternalServerError, "erro ao consultar pagantes", err)
		return
	}
	defer rows.Close()

	out := []ComandaResumo{}
	for rows.Next() {
		var c ComandaResumo
		var nome sql.NullString
		var efet sql.NullString
		if err := rows.Scan(&c.ID, &nome, &c.Numero, &c.IDCliente, &efet, &c.Data, &c.Valor, &c.Quantidade); err != nil {
			httpx.Error(w, r, http.StatusInternalServerError, "erro ao ler pagantes", err)
			return
		}
		c.Nome = nome.String
		c.EfetuouPagamento = efet.String

		ad, _ := h.db.Query(`SELECT valor, tipo FROM comanda_adicionais WHERE id_comanda = $1`, c.ID)
		if ad != nil {
			for ad.Next() {
				var v float64
				var t string
				if err := ad.Scan(&v, &t); err == nil {
					if t == "acrescimo" {
						c.Valor += v
					} else {
						c.Valor -= v
					}
				}
			}
			ad.Close()
		}

		var saldo sql.NullFloat64
		_ = h.db.QueryRow(
			`SELECT COALESCE(SUM(valor), 0) FROM cliente_saldo WHERE id_cliente = $1 AND id_comandautilizou = $2`,
			c.IDCliente, c.ID,
		).Scan(&saldo)
		c.Valor -= saldo.Float64

		out = append(out, c)
	}
	httpx.JSON(w, http.StatusOK, out)
}
