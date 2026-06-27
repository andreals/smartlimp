package financeiro

import (
	"fmt"
	"net/http"
	"strconv"
	"strings"
	"time"

	"github.com/forint/smartlimp-backend/internal/httpx"
)

type dashboardVolume struct {
	Periodo  string `json:"periodo"`
	Pecas    int64  `json:"pecas"`
	Comandas int64  `json:"comandas"`
}

type dashboardMix struct {
	Tipo     string  `json:"tipo"`
	Pecas    int64   `json:"pecas"`
	Valor    float64 `json:"valor"`
	PctPecas float64 `json:"pct_pecas"`
	PctValor float64 `json:"pct_valor"`
}

type dashboardRankingPeca struct {
	ID         int64   `json:"id"`
	Nome       string  `json:"nome"`
	Quantidade int64   `json:"quantidade"`
	Valor      float64 `json:"valor"`
}

type dashboardReceitaTipo struct {
	Tipo     string  `json:"tipo"`
	Valor    float64 `json:"valor"`
	Comandas int64   `json:"comandas"`
}

type dashboardClientePacote struct {
	IDPacote   int64  `json:"id_pacote"`
	NomePacote string `json:"nome_pacote"`
	Clientes   int64  `json:"clientes"`
}

type dashboardClienteRisco struct {
	ID              int64  `json:"id"`
	Nome            string `json:"nome"`
	UltimaComandaBR string `json:"ultima_comanda"`
	DiasSemComanda  int64  `json:"dias_sem_comanda"`
	// longa = entre os que passaram do limite, os com maior tempo sem pedido;
	// recente = os que ultrapassaram o limite há pouco (última comanda mais recente).
	Perfil       string `json:"perfil"`
	TipoCliente  string `json:"tipo_cliente"` // fixo | avulso
}

type dashboardOut struct {
	DataInicioBR       string                    `json:"data_inicio"`
	DataFimBR          string                    `json:"data_fim"`
	Granularidade      string                    `json:"granularidade"`
	DiasSemComanda     int                       `json:"dias_sem_comanda"`
	FaturamentoTotal   float64                   `json:"faturamento_total"`
	// Faturamento previsto: só preenchido quando o filtro cobre menos que o mês civil
	// e data_inicio/data_fim estão no mesmo mês (ver cálculo no handler).
	MostrarFaturamentoPrevisto bool    `json:"mostrar_faturamento_previsto"`
	FaturamentoPrevisto        float64 `json:"faturamento_previsto"`
	FaturamentoPrevistoAvulso  float64 `json:"faturamento_previsto_avulso"`
	FaturamentoPrevistoFixo    float64 `json:"faturamento_previsto_fixo"`
	PrevistoDiasFiltro         int     `json:"previsto_dias_filtro"`
	PrevistoDiasMes            int     `json:"previsto_dias_mes"`
	QuantidadeComandas int64                     `json:"quantidade_comandas"`
	QuantidadePecas    int64                     `json:"quantidade_pecas"`
	TicketMedio        float64                   `json:"ticket_medio"`
	ClientesAtivos     int64                     `json:"clientes_ativos"`
	Volume             []dashboardVolume         `json:"volume"`
	MixServico         []dashboardMix         `json:"mix_servico"`
	RankingPecas       []dashboardRankingPeca `json:"ranking_pecas"`
	ReceitaTipoCliente []dashboardReceitaTipo    `json:"receita_por_tipo_cliente"`
	ClientesPorPacote  []dashboardClientePacote  `json:"clientes_por_pacote"`
	ClientesRisco      []dashboardClienteRisco   `json:"clientes_risco"`
}

func parseGranularidade(s string) string {
	switch strings.ToLower(strings.TrimSpace(s)) {
	case "semana", "mes":
		return strings.ToLower(strings.TrimSpace(s))
	default:
		return "dia"
	}
}

func volumeGroupExpr(gr string) string {
	switch gr {
	case "semana":
		return "date_trunc('week', c.data::timestamp)::date"
	case "mes":
		return "date_trunc('month', c.data::timestamp)::date"
	default:
		return "c.data"
	}
}

