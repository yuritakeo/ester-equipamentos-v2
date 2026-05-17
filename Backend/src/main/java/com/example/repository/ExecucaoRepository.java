package com.example.repository;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import com.example.entity.Execucao;

@Repository
public interface ExecucaoRepository extends JpaRepository<Execucao, Long> {

        @Query("""
        SELECT 
            e.id AS id,
            e.equipe.id AS equipeId,
            e.estoque.id AS estoqueId
        FROM Execucao e
        WHERE e.id = :id
    """)
        Optional<ExecucaoRelatorioProjection> findDadosRelatorioById(
                @Param("id") Long id
        );

        @Query("""
        SELECT e.id
        FROM Execucao e
        WHERE e.estoque.id = :estoqueId
          AND e.id > :ultimoId
        ORDER BY e.id ASC
    """)
        List<Long> findIdsPorEstoqueDepoisDoId(
                @Param("estoqueId") Long estoqueId,
                @Param("ultimoId") Long ultimoId,
                Pageable pageable
        );

        @Query("""
        SELECT e.id
        FROM Execucao e
        WHERE e.data >= :inicio
          AND e.data < :fimExclusivo
          AND e.id > :ultimoId
        ORDER BY e.id ASC
    """)
        List<Long> findIdsPorPeriodoDepoisDoId(
                @Param("inicio") LocalDateTime inicio,
                @Param("fimExclusivo") LocalDateTime fimExclusivo,
                @Param("ultimoId") Long ultimoId,
                Pageable pageable
        );


    // ✅ MANTER SOMENTE PAGINADO
    @Query(value = """
            SELECT
                e.id AS id,
                e.data AS data,
                CASE
                    WHEN e.respostas_json IS NULL OR e.respostas_json = '' THEN 0
                    ELSE (length(e.respostas_json) - length(replace(e.respostas_json, '\"resposta\":\"NC\"', ''))) / 15
                END AS ncCount,
                est.id AS estoqueId,
                est.nome_equipamento AS estoqueNomeEquipamento,
                est.tag_patrimonio AS estoqueTagPatrimonio,
                emp.id AS estoqueEmpresaId,
                emp.nome AS estoqueEmpresaNome,
                eq_resp.id AS estoqueEquipeResponsavelId,
                eq_resp.nome AS estoqueEquipeResponsavelNome,
                eq_resp_tipo.id AS estoqueEquipeResponsavelTipoCategoriaId,
                eq_resp_tipo.nome AS estoqueEquipeResponsavelTipoCategoriaNome,
                cm.id AS checklistModeloId,
                cm.nome AS checklistModeloNome,
                cm.arquivo_nome AS checklistModeloArquivoNome
            FROM execucao e
            JOIN estoque est ON est.id = e.estoque_id
            LEFT JOIN empresa emp ON emp.id = est.empresa_id
            LEFT JOIN equipes eq_resp ON eq_resp.id = est.equipe_responsavel_id
            LEFT JOIN tipo_categoria eq_resp_tipo ON eq_resp_tipo.id = eq_resp.tipo_categoria_id
            LEFT JOIN checklist_modelo cm ON cm.id = e.checklist_modelo_id
            ORDER BY e.data DESC
            """,
            countQuery = "SELECT COUNT(*) FROM execucao",
            nativeQuery = true)
    Page<ExecucaoResumoProjection> findAllResumo(Pageable pageable);


    // ✅ PAINEL → manter (já filtrado)
    @Query(value = """
            SELECT
                e.id AS id,
                e.data AS data,
                e.respostas_json AS respostasJson,
                est.id AS estoqueId,
                est.nome_equipamento AS estoqueNomeEquipamento,
                est.tag_patrimonio AS estoqueTagPatrimonio,
                emp.id AS estoqueEmpresaId,
                emp.nome AS estoqueEmpresaNome,
                eq_resp.id AS estoqueEquipeResponsavelId,
                eq_resp.nome AS estoqueEquipeResponsavelNome,
                eq_resp_tipo.id AS estoqueEquipeResponsavelTipoCategoriaId,
                eq_resp_tipo.nome AS estoqueEquipeResponsavelTipoCategoriaNome,
                cm.id AS checklistModeloId,
                cm.nome AS checklistModeloNome,
                cm.arquivo_nome AS checklistModeloArquivoNome
            FROM execucao e
            JOIN estoque est ON est.id = e.estoque_id
            LEFT JOIN empresa emp ON emp.id = est.empresa_id
            LEFT JOIN equipes eq_resp ON eq_resp.id = est.equipe_responsavel_id
            LEFT JOIN tipo_categoria eq_resp_tipo ON eq_resp_tipo.id = eq_resp.tipo_categoria_id
            LEFT JOIN checklist_modelo cm ON cm.id = e.checklist_modelo_id
            WHERE e.estoque_id = :estoqueId
              AND e.data >= :inicio
              AND e.data < :fim
            ORDER BY e.data DESC
            """, nativeQuery = true)
    List<ExecucaoPainelProjection> findPainelSemanaAtualByEstoqueIdAndDataBetween(
            @Param("estoqueId") Long estoqueId,
            @Param("inicio") LocalDateTime inicio,
            @Param("fim") LocalDateTime fim
    );


