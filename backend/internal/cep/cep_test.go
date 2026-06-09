package cep

import (
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	"github.com/go-chi/chi/v5"
)

func TestBuscarCEPInvalido(t *testing.T) {
	h := NewHandler()
	r := chi.NewRouter()
	r.Get("/cep/{cep}", h.Buscar)

	for _, path := range []string{"/cep/123", "/cep/123456789", "/cep/abcd1234"} {
		req := httptest.NewRequest(http.MethodGet, path, nil)
		rec := httptest.NewRecorder()
		r.ServeHTTP(rec, req)
		if rec.Code != http.StatusBadRequest {
			t.Fatalf("%s: esperado 400, recebido %d", path, rec.Code)
		}
		if !strings.Contains(rec.Body.String(), "cep inválido") {
			t.Fatalf("%s: corpo inesperado: %s", path, rec.Body.String())
		}
	}
}

func TestBuscarCEPValido(t *testing.T) {
	mock := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.URL.Path != "/ws/01310100/json" {
			http.NotFound(w, r)
			return
		}
		w.Header().Set("Content-Type", "application/json")
		_, _ = w.Write([]byte(`{
			"logradouro": "Avenida Paulista",
			"bairro": "Bela Vista",
			"localidade": "São Paulo",
			"uf": "sp"
		}`))
	}))
	defer mock.Close()

	h := &Handler{http: clientViaMock(mock)}
	r := chi.NewRouter()
	r.Get("/cep/{cep}", h.Buscar)

	req := httptest.NewRequest(http.MethodGet, "/cep/01310-100", nil)
	rec := httptest.NewRecorder()
	r.ServeHTTP(rec, req)

	if rec.Code != http.StatusOK {
		t.Fatalf("esperado 200, recebido %d: %s", rec.Code, rec.Body.String())
	}
	body := rec.Body.String()
	if !strings.Contains(body, "Avenida Paulista") {
		t.Fatalf("logradouro ausente: %s", body)
	}
	if !strings.Contains(body, `"uf":"SP"`) {
		t.Fatalf("UF não normalizada: %s", body)
	}
}

func TestBuscarCEPNaoEncontrado(t *testing.T) {
	mock := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, _ *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		_, _ = w.Write([]byte(`{"erro": true}`))
	}))
	defer mock.Close()

	h := &Handler{http: clientViaMock(mock)}
	r := chi.NewRouter()
	r.Get("/cep/{cep}", h.Buscar)

	req := httptest.NewRequest(http.MethodGet, "/cep/00000000", nil)
	rec := httptest.NewRecorder()
	r.ServeHTTP(rec, req)
	if rec.Code != http.StatusNotFound {
		t.Fatalf("esperado 404, recebido %d: %s", rec.Code, rec.Body.String())
	}
}

func clientViaMock(mock *httptest.Server) *http.Client {
	host := strings.TrimPrefix(mock.URL, "http://")
	return &http.Client{
		Transport: roundTripFunc(func(req *http.Request) (*http.Response, error) {
			req.URL.Scheme = "http"
			req.URL.Host = host
			return http.DefaultTransport.RoundTrip(req)
		}),
	}
}

type roundTripFunc func(*http.Request) (*http.Response, error)

func (f roundTripFunc) RoundTrip(r *http.Request) (*http.Response, error) { return f(r) }
