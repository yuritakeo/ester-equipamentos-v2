package com.example.controller;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.web.bind.annotation.*;

import com.example.entity.Email;
import com.example.service.EmailService;

import lombok.RequiredArgsConstructor;

@RestController
@RequestMapping("/api/emails")
@RequiredArgsConstructor
public class EmailController {

    private final EmailService service;

    @PostMapping
    public Email criar(
            @RequestBody Email email,
            @RequestHeader(value = "X-User-Tipo", required = false) String actorTipo) {
        return service.saveEmail(email, actorTipo);
    }

    // ✅ CORRIGIDO: PAGINADO
    @GetMapping
    public Page<Email> listar(Pageable pageable) {
        return service.getAllEmails(pageable);
    }

    @GetMapping("/{id}")
    public Email buscarPorId(@PathVariable Long id) {
        return service.getEmailById(id);
    }

    @DeleteMapping("/{id}")
    public void deletar(@PathVariable Long id) {
        service.deleteEmail(id);
    }
}