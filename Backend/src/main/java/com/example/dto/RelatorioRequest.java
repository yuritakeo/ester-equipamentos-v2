package com.example.dto;

import jakarta.validation.constraints.NotNull;
import lombok.Data;

@Data
public class RelatorioRequest {

    @NotNull(message = "Equipe é obrigatória")
    private Long equipeId;

    @NotNull(message = "Estoque é obrigatório")
    private Long estoqueId;

    private Long checklistExecucaoId;
}
