package com.example.controller;

import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.example.dto.GerarPdfRequest;
import com.example.service.GerarPdfService;
import com.example.service.GerarPdfService.PdfGerado;

import lombok.RequiredArgsConstructor;

@RestController
@RequestMapping("/api")
@RequiredArgsConstructor
public class PdfController {

    private final GerarPdfService gerarPdfService;

    @PostMapping(value = "/gerar-pdf", produces = MediaType.APPLICATION_PDF_VALUE)
    public ResponseEntity<byte[]> gerarPdf(@Validated @RequestBody GerarPdfRequest request) {
        PdfGerado arquivo = gerarPdfService.gerarPdf(request);
        String nomeArquivo = sanitizarNomeArquivo(arquivo.nomeArquivo());

        return ResponseEntity.ok()
                .contentType(MediaType.APPLICATION_PDF)
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"" + nomeArquivo + "\"")
                .body(arquivo.conteudo());
    }

    private String sanitizarNomeArquivo(String nomeArquivo) {
        if (nomeArquivo == null || nomeArquivo.isBlank()) {
            return "checklist.pdf";
        }

        return nomeArquivo
                .replace("\"", "_")
                .replace("\r", "_")
                .replace("\n", "_");
    }
}
