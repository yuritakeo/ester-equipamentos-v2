-- =========================
-- ADEQUA A TABELA MANUTENCAO PARA NOVO FLUXO HISTORICO
-- =========================
-- Status permitidos: PENDENTE, CONCLUIDO, INUTILIZADO

-- 1. Adiciona colunas (seguro)
ALTER TABLE IF EXISTS manutencao
    ADD COLUMN IF NOT EXISTS equipe_ultima_id BIGINT,
    ADD COLUMN IF NOT EXISTS equipe_conclusao_id BIGINT,
    ADD COLUMN IF NOT EXISTS data_entrada TIMESTAMP,
    ADD COLUMN IF NOT EXISTS data_saida TIMESTAMP,
    ADD COLUMN IF NOT EXISTS valor_total NUMERIC(12, 2),
    ADD COLUMN IF NOT EXISTS valor_unitario_equipamento NUMERIC(12, 2),
    ADD COLUMN IF NOT EXISTS descricao TEXT,
    ADD COLUMN IF NOT EXISTS foto_nota_fiscal TEXT;

-- 2. Migra coluna antiga "data" -> "data_entrada"
DO $$
BEGIN
    IF EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_name = 'manutencao'
          AND column_name = 'data'
    ) THEN
        UPDATE manutencao
        SET data_entrada = COALESCE(data_entrada, data, CURRENT_TIMESTAMP)
        WHERE data_entrada IS NULL;

        ALTER TABLE manutencao DROP COLUMN data;
    END IF;
END $$;

-- 3. Garante valores mínimos
UPDATE manutencao
SET data_entrada = COALESCE(data_entrada, CURRENT_TIMESTAMP)
WHERE data_entrada IS NULL;

-- 4. Define padrão seguro
ALTER TABLE IF EXISTS manutencao
    ALTER COLUMN data_entrada SET DEFAULT CURRENT_TIMESTAMP;

-- Evita erro se já for NOT NULL
DO $$
BEGIN
    BEGIN
        ALTER TABLE manutencao
        ALTER COLUMN data_entrada SET NOT NULL;
    EXCEPTION
        WHEN OTHERS THEN
            NULL;
    END;
END $$;

-- 5. Corrige status antigo
UPDATE manutencao
SET status = 'PENDENTE'
WHERE status = 'SOLICITACAO';

-- 6. Preenche valores a partir do estoque
UPDATE manutencao m
SET valor_unitario_equipamento = e.valor_unitario
FROM estoque e
WHERE e.id = m.equipamento_id
  AND m.valor_unitario_equipamento IS NULL;

-- 7. Preenche equipe automaticamente
UPDATE manutencao m
SET equipe_ultima_id = COALESCE(e.equipe_responsavel_id, e.equipe_id)
FROM estoque e
WHERE e.id = m.equipamento_id
  AND m.equipe_ultima_id IS NULL;

-- 8. Corrige constraint de status
ALTER TABLE manutencao DROP CONSTRAINT IF EXISTS manutencao_status_check;

ALTER TABLE manutencao
    ADD CONSTRAINT manutencao_status_check
    CHECK (status IN ('PENDENTE', 'CONCLUIDO', 'INUTILIZADO'));

-- 9. FK equipe_ultima_id
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'fk_manutencao_equipe_ultima'
    ) THEN
        ALTER TABLE manutencao
            ADD CONSTRAINT fk_manutencao_equipe_ultima
            FOREIGN KEY (equipe_ultima_id)
            REFERENCES equipes(id);
    END IF;
END $$;

-- 10. FK equipe_conclusao_id
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'fk_manutencao_equipe_conclusao'
    ) THEN
        ALTER TABLE manutencao
            ADD CONSTRAINT fk_manutencao_equipe_conclusao
            FOREIGN KEY (equipe_conclusao_id)
            REFERENCES equipes(id);
    END IF;
END $$;