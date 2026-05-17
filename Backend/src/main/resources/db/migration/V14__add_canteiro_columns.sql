-- =========================
-- ADICIONA CANTEIRO AO ESTOQUE E SNAPSHOT NA MANUTENCAO
-- =========================

-- =========================
-- 1) ESTOQUE: RELACIONAMENTO COM CANTEIROS
-- =========================

-- Garante coluna
ALTER TABLE IF EXISTS estoque
    ADD COLUMN IF NOT EXISTS canteiro_id BIGINT;

-- Garante FK (sem duplicar)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'fk_estoque_canteiro'
    ) THEN
        ALTER TABLE estoque
            ADD CONSTRAINT fk_estoque_canteiro
            FOREIGN KEY (canteiro_id)
            REFERENCES canteiros(id)
            ON DELETE SET NULL;
    END IF;
END $$;

-- =========================
-- 2) MANUTENCAO: SNAPSHOT DE CANTEIRO
-- =========================

-- Garante colunas
ALTER TABLE IF EXISTS manutencao
    ADD COLUMN IF NOT EXISTS canteiro_id_snapshot BIGINT,
    ADD COLUMN IF NOT EXISTS canteiro_nome_snapshot VARCHAR(100);

-- Preenche snapshot com segurança
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.tables WHERE table_name = 'estoque'
    ) AND EXISTS (
        SELECT 1 FROM information_schema.tables WHERE table_name = 'canteiros'
    ) THEN

        UPDATE manutencao m
        SET
            canteiro_id_snapshot = COALESCE(m.canteiro_id_snapshot, e.canteiro_id),
            canteiro_nome_snapshot = COALESCE(m.canteiro_nome_snapshot, c.nome)
        FROM estoque e
        LEFT JOIN canteiros c ON c.id = e.canteiro_id
        WHERE e.id = m.equipamento_id
          AND (m.canteiro_id_snapshot IS NULL OR m.canteiro_nome_snapshot IS NULL);

    END IF;
END $$;