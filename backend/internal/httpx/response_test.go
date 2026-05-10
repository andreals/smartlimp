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
