package com.example.entity;

import java.time.LocalDateTime;

import org.hibernate.annotations.CreationTimestamp;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;

import jakarta.persistence.*;
import lombok.*;

@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Entity
@Table(name = "oficina")
public class Oficina {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "equipamento_id", nullable = false)
    @JsonIgnoreProperties({ "empresa", "equipeResponsavel", "equipe" })
    private Estoque equipamento;

    @CreationTimestamp
    @Column(nullable = false, updatable = false)
    private LocalDateTime data;

    @Column(length = 500)
    private String observacao;
}