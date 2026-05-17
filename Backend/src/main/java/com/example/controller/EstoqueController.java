package com.example.controller;

import java.util.List;
import java.util.Map;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import com.example.dto.DirecionarEquipeRequest;
import com.example.dto.EstoqueExclusaoLoteRequest;
import com.example.dto.EstoqueListagemDTO;
import com.example.dto.EstoqueRequest;
import com.example.entity.Estoque;
import com.example.service.EstoqueOficinaFacade;
import com.example.service.EstoqueService;

import lombok.RequiredArgsConstructor;

@RestController
@RequestMapping("/api/estoques")
@RequiredArgsConstructor
public class EstoqueController {

    private final EstoqueService service;
    private final EstoqueOficinaFacade estoqueOficinaFacade;

    @PatchMapping("/{id}/mover-para-oficina")
    public Estoque moverParaOficina(@PathVariable Long id) {
        return estoqueOficinaFacade.moverParaOficina(id);
    }

    @PatchMapping("/{id}/mover-para-canteiro")
    public Estoque moverParaCanteiro(@PathVariable Long id) {
        return estoqueOficinaFacade.moverParaOficina(id);
    }

    @PostMapping
    public Estoque criarEstoque(@Validated @RequestBody EstoqueRequest request) {
        Estoque estoque = service.salvar(request);
        estoqueOficinaFacade.registrarNaOficina(estoque);
        return estoque;
    }

    @PutMapping("/{id}")
    public Estoque atualizarEstoque(@PathVariable Long id, @Validated @RequestBody EstoqueRequest request) {
        return service.atualizar(id, request);
    }

    @PatchMapping("/{id}/direcionar-equipe")
    public Estoque direcionarEquipe(@PathVariable Long id, @Validated @RequestBody DirecionarEquipeRequest request) {
        return service.direcionarParaEquipe(id, request.getEquipeId());
    }

    @GetMapping("/{id}")
    public Estoque obterEstoque(@PathVariable Long id) {
        return service.getEstoqueById(id);
    }

    @DeleteMapping("/{id}")
    public void deletarEstoque(@PathVariable Long id) {
        service.deletar(id);
    }

    @DeleteMapping
    public Map<String, Integer> deletarTodosEstoques(
            @RequestHeader(value = "X-User-Tipo", required = false) String actorTipo) {
        return service.deletarTodosAtivos(actorTipo);
    }

    @PostMapping("/exclusao-lote")
    public Map<String, Integer> deletarEstoquesFiltrados(
            @RequestHeader(value = "X-User-Tipo", required = false) String actorTipo,
            @RequestBody EstoqueExclusaoLoteRequest request) {
        return service.deletarTodosAtivos(actorTipo, request == null ? null : request.getIds());
    }

    @GetMapping
    public Page<EstoqueListagemDTO> listarEstoques(Pageable pageable) {
        return service.listarPaginado(pageable.getPageNumber(), pageable.getPageSize());
    }


    @GetMapping(params = { "page", "size" })
    public Page<EstoqueListagemDTO> listarEstoquesPaginado(
            @RequestParam int page,
            @RequestParam int size) {
        return service.listarPaginado(page, size);
    }

    @GetMapping("/empresa/{empresaId}")
    public Page<EstoqueListagemDTO> listarPorEmpresa(
            @PathVariable Long empresaId,
            Pageable pageable) {

        return service.listarPorEmpresaPaginado(
                empresaId,
                pageable.getPageNumber(),
                pageable.getPageSize()
        );
    }

    @GetMapping(value = "/empresa/{empresaId}", params = { "page", "size" })
    public Page<EstoqueListagemDTO> listarPorEmpresaPaginado(
            @PathVariable Long empresaId,
            @RequestParam int page,
            @RequestParam int size) {
        return service.listarPorEmpresaPaginado(empresaId, page, size);
    }
}
