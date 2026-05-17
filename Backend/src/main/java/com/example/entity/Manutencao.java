package com.example.entity;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

import org.hibernate.annotations.CreationTimestamp;

import com.example.enums.ManutencaoStatus;
import com.fasterxml.jackson.annotation.JsonIgnoreProperties;

import jakarta.persistence.*;
import lombok.*;

@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Entity
@Table(name = "manutencao")
public class Manutencao {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "equipamento_id")
    @JsonIgnoreProperties({ "empresa", "equipeResponsavel", "equipe" })
    private Estoque equipamento;

    @Column(name = "nome_equipamento_snapshot", length = 255)
    private String nomeEquipamentoSnapshot;

    @Column(name = "tag_patrimonio_snapshot", length = 100)
    private String tagPatrimonioSnapshot;

    @Column(name = "canteiro_id_snapshot")
    private Long canteiroIdSnapshot;

    @Column(name = "canteiro_nome_snapshot", length = 100)
    private String canteiroNomeSnapshot;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "equipe_ultima_id")
    private Equipe equipeUltima;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "equipe_conclusao_id")
    private Equipe equipeConclusao;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "manutencao_pai_id")
    @JsonIgnoreProperties({ "subManutencoes", "manutencaoPai" })
    private Manutencao manutencaoPai;

    @Builder.Default
    @OneToMany(
            mappedBy = "manutencaoPai",
            fetch = FetchType.LAZY,
            cascade = CascadeType.ALL,
            orphanRemoval = true
    )
    @OrderBy("dataEntrada DESC")
    @JsonIgnoreProperties({ "manutencaoPai", "subManutencoes" })
    private List<Manutencao> subManutencoes = new ArrayList<>();

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 30)
    private ManutencaoStatus status;

    @CreationTimestamp
    @Column(name = "data_entrada", nullable = false, updatable = false)
    private LocalDateTime dataEntrada;

    @Column(name = "data_saida")
    private LocalDateTime dataSaida;

    @Column(name = "valor_total", precision = 12, scale = 2)
    private BigDecimal valorTotal;

    @Column(name = "valor_unitario_equipamento", precision = 12, scale = 2)
    private BigDecimal valorUnitarioEquipamento;

    @Column(columnDefinition = "TEXT")
    private String descricao;

    @Column(length = 500)
    private String observacao;

    @Column(name = "foto_nota_fiscal", columnDefinition = "TEXT")
    private String fotoNotaFiscal;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "email_id")
    private Email email;
}