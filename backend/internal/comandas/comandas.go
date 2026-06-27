package comandas

import (
	"database/sql"
	"errors"
	"fmt"
	"math"
	"net/http"
	"strconv"
	"strings"
	"time"

	"github.com/forint/smartlimp-backend/internal/httpx"
	"github.com/forint/smartlimp-backend/internal/middleware"
	"github.com/go-chi/chi/v5"
)

type pecaPayload struct {
	IDPeca         int64   `json:"id_peca"`
	IDCliente      int64   `json:"id_cliente"`
	Descricao      string  `json:"descricao"`
	QuantidadePeca int     `json:"quantidade_peca"`
	ValorPeca      float64 `json:"valor_peca"`
	Tipo           string  `json:"tipo"`
}

type savePayload struct {
	IDCliente         int64         `json:"id_cliente"`
	DataComanda       string        `json:"data_comanda"` // dd/mm/yyyy
	PecasComanda      []pecaPayload `json:"pecas_comanda"`
	Desconto          float64       `json:"desconto"`
	Acrescimo         float64       `json:"acrescimo"`
	PontosAcumulados  int64         `json:"pontos_acumulados"`
	PontosUtilizados  int64         `json:"pontos_utilizados"`
	ComandaPagamento  string        `json:"comanda_pagamento"`
}

type Handler struct{ db *sql.DB }

func NewHandler(db *sql.DB) *Handler { return &Handler{db: db} }

