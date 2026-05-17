
-- ===========================================================================
--                               INSERTS 
-- ===========================================================================




-- =========================
-- EMPRESA
-- =========================

INSERT INTO empresa (nome) VALUES 
('Empresa B');


-- =========================
-- ESTOQUE
-- =========================


INSERT INTO estoque (
    nome_equipamento,
    tag_patrimonio,
    valor_unitario,
    valor_locacao,
    empresa_id
)
VALUES
(
    'Compressor',
    'TAG-002',
    3000,
    400,
    (SELECT id FROM empresa WHERE nome = 'Empresa B')
);



-- =========================
-- CHECKLIST MODELO
-- =========================

INSERT INTO checklist_modelo (nome) VALUES
('Checklist Segurança');

-- =========================
-- EMAIL
-- =========================

INSERT INTO email (email, nome, setor) VALUES
('maria@empresa.com', 'Maria Souza', 'Operação');

