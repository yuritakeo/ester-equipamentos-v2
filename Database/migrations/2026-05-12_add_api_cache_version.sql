CREATE TABLE IF NOT EXISTS api_cache_version (
    id BIGINT PRIMARY KEY,
    version BIGINT NOT NULL,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

INSERT INTO api_cache_version (id, version, updated_at)
SELECT 1, 1, CURRENT_TIMESTAMP
WHERE NOT EXISTS (
    SELECT 1 FROM api_cache_version WHERE id = 1
);
