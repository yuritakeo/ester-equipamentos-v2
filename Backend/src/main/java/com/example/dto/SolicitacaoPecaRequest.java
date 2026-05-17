package com.example.dto;

import com.example.enums.SolicitacaoPecaStatus;

import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.Data;

@Data
public class SolicitacaoPecaRequest {

    @NotNull(message = "Equipamento é obrigatório")
    private Long equipamentoId;

    @NotNull(message = "Email destinatário é obrigatório")
    private Long emailId;

    private Long emailRemetenteId;

    @Size(max = 255, message = "Assunto deve ter no máximo 255 caracteres")
    private String assunto;

    private String descricao;

    @Size(max = 255, message = "Nome do anexo deve ter no máximo 255 caracteres")
    private String anexoNome;

    @Size(max = 100, message = "Tipo do anexo deve ter no máximo 100 caracteres")
    private String anexoTipo;

    private String anexoBase64;

    private SolicitacaoPecaStatus status;
}