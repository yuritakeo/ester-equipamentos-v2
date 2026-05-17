package com.example.repository;

import java.util.Optional;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

import com.example.entity.Usuario;
import org.springframework.data.jpa.repository.Query;

public interface UsuarioRepository extends JpaRepository<Usuario, Long> {

    Optional<Usuario> findByUsername(String username);

    Optional<Usuario> findByUsernameIgnoreCase(String username);

    boolean existsByUsername(String username);

    boolean existsByUsernameIgnoreCase(String username);

    // ✅ PAGINADO
    @Override
    Page<Usuario> findAll(Pageable pageable);

    @Query("""
    SELECT u FROM Usuario u
    JOIN FETCH u.equipe e
    JOIN FETCH e.tipoCategoria
    WHERE u.id = :id
""")
    Optional<Usuario> buscarCompleto(Long id);

}