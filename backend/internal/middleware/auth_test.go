package middleware

import (
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/forint/smartlimp-backend/internal/auth"
)

func TestRequireAuthMissingToken(t *testing.T) {
	tm := auth.NewTokenManager("s", 1)
	h := RequireAuth(tm)(http.HandlerFunc(func(w http.ResponseWriter, _ *http.Request) {
		w.WriteHeader(http.StatusOK)
	}))

	req := httptest.NewRequest("GET", "/x", nil)
	rec := httptest.NewRecorder()
	h.ServeHTTP(rec, req)
	if rec.Code != http.StatusUnauthorized {
		t.Fatalf("esperado 401, recebido %d", rec.Code)
	}
}

func TestRequireAuthValidToken(t *testing.T) {
	tm := auth.NewTokenManager("s", 1)
	tok, _, _ := tm.Generate(7, "u", "U")

	called := false
	h := RequireAuth(tm)(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		called = true
		c, ok := UserFromContext(r.Context())
		if !ok || c.UserID != 7 {
			t.Fatalf("contexto inválido: %+v", c)
		}
		w.WriteHeader(http.StatusOK)
	}))

	req := httptest.NewRequest("GET", "/x", nil)
	req.Header.Set("Authorization", "Bearer "+tok)
	rec := httptest.NewRecorder()
	h.ServeHTTP(rec, req)
	if rec.Code != http.StatusOK {
		t.Fatalf("esperado 200, recebido %d", rec.Code)
	}
	if !called {
		t.Fatal("handler não foi chamado")
	}
}

func TestRequireAuthInvalidToken(t *testing.T) {
	tm := auth.NewTokenManager("s", 1)
	h := RequireAuth(tm)(http.HandlerFunc(func(w http.ResponseWriter, _ *http.Request) {
		w.WriteHeader(http.StatusOK)
	}))

	req := httptest.NewRequest("GET", "/x", nil)
	req.Header.Set("Authorization", "Bearer xxx.yyy.zzz")
	rec := httptest.NewRecorder()
	h.ServeHTTP(rec, req)
	if rec.Code != http.StatusUnauthorized {
		t.Fatalf("esperado 401, recebido %d", rec.Code)
	}
}
