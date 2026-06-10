//go:build integration

package integration_test

import (
	"net/http"
	"testing"

	"github.com/forint/smartlimp-backend/internal/testutil"
)

func TestHealth(t *testing.T) {
	db := testutil.SetupPostgres(t)
	api := testutil.NewAPIServer(t, db)

	resp, data := api.Do(http.MethodGet, "/api/health", nil, "")
	if resp.StatusCode != http.StatusOK {
		t.Fatalf("status %d body %s", resp.StatusCode, data)
	}
	if string(data) != `{"status":"ok"}` {
		t.Fatalf("body inesperado: %s", data)
	}
}

func TestAuthLoginSuccess(t *testing.T) {
	db := testutil.SetupPostgres(t)
	api := testutil.NewAPIServer(t, db)

	token := api.LoginAdmin(t)
	if token == "" {
		t.Fatal("token vazio")
	}
}

func TestAuthLoginFailure(t *testing.T) {
	db := testutil.SetupPostgres(t)
	api := testutil.NewAPIServer(t, db)

	resp, _ := api.Do(http.MethodPost, "/api/auth/login", map[string]string{
		"login": "admin",
		"senha": "hash-invalido",
	}, "")
	if resp.StatusCode != http.StatusUnauthorized {
		t.Fatalf("esperado 401, recebido %d", resp.StatusCode)
	}
}

func TestProtectedRouteRequiresAuth(t *testing.T) {
	db := testutil.SetupPostgres(t)
	api := testutil.NewAPIServer(t, db)

	resp, _ := api.Do(http.MethodGet, "/api/clientes", nil, "")
	if resp.StatusCode != http.StatusUnauthorized {
		t.Fatalf("esperado 401, recebido %d", resp.StatusCode)
	}
}
