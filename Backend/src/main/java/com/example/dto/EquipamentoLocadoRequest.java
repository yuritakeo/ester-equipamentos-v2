package com.example.dto;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.List;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.Data;

@Data
public class EquipamentoLocadoRequest {

    @NotBlank(message = "Nome do equipamento é obrigatório")
    @Size(max = 100, message = "Nome do equipamento deve ter no máximo 100 caracteres")
    private String nomeLocado;

    @Size(max = 100, message = "Contrato deve ter no máximo 100 caracteres")
    private String contrato;

    @Size(max = 100, message = "Tag deve ter no máximo 100 caracteres")
    private String tag;

    @NotNull(message = "Empresa é obrigatória")
    private Long empresaId;

    @NotNull(message = "Quantidade é obrigatória")
    private Integer quantidade;

    private BigDecimal valorLocacao;

    private BigDecimal valorUnitario;

    private String fotoUrl;

    private String fotoUrl2;

    @Size(max = 20)
    private String status;

    @Size(max = 100)
    private String obra;

    private Long equipeId;

    private String dataLocacao;

    private String dataSaida;

    private BigDecimal indenizacaoValor;

    private String indenizacaoDescricao;

    @Valid
    private List<PecaLocadaRequest> pecas = new ArrayList<>();
}