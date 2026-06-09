package clientes

import (
	"database/sql"
	"testing"
)

func TestToOut(t *testing.T) {
	idPacote := sql.NullInt64{Int64: 5, Valid: true}
	c := Cliente{
		ID:                  1,
		Nome:                "Maria Silva",
		Telefone:            sql.NullString{String: "1133334444", Valid: true},
		Celular:             sql.NullString{String: "1199998888", Valid: true},
		Logradouro:          sql.NullString{String: "Rua A", Valid: true},
		Numero:              sql.NullString{String: "100", Valid: true},
		Bairro:              sql.NullString{String: "Centro", Valid: true},
		Cidade:              sql.NullString{String: "São Paulo", Valid: true},
		UF:                  sql.NullString{String: "SP", Valid: true},
		CEP:                 sql.NullString{String: "01310100", Valid: true},
		Email:               sql.NullString{String: "maria@exemplo.com", Valid: true},
		Tipo:                "fixo",
		FrequenciaPagamento: sql.NullString{String: "mensal", Valid: true},
		DiaVencimento:       sql.NullString{String: "10", Valid: true},
		Antecipado:          "N",
		Status:              "ativo",
		IDPacote:            idPacote,
		Pacote:              sql.NullString{String: "Pacote Básico", Valid: true},
		TipoPacote:          sql.NullString{String: "fixo", Valid: true},
		PrecoPacote:         sql.NullFloat64{Float64: 99.9, Valid: true},
		QuantidadePacote:    sql.NullInt64{Int64: 30, Valid: true},
	}

	out := toOut(c)
	if out.ID != 1 || out.Nome != "Maria Silva" {
		t.Fatalf("campos básicos inesperados: %+v", out)
	}
	if out.IDPacote == nil || *out.IDPacote != 5 {
		t.Fatalf("id_pacote inesperado: %+v", out.IDPacote)
	}
	if out.Pacote != "Pacote Básico" || out.PrecoPacote != 99.9 {
		t.Fatalf("dados do pacote inesperados: %+v", out)
	}

	semPacote := toOut(Cliente{ID: 2, Nome: "João", Tipo: "avulso", Antecipado: "S", Status: "ativo"})
	if semPacote.IDPacote != nil {
		t.Fatalf("esperado id_pacote nil, recebido %+v", semPacote.IDPacote)
	}
}

func TestNullablePacoteID(t *testing.T) {
	cases := []struct {
		name string
		in   *int64
		want bool
		val  int64
	}{
		{"nil", nil, false, 0},
		{"zero", ptrInt64(0), false, 0},
		{"negativo", ptrInt64(-1), false, 0},
		{"valido", ptrInt64(3), true, 3},
	}
	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			got := nullablePacoteID(tc.in)
			if got.Valid != tc.want || got.Int64 != tc.val {
				t.Fatalf("nullablePacoteID(%v) = %+v, want valid=%v int64=%d", tc.in, got, tc.want, tc.val)
			}
		})
	}
}

func TestDiaVencimentoArg(t *testing.T) {
	cases := []struct {
		in   string
		want any
	}{
		{"", nil},
		{"  ", nil},
		{"15", 15},
		{" 20 ", 20},
		{"ultimo", "ultimo"},
	}
	for _, tc := range cases {
		got := diaVencimentoArg(tc.in)
		if got != tc.want {
			t.Errorf("diaVencimentoArg(%q) = %#v, want %#v", tc.in, got, tc.want)
		}
	}
}

func ptrInt64(v int64) *int64 { return &v }