func (h *Handler) Save(w http.ResponseWriter, r *http.Request) {
	user, _ := middleware.UserFromContext(r.Context())

	var p savePayload
	if err := httpx.Decode(r, &p); err != nil {
		httpx.Error(w, r, http.StatusBadRequest, "payload inválido")
		return
	}
	if p.IDCliente == 0 || len(p.DataComanda) != 10 || len(p.PecasComanda) == 0 {
		httpx.Error(w, r, http.StatusBadRequest, "campos obrigatórios inválidos")
		return
	}

	dataComanda, err := parseBRDate(p.DataComanda)
	if err != nil {
		httpx.Error(w, r, http.StatusBadRequest, "data inválida")
		return
	}

	tx, err := h.db.Begin()
	if err != nil {
		httpx.Error(w, r, http.StatusInternalServerError, "erro ao iniciar transação", err)
		return
	}
	defer tx.Rollback()

	if _, err := tx.Exec(`SELECT pg_advisory_xact_lock($1)`, p.IDCliente); err != nil {
		httpx.Error(w, r, http.StatusInternalServerError, "erro ao reservar cliente", err)
		return
	}

	totalPecas := totalPecasComanda(p.PecasComanda)
	dup, err := hasDuplicateRecentComanda(tx, p.IDCliente, totalPecas, 5*time.Minute)
	if err != nil {
		httpx.Error(w, r, http.StatusInternalServerError, "erro ao verificar duplicidade", err)
		return
	}
	if dup {
		httpx.Error(w, r, http.StatusConflict, "comanda duplicada: já existe uma comanda igual para este cliente nos últimos 5 minutos")
		return
	}

	var (
		clienteNome  string
		clienteEmail sql.NullString
		clienteTipo  string
		idPacote     sql.NullInt64
	)
	row := tx.QueryRow(
		`SELECT nome, email, tipo, id_pacote FROM clientes WHERE id = $1`,
		p.IDCliente,
	)
	if err := row.Scan(&clienteNome, &clienteEmail, &clienteTipo, &idPacote); err != nil {
		httpx.Error(w, r, http.StatusBadRequest, "cliente inválido")
		return
	}

	var precoPacote float64
	if idPacote.Valid {
		_ = tx.QueryRow(`SELECT preco FROM pacotes WHERE id = $1`, idPacote.Int64).
			Scan(&precoPacote)
	}

	var numero int64
	row = tx.QueryRow(
		`SELECT (numero + 1) FROM comandas WHERE id_cliente = $1 ORDER BY numero DESC LIMIT 1`,
		p.IDCliente,
	)
	if err := row.Scan(&numero); err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			numero = 1
		} else {
			httpx.Error(w, r, http.StatusInternalServerError, "erro ao gerar número", err)
			return
		}
	}

	var idComanda int64
	if err := tx.QueryRow(
		`INSERT INTO comandas(id_usuario, data_cadastro, numero, id_cliente, data, pagamento)
		 VALUES ($1,$2,$3,$4,$5,$6) RETURNING id`,
		user.UserID, time.Now().Format("2006-01-02 15:04:05"),
		numero, p.IDCliente, dataComanda.Format("2006-01-02"), p.ComandaPagamento,
	).Scan(&idComanda); err != nil {
		httpx.Error(w, r, http.StatusInternalServerError, "erro ao inserir comanda", err)
		return
	}

	if _, err := tx.Exec(
		`UPDATE cliente_saldo SET id_comandautilizou = $1, utilizado = 'S' WHERE id_cliente = $2 AND utilizado = 'N'`,
		idComanda, p.IDCliente,
	); err != nil {
		httpx.Error(w, r, http.StatusInternalServerError, "erro ao atualizar saldo", err)
		return
	}

	for _, pe := range p.PecasComanda {
		if _, err := tx.Exec(
			`INSERT INTO comanda_pecas(id_comanda, id_peca, valor_peca, quantidade, tipo) VALUES ($1,$2,$3,$4,$5)`,
			idComanda, pe.IDPeca, pe.ValorPeca, pe.QuantidadePeca, pe.Tipo,
		); err != nil {
			httpx.Error(w, r, http.StatusInternalServerError, "erro ao inserir peças", err)
			return
		}
	}

	if p.Desconto > 0 {
		if _, err := tx.Exec(
			`INSERT INTO comanda_adicionais(id_comanda, valor, tipo) VALUES ($1,$2, 'desconto')`,
			idComanda, p.Desconto,
		); err != nil {
			httpx.Error(w, r, http.StatusInternalServerError, "erro ao inserir desconto", err)
			return
		}
	}
	if p.Acrescimo > 0 {
		if _, err := tx.Exec(
			`INSERT INTO comanda_adicionais(id_comanda, valor, tipo) VALUES ($1,$2, 'acrescimo')`,
			idComanda, p.Acrescimo,
		); err != nil {
			httpx.Error(w, r, http.StatusInternalServerError, "erro ao inserir acréscimo", err)
			return
		}
	}

	pontosUtilizados := p.PontosUtilizados
	if (clienteTipo == "fixo" && p.ComandaPagamento == "S" && pontosUtilizados > 0) ||
		(clienteTipo == "avulso" && pontosUtilizados > 0) {
		pontosRows, err := tx.Query(
			`SELECT id, id_comanda, quantidade FROM cliente_pontos WHERE id_cliente = $1 AND utilizado = 'N' ORDER BY quantidade ASC`,
			p.IDCliente,
		)
		if err != nil {
			httpx.Error(w, r, http.StatusInternalServerError, "erro ao consultar pontos", err)
			return
		}
		type pontoRow struct {
			ID         int64
			IDComanda  int64
			Quantidade int64
		}
		pontos := []pontoRow{}
		for pontosRows.Next() {
			var pr pontoRow
			if err := pontosRows.Scan(&pr.ID, &pr.IDComanda, &pr.Quantidade); err != nil {
				pontosRows.Close()
				httpx.Error(w, r, http.StatusInternalServerError, "erro ao ler pontos", err)
				return
			}
			pontos = append(pontos, pr)
		}
		pontosRows.Close()

		for _, pr := range pontos {
			if pontosUtilizados <= 0 {
				break
			}
			if pontosUtilizados > pr.Quantidade {
				if _, err := tx.Exec(
					`UPDATE cliente_pontos SET id_comanda_utilizado = $1, utilizado = 'S' WHERE id = $2`,
					idComanda, pr.ID,
				); err != nil {
					httpx.Error(w, r, http.StatusInternalServerError, "erro ao utilizar pontos", err)
					return
				}
				pontosUtilizados -= pr.Quantidade
			} else {
				if _, err := tx.Exec(
					`UPDATE cliente_pontos SET quantidade = $1, id_comanda_utilizado = $2, utilizado = 'S' WHERE id = $3`,
					pontosUtilizados, idComanda, pr.ID,
				); err != nil {
					httpx.Error(w, r, http.StatusInternalServerError, "erro ao utilizar pontos", err)
					return
				}
				if remaining := pr.Quantidade - pontosUtilizados; remaining > 0 {
					if _, err := tx.Exec(
						`INSERT INTO cliente_pontos(id_cliente, id_comanda, quantidade, utilizado) VALUES ($1,$2,$3, 'N')`,
						p.IDCliente, pr.IDComanda, remaining,
					); err != nil {
						httpx.Error(w, r, http.StatusInternalServerError, "erro ao reinserir pontos", err)
						return
					}
				}
				pontosUtilizados = 0
			}
		}
	}

	pontosAcumulados := p.PontosAcumulados
	if pontosAcumulados > 0 && (clienteTipo == "fixo" || clienteTipo == "avulso") {
		if clienteTipo == "fixo" {
			var (
				foraPacote sql.NullFloat64
				adAcrs     sql.NullFloat64
				adDesc     sql.NullFloat64
			)
			if p.ComandaPagamento == "S" {
				_ = tx.QueryRow(
					`SELECT SUM(x4.quantidade * x4.valor_peca) FROM comandas x1
					 JOIN clientes x2 ON x1.id_cliente = x2.id
					 JOIN pacotes x3 ON x2.id_pacote = x3.id
					 JOIN comanda_pecas x4 ON x1.id = x4.id_comanda
					 JOIN pecas x5 ON x4.id_peca = x5.id
					 WHERE (x3.tipo != x4.tipo OR x5.entra_pacote = 'N') AND x1.id = $1 AND x2.id = $2`,
					idComanda, p.IDCliente,
				).Scan(&foraPacote)

				_ = tx.QueryRow(
					`SELECT
						SUM(CASE WHEN x2.tipo = 'acrescimo' THEN x2.valor ELSE 0 END),
						SUM(CASE WHEN x2.tipo = 'desconto' THEN x2.valor ELSE 0 END)
					FROM comandas x1
					JOIN comanda_adicionais x2 ON x1.id = x2.id_comanda
					JOIN clientes x3 ON x1.id_cliente = x3.id
					WHERE x2.id_comanda > (SELECT COALESCE(MAX(id), 0) FROM comandas WHERE id_cliente = x1.id_cliente AND pagamento = 'S' AND id < $1) AND x3.id = $2`,
					idComanda, p.IDCliente,
				).Scan(&adAcrs, &adDesc)

				pontosAcumulados = int64(math.Floor(precoPacote + foraPacote.Float64 + adAcrs.Float64 - adDesc.Float64))
			} else {
				_ = tx.QueryRow(
					`SELECT SUM(x4.quantidade * x4.valor_peca) FROM comandas x1
					 JOIN clientes x2 ON x1.id_cliente = x2.id
					 JOIN pacotes x3 ON x2.id_pacote = x3.id
					 JOIN comanda_pecas x4 ON x1.id = x4.id_comanda
					 JOIN pecas x5 ON x4.id_peca = x5.id
					 WHERE (x3.tipo != x4.tipo OR x5.entra_pacote = 'N') AND x1.id = $1 AND x2.id = $2`,
					idComanda, p.IDCliente,
				).Scan(&foraPacote)
				pontosAcumulados = int64(math.Floor(foraPacote.Float64))
			}
		}

		if pontosAcumulados > 0 {
			if _, err := tx.Exec(
				`INSERT INTO cliente_pontos(id_cliente, id_comanda, id_comanda_utilizado, quantidade, utilizado) VALUES ($1, $2, 0, $3, 'N')`,
				p.IDCliente, idComanda, pontosAcumulados,
			); err != nil {
				httpx.Error(w, r, http.StatusInternalServerError, "erro ao acumular pontos", err)
				return
			}
		}
	}

	if err := tx.Commit(); err != nil {
		httpx.Error(w, r, http.StatusInternalServerError, "erro ao confirmar comanda", err)
		return
	}

	httpx.JSON(w, http.StatusCreated, map[string]any{
		"id":     idComanda,
		"numero": numero,
	})
}

