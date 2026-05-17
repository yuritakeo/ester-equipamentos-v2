package com.example.dto;

import java.util.List;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Data;

@Data
public class ChecklistModeloRequest {

    @NotBlank(message = "Nome do modelo é obrigatório")
    @Size(max = 255, message = "Nome do modelo deve ter no máximo 255 caracteres")
    private String nome;

    private List<Long> equipamentoIds;
}