-- =========================
-- NORMALIZA TIPO_CATEGORIA → GERENCIA
-- =========================
-- Consolida valores: GERENCIAL / DEVELOPER / GERENCIA → GERENCIA

DO $$
DECLARE
    canonical_gerencia_id BIGINT;
BEGIN

    -- 1. Busca GERENCIA existente
    SELECT id
    INTO canonical_gerencia_id
    FROM tipo_categoria
    WHERE UPPER(TRIM(nome)) = 'GERENCIA'
    ORDER BY id
    LIMIT 1;

    -- 2. Se não existir, tenta aproveitar GERENCIAL ou DEVELOPER
    IF canonical_gerencia_id IS NULL THEN
        SELECT id
        INTO canonical_gerencia_id
        FROM tipo_categoria
        WHERE UPPER(TRIM(nome)) IN ('GERENCIAL', 'DEVELOPER')
        ORDER BY CASE
            WHEN UPPER(TRIM(nome)) = 'GERENCIAL' THEN 0
            ELSE 1
        END, id
        LIMIT 1;
    END IF;

    -- 3. Se não existir nenhum, cria
    IF canonical_gerencia_id IS NULL THEN
        INSERT INTO tipo_categoria (nome)
        VALUES ('GERENCIA')
        RETURNING id INTO canonical_gerencia_id;
    ELSE
        -- 4. Normaliza nome existente
        UPDATE tipo_categoria
        SET nome = 'GERENCIA'
        WHERE id = canonical_gerencia_id;
    END IF;

    -- 5. Atualiza equipes para apontar para o ID correto
    UPDATE equipes
    SET tipo_categoria_id = canonical_gerencia_id
    WHERE tipo_categoria_id IN (
        SELECT id
        FROM tipo_categoria
        WHERE UPPER(TRIM(nome)) IN ('GERENCIA', 'GERENCIAL', 'DEVELOPER')
    );

    -- 6. Remove duplicados antigos
    DELETE FROM tipo_categoria
    WHERE id <> canonical_gerencia_id
      AND UPPER(TRIM(nome)) IN ('GERENCIA', 'GERENCIAL', 'DEVELOPER');

END $$;