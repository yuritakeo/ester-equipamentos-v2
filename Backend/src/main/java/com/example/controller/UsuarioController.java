package com.example.controller;

import jakarta.transaction.Transactional;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.*;

import com.example.dto.UsuarioRequest;
import com.example.dto.UsuarioResponse;
import com.example.service.UsuarioService;

import lombok.RequiredArgsConstructor;

@RestController
@RequestMapping("/api/usuarios")
@RequiredArgsConstructor
public class UsuarioController {

    private final UsuarioService service;

    @GetMapping("/{id}")
    public UsuarioResponse getById(@PathVariable Long id) {
        return service.getById(id);
    }

    @DeleteMapping("/{id}")
    public void delete(@PathVariable Long id) {
        service.delete(id);
    }

    @PostMapping
    @Transactional
    public UsuarioResponse save(
            @Validated @RequestBody UsuarioRequest request,
            @RequestHeader(value = "X-User-Tipo", required = false) String actorTipo) {
        return service.save(request, actorTipo);
    }

    @PutMapping("/{id}")
    public UsuarioResponse update(
            @PathVariable Long id,
            @Validated @RequestBody UsuarioRequest request,
            @RequestHeader(value = "X-User-Tipo", required = false) String actorTipo) {
        return service.update(id, request, actorTipo);
    }

    @PatchMapping("/{id}/inativar")
    public UsuarioResponse inativar(@PathVariable Long id) {
        return service.inativar(id);
    }

    // ✅ CORRIGIDO (paginação)
    @GetMapping
    public Page<UsuarioResponse> getAll(Pageable pageable) {
        return service.getAll(pageable);
    }
}