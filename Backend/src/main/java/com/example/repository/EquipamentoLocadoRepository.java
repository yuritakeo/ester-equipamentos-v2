package com.example.repository;

import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import com.example.entity.EquipamentoLocado;

public interface EquipamentoLocadoRepository extends JpaRepository<EquipamentoLocado, Long> {

    @EntityGraph(attributePaths = { "empresa", "equipe", "equipe.tipoCategoria", "pecas" })
    @Query("""
            SELECT e
            FROM EquipamentoLocado e
            ORDER BY LOWER(COALESCE(e.nomeLocado, '')), e.id
            """)
    List<EquipamentoLocado> findAllDetailed();

    @Override
    @EntityGraph(attributePaths = { "empresa", "equipe", "equipe.tipoCategoria", "pecas" })
    Optional<EquipamentoLocado> findById(Long id);

    @Query("""
            SELECT
                CASE WHEN COUNT(e) > 0 THEN true ELSE false END
            FROM EquipamentoLocado e
            WHERE e.tag IS NOT NULL
              AND TRIM(e.tag) <> ''
              AND LOWER(TRIM(e.tag)) = LOWER(TRIM(:tag))
              AND (:equipamentoLocadoId IS NULL OR e.id <> :equipamentoLocadoId)
            """)
    boolean existsOutroEquipamentoComMesmaTag(
            @Param("tag") String tag,
            @Param("equipamentoLocadoId") Long equipamentoLocadoId);
}