func (h *Handler) Delete(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")
	tx, err := h.db.Begin()
	if err != nil {
		httpx.Error(w, r, http.StatusInternalServerError, "erro ao iniciar transação", err)
		return
	}
	defer tx.Rollback()

	if _, err := tx.Exec(`DELETE FROM comanda_pecas WHERE id_comanda = $1`, id); err != nil {
		httpx.Error(w, r, http.StatusInternalServerError, "erro ao excluir peças", err)
		return
	}
	if _, err := tx.Exec(`DELETE FROM cliente_pontos WHERE id_comanda = $1`, id); err != nil {
		httpx.Error(w, r, http.StatusInternalServerError, "erro ao excluir pontos", err)
		return
	}
	if _, err := tx.Exec(`DELETE FROM comanda_adicionais WHERE id_comanda = $1`, id); err != nil {
		httpx.Error(w, r, http.StatusInternalServerError, "erro ao excluir adicionais", err)
		return
	}
	if _, err := tx.Exec(`DELETE FROM comandas WHERE id = $1`, id); err != nil {
		httpx.Error(w, r, http.StatusInternalServerError, "erro ao excluir comanda", err)
		return
	}
	if err := tx.Commit(); err != nil {
		httpx.Error(w, r, http.StatusInternalServerError, "erro ao confirmar exclusão", err)
		return
	}
	httpx.JSON(w, http.StatusOK, map[string]any{"ok": true})
}

