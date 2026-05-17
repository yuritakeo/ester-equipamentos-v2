-- Permite excluir equipamentos do estoque mesmo que existam registros de manutencao
-- concluida/inutilizada vinculados. O historico de manutencao e preservado por meio
-- de colunas snapshot (nome e tag) gravadas no momento da abertura da manutencao.
-- O FK equipamento_id passa a ser anulavel; registros concluidos/inutilizados terao
-- o FK zerado quando o equipamento for excluido do estoque.

-- 1. Adiciona colunas de snapshot
ALTER TABLE manutencao
    ADD COLUMN IF NOT EXISTS nome_equipamento_snapshot VARCHAR(255),
    ADD COLUMN IF NOT EXISTS tag_patrimonio_snapshot   VARCHAR(100);

-- 2. Preenche snapshots dos registros existentes (a partir do estoque vinculado)
UPDATE manutencao m
SET
    nome_equipamento_snapshot = COALESCE(m.nome_equipamento_snapshot, e.nome_equipamento),
    tag_patrimonio_snapshot   = COALESCE(m.tag_patrimonio_snapshot,   e.tag_patrimonio)
FROM estoque e
WHERE e.id = m.equipamento_id
  AND (m.nome_equipamento_snapshot IS NULL OR m.tag_patrimonio_snapshot IS NULL);

-- 3. Torna equipamento_id anulavel (CONCLUIDO/INUTILIZADO nao precisam mais do FK)
ALTER TABLE manutencao
    ALTER COLUMN equipamento_id DROP NOT NULL;

-- 4. Ajusta FK para permitir exclusao no estoque mantendo historico em manutencao
ALTER TABLE manutencao
    DROP CONSTRAINT IF EXISTS fk_manutencao_equipamento;

ALTER TABLE manutencao
    DROP CONSTRAINT IF EXISTS manutencao_equipamento_fk;

DO $$
DECLARE
    constraint_name TEXT;
BEGIN
    FOR constraint_name IN
        SELECT con.conname
        FROM pg_constraint con
        JOIN pg_class rel ON rel.oid = con.conrelid
        JOIN pg_namespace nsp ON nsp.oid = rel.relnamespace
        JOIN pg_attribute att ON att.attrelid = rel.oid AND att.attnum = ANY (con.conkey)
        JOIN pg_class frel ON frel.oid = con.confrelid
        WHERE con.contype = 'f'
          AND nsp.nspname = current_schema()
          AND rel.relname = 'manutencao'
          AND frel.relname = 'estoque'
          AND att.attname = 'equipamento_id'
    LOOP
        EXECUTE format('ALTER TABLE manutencao DROP CONSTRAINT IF EXISTS %I', constraint_name);
    END LOOP;
END $$;

ALTER TABLE manutencao
    ADD CONSTRAINT fk_manutencao_equipamento
    FOREIGN KEY (equipamento_id)
    REFERENCES estoque(id)
    ON DELETE SET NULL;
