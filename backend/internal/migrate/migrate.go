package migrate

import (
	"fmt"
	"os"
	"path/filepath"
	"sort"
)

// Dir retorna o diretório de migrations (MIGRATIONS_DIR ou "migrations").
func Dir() string {
	if v := os.Getenv("MIGRATIONS_DIR"); v != "" {
		return v
	}
	return "migrations"
}

// Apply executa todos os arquivos *.sql do diretório informado em ordem lexicográfica.
func Apply(exec func(string) error, dir string) error {
	files, err := filepath.Glob(filepath.Join(dir, "*.sql"))
	if err != nil {
		return fmt.Errorf("listar migrations: %w", err)
	}
	sort.Strings(files)
	for _, f := range files {
		b, err := os.ReadFile(f)
		if err != nil {
			return fmt.Errorf("ler %s: %w", f, err)
		}
		if err := exec(string(b)); err != nil {
			return fmt.Errorf("aplicar %s: %w", filepath.Base(f), err)
		}
	}
	return nil
}
