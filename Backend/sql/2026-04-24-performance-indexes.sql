-- Performance indexes for initial dashboard/loading queries

CREATE INDEX IF NOT EXISTS idx_estoque_ativo_nome
ON estoque (ativo, nome_equipamento);

CREATE INDEX IF NOT EXISTS idx_estoque_empresa_ativo_nome
ON estoque (empresa_id, ativo, nome_equipamento);

CREATE INDEX IF NOT EXISTS idx_estoque_tag_patrimonio_ativo_norm
ON estoque (lower(trim(tag_patrimonio)))
WHERE tag_patrimonio IS NOT NULL
  AND trim(tag_patrimonio) <> ''
  AND (ativo IS NULL OR ativo = true);

CREATE INDEX IF NOT EXISTS idx_execucao_data_desc
ON execucao (data DESC);

CREATE INDEX IF NOT EXISTS idx_execucao_estoque_data_desc
ON execucao (estoque_id, data DESC);

CREATE INDEX IF NOT EXISTS idx_execucao_equipe_data_desc
ON execucao (equipe_id, data DESC);

CREATE INDEX IF NOT EXISTS idx_oficina_equipamento_data_desc
ON oficina (equipamento_id, data DESC);

CREATE INDEX IF NOT EXISTS idx_manutencao_equipamento_status
ON manutencao (equipamento_id, status);

CREATE INDEX IF NOT EXISTS idx_manutencao_pai_status
ON manutencao (manutencao_pai_id, status);

CREATE INDEX IF NOT EXISTS idx_manutencao_pai_data_entrada_desc
ON manutencao (manutencao_pai_id, data_entrada DESC);

CREATE INDEX IF NOT EXISTS idx_notificacao_equipe_destino_data_criacao_desc
ON notificacao (equipe_destino_id, data_criacao DESC);

CREATE INDEX IF NOT EXISTS idx_notificacao_equipe_destino_status_data_desc
ON notificacao (equipe_destino_id, status, data_criacao DESC);

CREATE INDEX IF NOT EXISTS idx_notificacao_estoque_status
ON notificacao (estoque_id, status);
