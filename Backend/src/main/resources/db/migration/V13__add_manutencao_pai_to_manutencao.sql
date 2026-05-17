-- =========================
-- ADICIONA RELACAO MANUTENCAO PAI
-- =========================
-- Permite encadear manutenções (hierarquia)
-- Ex: manutenção principal → sub-manutenções

-- 1. Adiciona coluna (seguro)
ALTER TABLE IF EXISTS manutencao
ADD COLUMN IF NOT EXISTS manutencao_pai_id BIGINT;

-- 2. Remove FK antiga (se existir)
ALTER TABLE manutencao
DROP CONSTRAINT IF EXISTS fk_manutencao_pai;

-- 3. Cria FK com segurança
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'fk_manutencao_pai'
    ) THEN
        ALTER TABLE manutencao
        ADD CONSTRAINT fk_manutencao_pai
        FOREIGN KEY (manutencao_pai_id)
        REFERENCES manutencao(id)
        ON DELETE CASCADE;
    END IF;
END $$;