package com.example.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.Data;

@Data
public class PecaLocadaRequest {

    @NotBlank(message = "Nome da peça é obrigatório")
    @Size(max = 100, message = "Nome da peça deve ter no máximo 100 caracteres")
    private String nome;

    @NotNull(message = "Quantidade é obrigatória")
    private Integer quantidade;
}