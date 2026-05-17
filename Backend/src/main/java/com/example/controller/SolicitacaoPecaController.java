package com.example.controller;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.*;

import com.example.dto.SolicitacaoPecaRequest;
import com.example.entity.SolicitacaoPeca;
import com.example.service.SolicitacaoPecaService;

import lombok.RequiredArgsConstructor;

@RestController
@RequestMapping("/api/solicitacoes-pecas")
@RequiredArgsConstructor
public class SolicitacaoPecaController {

    private final SolicitacaoPecaService service;

    @PostMapping
    public SolicitacaoPeca criar(@Validated @RequestBody SolicitacaoPecaRequest request) {
        return service.salvar(request);
    }

    // ✅ CORRIGIDO (paginação)
    @GetMapping
    public Page<SolicitacaoPeca> listar(Pageable pageable) {
        return service.listar(pageable);
    }

    @GetMapping("/{id}")
    public SolicitacaoPeca buscarPorId(@PathVariable Long id) {
        return service.buscarPorId(id);
    }

    // ✅ CORRIGIDO
    @GetMapping("/equipamento/{equipamentoId}")
    public Page<SolicitacaoPeca> listarPorEquipamento(
            @PathVariable Long equipamentoId,
            Pageable pageable) {

        return service.listarPorEquipamento(equipamentoId, pageable);
    }

    @DeleteMapping("/{id}")
    public void deletar(@PathVariable Long id) {
        service.deletar(id);
    }
}