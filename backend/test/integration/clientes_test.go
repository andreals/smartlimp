//go:build integration

package integration_test

import (
	"net/http"
	"strconv"
	"testing"

	"github.com/forint/smartlimp-backend/internal/testutil"
)

func TestClientesCRUD(t *testing.T) {
	db := testutil.SetupPostgres(t)
	testutil.TruncateTables(t, db)
	api := testutil.NewAPIServer(t, db)
	token := api.LoginAdmin(t)

	// Criar cliente
	payload := map[string]any{
		"nome":       "Cliente Integração Teste",
		"cep":        "01310100",
		"numero":     "100",
		"logradouro": "Avenida Paulista",
		"bairro":     "Bela Vista",
		"cidade":     "São Paulo",
		"uf":         "SP",
		"tipo":       "avulso",
		"antecipado": "N",
		"status":     "ativo",
	}
	resp, data := api.Do(http.MethodPost, "/api/clientes", payload, token)
	if resp.StatusCode != http.StatusCreated {
		t.Fatalf("criar cliente: status %d body %s", resp.StatusCode, data)
	}
	var created struct {
		ID int64 `json:"id"`
	}
	testutil.DecodeJSON(t, data, &created)
	if created.ID <= 0 {
		t.Fatalf("id inválido: %+v", created)
	}

	// Buscar por id
	resp, data = api.Do(http.MethodGet, "/api/clientes/"+strconv.FormatInt(created.ID, 10), nil, token)
	if resp.StatusCode != http.StatusOK {
		t.Fatalf("get cliente: status %d body %s", resp.StatusCode, data)
	}
	var one struct {
		ID   int64  `json:"id"`
		Nome string `json:"nome"`
		CEP  string `json:"cep"`
	}
	testutil.DecodeJSON(t, data, &one)
	if one.Nome != payload["nome"] || one.CEP != payload["cep"] {
		t.Fatalf("cliente inesperado: %+v", one)
	}

	// Listar
	resp, data = api.Do(http.MethodGet, "/api/clientes?status=ativo", nil, token)
	if resp.StatusCode != http.StatusOK {
		t.Fatalf("listar: status %d body %s", resp.StatusCode, data)
	}
	var list []struct {
		ID int64 `json:"id"`
	}
	testutil.DecodeJSON(t, data, &list)
	if len(list) < 1 {
		t.Fatal("lista vazia")
	}

	// Nomes parecidos
	resp, data = api.Do(http.MethodGet, "/api/clientes/parecidos?nome=Integração", nil, token)
	if resp.StatusCode != http.StatusOK {
		t.Fatalf("parecidos: status %d body %s", resp.StatusCode, data)
	}

	// Pontos e saldo zerados
	resp, data = api.Do(http.MethodGet, "/api/clientes/"+strconv.FormatInt(created.ID, 10)+"/pontos", nil, token)
	if resp.StatusCode != http.StatusOK {
		t.Fatalf("pontos: status %d", resp.StatusCode)
	}
	var pontos struct {
		Quantidade int64 `json:"quantidade"`
	}
	testutil.DecodeJSON(t, data, &pontos)
	if pontos.Quantidade != 0 {
		t.Fatalf("pontos esperados 0, recebido %d", pontos.Quantidade)
	}

	resp, data = api.Do(http.MethodGet, "/api/clientes/"+strconv.FormatInt(created.ID, 10)+"/saldo", nil, token)
	if resp.StatusCode != http.StatusOK {
		t.Fatalf("saldo: status %d", resp.StatusCode)
	}
	var saldo struct {
		Valor float64 `json:"valor"`
	}
	testutil.DecodeJSON(t, data, &saldo)
	if saldo.Valor != 0 {
		t.Fatalf("saldo esperado 0, recebido %v", saldo.Valor)
	}

	// Atualizar
	update := payload
	update["id"] = created.ID
	update["nome"] = "Cliente Integração Atualizado"
	resp, data = api.Do(http.MethodPost, "/api/clientes", update, token)
	if resp.StatusCode != http.StatusOK {
		t.Fatalf("atualizar: status %d body %s", resp.StatusCode, data)
	}

	resp, data = api.Do(http.MethodGet, "/api/clientes/"+strconv.FormatInt(created.ID, 10), nil, token)
	testutil.DecodeJSON(t, data, &one)
	if one.Nome != update["nome"] {
		t.Fatalf("nome não atualizado: %s", one.Nome)
	}
}

func TestClientesSaveValidation(t *testing.T) {
	db := testutil.SetupPostgres(t)
	testutil.TruncateTables(t, db)
	api := testutil.NewAPIServer(t, db)
	token := api.LoginAdmin(t)

	resp, _ := api.Do(http.MethodPost, "/api/clientes", map[string]any{
		"nome": "abc",
		"cep":  "01310100",
	}, token)
	if resp.StatusCode != http.StatusBadRequest {
		t.Fatalf("esperado 400, recebido %d", resp.StatusCode)
	}
}
