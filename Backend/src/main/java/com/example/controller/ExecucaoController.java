package com.example.controller;

import java.util.List;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.*;

import com.example.dto.ExecucaoPainelDTO;
import com.example.dto.ExecucaoRequest;
import com.example.dto.ExecucaoResumoDTO;
import com.example.entity.Execucao;
import com.example.service.ExecucaoService;

import lombok.RequiredArgsConstructor;

@RestController
@RequestMapping("/api/execucoes")
@RequiredArgsConstructor
public class ExecucaoController {

    private final ExecucaoService service;

    @PostMapping
    public Execucao criar(@Validated @RequestBody ExecucaoRequest request) {
        return service.salvar(request);
    }

    // ✅ CORRIGIDO (paginação)
    @GetMapping
    public Page<Execucao> listar(Pageable pageable) {
        return service.listarPaginado(
                pageable.getPageNumber(),
                pageable.getPageSize()
        );
    }

    // ✅ CORRIGIDO (remove versão sem paginação)
    @GetMapping(value = "/resumo")
    public Page<ExecucaoResumoDTO> listarResumo(Pageable pageable) {
        return service.listarResumoPaginado(
                pageable.getPageNumber(),
                pageable.getPageSize()
        );
    }

    @GetMapping("/{id}")
    public Execucao buscarPorId(@PathVariable Long id) {
        return service.buscarPorId(id);
    }

    // ✅ CORRIGIDO
    @GetMapping("/equipe/{equipeId}")
    public Page<Execucao> listarPorEquipe(
            @PathVariable Long equipeId,
            Pageable pageable) {

        return service.listarPorEquipe(
                equipeId,
                pageable.getPageNumber(),
                pageable.getPageSize()
        );
    }

    // ✅ CORRIGIDO
    @GetMapping("/estoque/{estoqueId}")
    public Page<Execucao> listarPorEstoque(
            @PathVariable Long estoqueId,
            Pageable pageable) {

        return service.listarPorEstoque(
                estoqueId,
                pageable.getPageNumber(),
                pageable.getPageSize()
        );
    }

    // ✅ mantém (já é controlado)
    @GetMapping("/estoque/{estoqueId}/semana-atual")
    public List<ExecucaoPainelDTO> listarSemanaAtualPorEstoque(@PathVariable Long estoqueId) {
        return service.listarSemanaAtualPorEstoque(estoqueId);
    }

    @DeleteMapping("/{id}")
    public void deletar(@PathVariable Long id) {
        service.deletar(id);
    }
}