package com.example.entity;

import java.math.BigDecimal;
import java.time.LocalDateTime;

import org.hibernate.annotations.CreationTimestamp;

import jakarta.persistence.*;
import lombok.*;

@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Entity
@Table(name = "direcionamento_historico")
public class DirecionamentoHistorico {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "equipamento_id_snapshot", nullable = false)
    private Long equipamentoIdSnapshot;

    @Column(name = "nome_equipamento_snapshot", nullable = false, length = 255)
    private String nomeEquipamentoSnapshot;

    @Column(name = "tag_patrimonio_snapshot", length = 100)
    private String tagPatrimonioSnapshot;

    @Column(name = "empresa_nome_snapshot", length = 255)
    private String empresaNomeSnapshot;

    @Column(name = "valor_unitario_snapshot", precision = 19, scale = 2)
    private BigDecimal valorUnitarioSnapshot;

    @Column(name = "acao", nullable = false, length = 60)
    private String acao;

    @Column(name = "origem_tipo", nullable = false, length = 40)
    private String origemTipo;

    @Column(name = "origem_referencia_id")
    private Long origemReferenciaId;

    @Column(name = "origem_nome_snapshot", nullable = false, length = 255)
    private String origemNomeSnapshot;

    @Column(name = "origem_categoria_snapshot", length = 100)
    private String origemCategoriaSnapshot;

    @Column(name = "destino_tipo", nullable = false, length = 40)
    private String destinoTipo;

    @Column(name = "destino_referencia_id")
    private Long destinoReferenciaId;

    @Column(name = "destino_nome_snapshot", nullable = false, length = 255)
    private String destinoNomeSnapshot;

    @Column(name = "destino_categoria_snapshot", length = 100)
    private String destinoCategoriaSnapshot;

    @Column(length = 500)
    private String observacao;

    @CreationTimestamp
    @Column(name = "data_evento", nullable = false, updatable = false)
    private LocalDateTime dataEvento;
}