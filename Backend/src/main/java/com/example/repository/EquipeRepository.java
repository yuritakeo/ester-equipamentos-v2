package com.example.repository;

import java.util.Optional;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

import com.example.entity.Equipe;

public interface EquipeRepository extends JpaRepository<Equipe, Long> {

    Optional<Equipe> findByNome(String nome);

    // ✅ padrão mantém (não mexe)
    @Override
    Page<Equipe> findAll(Pageable pageable);

    // ✅ NOVO: resolve Lazy do tipoCategoria
    @Query("""
        SELECT e FROM Equipe e
        JOIN FETCH e.tipoCategoria
    """)
    Page<Equipe> buscarCompleto(Pageable pageable);
}