type ImpressaoPeca struct {
	Quantidade   int     `json:"quantidade"`
	Descricao    string  `json:"descricao"`
	Tipo         string  `json:"tipo"`
	TipoServico  string  `json:"tipo_servico"`
	ValorPeca    float64 `json:"valor_peca"`
	ValorTotal   float64 `json:"valor_total"`
	EntraPacote  string  `json:"entra_pacote"`
}

type ImpressaoOut struct {
	Numero            int64           `json:"numero"`
	Cliente           string          `json:"cliente"`
	Pacote            string          `json:"pacote"`
	TipoPacote        string          `json:"tipo_pacote"`
	TipoCliente       string          `json:"tipo_cliente"`
	DataComanda       string          `json:"data_comanda"`
	Pagamento         string          `json:"pagamento"`
	Logradouro        string          `json:"logradouro"`
	NumeroCasa        string          `json:"numero_casa"`
	Bairro            string          `json:"bairro"`
	Cidade            string          `json:"cidade"`
	Telefone          string          `json:"telefone"`
	Celular           string          `json:"celular"`
	FrequenciaPgmt    string          `json:"frequencia_pagamento"`
	DiaVencimento     int64          `json:"dia_vencimento"`
	Pecas             []ImpressaoPeca `json:"pecas"`
	SubTotal          float64         `json:"sub_total"`
	Desconto          float64         `json:"desconto"`
	Acrescimo         float64         `json:"acrescimo"`
	Saldo             float64         `json:"saldo"`
	TotalPecas        int             `json:"total_pecas"`
	TotalValor        float64         `json:"total_valor"`
	TotalVencimento   int             `json:"total_vencimento"`
	Antecipado        string          `json:"antecipado"`
	Pontos            int64           `json:"pontos"`
	PontosAcumulados  int64           `json:"pontos_acumulados"`
	PontosUtilizados  int64           `json:"pontos_utilizados"`
	ValorPontos       float64         `json:"valor_pontos"`
}

