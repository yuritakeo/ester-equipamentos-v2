package com.example.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Data;

@Data
public class CanteiroRequest {

    @NotBlank(message = "Nome do canteiro é obrigatório")
    @Size(max = 100, message = "Nome do canteiro deve ter no máximo 100 caracteres")
    private String nome;
}