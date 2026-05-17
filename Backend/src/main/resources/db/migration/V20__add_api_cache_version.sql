-- =========================
-- CONTROLE DE VERSAO DE CACHE DA API
-- =========================
-- Usado para invalidar cache no frontend / clientes

-- 1. Cria tabela (seguro)
CREATE TABLE IF NOT EXISTS api_cache_version (
    id BIGINT PRIMARY KEY,
    version BIGINT NOT NULL,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 2. Garante registro inicial
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM api_cache_version 
        WHERE id = 1
    ) THEN
        INSERT INTO api_cache_version (id, version, updated_at)
        VALUES (1, 1, CURRENT_TIMESTAMP);
    END IF;
END $$;