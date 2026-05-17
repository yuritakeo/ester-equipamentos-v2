-- Ajusta registros historicos criados antes da correcao global de timezone.
--
-- Contexto:
-- - O backend passou a usar America/Sao_Paulo como timezone padrao.
-- - Este script corrige dados antigos com defasagem de 3 horas.
--
-- Regra aplicada:
-- - Soma +3 horas apenas para registros com data <= 2026-04-04 23:59:59.
--
-- IMPORTANTE:
-- - Execute em janela de manutencao.
-- - Faça backup antes de aplicar em producao.

DO $$
DECLARE
    cutoff TIMESTAMP := TIMESTAMP '2026-04-04 23:59:59';
BEGIN
    IF EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_name = 'manutencao' AND column_name = 'data_entrada'
    ) THEN
        UPDATE manutencao
        SET data_entrada = data_entrada + INTERVAL '3 hours'
        WHERE data_entrada IS NOT NULL
          AND data_entrada <= cutoff;
    END IF;

    IF EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_name = 'manutencao' AND column_name = 'data_saida'
    ) THEN
        UPDATE manutencao
        SET data_saida = data_saida + INTERVAL '3 hours'
        WHERE data_saida IS NOT NULL
          AND data_saida <= cutoff;
    END IF;

    IF EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_name = 'oficina' AND column_name = 'data'
    ) THEN
        UPDATE oficina
        SET data = data + INTERVAL '3 hours'
        WHERE data IS NOT NULL
          AND data <= cutoff;
    END IF;

    IF EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_name = 'execucao' AND column_name = 'data'
    ) THEN
        UPDATE execucao
        SET data = data + INTERVAL '3 hours'
        WHERE data IS NOT NULL
          AND data <= cutoff;
    END IF;

    IF EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_name = 'relatorio' AND column_name = 'data'
    ) THEN
        UPDATE relatorio
        SET data = data + INTERVAL '3 hours'
        WHERE data IS NOT NULL
          AND data <= cutoff;
    END IF;

    IF EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_name = 'notificacao' AND column_name = 'data_criacao'
    ) THEN
        UPDATE notificacao
        SET data_criacao = data_criacao + INTERVAL '3 hours'
        WHERE data_criacao IS NOT NULL
          AND data_criacao <= cutoff;
    END IF;

    IF EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_name = 'notificacao' AND column_name = 'data_resposta'
    ) THEN
        UPDATE notificacao
        SET data_resposta = data_resposta + INTERVAL '3 hours'
        WHERE data_resposta IS NOT NULL
          AND data_resposta <= cutoff;
    END IF;

    IF EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_name = 'solicitacao_peca' AND column_name = 'data_solicitacao'
    ) THEN
        UPDATE solicitacao_peca
        SET data_solicitacao = data_solicitacao + INTERVAL '3 hours'
        WHERE data_solicitacao IS NOT NULL
          AND data_solicitacao <= cutoff;
    END IF;
END $$;
