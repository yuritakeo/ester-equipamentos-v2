package com.example.entity;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

import org.hibernate.annotations.CreationTimestamp;

import com.fasterxml.jackson.annotation.JsonIgnore;
import com.fasterxml.jackson.annotation.JsonIgnoreProperties;

import jakarta.persistence.*;
import lombok.*;

@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Entity
@Table(name = "checklist_modelo")
public class ChecklistModelo {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private String nome;

    @Column(name = "arquivo_nome")
    private String arquivoNome;

    @Column(name = "arquivo_original_nome")
    private String arquivoOriginalNome;

    @Column(name = "arquivo_caminho")
    private String arquivoCaminho;

    @Lob
    @JsonIgnore
    @Column(name = "arquivo_conteudo")
    private byte[] arquivoConteudo;

    @ManyToMany(fetch = FetchType.LAZY)
    @JoinTable(
            name = "checklist_modelo_equipamento",
            joinColumns = @JoinColumn(name = "checklist_modelo_id"),
            inverseJoinColumns = @JoinColumn(name = "equipamento_id")
    )
    @JsonIgnoreProperties({
            "empresa",
            "equipeResponsavel",
            "equipe",
            "checklistModelos"
    })
    @Builder.Default
    private List<Estoque> equipamentos = new ArrayList<>();

    @CreationTimestamp
    @Column(nullable = false, updatable = false)
    private LocalDateTime data;
}