package testutil

import (
	"context"
	"database/sql"
	"fmt"
	"os"
	"os/exec"
	"path/filepath"
	"runtime"
	"testing"
	"time"

	"github.com/forint/smartlimp-backend/internal/config"
	"github.com/forint/smartlimp-backend/internal/migrate"
	_ "github.com/jackc/pgx/v5/stdlib"
	"github.com/testcontainers/testcontainers-go"
	"github.com/testcontainers/testcontainers-go/modules/postgres"
	"github.com/testcontainers/testcontainers-go/wait"
)

const defaultTestDBURL = "postgresql://smartlimp:test@127.0.0.1:54329/smartlimp_test?sslmode=disable"

// SetupPostgres conecta em Postgres para testes (TEST_DATABASE_URL, docker-compose ou Testcontainers).
func SetupPostgres(t *testing.T) *sql.DB {
	t.Helper()

	url := os.Getenv("TEST_DATABASE_URL")
	var terminate func()

	if url == "" {
		url = defaultTestDBURL
		db, err := openAndPing(url)
		if err == nil {
			t.Cleanup(func() { _ = db.Close() })
			runMigrations(t, db)
			return db
		}

		containerURL, cleanup, err := startPostgresContainer(t)
		if err != nil {
			t.Skipf("Postgres indisponível para integração: %v\n"+
				"Suba o banco com: docker compose -f docker-compose.test.yml up -d\n"+
				"Ou defina TEST_DATABASE_URL", err)
		}
		url = containerURL
		terminate = cleanup
	}

	db, err := openAndPing(url)
	if err != nil {
		if terminate != nil {
			terminate()
		}
		t.Fatalf("conectar Postgres de teste: %v", err)
	}

	t.Cleanup(func() {
		_ = db.Close()
		if terminate != nil {
			terminate()
		}
	})

	runMigrations(t, db)
	return db
}

func openAndPing(url string) (*sql.DB, error) {
	db, err := sql.Open("pgx", url)
	if err != nil {
		return nil, err
	}
	db.SetMaxOpenConns(5)
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()
	if err := db.PingContext(ctx); err != nil {
		_ = db.Close()
		return nil, err
	}
	return db, nil
}

func startPostgresContainer(t *testing.T) (connStr string, cleanup func(), err error) {
	t.Helper()
	if !dockerAvailable() {
		return "", nil, fmt.Errorf("docker indisponível")
	}

	defer func() {
		if r := recover(); r != nil {
			err = fmt.Errorf("testcontainers: %v", r)
		}
	}()

	ctx := context.Background()

	pg, runErr := postgres.Run(ctx,
		"postgres:16-alpine",
		postgres.WithDatabase("smartlimp_test"),
		postgres.WithUsername("smartlimp"),
		postgres.WithPassword("test"),
		testcontainers.WithWaitStrategy(
			wait.ForLog("database system is ready to accept connections").
				WithOccurrence(2).
				WithStartupTimeout(60*time.Second),
		),
	)
	if runErr != nil {
		return "", nil, runErr
	}

	cleanup = func() {
		if termErr := pg.Terminate(context.Background()); termErr != nil {
			t.Logf("encerrar container postgres: %v", termErr)
		}
	}

	connStr, err = pg.ConnectionString(ctx, "sslmode=disable")
	if err != nil {
		cleanup()
		cleanup = nil
		return "", nil, err
	}
	return connStr, cleanup, nil
}

func dockerAvailable() bool {
	ctx, cancel := context.WithTimeout(context.Background(), 3*time.Second)
	defer cancel()
	return exec.CommandContext(ctx, "docker", "info").Run() == nil
}

func runMigrations(t *testing.T, db *sql.DB) {
	t.Helper()
	dir := migrationsDir()
	if err := migrate.Apply(func(sql string) error {
		_, err := db.Exec(sql)
		return err
	}, dir); err != nil {
		t.Fatalf("aplicar migrations em %s: %v", dir, err)
	}
}

func migrationsDir() string {
	if v := os.Getenv("MIGRATIONS_DIR"); v != "" {
		return v
	}
	_, file, _, ok := runtime.Caller(0)
	if !ok {
		return "migrations"
	}
	// backend/internal/testutil -> backend/migrations
	return filepath.Clean(filepath.Join(filepath.Dir(file), "..", "..", "migrations"))
}

// TestConfig retorna configuração padrão para testes HTTP.
func TestConfig() *config.Config {
	return config.ForTests()
}

// AdminPasswordMD5 é o hash MD5 de "admin123" (seed da migration 002).
const AdminPasswordMD5 = "0192023a7bbd73250516f069df18b500"

// TruncateTables limpa dados de teste preservando o admin seed.
func TruncateTables(t *testing.T, db *sql.DB) {
	t.Helper()
	_, err := db.Exec(`
		TRUNCATE TABLE
			comanda_pecas,
			comandas,
			cliente_pontos,
			cliente_saldo,
			clientes,
			pecas,
			pacotes
		RESTART IDENTITY CASCADE
	`)
	if err != nil {
		t.Fatalf("truncar tabelas: %v", err)
	}
}

// MustExec executa SQL ou falha o teste.
func MustExec(t *testing.T, db *sql.DB, query string, args ...any) {
	t.Helper()
	if _, err := db.Exec(query, args...); err != nil {
		t.Fatalf("exec %q: %v", query, err)
	}
}

// FormatURL helper para mensagens de erro.
func FormatURL(url string) string {
	return fmt.Sprintf("(%d chars)", len(url))
}
