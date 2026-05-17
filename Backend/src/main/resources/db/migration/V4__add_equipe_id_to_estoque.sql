-- =========================
-- ADICIONA EQUIPE_ID AO ESTOQUE
-- =========================

ALTER TABLE estoque 
ADD COLUMN IF NOT EXISTS equipe_id BIGINT;

-- Remove constraint antiga se existir (segurança)
ALTER TABLE estoque
DROP CONSTRAINT IF EXISTS fk_estoque_equipe;

-- ✅ Corrigido: equipes
ALTER TABLE estoque
ADD CONSTRAINT fk_estoque_equipe
FOREIGN KEY (equipe_id)
REFERENCES equipes(id);

-- Opcional: garante estado limpo
UPDATE estoque SET equipe_id = NULL;
