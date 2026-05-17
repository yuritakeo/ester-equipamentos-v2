package com.example.repository;

import java.util.Optional;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import com.example.entity.EmailRemetente;

@Repository
public interface EmailRemetenteRepository extends JpaRepository<EmailRemetente, Long> {

    Optional<EmailRemetente> findByEmailIgnoreCase(String email);

    // ✅ PAGINADO (para uso seguro no service)
    @Override
    Page<EmailRemetente> findAll(Pageable pageable);
}