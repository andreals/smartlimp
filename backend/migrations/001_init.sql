-- Smartlimp - schema PostgreSQL
-- Migração inicial: cria todas as tabelas necessárias para o backend Go.
-- Todos os campos seguem o modelo legado (MySQL), adaptado para Postgres.

BEGIN;

-- =====================================================================
-- usuarios
-- =====================================================================
CREATE TABLE IF NOT EXISTS usuarios (
    id              BIGSERIAL PRIMARY KEY,
    id_usuario      BIGINT,                                    -- usuário criador (auto-referência opcional)
    data_cadastro   TIMESTAMP NOT NULL DEFAULT NOW(),
    nome            VARCHAR(120) NOT NULL,
    login           VARCHAR(60)  NOT NULL UNIQUE,
    senha           VARCHAR(64)  NOT NULL,                     -- MD5 hex (32) ou texto puro legado
    status          VARCHAR(10)  NOT NULL DEFAULT 'ativo'
                    CHECK (status IN ('ativo','inativo'))
);

CREATE INDEX IF NOT EXISTS idx_usuarios_login  ON usuarios (login);
CREATE INDEX IF NOT EXISTS idx_usuarios_status ON usuarios (status);

-- =====================================================================
-- pacotes
-- =====================================================================
CREATE TABLE IF NOT EXISTS pacotes (
    id              BIGSERIAL PRIMARY KEY,
    id_usuario      BIGINT REFERENCES usuarios(id) ON DELETE SET NULL,
    data_cadastro   TIMESTAMP NOT NULL DEFAULT NOW(),
    nome            VARCHAR(120) NOT NULL,
    tipo            VARCHAR(20)  NOT NULL                       -- ex.: 'lavar', 'passar', 'lavarpassar'
                    CHECK (tipo IN ('lavar','passar','lavarpassar','tingir')),
    preco           NUMERIC(10,2) NOT NULL DEFAULT 0,
    quantidade      INTEGER       NOT NULL DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_pacotes_tipo ON pacotes (tipo);

-- =====================================================================
-- pecas
-- =====================================================================
CREATE TABLE IF NOT EXISTS pecas (
    id                  BIGSERIAL PRIMARY KEY,
    id_usuario          BIGINT REFERENCES usuarios(id) ON DELETE SET NULL,
    data_cadastro       TIMESTAMP NOT NULL DEFAULT NOW(),
    nome                VARCHAR(120) NOT NULL,
    valor_passar        NUMERIC(10,2) NOT NULL DEFAULT 0,
    valor_lavar         NUMERIC(10,2) NOT NULL DEFAULT 0,
    valor_lavarpassar   NUMERIC(10,2) NOT NULL DEFAULT 0,
    valor_tingir        NUMERIC(10,2) NOT NULL DEFAULT 0,
    entra_pacote        CHAR(1)       NOT NULL DEFAULT 'S'
                        CHECK (entra_pacote IN ('S','N'))
);

CREATE INDEX IF NOT EXISTS idx_pecas_nome ON pecas (nome);

-- =====================================================================
-- clientes
-- =====================================================================
CREATE TABLE IF NOT EXISTS clientes (
    id                       BIGSERIAL PRIMARY KEY,
    id_usuario               BIGINT REFERENCES usuarios(id) ON DELETE SET NULL,
    data_cadastro            TIMESTAMP NOT NULL DEFAULT NOW(),
    nome                     VARCHAR(180) NOT NULL,
    id_pacote                BIGINT REFERENCES pacotes(id) ON DELETE SET NULL,
    telefone                 VARCHAR(40),
    celular                  VARCHAR(40),
    email                    VARCHAR(180),
    tipo                     VARCHAR(20) NOT NULL DEFAULT 'avulso'
                             CHECK (tipo IN ('fixo','avulso')),
    antecipado               CHAR(1)     NOT NULL DEFAULT 'N'
                             CHECK (antecipado IN ('S','N')),
    frequencia_pagamento     VARCHAR(20),                       -- 'mensal' | 'avulso' | etc.
    dia_vencimento           VARCHAR(2),
    cep                      VARCHAR(10),
    numero                   VARCHAR(20),
    logradouro               VARCHAR(180),
    bairro                   VARCHAR(120),
    cidade                   VARCHAR(120),
    uf                       VARCHAR(2),
    status                   VARCHAR(10) NOT NULL DEFAULT 'ativo'
                             CHECK (status IN ('ativo','inativo'))
);

CREATE INDEX IF NOT EXISTS idx_clientes_nome   ON clientes (nome);
CREATE INDEX IF NOT EXISTS idx_clientes_status ON clientes (status);
CREATE INDEX IF NOT EXISTS idx_clientes_pacote ON clientes (id_pacote);

-- =====================================================================
-- comandas
-- =====================================================================
CREATE TABLE IF NOT EXISTS comandas (
    id                  BIGSERIAL PRIMARY KEY,
    id_usuario          BIGINT REFERENCES usuarios(id) ON DELETE SET NULL,
    data_cadastro       TIMESTAMP NOT NULL DEFAULT NOW(),
    numero              BIGINT  NOT NULL DEFAULT 1,             -- contador por cliente
    id_cliente          BIGINT  NOT NULL REFERENCES clientes(id) ON DELETE CASCADE,
    data                DATE    NOT NULL,
    pagamento           CHAR(1) NOT NULL DEFAULT 'N'
                        CHECK (pagamento IN ('S','N')),
    efetuou_pagamento   CHAR(1) NOT NULL DEFAULT 'N'
                        CHECK (efetuou_pagamento IN ('S','N'))
);

CREATE INDEX IF NOT EXISTS idx_comandas_cliente   ON comandas (id_cliente);
CREATE INDEX IF NOT EXISTS idx_comandas_data      ON comandas (data);
CREATE INDEX IF NOT EXISTS idx_comandas_pagamento ON comandas (pagamento);

-- =====================================================================
-- comanda_pecas
-- =====================================================================
CREATE TABLE IF NOT EXISTS comanda_pecas (
    id            BIGSERIAL PRIMARY KEY,
    id_comanda    BIGINT NOT NULL REFERENCES comandas(id) ON DELETE CASCADE,
    id_peca       BIGINT NOT NULL REFERENCES pecas(id)    ON DELETE RESTRICT,
    valor_peca    NUMERIC(10,2) NOT NULL DEFAULT 0,
    quantidade    INTEGER       NOT NULL DEFAULT 0,
    tipo          VARCHAR(20)   NOT NULL
                  CHECK (tipo IN ('lavar','passar','lavarpassar','tingir'))
);

CREATE INDEX IF NOT EXISTS idx_comanda_pecas_comanda ON comanda_pecas (id_comanda);
CREATE INDEX IF NOT EXISTS idx_comanda_pecas_peca    ON comanda_pecas (id_peca);

-- =====================================================================
-- comanda_adicionais (descontos / acréscimos)
-- =====================================================================
CREATE TABLE IF NOT EXISTS comanda_adicionais (
    id           BIGSERIAL PRIMARY KEY,
    id_comanda   BIGINT NOT NULL REFERENCES comandas(id) ON DELETE CASCADE,
    valor        NUMERIC(10,2) NOT NULL DEFAULT 0,
    tipo         VARCHAR(15)  NOT NULL
                 CHECK (tipo IN ('desconto','acrescimo'))
);

CREATE INDEX IF NOT EXISTS idx_comanda_adicionais_comanda ON comanda_adicionais (id_comanda);

-- =====================================================================
-- cliente_pontos (programa de fidelidade)
-- =====================================================================
CREATE TABLE IF NOT EXISTS cliente_pontos (
    id                    BIGSERIAL PRIMARY KEY,
    id_cliente            BIGINT NOT NULL REFERENCES clientes(id) ON DELETE CASCADE,
    id_comanda            BIGINT NOT NULL REFERENCES comandas(id) ON DELETE CASCADE,
    quantidade            BIGINT NOT NULL DEFAULT 0,
    utilizado             CHAR(1) NOT NULL DEFAULT 'N'
                          CHECK (utilizado IN ('S','N')),
    id_comanda_utilizado  BIGINT REFERENCES comandas(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_cliente_pontos_cliente   ON cliente_pontos (id_cliente);
CREATE INDEX IF NOT EXISTS idx_cliente_pontos_utilizado ON cliente_pontos (utilizado);

-- =====================================================================
-- cliente_saldo (saldo gerado por troco/sobra de pagamento)
-- =====================================================================
CREATE TABLE IF NOT EXISTS cliente_saldo (
    id                  BIGSERIAL PRIMARY KEY,
    id_cliente          BIGINT NOT NULL REFERENCES clientes(id) ON DELETE CASCADE,
    valor               NUMERIC(10,2) NOT NULL DEFAULT 0,
    id_comandagerou     BIGINT REFERENCES comandas(id) ON DELETE SET NULL,
    id_comandautilizou  BIGINT REFERENCES comandas(id) ON DELETE SET NULL,
    utilizado           CHAR(1) NOT NULL DEFAULT 'N'
                        CHECK (utilizado IN ('S','N'))
);

CREATE INDEX IF NOT EXISTS idx_cliente_saldo_cliente   ON cliente_saldo (id_cliente);
CREATE INDEX IF NOT EXISTS idx_cliente_saldo_utilizado ON cliente_saldo (utilizado);

COMMIT;
