-- Persistencia de arquivo de modelo no banco para sobreviver a redeploy (ex.: Render).
ALTER TABLE checklist_modelo
ADD COLUMN IF NOT EXISTS arquivo_conteudo BYTEA;
