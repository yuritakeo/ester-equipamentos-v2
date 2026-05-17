package com.example.dto;

import java.math.BigDecimal;

import com.example.enums.ManutencaoStatus;

import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.Data;

@Data
public class ManutencaoRequest {

    @NotNull(message = "Equipamento é obrigatório")
    private Long equipamentoId;

    private Long emailId;

    @NotNull(message = "Status da manutenção é obrigatório")
    private ManutencaoStatus status;

    @Size(max = 500, message = "Observação deve ter no máximo 500 caracteres")
    private String observacao;

    private String descricao;

    private String fotoNotaFiscal;

    private BigDecimal valorTotal;

    private Long equipeDestinoId;

    // Valores aceitos: EQUIPE ou OFICINA
    @Size(max = 50, message = "Destino deve ter no máximo 50 caracteres")
    private String destinoAposConclusao;
}
