package com.example.controller;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.*;

import com.example.dto.RelatorioListagemDTO;
import com.example.dto.RelatorioEstoqueResumoDTO;
import com.example.dto.RelatorioRequest;
import com.example.entity.Relatorio;
import com.example.service.RelatorioService;

import lombok.RequiredArgsConstructor;

@RestController
@RequestMapping("/api/relatorios")
@RequiredArgsConstructor
public class RelatorioController {

    private final RelatorioService service;

    @PostMapping
    public Relatorio criar(@Validated @RequestBody RelatorioRequest request) {
        return service.salvar(request);
    }

    @PostMapping("/por-execucao/{execucaoId}")
    public Relatorio gerarPorExecucao(@PathVariable Long execucaoId) {
        return service.gerarPorExecucao(execucaoId);
    }

    // ✅ CORRIGIDO (paginação)
    @GetMapping
    public Page<RelatorioListagemDTO> listar(Pageable pageable) {
        return service.listarPaginado(
                pageable.getPageNumber(),
                pageable.getPageSize()
        );
    }

    @GetMapping("/{id}")
    public Relatorio buscarPorId(@PathVariable Long id) {
        return service.buscarPorId(id);
    }

    // ✅ CORRIGIDO
    @GetMapping("/equipe/{equipeId}")
    public Page<Relatorio> listarPorEquipe(
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
    public Page<RelatorioListagemDTO> listarPorEstoque(
            @PathVariable Long estoqueId,
            Pageable pageable) {

        return service.listarPorEstoque(
                estoqueId,
                pageable.getPageNumber(),
                pageable.getPageSize()
        );
    }

    // ✅ já estava correto
    @GetMapping("/estoque/{estoqueId}/resumo")
    public Page<RelatorioEstoqueResumoDTO> listarResumoPorEstoque(
            @PathVariable Long estoqueId,
            Pageable pageable) {

        return service.listarResumoPorEstoque(
                estoqueId,
                pageable.getPageNumber(),
                pageable.getPageSize()
        );
    }

    @DeleteMapping("/{id}")
    public void deletar(@PathVariable Long id) {
        service.deletar(id);
    }
}