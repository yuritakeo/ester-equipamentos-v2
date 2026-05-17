package com.example.dto;

import java.util.Map;

import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class GerarPdfRequest {

    @NotNull(message = "checklistModeloId é obrigatório")
    private Long checklistModeloId;

    @Size(max = 255)
    private String empresa;

    @Size(max = 255)
    private String equipamento;

    @Size(max = 100)
    private String tag;

    @Size(max = 100)
    private String dataChecklist;

    private Map<String, Object> respostas;
}