-- =========================
-- SNAPSHOT DE EQUIPAMENTO NA MANUTENCAO
-- =========================
-- Permite excluir equipamentos mantendo histórico na manutenção

-- =========================
-- 1. ADICIONA COLUNAS SNAPSHOT
-- =========================
ALTER TABLE IF EXISTS manutencao
    ADD COLUMN IF NOT EXISTS nome_equipamento_snapshot VARCHAR(255),
    ADD COLUMN IF NOT EXISTS tag_patrimonio_snapshot   VARCHAR(100);

-- =========================
-- 2. PREENCHE SNAPSHOT DOS REGISTROS EXISTENTES
-- =========================
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.tables WHERE table_name = 'estoque'
    ) THEN
        UPDATE manutencao m
        SET
            nome_equipamento_snapshot = COALESCE(m.nome_equipamento_snapshot, e.nome_equipamento),
            tag_patrimonio_snapshot   = COALESCE(m.tag_patrimonio_snapshot,   e.tag_patrimonio)
        FROM estoque e
        WHERE e.id = m.equipamento_id
          AND (m.nome_equipamento_snapshot IS NULL OR m.tag_patrimonio_snapshot IS NULL);
    END IF;
END $$;

-- =========================
-- 3. TORNA FK OPCIONAL
-- =========================
DO $$
BEGIN
    BEGIN
        ALTER TABLE manutencao
            ALTER COLUMN equipamento_id DROP NOT NULL;
    EXCEPTION
        WHEN OTHERS THEN
            NULL;
    END;
END $$;

-- =========================
-- 4. REMOVE FKs ANTIGAS (SEGURANÇA)
-- =========================
ALTER TABLE manutencao
    DROP CONSTRAINT IF EXISTS fk_manutencao_equipamento;

ALTER TABLE manutencao
    DROP CONSTRAINT IF EXISTS manutencao_equipamento_fk;

-- Remove qualquer FK escondida/legada
DO $$
DECLARE
    constraint_name TEXT;
BEGIN
    FOR constraint_name IN
        SELECT con.conname
        FROM pg_constraint con
        JOIN pg_class rel ON rel.oid = con.conrelid
        JOIN pg_namespace nsp ON nsp.oid = rel.relnamespace
        JOIN pg_class frel ON frel.oid = con.confrelid
        WHERE con.contype = 'f'
          AND nsp.nspname = current_schema()
          AND rel.relname = 'manutencao'
          AND frel.relname = 'estoque'
    LOOP
        EXECUTE format('ALTER TABLE manutencao DROP CONSTRAINT IF EXISTS %I', constraint_name);
    END LOOP;
END $$;

-- =========================
-- 5. RECRIA FK COM ON DELETE SET NULL
-- =========================
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'fk_manutencao_equipamento'
    ) THEN
        ALTER TABLE manutencao
            ADD CONSTRAINT fk_manutencao_equipamento
            FOREIGN KEY (equipamento_id)
            REFERENCES estoque(id)
            ON DELETE SET NULL;
    END IF;
END $$;