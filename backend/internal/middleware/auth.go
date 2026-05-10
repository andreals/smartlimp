package middleware

import (
	"context"
	"net/http"
	"strings"

	"github.com/forint/smartlimp-backend/internal/auth"
	"github.com/forint/smartlimp-backend/internal/httpx"
)

type ctxKey string

const userCtxKey ctxKey = "auth.user"

func RequireAuth(tm *auth.TokenManager) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			h := r.Header.Get("Authorization")
			if !strings.HasPrefix(strings.ToLower(h), "bearer ") {
				httpx.Error(w, http.StatusUnauthorized, "token ausente")
				return
			}
			token := strings.TrimSpace(h[len("Bearer "):])
			claims, err := tm.Parse(token)
			if err != nil {
				httpx.Error(w, http.StatusUnauthorized, "token inválido ou expirado")
				return
			}
			ctx := context.WithValue(r.Context(), userCtxKey, claims)
			next.ServeHTTP(w, r.WithContext(ctx))
		})
	}
}

func UserFromContext(ctx context.Context) (*auth.Claims, bool) {
	c, ok := ctx.Value(userCtxKey).(*auth.Claims)
	return c, ok
}
