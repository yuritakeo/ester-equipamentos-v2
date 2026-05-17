package com.example.controller;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.*;

import com.example.dto.EquipeRequest;
import com.example.entity.Equipe;
import com.example.service.EquipeService;

import lombok.RequiredArgsConstructor;

@RestController
@RequestMapping("/api/equipes")
@RequiredArgsConstructor
public class EquipeController {

    private final EquipeService service;

    @PostMapping
    public Equipe criar(@Validated @RequestBody EquipeRequest request) {
        return service.salvar(request);
    }

    // ✅ CORRIGIDO (paginação)
    @GetMapping
    public Page<Equipe> listar(Pageable pageable) {
        return service.listar(pageable);
    }

    @GetMapping("/{id}")
    public Equipe buscarPorId(@PathVariable Long id) {
        return service.buscarPorId(id);
    }

    @PutMapping("/{id}")
    public Equipe atualizar(
            @PathVariable Long id,
            @Validated @RequestBody EquipeRequest request) {
        return service.atualizar(id, request);
    }

    @PatchMapping("/{id}/inativar")
    public Equipe inativar(@PathVariable Long id) {
        return service.inativar(id);
    }

    @DeleteMapping("/{id}")
    public void deletar(@PathVariable Long id) {
        service.deletar(id);
    }
}