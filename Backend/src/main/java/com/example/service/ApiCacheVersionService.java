package com.example.service;

import java.time.LocalDateTime;
import java.util.concurrent.atomic.AtomicBoolean;
import java.util.concurrent.atomic.AtomicLong;

import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import jakarta.annotation.PostConstruct;
import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
public class ApiCacheVersionService {

    private static final long ROW_ID = 1L;

    private final JdbcTemplate jdbcTemplate;
    private final AtomicBoolean initialized = new AtomicBoolean(false);
    private final AtomicLong currentVersion = new AtomicLong(0);
    private volatile LocalDateTime updatedAt = LocalDateTime.now();

    @PostConstruct
    void init() {
        ensureInitialized();
        VersionSnapshot snapshot = loadSnapshotFromDatabase();
        currentVersion.set(snapshot.version());
        updatedAt = snapshot.updatedAt();
    }

    public VersionSnapshot getCurrentVersion() {
        ensureInitialized();
        return new VersionSnapshot(currentVersion.get(), updatedAt);
    }

    @Transactional
    public VersionSnapshot bumpVersion() {
        ensureInitialized();

        jdbcTemplate.update(
                "UPDATE api_cache_version SET version = version + 1, updated_at = CURRENT_TIMESTAMP WHERE id = ?",
                ROW_ID);

        VersionSnapshot snapshot = loadSnapshotFromDatabase();
        currentVersion.set(snapshot.version());
        updatedAt = snapshot.updatedAt();
        return snapshot;
    }

    private void ensureInitialized() {
        if (initialized.get()) {
            return;
        }

        synchronized (initialized) {
            if (initialized.get()) {
                return;
            }

            jdbcTemplate.execute("""
                    CREATE TABLE IF NOT EXISTS api_cache_version (
                        id BIGINT PRIMARY KEY,
                        version BIGINT NOT NULL,
                        updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
                    )
                    """);

            jdbcTemplate.update("""
                    INSERT INTO api_cache_version (id, version, updated_at)
                    SELECT ?, 1, CURRENT_TIMESTAMP
                    WHERE NOT EXISTS (
                        SELECT 1 FROM api_cache_version WHERE id = ?
                    )
                    """, ROW_ID, ROW_ID);

            initialized.set(true);
        }
    }

    private VersionSnapshot loadSnapshotFromDatabase() {
        return jdbcTemplate.queryForObject(
                "SELECT version, updated_at FROM api_cache_version WHERE id = ?",
                (rs, rowNum) -> new VersionSnapshot(
                        rs.getLong("version"),
                        rs.getTimestamp("updated_at").toLocalDateTime()),
                ROW_ID);
    }

    public record VersionSnapshot(long version, LocalDateTime updatedAt) {
    }
}
