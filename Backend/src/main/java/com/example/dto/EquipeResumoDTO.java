package com.example.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class EquipeResumoDTO {

    private Long id;
    private String nome;
    private TipoCategoriaResumoDTO tipoCategoria;

    // ✅ Construtor auxiliar seguro
    public EquipeResumoDTO(Long id, String nome, String tipoCategoriaNome) {
        this.id = id;
        this.nome = nome;
        this.tipoCategoria = tipoCategoriaNome != null
                ? new TipoCategoriaResumoDTO(null, tipoCategoriaNome)
                : null;
    }
}