package com.example.entity;

import java.time.LocalDateTime;

import org.hibernate.annotations.CreationTimestamp;

import com.example.enums.NotificacaoStatus;
import com.fasterxml.jackson.annotation.JsonIgnoreProperties;

import jakarta.persistence.*;
import lombok.*;

@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Entity
@Table(name = "notificacao")
public class Notificacao {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "estoque_id", nullable = false)
    @JsonIgnoreProperties({ "empresa", "equipeResponsavel", "equipe" })
    private Estoque estoque;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "equipe_origem_id", nullable = false)
    private Equipe equipeOrigem;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "equipe_destino_id", nullable = false)
    private Equipe equipeDestino;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private NotificacaoStatus status;

    @CreationTimestamp
    @Column(nullable = false, updatable = false)
    private LocalDateTime dataCriacao;

    @Column(name = "data_resposta")
    private LocalDateTime dataResposta;
}