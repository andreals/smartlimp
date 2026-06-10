package main

import (
	"database/sql"
	"fmt"
	"log"
	"strings"

	"github.com/forint/smartlimp-backend/internal/config"
	"github.com/forint/smartlimp-backend/internal/migrate"
	_ "github.com/jackc/pgx/v5/stdlib"
)

func main() {
	cfg := config.Load()

	db, err := sql.Open("pgx", cfg.DatabaseURL)
	if err != nil {
		log.Fatalf("abrir conexão: %v", err)
	}
	defer db.Close()

	if err := db.Ping(); err != nil {
		log.Fatalf("ping postgres: %v", err)
	}
	log.Printf("conectado em %s", redact(cfg.DatabaseURL))

	dir := migrate.Dir()
	if err := migrate.Apply(func(sql string) error {
		_, err := db.Exec(sql)
		return err
	}, dir); err != nil {
		log.Fatalf("migrations: %v", err)
	}
	log.Printf("migrations aplicadas em %s", dir)
}

func redact(url string) string {
	if i := strings.Index(url, "@"); i > 0 {
		j := strings.Index(url, "//")
		if j >= 0 && j+2 < i {
			return url[:j+2] + "***" + url[i:]
		}
	}
	return fmt.Sprintf("(%d chars)", len(url))
}
