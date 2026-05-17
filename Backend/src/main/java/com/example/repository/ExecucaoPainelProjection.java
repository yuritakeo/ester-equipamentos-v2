package com.example.repository;

import java.time.LocalDateTime;

public interface ExecucaoPainelProjection {
    Long getId();

    LocalDateTime getData();

    String getRespostasJson();

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
