package com.example.controller;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.web.bind.annotation.*;

import com.example.entity.EmailRemetente;
import com.example.service.EmailRemetenteService;

import lombok.RequiredArgsConstructor;

@RestController
@RequestMapping("/api/emails-remetentes")
@RequiredArgsConstructor
public class EmailRemetenteController {

    private final EmailRemetenteService service;

    @PostMapping
    public EmailRemetente criar(
            @RequestBody EmailRemetente emailRemetente,
            @RequestHeader(value = "X-User-Tipo", required = false) String actorTipo) {

        return service.save(emailRemetente, actorTipo);
    }

    // ✅ CORRIGIDO (paginação)
    @GetMapping
    public Page<EmailRemetente> listar(Pageable pageable) {
        return service.getAll(pageable);
    }

    @GetMapping("/{id}")
    public EmailRemetente buscarPorId(@PathVariable Long id) {
        return service.getById(id);
    }

    @DeleteMapping("/{id}")
    public void deletar(@PathVariable Long id) {
        service.delete(id);
    }
}