-- Conferencia de consistencia: equipamento em oficina nao deve manter vinculo com equipe.
-- Use este script antes e depois de rodar o update de correcao.

-- ANTES: quantos registros estao inconsistentes?
SELECT COUNT(*) AS total_inconsistentes_antes
FROM estoque e
WHERE (e.equipe_responsavel_id IS NOT NULL OR e.equipe_id IS NOT NULL)
  AND EXISTS (
    SELECT 1
    FROM oficina o
    WHERE o.equipamento_id = e.id
  );

-- ANTES: quais registros estao inconsistentes?
SELECT e.id,
       e.equipe_responsavel_id,
       e.equipe_id
FROM estoque e
WHERE (e.equipe_responsavel_id IS NOT NULL OR e.equipe_id IS NOT NULL)
  AND EXISTS (
    SELECT 1
    FROM oficina o
    WHERE o.equipamento_id = e.id
  )
ORDER BY e.id;

-- Rode o script de correcao:
-- Backend/sql/2026-03-31-fix-vinculo-equipe-equipamentos-na-oficina.sql

-- DEPOIS: a contagem deve ser 0.
SELECT COUNT(*) AS total_inconsistentes_depois
FROM estoque e
WHERE (e.equipe_responsavel_id IS NOT NULL OR e.equipe_id IS NOT NULL)
  AND EXISTS (
    SELECT 1
    FROM oficina o
    WHERE o.equipamento_id = e.id
  );

-- DEPOIS: nao deve retornar linhas.
SELECT e.id,
       e.equipe_responsavel_id,
       e.equipe_id
FROM estoque e
WHERE (e.equipe_responsavel_id IS NOT NULL OR e.equipe_id IS NOT NULL)
  AND EXISTS (
    SELECT 1
    FROM oficina o
    WHERE o.equipamento_id = e.id
  )
ORDER BY e.id;
