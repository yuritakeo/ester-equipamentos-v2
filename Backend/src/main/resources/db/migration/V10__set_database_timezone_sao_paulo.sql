-- =========================
-- DEFINE TIMEZONE PADRÃO PARA AMERICA/SAO_PAULO
-- =========================
-- Tenta aplicar no nível do banco.
-- Não falha se não tiver permissão (ex: cloud, container gerenciado).

DO $$
BEGIN
    BEGIN
        EXECUTE format(
            'ALTER DATABASE %I SET timezone TO ''America/Sao_Paulo''',
            current_database()
        );
    EXCEPTION
        WHEN insufficient_privilege THEN
            RAISE NOTICE 'Sem permissao para ALTER DATABASE. Ajustar manualmente no servidor.';
        WHEN OTHERS THEN
            RAISE NOTICE 'Falha ao alterar timezone do banco: %', SQLERRM;
    END;
END $$;

-- =========================
-- GARANTE TIMEZONE NA SESSAO ATUAL
-- =========================
DO $$
BEGIN
    BEGIN
        EXECUTE 'SET TIME ZONE ''America/Sao_Paulo''';
    EXCEPTION
        WHEN OTHERS THEN
            RAISE NOTICE 'Falha ao definir timezone da sessao: %', SQLERRM;
    END;
END $$;