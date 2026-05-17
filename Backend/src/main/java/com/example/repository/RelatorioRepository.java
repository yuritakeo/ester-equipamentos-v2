package com.example.repository;

import java.util.List;
import java.util.Optional;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import com.example.dto.RelatorioEstoqueResumoDTO;
import com.example.entity.Relatorio;

public interface RelatorioRepository extends JpaRepository<Relatorio, Long> {

    // ✅ PAGINADO (substitui findAllListagem)
    @Query(value = """
            SELECT
                r.id AS id,
                r.data AS data,
                eq.id AS equipeId,
                eq.nome AS equipeNome,
                eq_tipo.id AS equipeTipoCategoriaId,
                eq_tipo.nome AS equipeTipoCategoriaNome,
                est.id AS estoqueId,
                est.nome_equipamento AS estoqueNomeEquipamento,
                est.tag_patrimonio AS estoqueTagPatrimonio,
                est.ativo AS estoqueAtivo,
                emp.id AS estoqueEmpresaId,
                emp.nome AS estoqueEmpresaNome,
                eq_resp.id AS estoqueEquipeResponsavelId,
                eq_resp.nome AS estoqueEquipeResponsavelNome,
                eq_resp_tipo.id AS estoqueEquipeResponsavelTipoCategoriaId,
                eq_resp_tipo.nome AS estoqueEquipeResponsavelTipoCategoriaNome,
                exec.id AS checklistExecucaoId,
                exec.data AS checklistExecucaoData,
                exec.respostas_json AS checklistExecucaoRespostasJson,
                exec_eq.id AS checklistExecucaoEquipeId,
                exec_eq.nome AS checklistExecucaoEquipeNome,
                exec_eq_tipo.id AS checklistExecucaoEquipeTipoCategoriaId,
                exec_eq_tipo.nome AS checklistExecucaoEquipeTipoCategoriaNome,
                cm.id AS checklistModeloId,
                cm.nome AS checklistModeloNome,
                cm.arquivo_nome AS checklistModeloArquivoNome
            FROM relatorio r
            JOIN estoque est ON est.id = r.estoque_id
            LEFT JOIN empresa emp ON emp.id = est.empresa_id
            LEFT JOIN equipes eq_resp ON eq_resp.id = est.equipe_responsavel_id
            LEFT JOIN tipo_categoria eq_resp_tipo ON eq_resp_tipo.id = eq_resp.tipo_categoria_id
            LEFT JOIN equipes eq ON eq.id = r.equipe_id
            LEFT JOIN tipo_categoria eq_tipo ON eq_tipo.id = eq.tipo_categoria_id
            LEFT JOIN execucao exec ON exec.id = r.checklist_execucao_id
            LEFT JOIN equipes exec_eq ON exec_eq.id = exec.equipe_id
            LEFT JOIN tipo_categoria exec_eq_tipo ON exec_eq_tipo.id = exec_eq.tipo_categoria_id
            LEFT JOIN checklist_modelo cm ON cm.id = exec.checklist_modelo_id
            ORDER BY COALESCE(exec.data, r.data) DESC, r.id DESC
            """,
            countQuery = "SELECT COUNT(*) FROM relatorio",
            nativeQuery = true)
    Page<RelatorioListagemProjection> findAllListagem(Pageable pageable);


