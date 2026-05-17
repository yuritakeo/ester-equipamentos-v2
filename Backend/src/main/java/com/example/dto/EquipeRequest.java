package com.example.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Data;

@Data
public class EquipeRequest {

    @NotBlank(message = "Nome da equipe é obrigatório")
    @Size(max = 255, message = "Nome da equipe deve ter no máximo 255 caracteres")
    private String nome;

    private Long tipoCategoriaId;
}