func (h *Handler) Impressao(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")

	rows, err := h.db.Query(`
		SELECT
			UPPER(x2.nome) AS cliente,
			COALESCE(x3.nome, '') AS pacote,
			x3.tipo AS tipo_pacote,
			COALESCE(x3.preco, 0) AS valor_pacote,
			COALESCE(x3.quantidade, 0) AS quantidade_pacote,
			x2.antecipado,
			x1.numero,
			x2.tipo AS tipo_cliente,
			TO_CHAR(x1.data, 'DD/MM/YYYY') AS data_comanda,
			x1.data,
			x4.quantidade,
			x4.tipo,
			x4.valor_peca,
			UPPER(x5.nome) AS descricao,
			x5.entra_pacote,
			x1.id_cliente,
			x1.pagamento,
			x2.frequencia_pagamento AS frequencia_pagamento,
			x2.dia_vencimento AS dia_vencimento,
			COALESCE(x2.logradouro, '') AS logradouro,
			COALESCE(x2.numero, '') AS numCasa,
			COALESCE(x2.bairro, '') AS bairro,
			COALESCE(x2.cidade, '') AS cidade,
			COALESCE(x2.telefone, '') AS telefone,
			COALESCE(x2.celular, '') AS celular
		FROM comandas x1
		JOIN clientes x2 ON x1.id_cliente = x2.id
		LEFT JOIN pacotes x3 ON x2.id_pacote = x3.id
		JOIN comanda_pecas x4 ON x1.id = x4.id_comanda
		JOIN pecas x5 ON x4.id_peca = x5.id
		WHERE x1.id = $1
		ORDER BY x5.nome
	`, id)
	if err != nil {
		httpx.Error(w, r, http.StatusInternalServerError, "erro ao buscar comanda", err)
		return
	}

	type impressaoLinha struct {
		cliente      string
		pacote       string
		tipoPac      string
		vpacote          float64
		quantidadePacote int
		antecipado       string
		numero           int64
		tipoClienteR string
		dataComanda  string
		dataRow      time.Time
		quantidade   int
		tipo         string
		valorPeca    float64
		descricao    string
		entraPacote  string
		idCli        int64
		pagamentoRow string
		freqPag      string
		diaVenc      int64
		logradouro   string
		numCasa      string
		bairro       string
		cidade       string
		telefone     string
		celular      string
	}

	var linhas []impressaoLinha
	for rows.Next() {
		var ln impressaoLinha
		if err := rows.Scan(&ln.cliente, &ln.pacote, &ln.tipoPac, &ln.vpacote, &ln.quantidadePacote, &ln.antecipado, &ln.numero, &ln.tipoClienteR, &ln.dataComanda, &ln.dataRow,
			&ln.quantidade, &ln.tipo, &ln.valorPeca, &ln.descricao, &ln.entraPacote, &ln.idCli, &ln.pagamentoRow,
			&ln.freqPag, &ln.diaVenc, &ln.logradouro, &ln.numCasa, &ln.bairro, &ln.cidade, &ln.telefone, &ln.celular); err != nil {
			rows.Close()
			httpx.Error(w, r, http.StatusInternalServerError, "erro ao ler comanda", err)
			return
		}
		linhas = append(linhas, ln)
	}
	if err := rows.Err(); err != nil {
		rows.Close()
		httpx.Error(w, r, http.StatusInternalServerError, "erro ao ler comanda", err)
		return
	}
	rows.Close()

	if len(linhas) == 0 {
		httpx.Error(w, r, http.StatusNotFound, "comanda não encontrada ou sem itens")
		return
	}

	out := ImpressaoOut{Pecas: []ImpressaoPeca{}}
	primeiroLoop := true
	totalValor := 0.0
	totalPecas := 0
	totalVencimento := 0
	quantidadePacote := 0
	clienteAntecipado := ""
	desconto := 0.0
	acrescimo := 0.0
	idCliente := int64(0)
	dataRowStr := ""
	valorPacote := 0.0
	tipoPacote := ""
	tipoCliente := ""
	pagamento := ""
	frequenciaPgmt := ""
	diaVencimento := int64(0)

	for _, ln := range linhas {
		cliente := ln.cliente
		pacote := ln.pacote
		tipoPac := ln.tipoPac
		vpacote := ln.vpacote
		numero := ln.numero
		tipoClienteR := ln.tipoClienteR
		dataComanda := ln.dataComanda
		dataRow := ln.dataRow
		quantidade := ln.quantidade
		tipo := ln.tipo
		valorPeca := ln.valorPeca
		descricao := ln.descricao
		entraPacote := ln.entraPacote
		idCli := ln.idCli
		pagamentoRow := ln.pagamentoRow
		freqPag := ln.freqPag
		diaVenc := ln.diaVenc
		logradouro := ln.logradouro
		numCasa := ln.numCasa
		bairro := ln.bairro
		cidade := ln.cidade
		telefone := ln.telefone
		celular := ln.celular

		out.Numero = numero
		out.Cliente = cliente
		out.Pacote = pacote
		out.TipoPacote = tipoPac
		out.TipoCliente = tipoClienteR
		out.DataComanda = dataComanda
		out.Logradouro = logradouro
		out.NumeroCasa = numCasa
		out.Bairro = bairro
		out.Cidade = cidade
		out.Telefone = telefone
		out.Celular = celular
		out.FrequenciaPgmt = freqPag
		out.DiaVencimento = diaVenc
		out.Pagamento = pagamentoRow
		idCliente = idCli
		dataRowStr = dataRow.Format("2006-01-02")
		valorPacote = vpacote
		quantidadePacote = ln.quantidadePacote
		clienteAntecipado = ln.antecipado
		tipoPacote = tipoPac
		tipoCliente = tipoClienteR
		pagamento = pagamentoRow
		frequenciaPgmt = freqPag
		diaVencimento = diaVenc

		if tipoCliente == "fixo" && primeiroLoop {
			dataInicio, dataFim := comandaBillingPeriod(dataRow, frequenciaPgmt, diaVencimento, clienteAntecipado)

			if pagamento == "S" {
				var foraPacote, adAcrs, adDesc sql.NullFloat64
				_ = h.db.QueryRow(`
					SELECT SUM(x4.quantidade * x4.valor_peca) FROM comandas x1
					JOIN clientes x2 ON x1.id_cliente = x2.id
					JOIN pacotes x3 ON x2.id_pacote = x3.id
					JOIN comanda_pecas x4 ON x1.id = x4.id_comanda
					JOIN pecas x5 ON x4.id_peca = x5.id
					WHERE (x3.tipo != x4.tipo OR x5.entra_pacote = 'N')
					AND x1.id > (SELECT COALESCE(MAX(id), 0) FROM comandas WHERE id_cliente = x1.id_cliente AND pagamento = 'S' AND id < $1)
					AND x1.id != $2 AND x2.id = $3`,
					id, id, idCliente,
				).Scan(&foraPacote)

				_ = h.db.QueryRow(`
					SELECT SUM(CASE WHEN x2.tipo = 'acrescimo' THEN x2.valor ELSE 0 END),
					       SUM(CASE WHEN x2.tipo = 'desconto' THEN x2.valor ELSE 0 END)
					FROM comandas x1
					JOIN comanda_adicionais x2 ON x1.id = x2.id_comanda
					JOIN clientes x3 ON x1.id_cliente = x3.id
					WHERE x2.id_comanda > (SELECT COALESCE(MAX(id), 0) FROM comandas WHERE id_cliente = x1.id_cliente AND pagamento = 'S' AND id < $1) AND x3.id = $2`,
					id, idCliente,
				).Scan(&adAcrs, &adDesc)

				totalValor += valorPacote + foraPacote.Float64
				desconto += adDesc.Float64
				acrescimo += adAcrs.Float64
			}

			var totalVenc sql.NullInt64
			if clienteAntecipado == "S" {
				// Antecipado: mês civil da comanda; apenas comandas até a data atual (inclusive).
				_ = h.db.QueryRow(`
					SELECT COALESCE(SUM(x2.quantidade), 0) FROM comandas x1
					JOIN comanda_pecas x2 ON x1.id = x2.id_comanda
					JOIN pecas x3 ON x2.id_peca = x3.id
					WHERE x1.id_cliente = $1 AND x1.data BETWEEN $2 AND $3
					  AND x1.data <= $4 AND x3.entra_pacote = 'S'`,
					idCliente, dataInicio, dataFim, dataRowStr,
				).Scan(&totalVenc)
			} else {
				_ = h.db.QueryRow(`
					SELECT COALESCE(SUM(x2.quantidade), 0) FROM comandas x1
					JOIN comanda_pecas x2 ON x1.id = x2.id_comanda
					JOIN pecas x3 ON x2.id_peca = x3.id
					JOIN clientes x4 ON x1.id_cliente = x4.id
					JOIN pacotes x5 ON x4.id_pacote = x5.id
					WHERE x1.id_cliente = $1 AND x1.data BETWEEN $2 AND $3
					  AND x1.data <= $4 AND x3.entra_pacote = 'S' AND x5.tipo = x2.tipo`,
					idCliente, dataInicio, dataFim, dataRowStr,
				).Scan(&totalVenc)
			}
			totalVencimento = int(totalVenc.Int64)

			primeiroLoop = false
		}

		var tipoServico string
		switch tipo {
		case "lavarpassar":
			tipoServico = "LP"
		case "lavar":
			tipoServico = "L"
		case "passar":
			tipoServico = "P"
		case "tingir":
			tipoServico = "T"
		}

		var valorPecaOut, valorTotalPeca float64
		if (tipoCliente == "fixo" && (entraPacote == "N" || tipoPacote != tipo)) || tipoCliente != "fixo" {
			valorPecaOut = valorPeca
			valorTotalPeca = float64(quantidade) * valorPeca
			totalValor += valorTotalPeca
		}
		out.Pecas = append(out.Pecas, ImpressaoPeca{
			Quantidade:  quantidade,
			Descricao:   descricao,
			Tipo:        tipo,
			TipoServico: tipoServico,
			ValorPeca:   valorPecaOut,
			ValorTotal:  valorTotalPeca,
			EntraPacote: entraPacote,
		})

		if entraPacote == "S" {
			totalPecas += quantidade
		}
	}

	subTotal := totalValor

	addRows, err := h.db.Query(`SELECT valor, tipo FROM comanda_adicionais WHERE id_comanda = $1`, id)
	if err == nil {
		for addRows.Next() {
			var v float64
			var t string
			if err := addRows.Scan(&v, &t); err == nil {
				if t == "acrescimo" {
					acrescimo += v
				} else {
					desconto += v
				}
			}
		}
		addRows.Close()
	}

	var saldo sql.NullFloat64
	_ = h.db.QueryRow(`SELECT COALESCE(SUM(valor), 0) FROM cliente_saldo WHERE id_comandautilizou = $1`, id).Scan(&saldo)

	var pa, pu, pt sql.NullInt64
	_ = h.db.QueryRow(`SELECT COALESCE(SUM(quantidade), 0) FROM cliente_pontos WHERE id_comanda = $1`, id).Scan(&pa)
	_ = h.db.QueryRow(`SELECT COALESCE(SUM(quantidade), 0) FROM cliente_pontos WHERE id_comanda_utilizado = $1`, id).Scan(&pu)
	_ = h.db.QueryRow(`SELECT COALESCE(SUM(quantidade), 0) FROM cliente_pontos WHERE id_cliente = $1 AND utilizado = 'N'`, idCliente).Scan(&pt)

	valorPontos := 0.0
	switch pu.Int64 {
	case 250:
		valorPontos = 10
	case 350:
		valorPontos = 15
	case 440:
		valorPontos = 20
	case 540:
		valorPontos = 25
	}
	totalValor = subTotal - desconto + acrescimo - valorPontos - saldo.Float64

	out.SubTotal = subTotal
	out.Desconto = desconto
	out.Acrescimo = acrescimo
	out.Saldo = saldo.Float64
	out.TotalPecas = totalPecas
	if clienteAntecipado == "S" && quantidadePacote > 0 {
		restante := quantidadePacote - totalVencimento
		if restante < 0 {
			restante = 0
		}
		totalVencimento = restante
	}
	out.Antecipado = clienteAntecipado
	out.TotalVencimento = totalVencimento
	out.TotalValor = totalValor
	out.PontosAcumulados = pa.Int64
	out.PontosUtilizados = pu.Int64
	out.Pontos = pt.Int64
	out.ValorPontos = valorPontos
	_ = dataRowStr

	httpx.JSON(w, http.StatusOK, out)
}

