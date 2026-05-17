package com.example.repository;

import java.time.LocalDateTime;

public interface ChecklistModeloListagemProjection {
    Long getId();

    String getNome();

    String getArquivoNome();

    String getArquivoOriginalNome();

    LocalDateTime getData();
}
