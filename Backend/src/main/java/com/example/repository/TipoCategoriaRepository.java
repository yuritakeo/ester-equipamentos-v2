package com.example.repository;

import java.util.Optional;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

import com.example.entity.TipoCategoria;

public interface TipoCategoriaRepository extends JpaRepository<TipoCategoria, Long> {

    Optional<TipoCategoria> findByNome(String nome);

    Optional<TipoCategoria> findByNomeIgnoreCase(String nome);

    // ✅ mantém padrão (CORRETO)
    @Override
    Page<TipoCategoria> findAll(Pageable pageable);
}