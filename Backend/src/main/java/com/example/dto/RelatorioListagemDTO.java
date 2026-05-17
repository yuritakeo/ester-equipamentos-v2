package com.example.dto;

import java.time.LocalDateTime;

public record RelatorioListagemDTO(
        Long id,
        LocalDateTime data,
        EquipeDTO equipe,
        ExecucaoDTO checklistExecucao,
        EstoqueDTO estoque) {

    public record TipoCategoriaDTO(Long id, String nome) {
    }

    public record EquipeDTO(Long id, String nome, TipoCategoriaDTO tipoCategoria) {
    }

    public record EmpresaDTO(Long id, String nome) {
    }

    public record EstoqueDTO(
            Long id,
            String nomeEquipamento,
            String tagPatrimonio,
            Boolean ativo,
            EmpresaDTO empresa,
            EquipeDTO equipeResponsavel) {
    }

    public record ChecklistModeloDTO(Long id, String nome, String arquivoNome) {
    }

    public record ExecucaoDTO(
            Long id,
            LocalDateTime data,
            String respostasJson,
            EquipeDTO equipe,
            EstoqueDTO estoque,
            ChecklistModeloDTO checklistModelo) {
    }
}