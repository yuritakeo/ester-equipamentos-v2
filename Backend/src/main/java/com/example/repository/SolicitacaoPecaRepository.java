package com.example.repository;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

import com.example.entity.SolicitacaoPeca;

public interface SolicitacaoPecaRepository extends JpaRepository<SolicitacaoPeca, Long> {

    // ✅ PAGINADO
    Page<SolicitacaoPeca> findByEquipamentoIdOrderByDataSolicitacaoDesc(
            Long equipamentoId,
            Pageable pageable
    );

    void deleteByEquipamentoId(Long equipamentoId);

    // ✅ PAGINADO GLOBAL
    @Override
    Page<SolicitacaoPeca> findAll(Pageable pageable);
}