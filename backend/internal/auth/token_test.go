package auth

import (
	"testing"
	"time"
)

func TestTokenRoundtrip(t *testing.T) {
	tm := NewTokenManager("super-secret", 1)

	tok, exp, err := tm.Generate(42, "andre", "Andre")
	if err != nil {
		t.Fatalf("erro ao gerar token: %v", err)
	}
	if tok == "" {
		t.Fatal("token vazio")
	}
	if exp.Before(time.Now()) {
		t.Fatal("expiração no passado")
	}

	claims, err := tm.Parse(tok)
	if err != nil {
		t.Fatalf("erro ao parsear token: %v", err)
	}
	if claims.UserID != 42 || claims.Login != "andre" || claims.Nome != "Andre" {
		t.Fatalf("claims inesperados: %+v", claims)
	}
}

func TestTokenInvalidSecret(t *testing.T) {
	tm1 := NewTokenManager("secret-a", 1)
	tm2 := NewTokenManager("secret-b", 1)

	tok, _, err := tm1.Generate(1, "u", "U")
	if err != nil {
		t.Fatal(err)
	}
	if _, err := tm2.Parse(tok); err == nil {
		t.Fatal("token aceito com secret diferente")
	}
}

func TestMD5Compat(t *testing.T) {
	cases := map[string]string{
		"":      "d41d8cd98f00b204e9800998ecf8427e",
		"123":   "202cb962ac59075b964b07152d234b70",
		"admin": "21232f297a57a5a743894a0e4a801fc3",
	}
	for in, want := range cases {
		if got := md5sum(in); got != want {
			t.Errorf("md5(%q) = %s, want %s", in, got, want)
		}
	}
}
