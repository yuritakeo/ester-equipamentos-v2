package com.example.entity;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.List;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;

import jakarta.persistence.*;
import lombok.*;

@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Entity
@Table(name = "equipamentos_locados")
public class EquipamentoLocado {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "nome_locado", nullable = false, length = 100)
    private String nomeLocado;

    @Column(length = 100)
    private String contrato;

    @Column(length = 100)
    private String tag;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "empresa_id", nullable = false)
    @JsonIgnoreProperties({})
    private Empresa empresa;

    @Column(nullable = false)
    private Integer quantidade;

    @Column(name = "valor_locacao", precision = 10, scale = 2)
    private BigDecimal valorLocacao;

    @Column(name = "valor_unitario", precision = 10, scale = 2)
    private BigDecimal valorUnitario;

    @Column(name = "foto_url", columnDefinition = "TEXT")
    private String fotoUrl;

    @Column(name = "foto_url_2", columnDefinition = "TEXT")
    private String fotoUrl2;

    @Column(length = 20)
    private String status;

    @Column(length = 100)
    private String obra;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "equipe_id")
    @JsonIgnoreProperties({ "tipoCategoria" })
    private Equipe equipe;

    @Column(name = "data_locacao", length = 100)
    private String dataLocacao;

    @Column(name = "data_saida", length = 100)
    private String dataSaida;

    @Column(name = "indenizacao_valor", precision = 10, scale = 2)
    private BigDecimal indenizacaoValor;

    @Column(name = "indenizacao_descricao", columnDefinition = "TEXT")
    private String indenizacaoDescricao;

    @Builder.Default
    @OneToMany(
            mappedBy = "equipamentoLocado",
            cascade = CascadeType.ALL,
            orphanRemoval = true,
            fetch = FetchType.LAZY
    )
    @OrderBy("id ASC")
    @JsonIgnoreProperties({ "equipamentoLocado" })
    private List<PecaLocada> pecas = new ArrayList<>();
}