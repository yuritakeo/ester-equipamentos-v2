package com.example.dto;

import java.time.LocalDateTime;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class ExecucaoPainelDTO {

    private Long id;
    private LocalDateTime data;
    private String respostasJson;
    private EstoqueExecucaoResumoDTO estoque;
    private ChecklistModeloResumoDTO checklistModelo;

}