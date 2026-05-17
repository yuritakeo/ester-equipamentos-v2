package com.example.controller;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.web.bind.annotation.*;

import com.example.entity.TipoCategoria;
import com.example.service.TipoCategoriaService;

import lombok.RequiredArgsConstructor;

@RestController
@RequestMapping("/api/tipo-categoria")
@RequiredArgsConstructor
public class TipoCategoriaController {

    private final TipoCategoriaService service;

    @GetMapping("/{id}")
    public TipoCategoria getTipoCategoriaById(@PathVariable Long id) {
        return service.getTipoCategoriaById(id);
    }

    @PostMapping
    public TipoCategoria salvar(
            @RequestBody TipoCategoria tipoCategoria,
            @RequestHeader(value = "X-User-Tipo", required = false) String actorTipo) {
        return service.salvar(tipoCategoria, actorTipo);
    }

    @DeleteMapping("/{id}")
    public void deletar(@PathVariable Long id) {
        service.deletar(id);
    }

    // ✅ CORRIGIDO
    @GetMapping
    public Page<TipoCategoria> listar(Pageable pageable) {
        return service.listar(pageable);
    }
}
