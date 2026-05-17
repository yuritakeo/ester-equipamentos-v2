-- =========================
-- TIPO CATEGORIA
-- =========================
CREATE TABLE tipo_categoria (
    id SERIAL PRIMARY KEY,
    nome VARCHAR(100)
);

-- =========================
-- CANTEIROS
-- =========================
CREATE TABLE canteiros (
    id SERIAL PRIMARY KEY,
    nome VARCHAR(100) NOT NULL
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
-- USUARIO
-- =========================
CREATE TABLE usuario (
    id SERIAL PRIMARY KEY,
    equipe_id INT UNIQUE NOT NULL,
    username VARCHAR(100) UNIQUE,
    senha VARCHAR(255) NOT NULL,
    ativo BOOLEAN DEFAULT TRUE,

    CONSTRAINT fk_usuario_equipe
    FOREIGN KEY (equipe_id)
    REFERENCES equipes(id)
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
    valor_unitario NUMERIC(10,2),
    valor_locacao NUMERIC(10,2),
    empresa_id INT,

    ativo BOOLEAN DEFAULT TRUE,
    equipe_id BIGINT,
    equipe_responsavel_id BIGINT,
    canteiro_id BIGINT,

    CONSTRAINT fk_estoque_empresa
        FOREIGN KEY (empresa_id)
        REFERENCES empresa(id),

    CONSTRAINT fk_estoque_equipe
        FOREIGN KEY (equipe_id)
        REFERENCES equipes(id),

    CONSTRAINT fk_estoque_canteiro
        FOREIGN KEY (canteiro_id)
        REFERENCES canteiros(id)
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

    FOREIGN KEY (estoque_id) REFERENCES estoque(id),
    FOREIGN KEY (equipe_id) REFERENCES equipes(id)
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

    FOREIGN KEY (estoque_id) REFERENCES estoque(id)
);

-- =========================
-- RELATORIOS PDF
-- =========================
CREATE TABLE relatorios_pdf (
    id SERIAL PRIMARY KEY,
    nome_arquivo VARCHAR(255),
    conteudo BYTEA,
    data TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- =========================
-- SOLICITACAO PECA
-- =========================
CREATE TABLE solicitacao_peca (
    id SERIAL PRIMARY KEY,
    equipamento_id INT NOT NULL,
    email_id INT NOT NULL,
    data_solicitacao TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    descricao TEXT,

    status VARCHAR(20) DEFAULT 'SOLICITADO'
    CHECK (status IN ('SOLICITADO','APROVADO','CANCELADO')),

    FOREIGN KEY (equipamento_id) REFERENCES estoque(id),
    FOREIGN KEY (email_id) REFERENCES email(id)
);

-- =========================
-- OFICINA
-- =========================
CREATE TABLE oficina (
    id SERIAL PRIMARY KEY,
    equipamento_id INT,
    data TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    observacao VARCHAR(500),

    FOREIGN KEY (equipamento_id) REFERENCES estoque(id)
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

    data_entrada TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    data_saida TIMESTAMP,

    valor_total NUMERIC(12,2),
    valor_unitario_equipamento NUMERIC(12,2),

    descricao TEXT,
    observacao VARCHAR(500),
    foto_nota_fiscal TEXT,
    email_id BIGINT,

    FOREIGN KEY (equipamento_id) REFERENCES estoque(id),
    FOREIGN KEY (equipe_ultima_id) REFERENCES equipes(id),
    FOREIGN KEY (equipe_conclusao_id) REFERENCES equipes(id),
    FOREIGN KEY (email_id) REFERENCES email(id)
);
