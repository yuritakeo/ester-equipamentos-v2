package com.example.dto;

import java.math.BigDecimal;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.Data;

@Data
@lombok.Builder
public class EstoqueRequest {

    @NotBlank(message = "Nome do equipamento é obrigatório")
    @Size(max = 255, message = "Nome do equipamento deve ter no máximo 255 caracteres")
    private String nomeEquipamento;

    @Size(max = 100, message = "Tag de patrimônio deve ter no máximo 100 caracteres")
    private String tagPatrimonio;

    private BigDecimal valorUnitario;

    private BigDecimal valorLocacao;

    private String fotoBase64;

    private String fotoBase64Secundaria;

    private Boolean atualizarFotos;

    @NotNull(message = "Empresa é obrigatória")
    private Long empresaId;

    private Long canteiroId;

    private Long equipeResponsavelId;

    // ✅ relacionamento direto com equipe
    private Long equipeId;
}