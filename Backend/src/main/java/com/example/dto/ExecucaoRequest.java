package com.example.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.Data;

@Data
public class ExecucaoRequest {

    @NotNull(message = "Equipe é obrigatória")
    private Long equipeId;

    @NotNull(message = "Equipamento é obrigatório")
    private Long estoqueId;

    @NotNull(message = "Checklist modelo é obrigatório")
    private Long checklistModeloId;

    @NotBlank(message = "Respostas do checklist são obrigatórias")
    @Size(min = 2, message = "Respostas inválidas")
    private String respostasJson;
}
