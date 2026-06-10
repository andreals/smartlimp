//go:build integration

package integration_test

import (
	"net/http"
	"strconv"
	"testing"

	"github.com/forint/smartlimp-backend/internal/testutil"
)

func TestPacotesCRUD(t *testing.T) {
	db := testutil.SetupPostgres(t)
	testutil.TruncateTables(t, db)
	api := testutil.NewAPIServer(t, db)
	token := api.LoginAdmin(t)

	payload := map[string]any{
		"nome":       "Pacote E2E",
		"tipo":       "lavar",
		"preco":      49.9,
		"quantidade": 20,
	}
	resp, data := api.Do(http.MethodPost, "/api/pacotes", payload, token)
	if resp.StatusCode != http.StatusCreated {
		t.Fatalf("criar pacote: status %d body %s", resp.StatusCode, data)
	}
	var created struct {
		ID int64 `json:"id"`
	}
	testutil.DecodeJSON(t, data, &created)

	resp, data = api.Do(http.MethodGet, "/api/pacotes/"+strconv.FormatInt(created.ID, 10), nil, token)
	if resp.StatusCode != http.StatusOK {
		t.Fatalf("get pacote: status %d body %s", resp.StatusCode, data)
	}

	resp, data = api.Do(http.MethodGet, "/api/pacotes", nil, token)
	if resp.StatusCode != http.StatusOK {
		t.Fatalf("listar pacotes: status %d", resp.StatusCode)
	}
	var list []struct {
		ID int64 `json:"id"`
	}
	testutil.DecodeJSON(t, data, &list)
	if len(list) < 1 {
		t.Fatal("lista de pacotes vazia")
	}
}
