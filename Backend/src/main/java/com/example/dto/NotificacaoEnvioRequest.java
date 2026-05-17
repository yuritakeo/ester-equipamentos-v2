package com.example.dto;

import jakarta.validation.constraints.NotNull;
import lombok.Data;

@Data
public class NotificacaoEnvioRequest {

    @NotNull(message = "Estoque é obrigatório")
    private Long estoqueId;

    @NotNull(message = "Equipe de origem é obrigatória")
    private Long equipeOrigemId;

    @NotNull(message = "Equipe de destino é obrigatória")
    private Long equipeDestinoId;
}