//go:build integration

package integration_test

import (
	"net/http"
	"strconv"
	"testing"
	"time"

	"github.com/forint/smartlimp-backend/internal/testutil"
)

func TestImpressaoClienteSemPacote(t *testing.T) {
	db := testutil.SetupPostgres(t)
	testutil.TruncateTables(t, db)
	api := testutil.NewAPIServer(t, db)
	token := api.LoginAdmin(t)

	// Cliente avulso sem pacote (cenário típico de cadastro novo)
	resp, data := api.Do(http.MethodPost, "/api/clientes", map[string]any{
		"nome":       "Cliente Sem Pacote",
		"cep":        "01310100",
		"numero":     "100",
		"logradouro": "Avenida Paulista",
		"bairro":     "Bela Vista",
		"cidade":     "São Paulo",
		"uf":         "SP",
		"tipo":       "avulso",
		"antecipado": "N",
		"status":     "ativo",
	}, token)
	if resp.StatusCode != http.StatusCreated {
		t.Fatalf("criar cliente: status %d body %s", resp.StatusCode, data)
	}
	var cliente struct {
		ID int64 `json:"id"`
	}
	testutil.DecodeJSON(t, data, &cliente)

	// Peça mínima para comanda
	resp, data = api.Do(http.MethodPost, "/api/pecas", map[string]any{
		"nome":              "Camisa Teste",
		"valor_lavar":       10.0,
		"valor_passar":      8.0,
		"valor_lavarpassar": 15.0,
		"valor_tingir":      20.0,
		"entra_pacote":      "S",
	}, token)
	if resp.StatusCode != http.StatusCreated {
		t.Fatalf("criar peça: status %d body %s", resp.StatusCode, data)
	}
	var peca struct {
		ID int64 `json:"id"`
	}
	testutil.DecodeJSON(t, data, &peca)

	hoje := time.Now().Format("02/01/2006")
	resp, data = api.Do(http.MethodPost, "/api/comandas", map[string]any{
		"id_cliente":    cliente.ID,
		"data_comanda":  hoje,
		"pecas_comanda": []map[string]any{{
			"id_peca":          peca.ID,
			"id_cliente":       cliente.ID,
			"descricao":        "Camisa Teste",
			"quantidade_peca":  1,
			"valor_peca":       10.0,
			"tipo":             "lavar",
		}},
		"desconto":           0,
		"acrescimo":          0,
		"pontos_acumulados":  0,
		"pontos_utilizados":  0,
		"comanda_pagamento":  "N",
	}, token)
	if resp.StatusCode != http.StatusCreated {
		t.Fatalf("criar comanda: status %d body %s", resp.StatusCode, data)
	}
	var comanda struct {
		ID int64 `json:"id"`
	}
	testutil.DecodeJSON(t, data, &comanda)

	resp, data = api.Do(http.MethodGet, "/api/comandas/"+strconv.FormatInt(comanda.ID, 10)+"/impressao", nil, token)
	if resp.StatusCode != http.StatusOK {
		t.Fatalf("impressão: status %d body %s", resp.StatusCode, data)
	}
	var imp struct {
		Cliente     string `json:"cliente"`
		TipoPacote  string `json:"tipo_pacote"`
		TipoCliente string `json:"tipo_cliente"`
		Pecas       []any  `json:"pecas"`
	}
	testutil.DecodeJSON(t, data, &imp)
	if imp.Cliente == "" || len(imp.Pecas) == 0 {
		t.Fatalf("impressão incompleta: %+v", imp)
	}
	if imp.TipoPacote != "" {
		t.Fatalf("tipo_pacote deveria ser vazio sem pacote, recebido %q", imp.TipoPacote)
	}
}
