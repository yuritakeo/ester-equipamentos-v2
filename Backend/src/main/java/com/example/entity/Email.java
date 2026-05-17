package com.example.entity;

import com.example.enums.EmailTipo;

import jakarta.persistence.*;
import lombok.*;

@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Entity
@Table(name = "email")
public class Email {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "email", nullable = false, length = 255)
    private String email;

    @Column(name = "nome", length = 255)
    private String nome;

    @Column(name = "setor", length = 100)
    private String setor;

    @Enumerated(EnumType.STRING)
    @Column(name = "tipo", length = 30, nullable = false)
    @Builder.Default
    private EmailTipo tipo = EmailTipo.DESTINATARIO;

    @PrePersist
    public void prePersist() {
        if (tipo == null) {
            tipo = EmailTipo.DESTINATARIO;
        }
    }
}