package com.example.dto;

import jakarta.validation.constraints.NotNull;
import lombok.Data;

@Data
public class DirecionarEquipeRequest {

    @NotNull(message = "Equipe é obrigatória")
    private Long equipeId;
}