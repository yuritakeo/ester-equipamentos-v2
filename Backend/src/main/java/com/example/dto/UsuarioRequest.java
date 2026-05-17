package com.example.dto;

import com.fasterxml.jackson.annotation.JsonAlias;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Data;

@Data
public class UsuarioRequest {

    @NotBlank(message = "Username é obrigatório")
    @Size(max = 150, message = "Username deve ter no máximo 150 caracteres")
    private String username;

    @Size(min = 4, max = 255, message = "Senha deve ter entre 4 e 255 caracteres")
    private String senha;

    @JsonAlias("nomeEquipe")
    private Long equipeId;

    @JsonAlias("equipe")
    private String nomeEquipe;

    @JsonAlias({ "tipoCategoriaId", "tipoCadastroId", "tipo_cadastro" })
    private Long tipoCadastroId;
}