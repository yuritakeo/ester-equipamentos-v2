package com.example.dto;

import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.Data;

@Data
public class OficinaRequest {

    @NotNull(message = "Equipamento é obrigatório")
    private Long equipamentoId;

    @Size(max = 500, message = "Observação deve ter no máximo 500 caracteres")
    private String observacao;
}