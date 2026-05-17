-- The tables often on login
-- =========================

SELECT*FROM usuario;
SELECT*FROM tipo_categoria;
SELECT*FROM equipes;

SELECT*FROM manutencao;

CREATE TABLE usuario (
	id SERIAL PRIMARY KEY,
	equipe_id INT REFERENCES equipes(id) UNIQUE NOT NULL,
	username VARCHAR(100) UNIQUE,
	senha VARCHAR(255) NOT NULL
);



CREATE TABLE tipo_categoria (
	id SERIAL PRIMARY KEY,
	nome VARCHAR(100)
);


-- ===========================================================================
--                           TABLES CREATED 
-- ===========================================================================



-- ========================================
-- NOTIFICAÇÕES DE TROCADE EQUIPAMENTOS
-- ========================================

CREATE TABLE notificacao (
    id BIGSERIAL PRIMARY KEY,

    estoque_id BIGINT NOT NULL,
    equipe_origem_id BIGINT NOT NULL,
    equipe_destino_id BIGINT NOT NULL,

    status VARCHAR(20) NOT NULL,

    data_criacao TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    data_resposta TIMESTAMP,

    CONSTRAINT fk_notificacao_estoque
        FOREIGN KEY (estoque_id)
        REFERENCES estoque(id),

    CONSTRAINT fk_notificacao_equipe_origem
        FOREIGN KEY (equipe_origem_id)
        REFERENCES equipes(id),

    CONSTRAINT fk_notificacao_equipe_destino
        FOREIGN KEY (equipe_destino_id)
        REFERENCES equipes(id)
);

-- =========================
-- EQUIPES
-- =========================

CREATE TABLE equipes (
    id SERIAL PRIMARY KEY,
    nome VARCHAR(100) NOT NULL,
    tipo_categoria_id INT,

    CONSTRAINT fk_equipes_tipo_categoria
    FOREIGN KEY (tipo_categoria_id)
    REFERENCES tipo_categoria(id)
);


-- =========================
-- EMPRESA
-- =========================
CREATE TABLE empresa (
    id SERIAL PRIMARY KEY,
    nome VARCHAR(50) NOT NULL
);

-- =========================
-- ESTOQUE
-- =========================
CREATE TABLE estoque (
    id SERIAL PRIMARY KEY,
    nome_equipamento VARCHAR(100),
    tag_patrimonio VARCHAR(100),
    valor_unitario NUMERIC(10,24),
    valor_locacao NUMERIC(10,24),
    empresa_id INT,
    
    CONSTRAINT fk_estoque_empresa
    FOREIGN KEY (empresa_id)
    REFERENCES empresa(id)
);

-- =========================
-- CHECKLIST MODELO
-- =========================
CREATE TABLE checklist_modelo (
    id SERIAL PRIMARY KEY,
    nome VARCHAR(100),
    data TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- =========================
-- EMAIL
-- =========================
CREATE TABLE email (
    id SERIAL PRIMARY KEY,
    email VARCHAR(300),
    nome VARCHAR(300),
    setor VARCHAR(300)
);


CREATE TABLE email_remetente (
    id SERIAL PRIMARY KEY,
    email VARCHAR(300),
	senha VARCHAR(255) NOT NULL,
    nome VARCHAR(300),
    setor VARCHAR(300)
);

-- =========================
-- EXECUCAO
-- =========================
CREATE TABLE execucao (
    id SERIAL PRIMARY KEY,
    equipe_id INT,
    estoque_id INT,
    data TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_execucao_estoque
    FOREIGN KEY (estoque_id)
    REFERENCES estoque(id)

    -- equipe_id depende da tabela equipes (não incluída no script)
);

-- =========================
-- RELATORIO
-- =========================
CREATE TABLE relatorio (
    id SERIAL PRIMARY KEY,
    equipe_id INT,
    checklist_execucao_id INT,
    estoque_id INT,
    data TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_relatorio_estoque
    FOREIGN KEY (estoque_id)
    REFERENCES estoque(id)

);


-- =========================
-- SOLICITAÇÃO DE PEÇAS
-- =========================

CREATE TABLE solicitacao_peca (
    id SERIAL PRIMARY KEY,

    equipamento_id INT NOT NULL,
    email_id INT NOT NULL,

    data_solicitacao TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    descricao TEXT,
    
    status VARCHAR(20) DEFAULT 'SOLICITADO'
    CHECK (status IN ('SOLICITADO', 'APROVADO','CANCELADO')),

    CONSTRAINT fk_solicitacao_equipamento
    FOREIGN KEY (equipamento_id)
    REFERENCES estoque(id),

    CONSTRAINT fk_solicitacao_email
    FOREIGN KEY (email_id)
    REFERENCES email(id)
);


-- =========================
-- OFICINA
-- =========================
CREATE TABLE oficina (
    id SERIAL PRIMARY KEY,
    equipamento_id INT,
    data TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    observacao VARCHAR(500),

    CONSTRAINT fk_oficina_equipamento
    FOREIGN KEY (equipamento_id)
    REFERENCES estoque(id)
);

-- =========================
-- MANUTENCAO
-- =========================

CREATE TABLE manutencao (
    id BIGSERIAL PRIMARY KEY,

    equipamento_id BIGINT NOT NULL,
    equipe_ultima_id BIGINT,
    equipe_conclusao_id BIGINT,

    status VARCHAR(20) NOT NULL,

    data_entrada TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    data_saida TIMESTAMP,

    valor_total NUMERIC(12,2),
    valor_unitario_equipamento NUMERIC(12,2),

    descricao TEXT,
    observacao VARCHAR(500),

    foto_nota_fiscal TEXT,

    email_id BIGINT,

    CONSTRAINT fk_manutencao_equipamento
        FOREIGN KEY (equipamento_id)
        REFERENCES estoque(id)
        ON DELETE RESTRICT,

    CONSTRAINT fk_manutencao_equipe_ultima
        FOREIGN KEY (equipe_ultima_id)
        REFERENCES equipe(id),

    CONSTRAINT fk_manutencao_equipe_conclusao
        FOREIGN KEY (equipe_conclusao_id)
        REFERENCES equipe(id),

    CONSTRAINT fk_manutencao_email
        FOREIGN KEY (email_id)
        REFERENCES email(id),

    CONSTRAINT manutencao_status_check CHECK (
        status IN ('PENDENTE', 'CONCLUIDO', 'INUTILIZADO')
    )
);
