package com.example.service;

public enum DirecionamentoHistoricoAcao {
    CADASTRO_CANTEIRO("CADASTRO_CANTEIRO"),
    MOVER_PARA_CANTEIRO("MOVER_PARA_CANTEIRO"),
    DIRECIONAR_EQUIPE("DIRECIONAR_EQUIPE"),
    TRANSFERENCIA_EQUIPE("TRANSFERENCIA_EQUIPE"),
    ENTRADA_MANUTENCAO("ENTRADA_MANUTENCAO"),
    RETORNO_MANUTENCAO_EQUIPE("RETORNO_MANUTENCAO_EQUIPE"),
    RETORNO_MANUTENCAO_CANTEIRO("RETORNO_MANUTENCAO_CANTEIRO");

    private final String valor;

    DirecionamentoHistoricoAcao(String valor) {
        this.valor = valor;
    }

    public String valor() {
        return valor;
    }
}