// Dashboard agrega indicadores do período (datas em dd/mm/aaaa).
func (h *Handler) Dashboard(w http.ResponseWriter, r *http.Request) {
	q := r.URL.Query()
	diBR := strings.TrimSpace(q.Get("data_inicio"))
	dfBR := strings.TrimSpace(q.Get("data_fim"))
	diParsed, _ := parseBRDate(diBR)
	dfParsed, _ := parseBRDate(dfBR)
	if diParsed == "" || dfParsed == "" {
		httpx.Error(w, r, http.StatusBadRequest, "informe data_inicio e data_fim válidas (dd/mm/aaaa)")
		return
	}
	di, err := time.ParseInLocation("2006-01-02", diParsed, time.Local)
	if err != nil {
		httpx.Error(w, r, http.StatusBadRequest, "data inicial inválida")
		return
	}
	df, err := time.ParseInLocation("2006-01-02", dfParsed, time.Local)
	if err != nil {
		httpx.Error(w, r, http.StatusBadRequest, "data final inválida")
		return
	}
	if di.After(df) {
		httpx.Error(w, r, http.StatusBadRequest, "data_inicial não pode ser maior que data_final")
		return
	}
	diSQL := di.Format("2006-01-02")
	dfSQL := df.Format("2006-01-02")

	gr := parseGranularidade(q.Get("granularidade"))
	diasRisco := 45
	if v := strings.TrimSpace(q.Get("dias_sem_comanda")); v != "" {
		if n, err := strconv.Atoi(v); err == nil && n > 0 {
			diasRisco = n
		}
	}

	out := dashboardOut{
		DataInicioBR:       diBR,
		DataFimBR:          dfBR,
		Granularidade:      gr,
		DiasSemComanda:     diasRisco,
		Volume:             []dashboardVolume{},
		MixServico:         []dashboardMix{},
		RankingPecas:       []dashboardRankingPeca{},
		ReceitaTipoCliente: []dashboardReceitaTipo{},
		ClientesPorPacote:  []dashboardClientePacote{},
		ClientesRisco:      []dashboardClienteRisco{},
	}

	// Valor de comanda: linhas + adicionais − saldo utilizado (alias c = comandas)
	const comandaValorExpr = `
		(SELECT COALESCE(SUM(cp.valor_peca * cp.quantidade), 0) FROM comanda_pecas cp WHERE cp.id_comanda = c.id)
		+ COALESCE((
			SELECT SUM(CASE WHEN ca.tipo = 'acrescimo' THEN ca.valor ELSE -ca.valor END)
			FROM comanda_adicionais ca WHERE ca.id_comanda = c.id
		), 0)
		- COALESCE((
			SELECT SUM(cs.valor) FROM cliente_saldo cs
			WHERE cs.id_comandautilizou = c.id AND cs.id_cliente = c.id_cliente
		), 0)`

	// Dias do filtro (inclusive), usados no pró-rata do pacote (fixo com pacote).
	// O preço do pacote no cadastro é tratado como mensalidade de referência (30 dias).
	// A frequência de pagamento do cliente não entra no divisor: combinar "diário" com
	// preço mensal inflacionava (preco * dias / 1 ≈ dias vezes a mensalidade no período).
	const periodoDiasExpr = `($2::date - $1::date + 1)::numeric`
	const cicloMensalReferencia = `30.0`

	var qComandas int64
	if err := h.db.QueryRow(
		`SELECT COUNT(*)::bigint FROM comandas c
		 JOIN clientes cl ON cl.id = c.id_cliente
		 WHERE c.data BETWEEN $1 AND $2`,
		diSQL, dfSQL,
	).Scan(&qComandas); err != nil {
		httpx.Error(w, r, http.StatusInternalServerError, "erro ao contar comandas", err)
		return
	}
	out.QuantidadeComandas = qComandas

	var avulsoVal float64
	if err := h.db.QueryRow(fmt.Sprintf(`
		SELECT COALESCE(SUM(%s), 0)
		FROM comandas c
		JOIN clientes cl ON cl.id = c.id_cliente
		WHERE c.data BETWEEN $1 AND $2 AND cl.tipo = 'avulso'`,
		comandaValorExpr), diSQL, dfSQL).Scan(&avulsoVal); err != nil {
		httpx.Error(w, r, http.StatusInternalServerError, "erro ao somar receita avulsa", err)
		return
	}

	var fixoSemPacote float64
	if err := h.db.QueryRow(fmt.Sprintf(`
		SELECT COALESCE(SUM(%s), 0)
		FROM comandas c
		JOIN clientes cl ON cl.id = c.id_cliente
		WHERE c.data BETWEEN $1 AND $2 AND cl.tipo = 'fixo' AND cl.id_pacote IS NULL`,
		comandaValorExpr), diSQL, dfSQL).Scan(&fixoSemPacote); err != nil {
		httpx.Error(w, r, http.StatusInternalServerError, "erro ao somar fixo sem pacote", err)
		return
	}

	var fixoProrata float64
	if err := h.db.QueryRow(fmt.Sprintf(`
		SELECT COALESCE(SUM(
			p.preco * %s / NULLIF(%s, 0)
		), 0)
		FROM clientes c
		JOIN pacotes p ON p.id = c.id_pacote
		WHERE c.tipo = 'fixo' AND c.id_pacote IS NOT NULL
		AND EXISTS (
			SELECT 1 FROM comandas co
			WHERE co.id_cliente = c.id AND co.data BETWEEN $1 AND $2
		)`,
		periodoDiasExpr, cicloMensalReferencia), diSQL, dfSQL).Scan(&fixoProrata); err != nil {
		httpx.Error(w, r, http.StatusInternalServerError, "erro ao calcular pró-rata fixo", err)
		return
	}

	var fixoExtrasPacote float64
	if err := h.db.QueryRow(`
		SELECT COALESCE(SUM(
			(SELECT COALESCE(SUM(cp.valor_peca * cp.quantidade), 0)
			 FROM comanda_pecas cp
			 JOIN pecas pe ON pe.id = cp.id_peca
			 WHERE cp.id_comanda = c.id
			 AND (p.tipo <> cp.tipo OR pe.entra_pacote = 'N'))
			+ COALESCE((
				SELECT SUM(CASE WHEN ca.tipo = 'acrescimo' THEN ca.valor ELSE -ca.valor END)
				FROM comanda_adicionais ca WHERE ca.id_comanda = c.id
			), 0)
			- COALESCE((
				SELECT SUM(cs.valor) FROM cliente_saldo cs
				WHERE cs.id_comandautilizou = c.id AND cs.id_cliente = c.id_cliente
			), 0)
		), 0)
		FROM comandas c
		JOIN clientes cl ON cl.id = c.id_cliente
		JOIN pacotes p ON p.id = cl.id_pacote
		WHERE c.data BETWEEN $1 AND $2
		AND cl.tipo = 'fixo' AND cl.id_pacote IS NOT NULL`,
		diSQL, dfSQL).Scan(&fixoExtrasPacote); err != nil {
		httpx.Error(w, r, http.StatusInternalServerError, "erro ao somar extras fixo (pacote)", err)
		return
	}

	// Faturamento previsto: todos os valores do período sem filtro de pagamento.
	fixoVal := fixoProrata + fixoExtrasPacote + fixoSemPacote

	// Faturamento real: soma dos valor_pago registrados em fechamentos no período.
	if err := h.db.QueryRow(`
		SELECT COALESCE(SUM(valor_pago), 0)
		FROM fechamentos
		WHERE MAKE_DATE(ano, mes, 1) >= DATE_TRUNC('month', $1::date)
		  AND MAKE_DATE(ano, mes, 1) <= DATE_TRUNC('month', $2::date)`,
		diSQL, dfSQL).Scan(&out.FaturamentoTotal); err != nil {
		httpx.Error(w, r, http.StatusInternalServerError, "erro ao somar fechamentos", err)
		return
	}
	if qComandas > 0 {
		out.TicketMedio = (avulsoVal + fixoVal) / float64(qComandas)
	}

	if err := h.db.QueryRow(`
		SELECT COUNT(DISTINCT c.id_cliente)::bigint
		FROM comandas c
		JOIN clientes cl ON cl.id = c.id_cliente
		WHERE c.data BETWEEN $1 AND $2`,
		diSQL, dfSQL,
	).Scan(&out.ClientesAtivos); err != nil {
		httpx.Error(w, r, http.StatusInternalServerError, "erro ao contar clientes ativos", err)
		return
	}

	if err := h.db.QueryRow(`
		SELECT COALESCE(SUM(cp.quantidade), 0)::bigint
		FROM comandas c
		JOIN clientes cl ON cl.id = c.id_cliente
		JOIN comanda_pecas cp ON cp.id_comanda = c.id
		WHERE c.data BETWEEN $1 AND $2`,
		diSQL, dfSQL,
	).Scan(&out.QuantidadePecas); err != nil {
		httpx.Error(w, r, http.StatusInternalServerError, "erro ao somar peças", err)
		return
	}

	grp := volumeGroupExpr(gr)
	volSQL := fmt.Sprintf(`
		SELECT %s::text AS periodo,
		       COALESCE(SUM(cp.quantidade), 0)::bigint,
		       COUNT(DISTINCT c.id)::bigint
		FROM comandas c
		JOIN clientes cl ON cl.id = c.id_cliente
		JOIN comanda_pecas cp ON cp.id_comanda = c.id
		WHERE c.data BETWEEN $1 AND $2
		GROUP BY 1
		ORDER BY 1`, grp)

	vrows, err := h.db.Query(volSQL, diSQL, dfSQL)
	if err != nil {
		httpx.Error(w, r, http.StatusInternalServerError, "erro ao consultar volume", err)
		return
	}
	defer vrows.Close()
	for vrows.Next() {
		var p string
		var pecas, comandas int64
		if err := vrows.Scan(&p, &pecas, &comandas); err != nil {
			httpx.Error(w, r, http.StatusInternalServerError, "erro ao ler volume", err)
			return
		}
		out.Volume = append(out.Volume, dashboardVolume{Periodo: p, Pecas: pecas, Comandas: comandas})
	}

	mrows, err := h.db.Query(`
		SELECT cp.tipo,
		       COALESCE(SUM(cp.quantidade), 0)::bigint,
		       COALESCE(SUM(cp.valor_peca * cp.quantidade), 0)
		FROM comandas c
		JOIN clientes cl ON cl.id = c.id_cliente
		JOIN comanda_pecas cp ON cp.id_comanda = c.id
		WHERE c.data BETWEEN $1 AND $2
		GROUP BY cp.tipo
		ORDER BY SUM(cp.quantidade) DESC`,
		diSQL, dfSQL,
	)
	if err != nil {
		httpx.Error(w, r, http.StatusInternalServerError, "erro ao consultar mix", err)
		return
	}
	defer mrows.Close()
	var totalMixPecas int64
	var totalMixValor float64
	type mixRow struct {
		Tipo  string
		Pecas int64
		Valor float64
	}
	var mixRows []mixRow
	for mrows.Next() {
		var mr mixRow
		if err := mrows.Scan(&mr.Tipo, &mr.Pecas, &mr.Valor); err != nil {
			httpx.Error(w, r, http.StatusInternalServerError, "erro ao ler mix", err)
			return
		}
		totalMixPecas += mr.Pecas
		totalMixValor += mr.Valor
		mixRows = append(mixRows, mr)
	}
	for _, mr := range mixRows {
		var pctP, pctV float64
		if totalMixPecas > 0 {
			pctP = float64(mr.Pecas) / float64(totalMixPecas)
		}
		if totalMixValor > 0 {
			pctV = mr.Valor / totalMixValor
		}
		out.MixServico = append(out.MixServico, dashboardMix{
			Tipo: mr.Tipo, Pecas: mr.Pecas, Valor: mr.Valor, PctPecas: pctP, PctValor: pctV,
		})
	}

	rrows, err := h.db.Query(`
		SELECT p.id, p.nome,
		       COALESCE(SUM(cp.quantidade), 0)::bigint,
		       COALESCE(SUM(cp.valor_peca * cp.quantidade), 0)
		FROM comandas c
		JOIN clientes cl ON cl.id = c.id_cliente
		JOIN comanda_pecas cp ON cp.id_comanda = c.id
		JOIN pecas p ON p.id = cp.id_peca
		WHERE c.data BETWEEN $1 AND $2
		GROUP BY p.id, p.nome
		ORDER BY SUM(cp.quantidade) DESC
		LIMIT 10`,
		diSQL, dfSQL,
	)
	if err != nil {
		httpx.Error(w, r, http.StatusInternalServerError, "erro ao consultar ranking", err)
		return
	}
	defer rrows.Close()
	for rrows.Next() {
		var rp dashboardRankingPeca
		if err := rrows.Scan(&rp.ID, &rp.Nome, &rp.Quantidade, &rp.Valor); err != nil {
			httpx.Error(w, r, http.StatusInternalServerError, "erro ao ler ranking", err)
			return
		}
		out.RankingPecas = append(out.RankingPecas, rp)
	}

	var nComAvulso, nComFixo int64
	if err := h.db.QueryRow(`
		SELECT COUNT(*)::bigint FROM comandas c
		JOIN clientes cl ON cl.id = c.id_cliente
		WHERE c.data BETWEEN $1 AND $2 AND cl.tipo = 'avulso'`,
		diSQL, dfSQL).Scan(&nComAvulso); err != nil {
		httpx.Error(w, r, http.StatusInternalServerError, "erro ao contar comandas avulso", err)
		return
	}
	if err := h.db.QueryRow(`
		SELECT COUNT(*)::bigint FROM comandas c
		JOIN clientes cl ON cl.id = c.id_cliente
		WHERE c.data BETWEEN $1 AND $2 AND cl.tipo = 'fixo'`,
		diSQL, dfSQL).Scan(&nComFixo); err != nil {
		httpx.Error(w, r, http.StatusInternalServerError, "erro ao contar comandas fixo", err)
		return
	}

	if avulsoVal >= fixoVal {
		out.ReceitaTipoCliente = []dashboardReceitaTipo{
			{Tipo: "avulso", Valor: avulsoVal, Comandas: nComAvulso},
			{Tipo: "fixo", Valor: fixoVal, Comandas: nComFixo},
		}
	} else {
		out.ReceitaTipoCliente = []dashboardReceitaTipo{
			{Tipo: "fixo", Valor: fixoVal, Comandas: nComFixo},
			{Tipo: "avulso", Valor: avulsoVal, Comandas: nComAvulso},
		}
	}

	prows, err := h.db.Query(`
		SELECT COALESCE(p.id, 0)::bigint,
		       COALESCE(p.nome, 'Sem pacote'),
		       COUNT(*)::bigint
		FROM clientes c
		LEFT JOIN pacotes p ON p.id = c.id_pacote
		WHERE EXISTS (
			SELECT 1 FROM comandas co
			WHERE co.id_cliente = c.id AND co.data BETWEEN $1 AND $2
		)
		GROUP BY p.id, p.nome
		ORDER BY COUNT(*) DESC`,
		diSQL, dfSQL,
	)
	if err != nil {
		httpx.Error(w, r, http.StatusInternalServerError, "erro ao consultar clientes por pacote", err)
		return
	}
	defer prows.Close()
	for prows.Next() {
		var dp dashboardClientePacote
		if err := prows.Scan(&dp.IDPacote, &dp.NomePacote, &dp.Clientes); err != nil {
			httpx.Error(w, r, http.StatusInternalServerError, "erro ao ler pacotes", err)
			return
		}
		out.ClientesPorPacote = append(out.ClientesPorPacote, dp)
	}

	limite := time.Now().AddDate(0, 0, -diasRisco).Format("2006-01-02")
	const riscoBase = `
		SELECT c.id, c.nome, c.tipo,
		       TO_CHAR(MAX(co.data), 'DD/MM/YYYY') AS ultima,
		       (CURRENT_DATE - MAX(co.data))::bigint AS dias
		FROM clientes c
		JOIN comandas co ON co.id_cliente = c.id
		WHERE c.status = 'ativo'
		GROUP BY c.id, c.nome, c.tipo
		HAVING MAX(co.data) < $1::date`

	loadRisco := func(order string, limit int) ([]dashboardClienteRisco, error) {
		q := fmt.Sprintf("%s\n\t\tORDER BY %s\n\t\tLIMIT %d", riscoBase, order, limit)
		rows, err := h.db.Query(q, limite)
		if err != nil {
			return nil, err
		}
		defer rows.Close()
		var list []dashboardClienteRisco
		for rows.Next() {
			var cr dashboardClienteRisco
			if err := rows.Scan(&cr.ID, &cr.Nome, &cr.TipoCliente, &cr.UltimaComandaBR, &cr.DiasSemComanda); err != nil {
				return nil, err
			}
			list = append(list, cr)
		}
		return list, rows.Err()
	}

	longa, err := loadRisco("MAX(co.data) ASC", 10)
	if err != nil {
		httpx.Error(w, r, http.StatusInternalServerError, "erro ao consultar clientes em risco (ausência longa)", err)
		return
	}
	recente, err := loadRisco("MAX(co.data) DESC", 80)
	if err != nil {
		httpx.Error(w, r, http.StatusInternalServerError, "erro ao consultar clientes em risco (limite recente)", err)
		return
	}

	seen := make(map[int64]struct{}, 24)
	const maxRisco = 20
	const maxRecente = 10
	const maxLonga = 10
	addedRecente := 0
	for _, cr := range recente {
		if len(out.ClientesRisco) >= maxRisco || addedRecente >= maxRecente {
			break
		}
		if _, ok := seen[cr.ID]; ok {
			continue
		}
		seen[cr.ID] = struct{}{}
		cr.Perfil = "recente"
		out.ClientesRisco = append(out.ClientesRisco, cr)
		addedRecente++
	}
	addedLonga := 0
	for _, cr := range longa {
		if len(out.ClientesRisco) >= maxRisco || addedLonga >= maxLonga {
			break
		}
		if _, ok := seen[cr.ID]; ok {
			continue
		}
		seen[cr.ID] = struct{}{}
		cr.Perfil = "longa"
		out.ClientesRisco = append(out.ClientesRisco, cr)
		addedLonga++
	}

	// Faturamento previsto: avulso + valor cheio dos pacotes dos mensalistas + peças avulsas dos mensalistas.
	// Sempre exibido, independente de mês cheio ou parcial.
	var fixoPacotesPrevisto float64
	if err := h.db.QueryRow(`
		SELECT COALESCE(SUM(p.preco), 0)
		FROM clientes c
		JOIN pacotes p ON p.id = c.id_pacote
		WHERE c.tipo = 'fixo' AND c.id_pacote IS NOT NULL
		AND EXISTS (
			SELECT 1 FROM comandas co
			WHERE co.id_cliente = c.id AND co.data BETWEEN $1 AND $2
		)`,
		diSQL, dfSQL).Scan(&fixoPacotesPrevisto); err != nil {
		httpx.Error(w, r, http.StatusInternalServerError, "erro ao somar pacotes do previsto", err)
		return
	}
	fixoValPrevisto := fixoPacotesPrevisto + fixoExtrasPacote + fixoSemPacote
	out.MostrarFaturamentoPrevisto = true
	out.FaturamentoPrevistoAvulso = avulsoVal
	out.FaturamentoPrevistoFixo = fixoValPrevisto
	out.FaturamentoPrevisto = avulsoVal + fixoValPrevisto

	httpx.JSON(w, http.StatusOK, out)
}

