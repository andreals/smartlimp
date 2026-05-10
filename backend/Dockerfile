# Build API binary (Railway injects PORT at runtime; config reads DATABASE_URL, etc.)
FROM golang:1.25-alpine AS build
WORKDIR /src

COPY go.mod go.sum ./
RUN go mod download

COPY . .
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
