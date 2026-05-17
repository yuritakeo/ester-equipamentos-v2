DO $$
DECLARE
    canonical_gerencia_id BIGINT;
BEGIN
    SELECT id
    INTO canonical_gerencia_id
    FROM tipo_categoria
    WHERE UPPER(TRIM(nome)) = 'GERENCIA'
    ORDER BY id
    LIMIT 1;

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

    IF canonical_gerencia_id IS NULL THEN
        INSERT INTO tipo_categoria (nome)
        VALUES ('GERENCIA')
        RETURNING id INTO canonical_gerencia_id;
    ELSE
        UPDATE tipo_categoria
        SET nome = 'GERENCIA'
        WHERE id = canonical_gerencia_id;
    END IF;

    UPDATE equipes
    SET tipo_categoria_id = canonical_gerencia_id
    WHERE tipo_categoria_id IN (
        SELECT id
        FROM tipo_categoria
        WHERE UPPER(TRIM(nome)) IN ('GERENCIA', 'GERENCIAL', 'DEVELOPER')
    );

    DELETE FROM tipo_categoria
    WHERE id <> canonical_gerencia_id
      AND UPPER(TRIM(nome)) IN ('GERENCIA', 'GERENCIAL', 'DEVELOPER');
END $$;
