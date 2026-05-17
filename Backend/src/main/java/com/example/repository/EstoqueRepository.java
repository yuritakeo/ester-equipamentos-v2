package com.example.repository;

import java.math.BigDecimal;
import java.util.List;
import java.util.Optional;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import com.example.dto.EstoqueListagemDTO;
import com.example.entity.Estoque;

public interface EstoqueRepository extends JpaRepository<Estoque, Long> {

    @Query("""
            SELECT new com.example.dto.EstoqueListagemDTO(
                e.id,
                e.nomeEquipamento,
                e.tagPatrimonio,
                e.valorLocacao,
                e.valorUnitario,
                emp.id,
                emp.nome,
                c.id,
                c.nome,
                eq.id,
                eq.nome,
                eqTipo.id,
                eqTipo.nome,
                eqResp.id,
                eqResp.nome,
                eqRespTipo.id,
                eqRespTipo.nome,
                (CASE WHEN e.fotoBase64 IS NOT NULL AND e.fotoBase64 <> '' THEN 1 ELSE 0 END) +
                (CASE WHEN e.fotoBase64Secundaria IS NOT NULL AND e.fotoBase64Secundaria <> '' THEN 1 ELSE 0 END)
            )
            FROM Estoque e
            JOIN e.empresa emp
            LEFT JOIN e.canteiro c
            LEFT JOIN e.equipe eq
            LEFT JOIN eq.tipoCategoria eqTipo
            LEFT JOIN e.equipeResponsavel eqResp
            LEFT JOIN eqResp.tipoCategoria eqRespTipo
            WHERE e.ativo IS NULL OR e.ativo = true
            ORDER BY e.nomeEquipamento ASC
            """)
    List<EstoqueListagemDTO> findResumoAtivos();

    @Query(
            value = """
                    SELECT new com.example.dto.EstoqueListagemDTO(
                        e.id,
                        e.nomeEquipamento,
                        e.tagPatrimonio,
                        e.valorLocacao,
                        e.valorUnitario,
                        emp.id,
                        emp.nome,
                        c.id,
                        c.nome,
                        eq.id,
                        eq.nome,
                        eqTipo.id,
                        eqTipo.nome,
                        eqResp.id,
                        eqResp.nome,
                        eqRespTipo.id,
                        eqRespTipo.nome,
                        (CASE WHEN e.fotoBase64 IS NOT NULL AND e.fotoBase64 <> '' THEN 1 ELSE 0 END) +
                        (CASE WHEN e.fotoBase64Secundaria IS NOT NULL AND e.fotoBase64Secundaria <> '' THEN 1 ELSE 0 END)
                    )
                    FROM Estoque e
                    JOIN e.empresa emp
                    LEFT JOIN e.canteiro c
                    LEFT JOIN e.equipe eq
                    LEFT JOIN eq.tipoCategoria eqTipo
                    LEFT JOIN e.equipeResponsavel eqResp
                    LEFT JOIN eqResp.tipoCategoria eqRespTipo
                    WHERE e.ativo IS NULL OR e.ativo = true
                    ORDER BY e.nomeEquipamento ASC
                    """,
            countQuery = """
                    SELECT COUNT(e)
                    FROM Estoque e
                    WHERE e.ativo IS NULL OR e.ativo = true
                    """)
    Page<EstoqueListagemDTO> findResumoAtivos(Pageable pageable);

    @Query("""
            SELECT new com.example.dto.EstoqueListagemDTO(
                e.id,
                e.nomeEquipamento,
                e.tagPatrimonio,
                e.valorLocacao,
                e.valorUnitario,
                emp.id,
                emp.nome,
                c.id,
                c.nome,
                eq.id,
                eq.nome,
                eqTipo.id,
                eqTipo.nome,
                eqResp.id,
                eqResp.nome,
                eqRespTipo.id,
                eqRespTipo.nome,
                (CASE WHEN e.fotoBase64 IS NOT NULL AND e.fotoBase64 <> '' THEN 1 ELSE 0 END) +
                (CASE WHEN e.fotoBase64Secundaria IS NOT NULL AND e.fotoBase64Secundaria <> '' THEN 1 ELSE 0 END)
            )
            FROM Estoque e
            JOIN e.empresa emp
            LEFT JOIN e.canteiro c
            LEFT JOIN e.equipe eq
            LEFT JOIN eq.tipoCategoria eqTipo
            LEFT JOIN e.equipeResponsavel eqResp
            LEFT JOIN eqResp.tipoCategoria eqRespTipo
            WHERE (e.ativo IS NULL OR e.ativo = true)
              AND emp.id = :empresaId
            ORDER BY e.nomeEquipamento ASC
            """)
    List<EstoqueListagemDTO> findResumoAtivosByEmpresaId(@Param("empresaId") Long empresaId);

