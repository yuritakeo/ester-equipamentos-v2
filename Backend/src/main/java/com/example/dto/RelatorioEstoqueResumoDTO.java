package com.example.dto;

import java.time.LocalDateTime;

import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
public class RelatorioEstoqueResumoDTO {

    private Long id;
    private LocalDateTime data;
    private Long estoqueId;
    private Long checklistExecucaoId;
    private String equipeNome;

    public RelatorioEstoqueResumoDTO(
            Long id,
            LocalDateTime data,
            Long estoqueId,
            Long checklistExecucaoId,
            String equipeNome) {

        this.id = id;
        this.data = data;
        this.estoqueId = estoqueId;
        this.checklistExecucaoId = checklistExecucaoId;
        this.equipeNome = equipeNome;
    }
}