    // ✅ ENTITY GRAPH PAGINADO (substitui findAll)
    @Override
    @EntityGraph(attributePaths = {
            "equipe",
            "equipe.tipoCategoria",
            "estoque",
            "estoque.empresa",
            "estoque.equipeResponsavel",
            "estoque.equipeResponsavel.tipoCategoria",
            "checklistModelo"
    })
    Page<Execucao> findAll(Pageable pageable);


    @Override
    @EntityGraph(attributePaths = {
            "equipe",
            "equipe.tipoCategoria",
            "estoque",
            "estoque.empresa",
            "estoque.equipeResponsavel",
            "estoque.equipeResponsavel.tipoCategoria",
            "checklistModelo"
    })
    Optional<Execucao> findById(Long id);


    // ✅ TODOS COM PAGINAÇÃO AGORA

    @EntityGraph(attributePaths = {
            "equipe",
            "equipe.tipoCategoria",
            "estoque",
            "estoque.empresa",
            "estoque.equipeResponsavel",
            "estoque.equipeResponsavel.tipoCategoria",
            "checklistModelo"
    })
    Page<Execucao> findByDataBetween(
            LocalDateTime inicio,
            LocalDateTime fim,
            Pageable pageable
    );


    @EntityGraph(attributePaths = {
            "equipe",
            "equipe.tipoCategoria",
            "estoque",
            "estoque.empresa",
            "estoque.equipeResponsavel",
            "estoque.equipeResponsavel.tipoCategoria",
            "checklistModelo"
    })
    Page<Execucao> findByEquipeIdOrderByDataDesc(Long equipeId, Pageable pageable);


    @EntityGraph(attributePaths = {
            "equipe",
            "equipe.tipoCategoria",
            "estoque",
            "estoque.empresa",
            "estoque.equipeResponsavel",
            "estoque.equipeResponsavel.tipoCategoria",
            "checklistModelo"
    })
    Page<Execucao> findByEstoqueIdOrderByDataDesc(Long estoqueId, Pageable pageable);


    @EntityGraph(attributePaths = {
            "equipe",
            "equipe.tipoCategoria",
            "estoque",
            "estoque.empresa",
            "estoque.equipeResponsavel",
            "estoque.equipeResponsavel.tipoCategoria",
            "checklistModelo"
    })
    Page<Execucao> findByEstoqueIdInAndDataBetween(
            List<Long> estoqueIds,
            LocalDateTime inicio,
            LocalDateTime fim,
            Pageable pageable
    );


    @EntityGraph(attributePaths = {
            "equipe",
            "equipe.tipoCategoria",
            "estoque",
            "estoque.empresa",
            "estoque.equipeResponsavel",
            "estoque.equipeResponsavel.tipoCategoria",
            "checklistModelo"
    })
    Page<Execucao> findByChecklistModeloId(Long checklistModeloId, Pageable pageable);


    // ✅ EXISTENTES OK
    boolean existsByEstoqueIdAndDataBetween(
            Long estoqueId,
            LocalDateTime inicio,
            LocalDateTime fim
    );

    boolean existsByEstoqueIdAndDataGreaterThanEqualAndDataLessThan(
            Long estoqueId,
            LocalDateTime inicio,
            LocalDateTime fimExclusivo
    );


    // ✅ LOTE OK
    @Modifying(clearAutomatically = true, flushAutomatically = true)
    @Query("""
            UPDATE Execucao e
            SET e.checklistModelo = null
            WHERE e.id IN :ids
            """)
    int limparChecklistModeloPorIds(@Param("ids") List<Long> ids);

    @Modifying(clearAutomatically = true, flushAutomatically = true)
    @Query("""
            DELETE FROM Execucao e
            WHERE e.id IN :ids
            """)
    int deleteEmLotePorIds(@Param("ids") List<Long> ids);

    void deleteByEstoqueId(Long estoqueId);
}