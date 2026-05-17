ALTER TABLE manutencao
ADD COLUMN IF NOT EXISTS manutencao_pai_id BIGINT;

ALTER TABLE manutencao
DROP CONSTRAINT IF EXISTS fk_manutencao_pai;

ALTER TABLE manutencao
ADD CONSTRAINT fk_manutencao_pai
FOREIGN KEY (manutencao_pai_id)
REFERENCES manutencao(id)
ON DELETE CASCADE;
