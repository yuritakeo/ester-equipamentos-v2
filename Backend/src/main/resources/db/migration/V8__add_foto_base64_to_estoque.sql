-- =========================
-- ADICIONA CAMPOS DE FOTO BASE64 NO ESTOQUE
-- =========================
-- Permite armazenar uma ou duas imagens diretamente no banco

ALTER TABLE IF EXISTS estoque
ADD COLUMN IF NOT EXISTS foto_base64 TEXT;

ALTER TABLE IF EXISTS estoque
ADD COLUMN IF NOT EXISTS foto_base64_2 TEXT;