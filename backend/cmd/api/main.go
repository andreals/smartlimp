package main

import (
	"log"
	"net/http"
	"time"

	"github.com/forint/smartlimp-backend/internal/config"
	"github.com/forint/smartlimp-backend/internal/db"
	"github.com/forint/smartlimp-backend/internal/server"
)

func main() {
	cfg := config.Load()

	tz, err := time.LoadLocation("America/Sao_Paulo")
	if err == nil {
		time.Local = tz
	}

	conn, err := db.Connect(cfg)
	if err != nil {
		log.Fatalf("falha ao conectar no banco: %v", err)
	}
	defer conn.Close()

	addr := ":" + cfg.Port
	log.Printf("Smart Limp API rodando em %s (env=%s)", addr, cfg.Env)
	if err := http.ListenAndServe(addr, server.New(cfg, conn)); err != nil {
		log.Fatalf("servidor finalizado: %v", err)
	}
}
