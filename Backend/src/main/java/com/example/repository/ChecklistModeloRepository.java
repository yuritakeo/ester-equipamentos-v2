package com.example.repository;

import java.util.List;
import java.util.Optional;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import com.example.entity.ChecklistModelo;


public interface ChecklistModeloRepository extends JpaRepository<ChecklistModelo, Long> {

    // ✅ ✅ VÍNCULOS POR MODELOS (ESSENCIAL - CORREÇÃO PRINCIPAL)
    @Query(value = """
        SELECT
            cme.checklist_modelo_id AS modeloId,
            cm.nome AS modeloNome,
            e.id AS equipamentoId,
            e.nome_equipamento AS equipamentoNomeEquipamento,
            e.tag_patrimonio AS equipamentoTagPatrimonio
        FROM checklist_modelo_equipamento cme
        JOIN checklist_modelo cm ON cm.id = cme.checklist_modelo_id
        JOIN estoque e ON e.id = cme.equipamento_id
        WHERE cme.checklist_modelo_id IN (:ids)
        ORDER BY cme.checklist_modelo_id ASC, e.nome_equipamento ASC
        """, nativeQuery = true)
    List<ChecklistModeloVinculoResumoProjection> findVinculosResumoByModeloIds(
            @Param("ids") List<Long> ids
    );


    // ✅ ✅ SEM PAGINAÇÃO (REGRA DE NEGÓCIO CONTROLADA)
    @Query(value = """
            SELECT
                cme.checklist_modelo_id AS modeloId,
                cm.nome AS modeloNome,
                e.id AS equipamentoId,
                e.nome_equipamento AS equipamentoNomeEquipamento,
                e.tag_patrimonio AS equipamentoTagPatrimonio
            FROM checklist_modelo_equipamento cme
            JOIN checklist_modelo cm ON cm.id = cme.checklist_modelo_id
            JOIN estoque e ON e.id = cme.equipamento_id
            WHERE cme.equipamento_id IN (:equipamentoIds)
            ORDER BY cme.checklist_modelo_id ASC, e.nome_equipamento ASC
            """, nativeQuery = true)
    List<ChecklistModeloVinculoResumoProjection> findVinculosResumoByEquipamentoIdsSemPaginacao(
            @Param("equipamentoIds") List<Long> equipamentoIds
    );


    // ✅ ✅ LISTAGEM PRINCIPAL PAGINADA (LEVE)
    @Query("""
            SELECT
                cm.id AS id,
                cm.nome AS nome,
                cm.arquivoNome AS arquivoNome,
                cm.arquivoOriginalNome AS arquivoOriginalNome,
                cm.data AS data
            FROM ChecklistModelo cm
            ORDER BY cm.nome ASC
            """)
    Page<ChecklistModeloListagemProjection> findAllListagem(Pageable pageable);


    // ✅ ✅ (OPCIONAL) VÍNCULOS GERAIS PAGINADOS
    @Query(value = """
            SELECT
                cme.checklist_modelo_id AS modeloId,
                cm.nome AS modeloNome,
                e.id AS equipamentoId,
                e.nome_equipamento AS equipamentoNomeEquipamento,
                e.tag_patrimonio AS equipamentoTagPatrimonio
            FROM checklist_modelo_equipamento cme
            JOIN checklist_modelo cm ON cm.id = cme.checklist_modelo_id
            JOIN estoque e ON e.id = cme.equipamento_id
            ORDER BY cme.checklist_modelo_id ASC, e.nome_equipamento ASC
            """,
            countQuery = "SELECT count(*) FROM checklist_modelo_equipamento",
            nativeQuery = true)
    Page<ChecklistModeloVinculoResumoProjection> findAllVinculosResumo(Pageable pageable);


    // ✅ ✅ POR EQUIPAMENTO PAGINADO
    @Query(value = """
            SELECT
                cme.checklist_modelo_id AS modeloId,
                cm.nome AS modeloNome,
                e.id AS equipamentoId,
                e.nome_equipamento AS equipamentoNomeEquipamento,
                e.tag_patrimonio AS equipamentoTagPatrimonio
            FROM checklist_modelo_equipamento cme
            JOIN checklist_modelo cm ON cm.id = cme.checklist_modelo_id
            JOIN estoque e ON e.id = cme.equipamento_id
            WHERE cme.equipamento_id IN (:equipamentoIds)
            ORDER BY cme.checklist_modelo_id ASC, e.nome_equipamento ASC
            """,
            countQuery = """
                SELECT count(*) 
                FROM checklist_modelo_equipamento cme 
                WHERE cme.equipamento_id IN (:equipamentoIds)
            """,
            nativeQuery = true)
    Page<ChecklistModeloVinculoResumoProjection> findVinculosResumoByEquipamentoIds(
            @Param("equipamentoIds") List<Long> equipamentoIds,
            Pageable pageable
    );


    // ✅ DELETE VÍNCULOS
    @Modifying(clearAutomatically = true, flushAutomatically = true)
    @Query(value = """
            DELETE FROM checklist_modelo_equipamento
            WHERE equipamento_id IN (:equipamentoIds)
            """, nativeQuery = true)
    int deleteVinculosByEquipamentoIds(@Param("equipamentoIds") List<Long> equipamentoIds);


    @Modifying(clearAutomatically = true, flushAutomatically = true)
    @Query(value = """
            DELETE FROM checklist_modelo_equipamento
            WHERE equipamento_id IN (:equipamentoIds)
              AND checklist_modelo_id <> :modeloId
            """, nativeQuery = true)
    int deleteVinculosByEquipamentoIdsAndModeloIdNot(
            @Param("equipamentoIds") List<Long> equipamentoIds,
            @Param("modeloId") Long modeloId
    );


    // ✅ FIND ALL COM PAGINAÇÃO + ENTITY GRAPH (SEGURO)
    @Override
    @EntityGraph(attributePaths = {
            "equipamentos",
            "equipamentos.empresa",
            "equipamentos.equipeResponsavel",
            "equipamentos.equipeResponsavel.tipoCategoria"
    })
    Page<ChecklistModelo> findAll(Pageable pageable);


    // ✅ FIND BY ID COM RELACIONAMENTOS
    @Override
    @EntityGraph(attributePaths = {
            "equipamentos",
            "equipamentos.empresa",
            "equipamentos.equipeResponsavel",
            "equipamentos.equipeResponsavel.tipoCategoria"
    })
    Optional<ChecklistModelo> findById(Long id);


    boolean existsById(Long id);

}