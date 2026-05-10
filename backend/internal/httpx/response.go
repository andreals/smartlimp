package httpx

import (
	"encoding/json"
	"log"
	"net/http"
)

type ErrorBody struct {
	Error string `json:"error"`
}

func JSON(w http.ResponseWriter, status int, payload any) {
	w.Header().Set("Content-Type", "application/json; charset=utf-8")
	w.WriteHeader(status)
	if payload == nil {
		return
	}
	_ = json.NewEncoder(w).Encode(payload)
}

func Error(w http.ResponseWriter, r *http.Request, status int, msg string, cause ...error) {
	if status >= http.StatusInternalServerError {
		if len(cause) > 0 && cause[0] != nil {
			log.Printf("erro HTTP %s %s -> %d: %s: %v", r.Method, r.URL.Path, status, msg, cause[0])
		} else {
			log.Printf("erro HTTP %s %s -> %d: %s", r.Method, r.URL.Path, status, msg)
		}
	}
	JSON(w, status, ErrorBody{Error: msg})
}

func Decode(r *http.Request, dst any) error {
	defer r.Body.Close()
	dec := json.NewDecoder(r.Body)
	dec.DisallowUnknownFields()
	return dec.Decode(dst)
}
