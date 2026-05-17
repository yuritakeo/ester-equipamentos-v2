-- =========================
-- ADICIONA CAMPOS DE FOTO EM EQUIPAMENTOS LOCADOS
-- =========================

ALTER TABLE IF EXISTS equipamentosLocados
ADD COLUMN IF NOT EXISTS foto_url TEXT;

ALTER TABLE IF EXISTS equipamentosLocados
ADD COLUMN IF NOT EXISTS foto_url_2 TEXT;