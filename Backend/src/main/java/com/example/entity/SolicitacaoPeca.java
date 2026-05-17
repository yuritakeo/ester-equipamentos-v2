package com.example.entity;

import java.time.LocalDateTime;

import org.hibernate.annotations.CreationTimestamp;

import com.example.enums.SolicitacaoPecaStatus;
import com.fasterxml.jackson.annotation.JsonIgnoreProperties;

import jakarta.persistence.*;
import lombok.*;

@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Entity
@Table(name = "solicitacao_peca")
public class SolicitacaoPeca {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "equipamento_id", nullable = false)
    @JsonIgnoreProperties({ "empresa", "equipeResponsavel", "equipe" })
    private Estoque equipamento;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "email_id", nullable = false)
    private Email email;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "email_remetente_id")
    private EmailRemetente emailRemetente;

    @CreationTimestamp
    @Column(name = "data_solicitacao", nullable = false, updatable = false)
    private LocalDateTime dataSolicitacao;

    @Column(length = 255)
    private String assunto;

    @Column(columnDefinition = "TEXT")
    private String descricao;

    @Column(length = 255)
    private String anexoNome;

    @Column(length = 100)
    private String anexoTipo;

    @Column(columnDefinition = "TEXT")
    private String anexoBase64;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 30)
    private SolicitacaoPecaStatus status;
}