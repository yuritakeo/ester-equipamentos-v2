-- =========================
-- ADICIONA CONTEUDO DE ARQUIVO AO CHECKLIST_MODELO
-- =========================
-- Permite armazenar o arquivo diretamente no banco (BYTEA),
-- garantindo persistência mesmo após redeploy (ex: Render)

ALTER TABLE IF EXISTS checklist_modelo
ADD COLUMN IF NOT EXISTS arquivo_conteudo BYTEA;