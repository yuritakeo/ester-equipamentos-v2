-- ==================================================
--         ALTERAÇÕES NA TABELA DE EMAILS
-- ==================================================

ALTER TABLE email
ADD COLUMN IF NOT EXISTS tipo VARCHAR(30) DEFAULT 'DESTINATARIO';

ALTER TABLE equipes
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



-- ==================================================
--         ALTERAÇÕES NA TABELA DE CHECKLIST
-- ==================================================




ALTER TABLE checklist_modelo
ADD COLUMN IF NOT EXISTS arquivo_nome VARCHAR(255);

ALTER TABLE checklist_modelo
ADD COLUMN IF NOT EXISTS arquivo_original_nome VARCHAR(255);

ALTER TABLE checklist_modelo
ADD COLUMN IF NOT EXISTS arquivo_caminho TEXT;

CREATE TABLE IF NOT EXISTS checklist_modelo_equipamento (
    checklist_modelo_id BIGINT NOT NULL,
    equipamento_id BIGINT NOT NULL,
    PRIMARY KEY (checklist_modelo_id, equipamento_id),
    CONSTRAINT fk_checklist_modelo_equipamento_modelo
        FOREIGN KEY (checklist_modelo_id) REFERENCES checklist_modelo(id) ON DELETE CASCADE,
    CONSTRAINT fk_checklist_modelo_equipamento_estoque
        FOREIGN KEY (equipamento_id) REFERENCES estoque(id) ON DELETE CASCADE
);


-- ==================================================
--                 ESTOQUE
-- ==================================================



ALTER TABLE estoque
ADD COLUMN IF NOT EXISTS equipe_responsavel_id BIGINT;

ALTER TABLE estoque
DROP CONSTRAINT IF EXISTS fk_estoque_equipe_responsavel;

ALTER TABLE estoque
ADD CONSTRAINT fk_estoque_equipe_responsavel
FOREIGN KEY (equipe_responsavel_id) REFERENCES equipes(id);













-- ==================================================
--                 CHECKLIST EXECUÇÃO
-- ==================================================



ALTER TABLE execucao
ADD COLUMN IF NOT EXISTS checklist_modelo_id BIGINT;

ALTER TABLE execucao
ADD COLUMN IF NOT EXISTS respostas_json TEXT;

ALTER TABLE execucao
DROP CONSTRAINT IF EXISTS fk_execucao_checklist_modelo;

ALTER TABLE execucao
ADD CONSTRAINT fk_execucao_checklist_modelo
FOREIGN KEY (checklist_modelo_id) REFERENCES checklist_modelo(id);




