package com.example.dto;

import java.math.BigDecimal;

import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
public class EstoqueListagemDTO {

    private Long id;
    private String nomeEquipamento;
    private String tagPatrimonio;
    private BigDecimal valorLocacao;
    private BigDecimal valorUnitario;
    private EmpresaResumoDTO empresa;
    private CanteiroResumoDTO canteiro;
    private EquipeResumoDTO equipe;
    private EquipeResumoDTO equipeResponsavel;
    private Integer quantidadeFotos;

    public EstoqueListagemDTO(
            Long id,
            String nomeEquipamento,
            String tagPatrimonio,
            BigDecimal valorLocacao,
            BigDecimal valorUnitario,
            Long empresaId,
            String empresaNome,
            Long canteiroId,
            String canteiroNome,
            Long equipeId,
            String equipeNome,
            Long equipeTipoCategoriaId,
            String equipeTipoCategoriaNome,
            Long equipeResponsavelId,
            String equipeResponsavelNome,
            Long equipeResponsavelTipoCategoriaId,
            String equipeResponsavelTipoCategoriaNome,
            Integer quantidadeFotos) {

        this.id = id;
        this.nomeEquipamento = nomeEquipamento;
        this.tagPatrimonio = tagPatrimonio;
        this.valorLocacao = valorLocacao;
        this.valorUnitario = valorUnitario;

        this.empresa = (empresaId == null && empresaNome == null)
                ? null
                : new EmpresaResumoDTO(empresaId, empresaNome);

        this.canteiro = (canteiroId == null && canteiroNome == null)
                ? null
                : new CanteiroResumoDTO(canteiroId, canteiroNome);

        this.equipe = (equipeId == null && equipeNome == null)
                ? null
                : new EquipeResumoDTO(
                equipeId,
                equipeNome,
                (equipeTipoCategoriaId == null && equipeTipoCategoriaNome == null)
                        ? null
                        : new TipoCategoriaResumoDTO(
                        equipeTipoCategoriaId,
                        equipeTipoCategoriaNome
                )
        );

        this.equipeResponsavel = (equipeResponsavelId == null && equipeResponsavelNome == null)
                ? null
                : new EquipeResumoDTO(
                equipeResponsavelId,
                equipeResponsavelNome,
                (equipeResponsavelTipoCategoriaId == null && equipeResponsavelTipoCategoriaNome == null)
                        ? null
                        : new TipoCategoriaResumoDTO(
                        equipeResponsavelTipoCategoriaId,
                        equipeResponsavelTipoCategoriaNome
                )
        );

        this.quantidadeFotos = quantidadeFotos == null ? 0 : quantidadeFotos;
    }
}