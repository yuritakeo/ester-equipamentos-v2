//// Backend/src/main/java/com/example/service/ApiCacheVersionService.java
//
//package com.example.service;
//
//// =========================
//// IMPORTS
//// =========================
//import java.time.LocalDateTime;
//import java.util.concurrent.atomic.AtomicBoolean;
//import java.util.concurrent.atomic.AtomicLong;
//
//import org.springframework.jdbc.core.JdbcTemplate;
//import org.springframework.stereotype.Service;
//import org.springframework.transaction.annotation.Transactional;
//
//import jakarta.annotation.PostConstruct;
//import lombok.RequiredArgsConstructor;
//
//// =========================
//// SERVICE PRINCIPAL
//// =========================
//// Responsável por controlar versão de cache da API
//// Usado para invalidar cache no frontend / clientes
//@Service
//@RequiredArgsConstructor
//public class ApiCacheVersionService {
//
//    // =========================
//    // CONSTANTES
//    // =========================
//    // ID fixo da linha (sempre usamos apenas uma linha no banco)
//    private static final long ROW_ID = 1L;
//
//    // =========================
//    // DEPENDÊNCIAS
//    // =========================
//    // JdbcTemplate para acesso direto ao banco (sem JPA)
//    private final JdbcTemplate jdbcTemplate;
//
//    // =========================
//    // CONTROLE DE ESTADO
//    // =========================
//    // Flag de inicialização (evita recriar a tabela várias vezes)
//    private final AtomicBoolean initialized = new AtomicBoolean(false);
//
//    // Versão atual em memória (cache interno)
//    private final AtomicLong currentVersion = new AtomicLong(0);
//
//    // Timestamp da última atualização
//    private volatile LocalDateTime updatedAt = LocalDateTime.now();
//
//    // =========================
//    // INIT (executado ao subir aplicação)
//    // =========================
//    @PostConstruct
//    void init() {
//        // Garante que estrutura do banco existe
//        ensureInitialized();
//
//        // Carrega dados atuais do banco
//        VersionSnapshot snapshot = loadSnapshotFromDatabase();
//
//        // Atualiza estado em memória
//        currentVersion.set(snapshot.version());
//        updatedAt = snapshot.updatedAt();
//    }
//
//    // =========================
//    // GET VERSION
//    // =========================
//    // Retorna versão atual do cache
//    public VersionSnapshot getCurrentVersion() {
//        ensureInitialized();
//        return new VersionSnapshot(currentVersion.get(), updatedAt);
//    }
//
//    // =========================
//    // INCREMENTA VERSÃO
//    // =========================
//    // Usado para invalidar cache
//    @Transactional
//    public VersionSnapshot bumpVersion() {
//        ensureInitialized();
//
//        // Incrementa versão direto no banco
//        jdbcTemplate.update(
//                "UPDATE api_cache_version SET version = version + 1, updated_at = CURRENT_TIMESTAMP WHERE id = ?",
//                ROW_ID);
//
//        // Recarrega valor atualizado
//        VersionSnapshot snapshot = loadSnapshotFromDatabase();
//
//        // Atualiza cache interno
//        currentVersion.set(snapshot.version());
//        updatedAt = snapshot.updatedAt();
//
//        return snapshot;
//    }
//
//    // =========================
//    // INICIALIZAÇÃO LAZY
//    // =========================
//    // Cria tabela e registro inicial se não existirem
//    private void ensureInitialized() {
//
//        // Já inicializado → sai
//        if (initialized.get()) {
//            return;
//        }
//
//        synchronized (initialized) {
//
//            // Double check (thread-safe)
//            if (initialized.get()) {
//                return;
//            }
//
//            // =========================
//            // CRIA TABELA (SE NÃO EXISTIR)
//            // =========================
//            jdbcTemplate.execute("""
//                    CREATE TABLE IF NOT EXISTS api_cache_version (
//                        id BIGINT PRIMARY KEY,
//                        version BIGINT NOT NULL,
//                        updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
//                    )
//                    """);
//
//            // =========================
//            // INSERE REGISTRO INICIAL
//            // =========================
//            jdbcTemplate.update("""
//                    INSERT INTO api_cache_version (id, version, updated_at)
//                    SELECT ?, 1, CURRENT_TIMESTAMP
//                    WHERE NOT EXISTS (
//                        SELECT 1 FROM api_cache_version WHERE id = ?
//                    )
//                    """, ROW_ID, ROW_ID);
//
//            // Marca como inicializado
//            initialized.set(true);
//        }
//    }
//
//    // =========================
//    // CONSULTA SNAPSHOT
//    // =========================
//    // Busca versão e timestamp do banco
//    private VersionSnapshot loadSnapshotFromDatabase() {
//        return jdbcTemplate.queryForObject(
//                "SELECT version, updated_at FROM api_cache_version WHERE id = ?",
//                (rs, rowNum) -> new VersionSnapshot(
//                        rs.getLong("version"),
//                        rs.getTimestamp("updated_at").toLocalDateTime()),
//                ROW_ID);
//    }
//
//    // =========================
//    // RECORD (DTO INTERNO)
//    // =========================
//    // Representa snapshot da versão
//    public record VersionSnapshot(long version, LocalDateTime updatedAt) {
//    }
//}