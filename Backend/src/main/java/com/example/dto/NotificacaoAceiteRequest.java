package com.example.dto;

import jakarta.validation.constraints.NotNull;
import lombok.Data;

@Data
public class NotificacaoAceiteRequest {

    @NotNull(message = "Equipe destino é obrigatória")
    private Long equipeDestinoId;
}