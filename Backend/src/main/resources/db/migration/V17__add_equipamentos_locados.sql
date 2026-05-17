-- =========================
-- TABELA: EQUIPAMENTOS LOCADOS
-- =========================

CREATE TABLE IF NOT EXISTS equipamentos_locados (
    id BIGSERIAL PRIMARY KEY,
    nome_locado VARCHAR(100) NOT NULL,
    contrato VARCHAR(100),
    tag VARCHAR(100),

    empresa_id BIGINT NOT NULL,
    quantidade INT NOT NULL DEFAULT 0,
    valor_locacao NUMERIC(10,2) NOT NULL DEFAULT 0,
    valor_unitario NUMERIC(10,2) NOT NULL DEFAULT 0,

    status VARCHAR(20),
    obra VARCHAR(100),

    equipe_id BIGINT,

    data_locacao VARCHAR(100),
    data_saida VARCHAR(100),

    CONSTRAINT fk_equipe_locado
        FOREIGN KEY (equipe_id)
        REFERENCES equipes(id)
        ON DELETE SET NULL,

    CONSTRAINT fk_empresa_locado
        FOREIGN KEY (empresa_id)
        REFERENCES empresa(id)
        ON DELETE RESTRICT
);

-- =========================
-- TABELA: PECAS
-- =========================

CREATE TABLE IF NOT EXISTS pecas (
    id BIGSERIAL PRIMARY KEY,
    nome VARCHAR(100) NOT NULL,
    quantidade INT NOT NULL DEFAULT 0,
    equipamento_locado_id BIGINT NOT NULL,

    CONSTRAINT fk_peca_equipamento
        FOREIGN KEY (equipamento_locado_id)
        REFERENCES equipamentos_locados(id)
        ON DELETE CASCADE
);