# Build a partir da raiz do monorepo (Railway sem "Root Directory" = backend).
# Contexto: repositório inteiro; só copia backend/.
FROM golang:1.25-alpine AS build
WORKDIR /src

COPY backend/go.mod backend/go.sum ./
RUN go mod download

COPY backend/ .
RUN CGO_ENABLED=0 GOOS=linux GOARCH=amd64 go build -trimpath -ldflags="-s -w" -o /out/api ./cmd/api

FROM alpine:3.21
RUN apk --no-cache add ca-certificates tzdata
ENV TZ=America/Sao_Paulo
WORKDIR /app

COPY --from=build /out/api ./api
RUN chmod +x ./api

USER nobody
EXPOSE 8080
CMD ["./api"]
