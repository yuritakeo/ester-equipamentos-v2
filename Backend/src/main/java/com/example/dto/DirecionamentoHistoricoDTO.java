package com.example.dto;

import java.math.BigDecimal;
import java.time.LocalDateTime;

import com.example.entity.DirecionamentoHistorico;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class DirecionamentoHistoricoDTO {

    private Long id;
    private Long equipamentoId;
    private String nomeEquipamento;
    private String tagPatrimonio;
    private String empresaNome;
    private BigDecimal valorUnitario;
    private String acao;
    private String origemTipo;
    private Long origemReferenciaId;
    private String origemNome;
    private String origemCategoria;
    private String destinoTipo;
    private Long destinoReferenciaId;
    private String destinoNome;
    private String destinoCategoria;
    private String observacao;
    private LocalDateTime dataEvento;

    // ✅ Construtor de conversão para evitar duplicação de lógica no service
    public DirecionamentoHistoricoDTO(DirecionamentoHistorico entity) {
        if (entity != null) {
            this.id = entity.getId();
            this.equipamentoId = entity.getEquipamentoIdSnapshot();
            this.nomeEquipamento = entity.getNomeEquipamentoSnapshot();
            this.tagPatrimonio = entity.getTagPatrimonioSnapshot();
            this.empresaNome = entity.getEmpresaNomeSnapshot();
            this.valorUnitario = entity.getValorUnitarioSnapshot();
            this.acao = entity.getAcao();
            this.origemTipo = entity.getOrigemTipo();
            this.origemReferenciaId = entity.getOrigemReferenciaId();
            this.origemNome = entity.getOrigemNomeSnapshot();
            this.origemCategoria = entity.getOrigemCategoriaSnapshot();
            this.destinoTipo = entity.getDestinoTipo();
            this.destinoReferenciaId = entity.getDestinoReferenciaId();
            this.destinoNome = entity.getDestinoNomeSnapshot();
            this.destinoCategoria = entity.getDestinoCategoriaSnapshot();
            this.observacao = entity.getObservacao();
            this.dataEvento = entity.getDataEvento();
        }
    }
}