CREATE TABLE IF NOT EXISTS direcionamento_historico (
    id BIGSERIAL PRIMARY KEY,
    equipamento_id_snapshot BIGINT NOT NULL,
    nome_equipamento_snapshot VARCHAR(255) NOT NULL,
    tag_patrimonio_snapshot VARCHAR(100),
    empresa_nome_snapshot VARCHAR(255),
    valor_unitario_snapshot NUMERIC(19, 2),
    acao VARCHAR(60) NOT NULL,
    origem_tipo VARCHAR(40) NOT NULL,
    origem_referencia_id BIGINT,
    origem_nome_snapshot VARCHAR(255) NOT NULL,
    origem_categoria_snapshot VARCHAR(100),
    destino_tipo VARCHAR(40) NOT NULL,
    destino_referencia_id BIGINT,
    destino_nome_snapshot VARCHAR(255) NOT NULL,
    destino_categoria_snapshot VARCHAR(100),
    observacao VARCHAR(500),
    data_evento TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_direcionamento_historico_equipamento_data
ON direcionamento_historico (equipamento_id_snapshot, data_evento DESC);
