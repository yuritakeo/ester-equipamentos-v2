package com.example.controller;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.*;

import com.example.dto.EmpresaRequest;
import com.example.entity.Empresa;
import com.example.service.EmpresaService;

@RestController
@RequestMapping("/api/empresas")
public class EmpresaController {

    private final EmpresaService service;

    public EmpresaController(EmpresaService service) {
        this.service = service;
    }

    @PostMapping
    public Empresa criar(
            @Validated @RequestBody EmpresaRequest request,
            @RequestHeader(value = "X-User-Tipo", required = false) String actorTipo) {
        return service.salvar(request, actorTipo);
    }

    @PutMapping("/{id}")
    public Empresa atualizar(
            @PathVariable Long id,
            @Validated @RequestBody EmpresaRequest request,
            @RequestHeader(value = "X-User-Tipo", required = false) String actorTipo) {
        return service.atualizar(id, request, actorTipo);
    }

    // ✅ CORRIGIDO (paginação)
    @GetMapping
    public Page<Empresa> listar(Pageable pageable) {
        return service.listar(pageable);
    }

    @GetMapping("/{id}")
    public Empresa buscarPorId(@PathVariable Long id) {
        return service.getEmpresaById(id);
    }

    @DeleteMapping("/{id}")
    public void deletar(
            @PathVariable Long id,
            @RequestHeader(value = "X-User-Tipo", required = false) String actorTipo) {
        service.deletar(id, actorTipo);
    }
}
