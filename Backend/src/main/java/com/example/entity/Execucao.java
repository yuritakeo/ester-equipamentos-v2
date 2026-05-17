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
@Table(name = "execucao")
public class Execucao {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "equipe_id", nullable = false)
    @JsonIgnoreProperties({ "tipoCategoria" })
    private Equipe equipe;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "estoque_id", nullable = false)
    @JsonIgnoreProperties({ "empresa", "equipeResponsavel", "equipe" })
    private Estoque estoque;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "checklist_modelo_id")
    @JsonIgnoreProperties({ "equipamentos" })
    private ChecklistModelo checklistModelo;

    @Column(name = "respostas_json", columnDefinition = "TEXT")
    private String respostasJson;

    @CreationTimestamp
    @Column(nullable = false, updatable = false)
    private LocalDateTime data;
}