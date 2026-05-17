-- Adequa a tabela manutencao para o novo fluxo historico
-- Status permitidos: PENDENTE, CONCLUIDO, INUTILIZADO

ALTER TABLE manutencao
    ADD COLUMN IF NOT EXISTS equipe_ultima_id BIGINT,
    ADD COLUMN IF NOT EXISTS equipe_conclusao_id BIGINT,
    ADD COLUMN IF NOT EXISTS data_entrada TIMESTAMP,
    ADD COLUMN IF NOT EXISTS data_saida TIMESTAMP,
    ADD COLUMN IF NOT EXISTS valor_total NUMERIC(12, 2),
    ADD COLUMN IF NOT EXISTS valor_unitario_equipamento NUMERIC(12, 2),
    ADD COLUMN IF NOT EXISTS descricao TEXT,
    ADD COLUMN IF NOT EXISTS foto_nota_fiscal TEXT;

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

UPDATE manutencao
SET data_entrada = COALESCE(data_entrada, CURRENT_TIMESTAMP)
WHERE data_entrada IS NULL;

ALTER TABLE manutencao
    ALTER COLUMN data_entrada SET DEFAULT CURRENT_TIMESTAMP,
    ALTER COLUMN data_entrada SET NOT NULL;

UPDATE manutencao
SET status = 'PENDENTE'
WHERE status = 'SOLICITACAO';

UPDATE manutencao m
SET valor_unitario_equipamento = e.valor_unitario
FROM estoque e
WHERE e.id = m.equipamento_id
  AND m.valor_unitario_equipamento IS NULL;

UPDATE manutencao m
SET equipe_ultima_id = COALESCE(e.equipe_responsavel_id, e.equipe_id)
FROM estoque e
WHERE e.id = m.equipamento_id
  AND m.equipe_ultima_id IS NULL;

ALTER TABLE manutencao DROP CONSTRAINT IF EXISTS manutencao_status_check;
ALTER TABLE manutencao
    ADD CONSTRAINT manutencao_status_check
    CHECK (status IN ('PENDENTE', 'CONCLUIDO', 'INUTILIZADO'));

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

