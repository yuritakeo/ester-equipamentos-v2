package com.example.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Data;

@Data
public class EmpresaRequest {

    @NotBlank(message = "Nome da empresa é obrigatório")
    @Size(max = 255, message = "Nome da empresa deve ter no máximo 255 caracteres")
    private String nome;
}