package com.example.dto;

import java.time.LocalDateTime;

import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
public class ExecucaoResumoDTO {

    private Long id;
    private LocalDateTime data;
    private Integer ncCount;
    private EstoqueExecucaoResumoDTO estoque;
    private ChecklistModeloResumoDTO checklistModelo;

    public ExecucaoResumoDTO(
            Long id,
            LocalDateTime data,
            Long ncCount,
            Long estoqueId,
            String estoqueNomeEquipamento,
            String estoqueTagPatrimonio,
            Long estoqueEmpresaId,
            String estoqueEmpresaNome,
            Long estoqueEquipeResponsavelId,
            String estoqueEquipeResponsavelNome,
            Long estoqueEquipeResponsavelTipoCategoriaId,
            String estoqueEquipeResponsavelTipoCategoriaNome,
            Long checklistModeloId,
            String checklistModeloNome,
            String checklistModeloArquivoNome) {

        this.id = id;
        this.data = data;
        this.ncCount = ncCount == null ? 0 : ncCount.intValue();

        this.estoque = new EstoqueExecucaoResumoDTO(
                estoqueId,
                estoqueNomeEquipamento,
                estoqueTagPatrimonio,
                estoqueEmpresaId,
                estoqueEmpresaNome,
                estoqueEquipeResponsavelId,
                estoqueEquipeResponsavelNome,
                estoqueEquipeResponsavelTipoCategoriaId,
                estoqueEquipeResponsavelTipoCategoriaNome
        );

        this.checklistModelo = (checklistModeloId == null
                && checklistModeloNome == null
                && checklistModeloArquivoNome == null)
                ? null
                : new ChecklistModeloResumoDTO(
                checklistModeloId,
                checklistModeloNome,
                checklistModeloArquivoNome
        );
    }
}