package com.example.service;

import com.example.entity.Estoque;

public record DirecionamentoHistoricoCommand(
    String acao,
    String origemTipo,
    Long origemReferenciaId,
    String origemNome,
    String origemCategoria,
    String destinoTipo,
    Long destinoReferenciaId,
    String destinoNome,
    String destinoCategoria,
    String observacao,
    Estoque estoque) {

}