func (h *Handler) Pagamento(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")

	type payload struct {
		IDCliente     int64   `json:"id_cliente"`
		ValorComanda  float64 `json:"valor_comanda"`
		ValorPago     float64 `json:"valor_pago"`
	}
	var p payload
	if err := httpx.Decode(r, &p); err != nil {
		httpx.Error(w, r, http.StatusBadRequest, "payload inválido")
		return
	}

	saldo := p.ValorPago - p.ValorComanda
	if saldo != 0 {
		if _, err := h.db.Exec(
			`INSERT INTO cliente_saldo(id_cliente, valor, id_comandagerou) VALUES ($1,$2,$3)`,
			p.IDCliente, saldo, id,
		); err != nil {
			httpx.Error(w, r, http.StatusInternalServerError, "erro ao registrar saldo", err)
			return
		}
	}

	if _, err := h.db.Exec(`UPDATE comandas SET efetuou_pagamento = 'S' WHERE id = $1`, id); err != nil {
		httpx.Error(w, r, http.StatusInternalServerError, "erro ao atualizar comanda", err)
		return
	}
	httpx.JSON(w, http.StatusOK, map[string]any{"ok": true})
}

func totalPecasComanda(pecas []pecaPayload) int {
	total := 0
	for _, pe := range pecas {
		total += pe.QuantidadePeca
	}
	return total
}

