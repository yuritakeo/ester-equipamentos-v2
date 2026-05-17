-- =========================
-- ADICIONA ID_MODELO AO RELATORIOS_PDF
-- =========================

ALTER TABLE IF EXISTS relatorios_pdf
ADD COLUMN IF NOT EXISTS id_modelo INTEGER;