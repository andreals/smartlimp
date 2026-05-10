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

type postmonResponse struct {
	Logradouro string `json:"logradouro"`
	Bairro     string `json:"bairro"`
	Cidade     string `json:"cidade"`
	Estado     string `json:"estado"`
}

type cepOut struct {
	Logradouro string `json:"logradouro"`
	Bairro     string `json:"bairro"`
	Cidade     string `json:"cidade"`
	UF         string `json:"uf"`
}

type Handler struct{ http *http.Client }

func NewHandler() *Handler {
	return &Handler{http: &http.Client{Timeout: 10 * time.Second}}
}

func (h *Handler) Buscar(w http.ResponseWriter, r *http.Request) {
	cep := strings.ReplaceAll(chi.URLParam(r, "cep"), "-", "")
	if len(cep) != 8 {
		httpx.Error(w, http.StatusBadRequest, "cep inválido")
		return
	}

	resp, err := h.http.Get("https://api.postmon.com.br/v1/cep/" + cep)
	if err != nil {
		httpx.Error(w, http.StatusBadGateway, "erro ao consultar cep")
		return
	}
	defer resp.Body.Close()

	if resp.StatusCode >= 400 {
		httpx.Error(w, http.StatusNotFound, "cep não encontrado")
		return
	}

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		httpx.Error(w, http.StatusInternalServerError, "erro ao ler resposta cep")
		return
	}

	var pm postmonResponse
	if err := json.Unmarshal(body, &pm); err != nil {
		httpx.Error(w, http.StatusInternalServerError, "resposta cep inválida")
		return
	}

	logradouro := pm.Logradouro
	if i := strings.Index(logradouro, "-"); i >= 0 {
		logradouro = strings.TrimSpace(logradouro[:i])
	}

	httpx.JSON(w, http.StatusOK, cepOut{
		Logradouro: logradouro,
		Bairro:     pm.Bairro,
		Cidade:     pm.Cidade,
		UF:         pm.Estado,
	})
}
