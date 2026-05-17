-- =========================
-- ADICIONA CAMPOS DE INDENIZACAO EM EQUIPAMENTOS LOCADOS
-- =========================
-- Permite registrar valores e descrição de indenização (avarias, perdas, etc.)

ALTER TABLE IF EXISTS equipamentosLocados
ADD COLUMN IF NOT EXISTS indenizacao_valor NUMERIC(10, 2);

ALTER TABLE IF EXISTS equipamentosLocados
ADD COLUMN IF NOT EXISTS indenizacao_descricao TEXT;