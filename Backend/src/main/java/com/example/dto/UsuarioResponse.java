package com.example.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class UsuarioResponse {

    private Long id;
    private String username;
    private Long equipeId;
    private String equipe;
    private Long tipoCadastroId;
    private String tipoCadastro;
    private Long tipoCategoriaId;
    private String tipoCategoria;
    private Boolean ativo;
    private String tipoUsuario; // ADMIN, GERENCIA, etc.
}
