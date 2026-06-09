package httpx

import (
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
)

func TestJSON(t *testing.T) {
	w := httptest.NewRecorder()
	JSON(w, 200, map[string]string{"hello": "world"})
	if w.Code != 200 {
		t.Fatalf("status %d", w.Code)
	}
	var got map[string]string
	if err := json.NewDecoder(w.Body).Decode(&got); err != nil {
		t.Fatal(err)
	}
	if got["hello"] != "world" {
		t.Fatalf("body inesperado: %v", got)
	}
}

func TestError(t *testing.T) {
	w := httptest.NewRecorder()
	r := httptest.NewRequest(http.MethodGet, "/", nil)
	Error(w, r, 400, "bad")
	if !strings.Contains(w.Body.String(), `"error":"bad"`) {
		t.Fatalf("body inesperado: %s", w.Body.String())
	}
}

func TestDecode(t *testing.T) {
	type payload struct {
		Nome string `json:"nome"`
		ID   int    `json:"id"`
	}

	t.Run("ok", func(t *testing.T) {
		r := httptest.NewRequest(http.MethodPost, "/", strings.NewReader(`{"nome":"Ana","id":1}`))
		var p payload
		if err := Decode(r, &p); err != nil {
			t.Fatal(err)
		}
		if p.Nome != "Ana" || p.ID != 1 {
			t.Fatalf("payload inesperado: %+v", p)
		}
	})

	t.Run("campo desconhecido", func(t *testing.T) {
		r := httptest.NewRequest(http.MethodPost, "/", strings.NewReader(`{"nome":"Ana","extra":true}`))
		var p payload
		if err := Decode(r, &p); err == nil {
			t.Fatal("esperado erro por campo desconhecido")
		}
	})

	t.Run("json inválido", func(t *testing.T) {
		r := httptest.NewRequest(http.MethodPost, "/", strings.NewReader(`{`))
		var p payload
		if err := Decode(r, &p); err == nil {
			t.Fatal("esperado erro de json inválido")
		}
	})
}
