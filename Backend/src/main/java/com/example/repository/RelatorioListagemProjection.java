package com.example.repository;

import java.time.LocalDateTime;

public interface RelatorioListagemProjection {
    Long getId();

    LocalDateTime getData();

    Long getEquipeId();

    String getEquipeNome();

    Long getEquipeTipoCategoriaId();

    String getEquipeTipoCategoriaNome();

    Long getEstoqueId();

    String getEstoqueNomeEquipamento();

    String getEstoqueTagPatrimonio();

    Boolean getEstoqueAtivo();

    Long getEstoqueEmpresaId();

    String getEstoqueEmpresaNome();

    Long getEstoqueEquipeResponsavelId();

    String getEstoqueEquipeResponsavelNome();

    Long getEstoqueEquipeResponsavelTipoCategoriaId();

    String getEstoqueEquipeResponsavelTipoCategoriaNome();

    Long getChecklistExecucaoId();

    LocalDateTime getChecklistExecucaoData();

    String getChecklistExecucaoRespostasJson();

    Long getChecklistExecucaoEquipeId();

    String getChecklistExecucaoEquipeNome();

    Long getChecklistExecucaoEquipeTipoCategoriaId();

    String getChecklistExecucaoEquipeTipoCategoriaNome();

    Long getChecklistModeloId();

    String getChecklistModeloNome();

    String getChecklistModeloArquivoNome();
}
