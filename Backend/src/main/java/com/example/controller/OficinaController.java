package com.example.controller;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.*;

import com.example.dto.DirecionarEquipeRequest;
import com.example.dto.OficinaRequest;
import com.example.entity.Estoque;
import com.example.entity.Oficina;
import com.example.service.EstoqueOficinaFacade;
import com.example.service.OficinaService;

import lombok.RequiredArgsConstructor;

@RestController
@RequestMapping({"/api/oficinas", "/api/canteiros"})
@RequiredArgsConstructor
public class OficinaController {

    private final OficinaService service;
    private final EstoqueOficinaFacade estoqueOficinaFacade;

    @PostMapping
    public Oficina criar(@Validated @RequestBody OficinaRequest request) {
        return service.salvar(request);
    }

    // ✅ CORRIGIDO (paginação)
    @GetMapping
    public Page<Oficina> listar(Pageable pageable) {
        return service.listar(pageable);
    }

    @GetMapping("/{id}")
    public Oficina buscarPorId(@PathVariable Long id) {
        return service.buscarPorId(id);
    }

    // ✅ CORRIGIDO
    @GetMapping("/equipamento/{equipamentoId}")
    public Page<Oficina> listarPorEquipamento(
            @PathVariable Long equipamentoId,
            Pageable pageable) {

        return service.listarPorEquipamento(equipamentoId, pageable);
    }

    @DeleteMapping("/{id}")
    public void deletar(@PathVariable Long id) {
        service.deletar(id);
    }

    @PatchMapping("/{id}/direcionar-equipe")
    public Estoque direcionarParaEquipe(
            @PathVariable Long id,
            @Validated @RequestBody DirecionarEquipeRequest request) {
        return estoqueOficinaFacade.direcionarParaEquipe(id, request);
    }
}