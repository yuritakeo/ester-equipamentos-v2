package com.example.entity;

import java.math.BigDecimal;
import java.util.List;

import com.example.dto.ChecklistModeloVinculoDTO;
import com.fasterxml.jackson.annotation.JsonIgnoreProperties;

import jakarta.persistence.*;
import lombok.*;

@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Entity
@Table(name = "estoque")
public class Estoque {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "nome_equipamento", nullable = false, length = 255)
    private String nomeEquipamento;

    @Column(name = "tag_patrimonio", length = 100)
    private String tagPatrimonio;

    @Column(name = "valor_locacao", nullable = false, precision = 10, scale = 2)
    private BigDecimal valorLocacao;

    @Column(name = "valor_unitario", nullable = false, precision = 10, scale = 2)
    private BigDecimal valorUnitario;

    @Column(name = "foto_base64", columnDefinition = "TEXT")
    private String fotoBase64;

    @Column(name = "foto_base64_2", columnDefinition = "TEXT")
    private String fotoBase64Secundaria;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "empresa_id", nullable = false)
    @JsonIgnoreProperties({})
    private Empresa empresa;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "canteiro_id")
    private Canteiro canteiro;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "equipe_id")
    @JsonIgnoreProperties({ "tipoCategoria" })
    private Equipe equipe;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "equipe_responsavel_id")
    @JsonIgnoreProperties({ "tipoCategoria" })
    private Equipe equipeResponsavel;

    @Builder.Default
    @Column(nullable = false)
    private Boolean ativo = true;

    @Transient
    private List<ChecklistModeloVinculoDTO> checklistModelosVinculados;

    @PrePersist
    public void prePersist() {
        if (ativo == null) {
            ativo = true;
        }
    }
}