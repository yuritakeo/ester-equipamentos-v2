package com.example.controller;

import java.util.List;

import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.example.dto.ManutencaoRequest;
import com.example.entity.Manutencao;
import com.example.service.ManutencaoService;

import lombok.RequiredArgsConstructor;

@RestController
@RequestMapping("/api/manutencoes")
@RequiredArgsConstructor
public class ManutencaoController {

    private final ManutencaoService service;

    @PostMapping
    public Manutencao criar(@Validated @RequestBody ManutencaoRequest request) {
        return service.salvar(request);
    }

    @PostMapping("/{id}/submanutencoes")
    public Manutencao criarSubmanutencao(@PathVariable Long id, @Validated @RequestBody ManutencaoRequest request) {
        return service.salvarSubmanutencao(id, request);
    }

    @PutMapping("/{id}")
    public Manutencao atualizar(
            @PathVariable Long id,
            @Validated @RequestBody ManutencaoRequest request,
            @RequestHeader(value = "X-User-Id", required = false) Long actorUserId) {
        return service.atualizar(id, request, actorUserId);
    }

    @GetMapping
    public List<Manutencao> listar() {
        return service.listar();
    }

    @GetMapping("/{id}")
    public Manutencao buscarPorId(@PathVariable Long id) {
        return service.buscarPorId(id);
    }

    @GetMapping("/equipamento/{equipamentoId}")
    public List<Manutencao> listarPorEquipamento(@PathVariable Long equipamentoId) {
        return service.listarPorEquipamento(equipamentoId);
    }

    @DeleteMapping("/{id}")
    public void deletar(@PathVariable Long id) {
        service.deletar(id);
    }
}
