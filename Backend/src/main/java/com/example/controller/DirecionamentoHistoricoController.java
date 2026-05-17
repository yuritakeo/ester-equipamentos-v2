package com.example.controller;

import java.util.List;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.example.dto.DirecionamentoHistoricoDTO;
import com.example.service.DirecionamentoHistoricoService;

import lombok.RequiredArgsConstructor;

@RestController
@RequestMapping("/api/historico-direcionamentos")
@RequiredArgsConstructor
public class DirecionamentoHistoricoController {

    private final DirecionamentoHistoricoService service;

    @GetMapping
    public List<DirecionamentoHistoricoDTO> listar() {
        return service.listarTodos();
    }
}
