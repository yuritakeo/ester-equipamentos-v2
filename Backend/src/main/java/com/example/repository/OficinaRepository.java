package com.example.repository;

import java.util.List;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

import com.example.entity.Oficina;

public interface OficinaRepository extends JpaRepository<Oficina, Long> {

    // ✅ PAGINADO (corrigido)
    Page<Oficina> findByEquipamentoIdOrderByDataDesc(Long equipamentoId, Pageable pageable);

    void deleteByEquipamentoId(Long equipamentoId);

    boolean existsByEquipamentoId(Long equipamentoId);

    @Query("SELECT DISTINCT o.equipamento.id FROM Oficina o WHERE o.equipamento IS NOT NULL")
    List<Long> findEquipamentoIdsComPassagemNaOficina();

    // ✅ PAGINADO (para listagem geral)
    @Override
    Page<Oficina> findAll(Pageable pageable);
}