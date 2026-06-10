package testutil

import (
	"bytes"
	"database/sql"
	"encoding/json"
	"io"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/forint/smartlimp-backend/internal/server"
)

// APIServer inicia httptest.Server com a API completa.
type APIServer struct {
	*httptest.Server
	DB *sql.DB
}

// NewAPIServer monta servidor de teste com banco real.
func NewAPIServer(t *testing.T, db *sql.DB) *APIServer {
	t.Helper()
	cfg := TestConfig()
	srv := httptest.NewServer(server.New(cfg, db))
	t.Cleanup(srv.Close)
	return &APIServer{Server: srv, DB: db}
}

// Do executa requisição HTTP contra a API de teste.
func (s *APIServer) Do(method, path string, body any, token string) (*http.Response, []byte) {
	var r io.Reader
	if body != nil {
		b, _ := json.Marshal(body)
		r = bytes.NewReader(b)
	}
	req, _ := http.NewRequest(method, s.URL+path, r)
	if body != nil {
		req.Header.Set("Content-Type", "application/json")
	}
	if token != "" {
		req.Header.Set("Authorization", "Bearer "+token)
	}
	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		panic(err)
	}
	defer resp.Body.Close()
	data, _ := io.ReadAll(resp.Body)
	return resp, data
}

// LoginAdmin autentica com o usuário seed admin/admin123 (senha enviada como MD5, igual ao frontend).
func (s *APIServer) LoginAdmin(t *testing.T) string {
	t.Helper()
	resp, data := s.Do(http.MethodPost, "/api/auth/login", map[string]string{
		"login": "admin",
		"senha": AdminPasswordMD5,
	}, "")
	if resp.StatusCode != http.StatusOK {
		t.Fatalf("login admin: status %d body %s", resp.StatusCode, data)
	}
	var out struct {
		Token string `json:"token"`
	}
	if err := json.Unmarshal(data, &out); err != nil || out.Token == "" {
		t.Fatalf("token inválido: %s", data)
	}
	return out.Token
}

// DecodeJSON decodifica corpo JSON no destino.
func DecodeJSON(t *testing.T, data []byte, dst any) {
	t.Helper()
	if err := json.Unmarshal(data, dst); err != nil {
		t.Fatalf("json: %v body=%s", err, data)
	}
}