func hasDuplicateRecentComanda(tx *sql.Tx, idCliente int64, totalPecas int, window time.Duration) (bool, error) {
	cutoff := time.Now().Add(-window).Format("2006-01-02 15:04:05")
	var exists int
	err := tx.QueryRow(`
		SELECT 1
		FROM comandas c
		JOIN (
			SELECT id_comanda, SUM(quantidade)::int AS total_pecas
			FROM comanda_pecas
			GROUP BY id_comanda
		) cp ON cp.id_comanda = c.id
		WHERE c.id_cliente = $1
		  AND c.data_cadastro >= $2
		  AND cp.total_pecas = $3
		LIMIT 1`,
		idCliente, cutoff, totalPecas,
	).Scan(&exists)
	if errors.Is(err, sql.ErrNoRows) {
		return false, nil
	}
	if err != nil {
		return false, err
	}
	return true, nil
}

func parseBRDate(s string) (time.Time, error) {
	parts := strings.Split(s, "/")
	if len(parts) != 3 {
		return time.Time{}, fmt.Errorf("formato inválido")
	}
	d, err := strconv.Atoi(parts[0])
	if err != nil {
		return time.Time{}, err
	}
	m, err := strconv.Atoi(parts[1])
	if err != nil {
		return time.Time{}, err
	}
	y, err := strconv.Atoi(parts[2])
	if err != nil {
		return time.Time{}, err
	}
	return time.Date(y, time.Month(m), d, 0, 0, 0, 0, time.Local), nil
}

