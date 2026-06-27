package financeiro

import (
	"database/sql"
	"fmt"
	"net/http"
	"strconv"
	"strings"
	"time"

	"github.com/forint/smartlimp-backend/internal/httpx"
)

type ClienteFechamento struct {
	ID       int64  `json:"id"`
	Nome     string `json:"nome"`
	Celular  string `json:"celular"`
	Telefone string `json:"telefone"`
	Bairro   string `json:"bairro"`
}

func (h *Handler) ClientesFechamento(w http.ResponseWriter, r *http.Request) {
	q := r.URL.Query()
	mes, errMes := strconv.Atoi(strings.TrimSpace(q.Get("mes")))
	ano, errAno := strconv.Atoi(strings.TrimSpace(q.Get("ano")))
	tipoCliente := strings.TrimSpace(q.Get("tipo_cliente"))

	if errMes != nil || errAno != nil || mes < 1 || mes > 12 || ano < 2000 {
		httpx.JSON(w, http.StatusOK, []ClienteFechamento{})
		return
	}

	dataInicio := fmt.Sprintf("%d-%02d-01", ano, mes)
	lastDay := time.Date(ano, time.Month(mes+1), 0, 0, 0, 0, 0, time.Local).Day()
	dataFim := fmt.Sprintf("%d-%02d-%02d", ano, mes, lastDay)

	rows, err := h.db.Query(`
		SELECT DISTINCT ON (cl.nome) cl.id, cl.nome,
		       COALESCE(cl.celular, ''), COALESCE(cl.telefone, ''), COALESCE(cl.bairro, '')
		FROM comandas c
		JOIN clientes cl ON c.id_cliente = cl.id
		WHERE c.data BETWEEN $1 AND $2
		  AND ($3 = '' OR cl.tipo::text = $3)
		ORDER BY cl.nome
	`, dataInicio, dataFim, tipoCliente)
	if err != nil {
		httpx.Error(w, r, http.StatusInternalServerError, "erro ao consultar clientes", err)
		return
	}
	defer rows.Close()

	out := []ClienteFechamento{}
	for rows.Next() {
		var c ClienteFechamento
		if err := rows.Scan(&c.ID, &c.Nome, &c.Celular, &c.Telefone, &c.Bairro); err != nil {
			httpx.Error(w, r, http.StatusInternalServerError, "erro ao ler clientes", err)
			return
		}
		out = append(out, c)
	}
	httpx.JSON(w, http.StatusOK, out)
}

type FechamentoComanda struct {
	ID               int64   `json:"id"`
	Numero           int64   `json:"numero"`
	Data             string  `json:"data"`
	Quantidade       int64   `json:"quantidade"`
	ValorAvulso      float64 `json:"valor_avulso"`
	EfetuouPagamento string  `json:"efetuou_pagamento"`
}

type FechamentoOut struct {
	Cliente          string              `json:"cliente"`
	TipoCliente      string              `json:"tipo_cliente"`
	Pacote           string              `json:"pacote"`
	PrecoPacote      float64             `json:"preco_pacote"`
	QuantidadePacote int64               `json:"quantidade_pacote"`
	Comandas         []FechamentoComanda `json:"comandas"`
	TotalPecas       int64               `json:"total_pecas"`
	TotalAvulso      float64             `json:"total_avulso"`
	ExcedentePecas   int64               `json:"excedente_pecas"`
	ValorExcedente   float64             `json:"valor_excedente"`
	Total            float64             `json:"total"`
	ValorPago        *float64            `json:"valor_pago"`
}

