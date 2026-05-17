package com.example.repository;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

import com.example.entity.Empresa;

public interface EmpresaRepository extends JpaRepository<Empresa, Long> {

    boolean existsByNomeIgnoreCase(String nome);

    boolean existsByNomeIgnoreCaseAndIdNot(String nome, Long id);

    // ✅ PAGINADO (usado no service)
    @Override
    Page<Empresa> findAll(Pageable pageable);
}