package com.example.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Data;

@Data
public class LoginRequest {

    @NotBlank(message = "Username é obrigatório")
    @Size(max = 150, message = "Username deve ter no máximo 150 caracteres")
    private String username;

    @NotBlank(message = "Senha é obrigatória")
    @Size(min = 4, max = 255, message = "Senha deve ter entre 4 e 255 caracteres")
    private String senha;
}

