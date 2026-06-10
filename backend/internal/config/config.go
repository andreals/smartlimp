package config

import (
	"log"
	"os"
	"strconv"
	"strings"

	"github.com/joho/godotenv"
)

type Config struct {
	Port        string
	Env         string
	DatabaseURL string
	JWTSecret   string
	JWTTTLHours int
	CORSOrigins []string
}

func Load() *Config {
	if err := godotenv.Load(); err != nil {
		log.Printf("config: nenhum .env encontrado, usando variáveis do ambiente")
	}

	ttl, err := strconv.Atoi(getenv("JWT_TTL_HOURS", "12"))
	if err != nil {
		ttl = 12
	}

	rawOrigins := getenv("CORS_ORIGINS", "http://localhost:5173")
	origins := []string{}
	for _, o := range strings.Split(rawOrigins, ",") {
		if v := strings.TrimSpace(o); v != "" {
			origins = append(origins, v)
		}
	}

	dbURL := os.Getenv("DATABASE_URL")
	if dbURL == "" {
		log.Fatal("config: DATABASE_URL é obrigatório")
	}

	return &Config{
		Port:        getenv("PORT", "8080"),
		Env:         getenv("ENV", "development"),
		DatabaseURL: dbURL,
		JWTSecret:   getenv("JWT_SECRET", "dev-secret-change-me"),
		JWTTTLHours: ttl,
		CORSOrigins: origins,
	}
}

func getenv(k, def string) string {
	v := os.Getenv(k)
	if v == "" {
		return def
	}
	return v
}

// ForTests monta configuração para testes de integração / E2E.
func ForTests() *Config {
	dbURL := os.Getenv("TEST_DATABASE_URL")
	if dbURL == "" {
		dbURL = os.Getenv("DATABASE_URL")
	}
	if dbURL == "" {
		dbURL = "postgresql://smartlimp:test@127.0.0.1:54329/smartlimp_test?sslmode=disable"
	}

	ttl, err := strconv.Atoi(getenv("JWT_TTL_HOURS", "12"))
	if err != nil {
		ttl = 12
	}

	rawOrigins := getenv("CORS_ORIGINS", "http://127.0.0.1:5173")
	origins := []string{}
	for _, o := range strings.Split(rawOrigins, ",") {
		if v := strings.TrimSpace(o); v != "" {
			origins = append(origins, v)
		}
	}

	return &Config{
		Port:        getenv("PORT", "8080"),
		Env:         "test",
		DatabaseURL: dbURL,
		JWTSecret:   getenv("JWT_SECRET", "test-secret"),
		JWTTTLHours: ttl,
		CORSOrigins: origins,
	}
}
