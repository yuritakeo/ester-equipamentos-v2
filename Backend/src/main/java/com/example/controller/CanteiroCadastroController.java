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

import com.example.dto.CanteiroRequest;
import com.example.entity.Canteiro;
import com.example.service.CanteiroService;

import lombok.RequiredArgsConstructor;

@RestController
@RequestMapping("/api/canteiro-locais")
@RequiredArgsConstructor
public class CanteiroCadastroController {

    private final CanteiroService service;

    @GetMapping
    public List<Canteiro> listar() {
        return service.listar();
    }

    @PostMapping
    public Canteiro criar(
            @Validated @RequestBody CanteiroRequest request,
            @RequestHeader(value = "X-User-Tipo", required = false) String actorTipo) {
        return service.criar(request, actorTipo);
    }

    @PutMapping("/{id}")
    public Canteiro atualizar(
            @PathVariable Long id,
            @Validated @RequestBody CanteiroRequest request,
            @RequestHeader(value = "X-User-Tipo", required = false) String actorTipo) {
        return service.atualizar(id, request, actorTipo);
    }

    @DeleteMapping("/{id}")
    public void excluir(
            @PathVariable Long id,
            @RequestHeader(value = "X-User-Tipo", required = false) String actorTipo) {
        service.excluir(id, actorTipo);
    }
}