func (h *Handler) Fechamento(w http.ResponseWriter, r *http.Request) {
	q := r.URL.Query()
	idCliente := strings.TrimSpace(q.Get("id_cliente"))
	mes, errMes := strconv.Atoi(strings.TrimSpace(q.Get("mes")))
	ano, errAno := strconv.Atoi(strings.TrimSpace(q.Get("ano")))

	if idCliente == "" || errMes != nil || errAno != nil || mes < 1 || mes > 12 || ano < 2000 {
		httpx.JSON(w, http.StatusOK, FechamentoOut{Comandas: []FechamentoComanda{}})
		return
	}

	var (
		clienteNome      string
		clienteTipo      string
		precoPacote      float64
		tipoPacote       string
		nomePacote       string
		quantidadePacote int64
	)
	err := h.db.QueryRow(`
		SELECT cl.nome, cl.tipo::text,
		       COALESCE(pk.preco, 0)::float8, COALESCE(pk.tipo::text, ''), COALESCE(pk.nome, ''),
		       COALESCE(pk.quantidade, 0)
		FROM clientes cl
		LEFT JOIN pacotes pk ON cl.id_pacote = pk.id
		WHERE cl.id = $1
	`, idCliente).Scan(&clienteNome, &clienteTipo, &precoPacote, &tipoPacote, &nomePacote, &quantidadePacote)
	if err != nil {
		httpx.Error(w, r, http.StatusInternalServerError, "cliente "+idCliente+": "+err.Error())
		return
	}

	dataInicio := fmt.Sprintf("%d-%02d-01", ano, mes)
	lastDay := time.Date(ano, time.Month(mes+1), 0, 0, 0, 0, 0, time.Local).Day()
	dataFim := fmt.Sprintf("%d-%02d-%02d", ano, mes, lastDay)

	isFixo := clienteTipo == "fixo" && tipoPacote != ""

	var rows *sql.Rows
	if isFixo {
		rows, err = h.db.Query(`
			SELECT c.id, c.numero, TO_CHAR(c.data, 'DD/MM/YYYY'),
			    COALESCE(SUM(CASE WHEN p.entra_pacote = 'S' AND cp.tipo::text = $3 THEN cp.quantidade ELSE 0 END), 0),
			    COALESCE(SUM(CASE WHEN p.entra_pacote = 'N' OR cp.tipo::text != $3 THEN cp.quantidade * cp.valor_peca ELSE 0 END), 0)::float8,
			    c.efetuou_pagamento
			FROM comandas c
			JOIN comanda_pecas cp ON c.id = cp.id_comanda
			JOIN pecas p ON cp.id_peca = p.id
			WHERE c.id_cliente = $1 AND c.data BETWEEN $2 AND $4
			GROUP BY c.id, c.numero, c.data, c.efetuou_pagamento
			ORDER BY c.data
		`, idCliente, dataInicio, tipoPacote, dataFim)
	} else {
		rows, err = h.db.Query(`
			SELECT c.id, c.numero, TO_CHAR(c.data, 'DD/MM/YYYY'),
			    COALESCE(SUM(cp.quantidade), 0),
			    COALESCE(SUM(cp.quantidade * cp.valor_peca), 0)::float8,
			    c.efetuou_pagamento
			FROM comandas c
			JOIN comanda_pecas cp ON c.id = cp.id_comanda
			WHERE c.id_cliente = $1 AND c.data BETWEEN $2 AND $3
			GROUP BY c.id, c.numero, c.data, c.efetuou_pagamento
			ORDER BY c.data
		`, idCliente, dataInicio, dataFim)
	}
	if err != nil {
		httpx.Error(w, r, http.StatusInternalServerError, "erro ao consultar fechamento", err)
		return
	}
	defer rows.Close()

	out := FechamentoOut{
		Cliente:          clienteNome,
		TipoCliente:      clienteTipo,
		Pacote:           nomePacote,
		PrecoPacote:      precoPacote,
		QuantidadePacote: quantidadePacote,
		Comandas:         []FechamentoComanda{},
	}

	var totalPecas int64
	var totalAvulso float64

	for rows.Next() {
		var c FechamentoComanda
		if err := rows.Scan(&c.ID, &c.Numero, &c.Data, &c.Quantidade, &c.ValorAvulso, &c.EfetuouPagamento); err != nil {
			httpx.Error(w, r, http.StatusInternalServerError, "erro ao ler fechamento", err)
			return
		}
		totalPecas += c.Quantidade
		totalAvulso += c.ValorAvulso
		out.Comandas = append(out.Comandas, c)
	}

	out.TotalPecas = totalPecas
	out.TotalAvulso = totalAvulso

	var valorExcedente float64
	if isFixo && quantidadePacote > 0 && totalPecas > quantidadePacote {
		excedente := totalPecas - quantidadePacote
		valorUnitario := precoPacote / float64(quantidadePacote)
		valorExcedente = float64(excedente) * valorUnitario
		out.ExcedentePecas = excedente
		out.ValorExcedente = valorExcedente
	}

	if isFixo {
		out.Total = precoPacote + totalAvulso + valorExcedente
	} else {
		out.Total = totalAvulso
	}

	var vp sql.NullFloat64
	_ = h.db.QueryRow(`
		SELECT valor_pago FROM fechamentos WHERE id_cliente = $1 AND mes = $2 AND ano = $3
	`, idCliente, mes, ano).Scan(&vp)
	if vp.Valid {
		v := vp.Float64
		out.ValorPago = &v
	}

	httpx.JSON(w, http.StatusOK, out)
}

func (h *Handler) Fechar(w http.ResponseWriter, r *http.Request) {
	type payload struct {
		IDCliente int64    `json:"id_cliente"`
		Mes       int      `json:"mes"`
		Ano       int      `json:"ano"`
		ValorPago *float64 `json:"valor_pago"`
	}
	var p payload
	if err := httpx.Decode(r, &p); err != nil {
		httpx.Error(w, r, http.StatusBadRequest, "payload inválido")
		return
	}
	if p.IDCliente == 0 || p.Mes < 1 || p.Mes > 12 || p.Ano < 2000 {
		httpx.Error(w, r, http.StatusBadRequest, "parâmetros inválidos")
		return
	}

	dataInicio := fmt.Sprintf("%d-%02d-01", p.Ano, p.Mes)
	lastDay := time.Date(p.Ano, time.Month(p.Mes+1), 0, 0, 0, 0, 0, time.Local).Day()
	dataFim := fmt.Sprintf("%d-%02d-%02d", p.Ano, p.Mes, lastDay)

	tx, err := h.db.Begin()
	if err != nil {
		httpx.Error(w, r, http.StatusInternalServerError, "erro ao iniciar transação", err)
		return
	}
	defer tx.Rollback()

	if _, err = tx.Exec(`
		UPDATE comandas
		SET efetuou_pagamento = 'S'
		WHERE id_cliente = $1 AND data BETWEEN $2 AND $3 AND efetuou_pagamento = 'N'
	`, p.IDCliente, dataInicio, dataFim); err != nil {
		httpx.Error(w, r, http.StatusInternalServerError, "erro ao realizar fechamento", err)
		return
	}

	if p.ValorPago != nil {
		if _, err = tx.Exec(`
			INSERT INTO fechamentos(id_cliente, mes, ano, valor_pago)
			VALUES ($1, $2, $3, $4)
			ON CONFLICT (id_cliente, mes, ano)
			DO UPDATE SET valor_pago = EXCLUDED.valor_pago, data_registro = NOW()
		`, p.IDCliente, p.Mes, p.Ano, *p.ValorPago); err != nil {
			httpx.Error(w, r, http.StatusInternalServerError, "erro ao registrar valor pago", err)
			return
		}
	}

	if err = tx.Commit(); err != nil {
		httpx.Error(w, r, http.StatusInternalServerError, "erro ao confirmar fechamento", err)
		return
	}
	httpx.JSON(w, http.StatusOK, map[string]any{"ok": true})
}
