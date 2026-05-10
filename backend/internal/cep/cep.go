package cep

import (
	"encoding/json"
	"io"
	"net/http"
	"strings"
	"time"

	"github.com/forint/smartlimp-backend/internal/httpx"
	"github.com/go-chi/chi/v5"
)

type viaCEPResponse struct {
	Erro       bool   `json:"erro"`
	Logradouro string `json:"logradouro"`
	Bairro     string `json:"bairro"`
	Localidade string `json:"localidade"`
	UF         string `json:"uf"`
}

type cepOut struct {
	Logradouro string `json:"logradouro"`
	Bairro     string `json:"bairro"`
	Cidade     string `json:"cidade"`
	UF         string `json:"uf"`
}

type Handler struct{ http *http.Client }

func NewHandler() *Handler {
	return &Handler{http: &http.Client{Timeout: 12 * time.Second}}
}

func (h *Handler) Buscar(w http.ResponseWriter, r *http.Request) {
	cep := strings.Map(func(r rune) rune {
		if r >= '0' && r <= '9' {
			return r
		}
		return -1
	}, chi.URLParam(r, "cep"))
	if len(cep) != 8 {
		httpx.Error(w, r, http.StatusBadRequest, "cep inválido")
		return
	}

	url := "https://viacep.com.br/ws/" + cep + "/json"
	req, err := http.NewRequestWithContext(r.Context(), http.MethodGet, url, nil)
	if err != nil {
		httpx.Error(w, r, http.StatusInternalServerError, "erro ao montar consulta cep", err)
		return
	}
	req.Header.Set("Accept", "application/json")
	req.Header.Set("User-Agent", "SmartLimp-Backend/1.0")

	resp, err := h.http.Do(req)
	if err != nil {
		httpx.Error(w, r, http.StatusBadGateway, "erro ao consultar cep", err)
		return
	}
	defer resp.Body.Close()

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		httpx.Error(w, r, http.StatusInternalServerError, "erro ao ler resposta cep", err)
		return
	}

	if resp.StatusCode >= 400 {
		httpx.Error(w, r, http.StatusNotFound, "cep não encontrado")
		return
	}

	var v viaCEPResponse
	if err := json.Unmarshal(body, &v); err != nil {
		httpx.Error(w, r, http.StatusInternalServerError, "resposta cep inválida", err)
		return
	}

	if v.Erro || (strings.TrimSpace(v.Localidade) == "" && strings.TrimSpace(v.UF) == "") {
		httpx.Error(w, r, http.StatusNotFound, "cep não encontrado")
		return
	}

	logradouro := strings.TrimSpace(v.Logradouro)

	httpx.JSON(w, http.StatusOK, cepOut{
		Logradouro: logradouro,
		Bairro:     strings.TrimSpace(v.Bairro),
		Cidade:     strings.TrimSpace(v.Localidade),
		UF:         strings.TrimSpace(strings.ToUpper(v.UF)),
	})
}
