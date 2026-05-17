package com.example.repository;

import java.time.LocalDateTime;

public interface ExecucaoResumoProjection {
    Long getId();

    LocalDateTime getData();

    Long getNcCount();

    Long getEstoqueId();

    String getEstoqueNomeEquipamento();

    String getEstoqueTagPatrimonio();

    Long getEstoqueEmpresaId();

    String getEstoqueEmpresaNome();

    Long getEstoqueEquipeResponsavelId();

    String getEstoqueEquipeResponsavelNome();

    Long getEstoqueEquipeResponsavelTipoCategoriaId();

    String getEstoqueEquipeResponsavelTipoCategoriaNome();

    Long getChecklistModeloId();

    String getChecklistModeloNome();

    String getChecklistModeloArquivoNome();
}
