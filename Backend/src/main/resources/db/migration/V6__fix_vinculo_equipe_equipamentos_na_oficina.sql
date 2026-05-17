-- =========================
-- CORRIGE VINCULO DE EQUIPE EM EQUIPAMENTOS NA OFICINA
-- =========================
-- Remove equipe/responsavel de equipamentos que estão na oficina
-- Script idempotente e seguro para múltiplas execuções

DO $$
BEGIN
    IF EXISTS (
        SELECT 1
        FROM information_schema.tables
        WHERE table_name = 'estoque'
    ) AND EXISTS (
        SELECT 1
        FROM information_schema.tables
        WHERE table_name = 'oficina'
    ) THEN

        UPDATE estoque e
        SET equipe_responsavel_id = NULL,
            equipe_id = NULL
        WHERE (e.equipe_responsavel_id IS NOT NULL OR e.equipe_id IS NOT NULL)
          AND EXISTS (
            SELECT 1
            FROM oficina o
            WHERE o.equipamento_id = e.id
          );

    END IF;
END $$;