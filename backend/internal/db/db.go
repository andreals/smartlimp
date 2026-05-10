package db

import (
	"database/sql"
	"fmt"
	"time"

	"github.com/forint/smartlimp-backend/internal/config"
	_ "github.com/jackc/pgx/v5/stdlib"
)

func Connect(cfg *config.Config) (*sql.DB, error) {
	db, err := sql.Open("pgx", cfg.DatabaseURL)
	if err != nil {
		return nil, fmt.Errorf("abrir conexão Postgres: %w", err)
	}
	db.SetMaxOpenConns(25)
	db.SetMaxIdleConns(10)
	db.SetConnMaxLifetime(5 * time.Minute)

	if err := db.Ping(); err != nil {
		return nil, fmt.Errorf("ping Postgres: %w", err)
	}
	return db, nil
}