                @Query(
                                                value = """
                                                                                SELECT new com.example.dto.EstoqueListagemDTO(
                                                                                                e.id,
                                                                                                e.nomeEquipamento,
                                                                                                e.tagPatrimonio,
                                                                                                e.valorLocacao,
                                                                                                e.valorUnitario,
                                                                                                emp.id,
                                                                                                emp.nome,
                                                                                                c.id,
                                                                                                c.nome,
                                                                                                eq.id,
                                                                                                eq.nome,
                                                                                                eqTipo.id,
                                                                                                eqTipo.nome,
                                                                                                eqResp.id,
                                                                                                eqResp.nome,
                                                                                                eqRespTipo.id,
                                                                                                eqRespTipo.nome,
                                                                                                (CASE WHEN e.fotoBase64 IS NOT NULL AND e.fotoBase64 <> '' THEN 1 ELSE 0 END) +
                                                                                                (CASE WHEN e.fotoBase64Secundaria IS NOT NULL AND e.fotoBase64Secundaria <> '' THEN 1 ELSE 0 END)
                                                                                )
                                                                                FROM Estoque e
                                                                                JOIN e.empresa emp
                                                                                LEFT JOIN e.canteiro c
                                                                                LEFT JOIN e.equipe eq
                                                                                LEFT JOIN eq.tipoCategoria eqTipo
                                                                                LEFT JOIN e.equipeResponsavel eqResp
                                                                                LEFT JOIN eqResp.tipoCategoria eqRespTipo
                                                                                WHERE (e.ativo IS NULL OR e.ativo = true)
                                                                                        AND emp.id = :empresaId
                                                                                ORDER BY e.nomeEquipamento ASC
                                                                                """,
                                                countQuery = """
                                                                                SELECT COUNT(e)
                                                                                FROM Estoque e
                                                                                JOIN e.empresa emp
                                                                                WHERE (e.ativo IS NULL OR e.ativo = true)
                                                                                        AND emp.id = :empresaId
                                                                                """)
                Page<EstoqueListagemDTO> findResumoAtivosByEmpresaId(@Param("empresaId") Long empresaId, Pageable pageable);

    @Override
    @EntityGraph(attributePaths = {
            "empresa",
            "canteiro",
            "equipe",
            "equipe.tipoCategoria",
            "equipeResponsavel",
            "equipeResponsavel.tipoCategoria"
    })
    Page<Estoque> findAll(Pageable pageable);

    @Override
    @EntityGraph(attributePaths = {
            "empresa",
            "canteiro",
            "equipe",
            "equipe.tipoCategoria",
            "equipeResponsavel",
            "equipeResponsavel.tipoCategoria"
    })
    Optional<Estoque> findById(Long id);

    @EntityGraph(attributePaths = {
            "empresa",
            "canteiro",
            "equipe",
            "equipe.tipoCategoria",
            "equipeResponsavel",
            "equipeResponsavel.tipoCategoria"
    })
    List<Estoque> findByEmpresaIdOrderByNomeEquipamentoAsc(Long empresaId);

    @Query("""
            SELECT
                CASE WHEN COUNT(e) > 0 THEN true ELSE false END
            FROM Estoque e
            WHERE e.tagPatrimonio IS NOT NULL
              AND TRIM(e.tagPatrimonio) <> ''
              AND LOWER(TRIM(e.tagPatrimonio)) = LOWER(TRIM(:tagPatrimonio))
              AND (:estoqueId IS NULL OR e.id <> :estoqueId)
              AND (e.ativo IS NULL OR e.ativo = true)
            """)
    boolean existsOutroEquipamentoComMesmaTag(
            @Param("tagPatrimonio") String tagPatrimonio,
            @Param("estoqueId") Long estoqueId);

    @Query("""
            SELECT
                CASE WHEN COUNT(e) > 0 THEN true ELSE false END
            FROM Estoque e
            WHERE (e.tagPatrimonio IS NULL OR TRIM(e.tagPatrimonio) = '')
              AND LOWER(TRIM(e.nomeEquipamento)) = LOWER(TRIM(:nomeEquipamento))
              AND COALESCE(e.valorUnitario, :valorUnitario) = :valorUnitario
              AND COALESCE(e.valorLocacao, :valorLocacao) = :valorLocacao
              AND (:estoqueId IS NULL OR e.id <> :estoqueId)
              AND (e.ativo IS NULL OR e.ativo = true)
            """)
    boolean existsOutroEquipamentoSemTagComMesmoNomeEValores(
            @Param("nomeEquipamento") String nomeEquipamento,
            @Param("valorUnitario") BigDecimal valorUnitario,
            @Param("valorLocacao") BigDecimal valorLocacao,
            @Param("estoqueId") Long estoqueId);

    @Query("SELECT e.id FROM Estoque e WHERE e.ativo IS NULL OR e.ativo = true")
    List<Long> findIdsAtivos();

    @Query("SELECT e.id FROM Estoque e WHERE (e.ativo IS NULL OR e.ativo = true) AND e.id IN :ids")
    List<Long> findIdsAtivosByIds(@Param("ids") List<Long> ids);

    @Modifying(clearAutomatically = true)
    @Query("UPDATE Estoque e SET e.equipeResponsavel = null, e.equipe = null WHERE e.id IN :ids")
    int limparVinculoEquipeByIds(@Param("ids") List<Long> ids);

    @Modifying(clearAutomatically = true)
    @Query("UPDATE Estoque e SET e.ativo = false WHERE e.id IN :ids")
    int inativarByIds(@Param("ids") List<Long> ids);

        boolean existsByCanteiroId(Long canteiroId);

        boolean existsByEmpresaId(Long empresaId);
}