func lastDayOfMonth(t time.Time) string {
	first := time.Date(t.Year(), t.Month(), 1, 0, 0, 0, 0, t.Location())
	last := first.AddDate(0, 1, -1)
	return last.Format("2006-01-02")
}

// comandaBillingPeriod define o intervalo (inclusive) para somar peças do pacote na impressão.
// Antecipado: sempre mês civil da data da comanda (acumula todas as comandas do mês).
// Demais fixos: ciclo pela frequência (mensal usa dia de vencimento relativo à data da comanda, não "hoje").
func comandaBillingPeriod(dataRow time.Time, frequencia string, diaVencimento int64, antecipado string) (inicio, fim string) {
	loc := dataRow.Location()
	if antecipado == "S" {
		first := time.Date(dataRow.Year(), dataRow.Month(), 1, 0, 0, 0, 0, loc)
		return first.Format("2006-01-02"), first.AddDate(0, 1, -1).Format("2006-01-02")
	}
	if strings.TrimSpace(strings.ToLower(frequencia)) != "mensal" {
		first := time.Date(dataRow.Year(), dataRow.Month(), 1, 0, 0, 0, 0, loc)
		return first.Format("2006-01-02"), lastDayOfMonth(dataRow)
	}
	dueDay := 1
	if diaVencimento >= 1 && diaVencimento <= 31 {
		dueDay = int(diaVencimento)
	}
	y, m, _ := dataRow.Date()
	dim := daysInMonth(y, m)
	if dueDay > dim {
		dueDay = dim
	}
	venc := time.Date(y, m, dueDay, 0, 0, 0, 0, loc)
	if dataRow.Before(venc) {
		prev := venc.AddDate(0, -1, 0)
		py, pm, _ := prev.Date()
		pdim := daysInMonth(py, pm)
		pd := dueDay
		if pd > pdim {
			pd = pdim
		}
		inicioT := time.Date(py, pm, pd, 0, 0, 0, 0, loc)
		return inicioT.Format("2006-01-02"), venc.AddDate(0, 0, -1).Format("2006-01-02")
	}
	return venc.Format("2006-01-02"), venc.AddDate(0, 1, -1).Format("2006-01-02")
}

func daysInMonth(year int, month time.Month) int {
	return time.Date(year, month+1, 0, 0, 0, 0, 0, time.Local).Day()
}
