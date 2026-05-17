package com.example.controller;

import java.util.List;

import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.example.dto.EquipamentoLocadoRequest;
import com.example.entity.EquipamentoLocado;
import com.example.service.EquipamentoLocadoService;

import lombok.RequiredArgsConstructor;

@RestController
@RequestMapping("/api/equipamentos-locados")
@RequiredArgsConstructor
public class EquipamentoLocadoController {

    private final EquipamentoLocadoService service;

    @GetMapping
    public List<EquipamentoLocado> listar() {
        return service.listar();
    }

    @GetMapping("/{id}")
    public EquipamentoLocado buscarPorId(@PathVariable Long id) {
        return service.buscarPorId(id);
    }

    @PostMapping
    public EquipamentoLocado criar(@Validated @RequestBody EquipamentoLocadoRequest request) {
        return service.salvar(request);
    }

    @PutMapping("/{id}")
    public EquipamentoLocado atualizar(@PathVariable Long id, @Validated @RequestBody EquipamentoLocadoRequest request) {
        return service.atualizar(id, request);
    }

    @DeleteMapping("/{id}")
    public void deletar(@PathVariable Long id) {
        service.deletar(id);
    }
}
