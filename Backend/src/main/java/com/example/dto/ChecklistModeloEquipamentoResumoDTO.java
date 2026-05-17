package com.example.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class ChecklistModeloEquipamentoResumoDTO {

    private Long id;
    private String nomeEquipamento;
    private String tagPatrimonio;
}