package com.example.dto;

import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
public class EstoqueExecucaoResumoDTO {

    private Long id;
    private String nomeEquipamento;
    private String tagPatrimonio;
    private EmpresaResumoDTO empresa;
    private EquipeResumoDTO equipeResponsavel;

    public EstoqueExecucaoResumoDTO(
            Long id,
            String nomeEquipamento,
            String tagPatrimonio,
            Long empresaId,
            String empresaNome,
            Long equipeResponsavelId,
            String equipeResponsavelNome,
            Long equipeResponsavelTipoCategoriaId,
            String equipeResponsavelTipoCategoriaNome) {

        this.id = id;
        this.nomeEquipamento = nomeEquipamento;
        this.tagPatrimonio = tagPatrimonio;

        this.empresa = (empresaId == null && empresaNome == null)
                ? null
                : new EmpresaResumoDTO(empresaId, empresaNome);

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
    }
}