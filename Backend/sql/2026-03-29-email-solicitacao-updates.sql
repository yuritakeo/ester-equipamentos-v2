ALTER TABLE email
ADD COLUMN IF NOT EXISTS tipo VARCHAR(30) DEFAULT 'DESTINATARIO';

ALTER TABLE equipe
ADD COLUMN IF NOT EXISTS ativo BOOLEAN DEFAULT TRUE;

ALTER TABLE usuario
ADD COLUMN IF NOT EXISTS ativo BOOLEAN DEFAULT TRUE;

CREATE TABLE IF NOT EXISTS email_remetente (
    id SERIAL PRIMARY KEY,
    email VARCHAR(300),
    senha VARCHAR(255) NOT NULL,
    nome VARCHAR(300),
    setor VARCHAR(300)
);

CREATE TABLE IF NOT EXISTS checklist_modelo_equipamento (
    checklist_modelo_id BIGINT NOT NULL,
    equipamento_id BIGINT NOT NULL,
    PRIMARY KEY (checklist_modelo_id, equipamento_id),
    CONSTRAINT fk_checklist_modelo_equipamento_modelo
        FOREIGN KEY (checklist_modelo_id) REFERENCES checklist_modelo(id) ON DELETE CASCADE,
    CONSTRAINT fk_checklist_modelo_equipamento_estoque
        FOREIGN KEY (equipamento_id) REFERENCES estoque(id) ON DELETE CASCADE
);

ALTER TABLE checklist_modelo
ADD COLUMN IF NOT EXISTS arquivo_nome VARCHAR(255);

ALTER TABLE checklist_modelo
ADD COLUMN IF NOT EXISTS arquivo_original_nome VARCHAR(255);

ALTER TABLE checklist_modelo
ADD COLUMN IF NOT EXISTS arquivo_caminho TEXT;

ALTER TABLE solicitacao_peca
ADD COLUMN IF NOT EXISTS email_remetente_id BIGINT;

ALTER TABLE solicitacao_peca
ADD COLUMN IF NOT EXISTS assunto VARCHAR(255);

ALTER TABLE solicitacao_peca
ADD COLUMN IF NOT EXISTS anexo_nome VARCHAR(255);

ALTER TABLE solicitacao_peca
ADD COLUMN IF NOT EXISTS anexo_tipo VARCHAR(100);

ALTER TABLE solicitacao_peca
ADD COLUMN IF NOT EXISTS anexo_base64 TEXT;

ALTER TABLE solicitacao_peca
DROP CONSTRAINT IF EXISTS fk_solicitacao_peca_email_remetente;

ALTER TABLE solicitacao_peca
ADD CONSTRAINT fk_solicitacao_peca_email_remetente
FOREIGN KEY (email_remetente_id) REFERENCES email_remetente(id);
