BEGIN;

CREATE TABLE IF NOT EXISTS fechamentos (
    id             BIGSERIAL PRIMARY KEY,
    id_cliente     BIGINT NOT NULL REFERENCES clientes(id) ON DELETE CASCADE,
    mes            INTEGER NOT NULL CHECK (mes BETWEEN 1 AND 12),
    ano            INTEGER NOT NULL CHECK (ano >= 2000),
    valor_pago     NUMERIC(10,2) NOT NULL,
    data_registro  TIMESTAMP NOT NULL DEFAULT NOW(),
    UNIQUE (id_cliente, mes, ano)
);

CREATE INDEX IF NOT EXISTS idx_fechamentos_cliente ON fechamentos (id_cliente);

COMMIT;