    // ✅ PAGINADO (substitui findListagemByEstoqueId)
    @Query(value = """
            SELECT
                r.id AS id,
                r.data AS data,
                eq.id AS equipeId,
                eq.nome AS equipeNome,
                eq_tipo.id AS equipeTipoCategoriaId,
                eq_tipo.nome AS equipeTipoCategoriaNome,
                est.id AS estoqueId,
                est.nome_equipamento AS estoqueNomeEquipamento,
                est.tag_patrimonio AS estoqueTagPatrimonio,
                est.ativo AS estoqueAtivo,
                emp.id AS estoqueEmpresaId,
                emp.nome AS estoqueEmpresaNome,
                eq_resp.id AS estoqueEquipeResponsavelId,
                eq_resp.nome AS estoqueEquipeResponsavelNome,
                eq_resp_tipo.id AS estoqueEquipeResponsavelTipoCategoriaId,
                eq_resp_tipo.nome AS estoqueEquipeResponsavelTipoCategoriaNome,
                exec.id AS checklistExecucaoId,
                exec.data AS checklistExecucaoData,
                exec.respostas_json AS checklistExecucaoRespostasJson,
                exec_eq.id AS checklistExecucaoEquipeId,
                exec_eq.nome AS checklistExecucaoEquipeNome,
                exec_eq_tipo.id AS checklistExecucaoEquipeTipoCategoriaId,
                exec_eq_tipo.nome AS checklistExecucaoEquipeTipoCategoriaNome,
                cm.id AS checklistModeloId,
                cm.nome AS checklistModeloNome,
                cm.arquivo_nome AS checklistModeloArquivoNome
            FROM relatorio r
            JOIN estoque est ON est.id = r.estoque_id
            LEFT JOIN empresa emp ON emp.id = est.empresa_id
            LEFT JOIN equipes eq_resp ON eq_resp.id = est.equipe_responsavel_id
            LEFT JOIN tipo_categoria eq_resp_tipo ON eq_resp_tipo.id = eq_resp.tipo_categoria_id
            LEFT JOIN equipes eq ON eq.id = r.equipe_id
            LEFT JOIN tipo_categoria eq_tipo ON eq_tipo.id = eq.tipo_categoria_id
            LEFT JOIN execucao exec ON exec.id = r.checklist_execucao_id
            LEFT JOIN equipes exec_eq ON exec_eq.id = exec.equipe_id
            LEFT JOIN tipo_categoria exec_eq_tipo ON exec_eq_tipo.id = exec_eq.tipo_categoria_id
            LEFT JOIN checklist_modelo cm ON cm.id = exec.checklist_modelo_id
            WHERE r.estoque_id = :estoqueId
            ORDER BY COALESCE(exec.data, r.data) DESC, r.id DESC
            """,
            countQuery = "SELECT COUNT(*) FROM relatorio WHERE estoque_id = :estoqueId",
            nativeQuery = true)
    Page<RelatorioListagemProjection> findListagemByEstoqueId(
            @Param("estoqueId") Long estoqueId,
            Pageable pageable
    );


    @Override
    @EntityGraph(attributePaths = {
            "equipe",
            "equipe.tipoCategoria",
            "estoque",
            "estoque.empresa",
            "estoque.equipeResponsavel",
            "estoque.equipeResponsavel.tipoCategoria",
            "checklistExecucao",
            "checklistExecucao.checklistModelo"
    })
    Page<Relatorio> findAll(Pageable pageable);


    @Override
    @EntityGraph(attributePaths = {
            "equipe",
            "equipe.tipoCategoria",
            "estoque",
            "estoque.empresa",
            "estoque.equipeResponsavel",
            "estoque.equipeResponsavel.tipoCategoria",
            "checklistExecucao",
            "checklistExecucao.checklistModelo"
    })
    Optional<Relatorio> findById(Long id);


    // ✅ PAGINADOS AGORA
    @EntityGraph(attributePaths = {
            "equipe",
            "equipe.tipoCategoria",
            "estoque",
            "estoque.empresa",
            "estoque.equipeResponsavel",
            "estoque.equipeResponsavel.tipoCategoria",
            "checklistExecucao",
            "checklistExecucao.checklistModelo"
    })
    Page<Relatorio> findByEquipeIdOrderByDataDesc(Long equipeId, Pageable pageable);


    @EntityGraph(attributePaths = {
            "equipe",
            "equipe.tipoCategoria",
            "estoque",
            "estoque.empresa",
            "estoque.equipeResponsavel",
            "estoque.equipeResponsavel.tipoCategoria",
            "checklistExecucao",
            "checklistExecucao.checklistModelo"
    })
    Page<Relatorio> findByEstoqueIdOrderByDataDesc(Long estoqueId, Pageable pageable);


    // ✅ JÁ ESTÁ CERTO
    @Query("""
            SELECT new com.example.dto.RelatorioEstoqueResumoDTO(
                r.id,
                COALESCE(r.checklistExecucao.data, r.data),
                r.estoque.id,
                r.checklistExecucao.id,
                COALESCE(r.equipe.nome, r.checklistExecucao.equipe.nome)
            )
            FROM Relatorio r
            WHERE r.estoque.id = :estoqueId
            ORDER BY COALESCE(r.checklistExecucao.data, r.data) DESC
            """)
    Page<RelatorioEstoqueResumoDTO> findResumoByEstoqueId(Long estoqueId, Pageable pageable);


    boolean existsByChecklistExecucaoId(Long checklistExecucaoId);


    @EntityGraph(attributePaths = {
            "equipe",
            "equipe.tipoCategoria",
            "estoque",
            "estoque.empresa",
            "estoque.equipeResponsavel",
            "estoque.equipeResponsavel.tipoCategoria",
            "checklistExecucao",
            "checklistExecucao.checklistModelo"
    })
    Optional<Relatorio> findByChecklistExecucaoId(Long checklistExecucaoId);


    void deleteByEstoqueId(Long estoqueId);
}