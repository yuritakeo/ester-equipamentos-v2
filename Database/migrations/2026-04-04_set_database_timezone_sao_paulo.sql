-- Define timezone padrao do banco para Sao Paulo (BRT/BRT-equivalente).
-- O script tenta aplicar no nivel de database e segue sem falhar se nao houver permissao.

DO $$
BEGIN
    BEGIN
        EXECUTE format(
            'ALTER DATABASE %I SET timezone TO ''America/Sao_Paulo''',
            current_database()
        );
    EXCEPTION
        WHEN insufficient_privilege THEN
            RAISE NOTICE 'Sem permissao para ALTER DATABASE. Ajuste manualmente no servidor.';
    END;
END $$;

-- Garante a sessao atual em Sao Paulo.
SET TIME ZONE 'America/Sao_Paulo';
