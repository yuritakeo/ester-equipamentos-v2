package com.example.service;

import org.springframework.stereotype.Service;

import com.example.dto.GerarPdfRequest;
import com.example.exception.BusinessException;

@Service
public class GerarPdfService {

    public PdfGerado gerarPdf(GerarPdfRequest request) {
        throw new BusinessException("Geracao de PDF no backend foi desativada. Gere o PDF pelo painel (navegador).");
    }

    public record PdfGerado(byte[] conteudo, String nomeArquivo) {
    }
}
