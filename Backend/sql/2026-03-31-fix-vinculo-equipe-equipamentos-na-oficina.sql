-- Corrige dados legados: equipamento em oficina nao deve manter vinculo com equipe.
-- Script idempotente: pode ser executado mais de uma vez com seguranca.

UPDATE estoque e
SET equipe_responsavel_id = NULL,
    equipe_id = NULL
WHERE (e.equipe_responsavel_id IS NOT NULL OR e.equipe_id IS NOT NULL)
  AND EXISTS (
    SELECT 1
    FROM oficina o
    WHERE o.equipamento_id = e.id
  );
