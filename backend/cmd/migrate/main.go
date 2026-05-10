package main

import (
	"database/sql"
	"fmt"
	"log"
	"os"
	"path/filepath"
	"sort"
	"strings"

	"github.com/forint/smartlimp-backend/internal/config"
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

	dir := "migrations"
	if v := os.Getenv("MIGRATIONS_DIR"); v != "" {
		dir = v
	}

	files, err := filepath.Glob(filepath.Join(dir, "*.sql"))
	if err != nil {
		log.Fatalf("listar migrations: %v", err)
	}
	sort.Strings(files)

	for _, f := range files {
		log.Printf("aplicando %s ...", filepath.Base(f))
		b, err := os.ReadFile(f)
		if err != nil {
			log.Fatalf("ler %s: %v", f, err)
		}
		if _, err := db.Exec(string(b)); err != nil {
			log.Fatalf("aplicar %s: %v", f, err)
		}
	}
	log.Printf("%d migration(s) aplicadas com sucesso", len(files))
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
