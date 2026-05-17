package com.example.repository;

import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import com.example.entity.Manutencao;
import com.example.enums.ManutencaoStatus;

public interface ManutencaoRepository extends JpaRepository<Manutencao, Long> {

    List<Manutencao> findByManutencaoPaiIsNullOrderByDataEntradaDesc();

    List<Manutencao> findByEquipamentoIdOrderByDataEntradaDesc(Long equipamentoId);

    boolean existsByEquipamentoIdAndStatus(Long equipamentoId, ManutencaoStatus status);

    boolean existsByManutencaoPaiIdAndStatus(Long manutencaoPaiId, ManutencaoStatus status);

    void deleteByEquipamentoId(Long equipamentoId);

    @Modifying(clearAutomatically = true)
    @Query("UPDATE Manutencao m SET m.equipamento = null WHERE m.equipamento.id = :estoqueId AND m.status <> com.example.enums.ManutencaoStatus.PENDENTE")
    void desvinculaEquipamentoConcluido(@Param("estoqueId") Long estoqueId);

    @Query("SELECT DISTINCT m.equipamento.id FROM Manutencao m WHERE m.equipamento.id IN :ids AND m.status = com.example.enums.ManutencaoStatus.PENDENTE")
    List<Long> findEquipamentoIdsComPendencia(@Param("ids") List<Long> ids);

    @Query("""
            SELECT DISTINCT m.equipamento.id
            FROM Manutencao m
            WHERE m.equipamento IS NOT NULL
              AND m.manutencaoPai IS NULL
              AND m.status = com.example.enums.ManutencaoStatus.PENDENTE
            """)
    List<Long> findEquipamentoIdsComPendenciaAberta();

    @Modifying(clearAutomatically = true)
    @Query("UPDATE Manutencao m SET m.equipamento = null WHERE m.equipamento.id IN :ids AND m.status <> com.example.enums.ManutencaoStatus.PENDENTE")
    int desvinculaEquipamentoConcluidoPorIds(@Param("ids") List<Long> ids);
}
