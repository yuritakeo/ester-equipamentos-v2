package com.example.controller;

import org.springframework.core.io.Resource;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import com.example.dto.ChecklistModeloListagemDTO;
import com.example.dto.ChecklistModeloRequest;
import com.example.entity.ChecklistModelo;
import com.example.service.ChecklistModeloService;

import lombok.RequiredArgsConstructor;

@RestController
@RequestMapping("/api/checklist-modelos")
@RequiredArgsConstructor
public class ChecklistModeloController {

    private final ChecklistModeloService service;

    @PostMapping
    public ChecklistModelo criar(@Validated @RequestBody ChecklistModeloRequest request) {
        return service.salvar(request);
    }

    @PostMapping("/importar")
    public ChecklistModelo importar(
            @RequestParam(value = "nome", required = false) String nome,
            @RequestParam("arquivo") MultipartFile arquivo) {
        return service.importar(nome, arquivo);
    }

    @PostMapping("/{id}/arquivo")
    public ChecklistModelo atualizarArquivo(
            @PathVariable Long id,
            @RequestParam("arquivo") MultipartFile arquivo) {
        return service.atualizarArquivo(id, arquivo);
    }

    @PutMapping("/{id}")
    public ChecklistModelo atualizar(@PathVariable Long id, @Validated @RequestBody ChecklistModeloRequest request) {
        return service.atualizar(id, request);
    }

    @GetMapping
    public Page<ChecklistModeloListagemDTO> listar(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {

        return service.listarResumo(PageRequest.of(page, size));
    }

    @GetMapping("/{id}")
    public ChecklistModelo buscarPorId(@PathVariable Long id) {
        return service.buscarPorId(id);
    }

    @GetMapping("/{id}/arquivo")
    public ResponseEntity<Resource> baixarArquivo(@PathVariable Long id) {
        Resource resource = service.baixarArquivo(id);
        String nomeArquivo = service.getArquivoOriginalNome(id);

        return ResponseEntity.ok()
                .contentType(MediaType.APPLICATION_OCTET_STREAM)
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"" + nomeArquivo + "\"")
                .body(resource);
    }

    @DeleteMapping("/{id}")
    public void deletar(@PathVariable Long id) {
        service.deletar(id);
    }
}