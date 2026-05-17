package com.example.controller;

import java.util.List;

import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import com.example.dto.NotificacaoAceiteRequest;
import com.example.dto.NotificacaoEnvioRequest;
import com.example.entity.Notificacao;
import com.example.service.NotificacaoService;

import lombok.RequiredArgsConstructor;

@RestController
@RequestMapping("/api/notificacoes")
@RequiredArgsConstructor
public class NotificacaoController {

    private final NotificacaoService notificacaoService;

    @PostMapping("/transferencia")
    public Notificacao enviar(@Validated @RequestBody NotificacaoEnvioRequest request) {
        return notificacaoService.enviar(request);
    }

    @GetMapping("/transferencia/recebidas/{equipeId}")
    public List<Notificacao> listarRecebidas(
            @PathVariable Long equipeId,
            @RequestParam(required = false) String status) {
        return notificacaoService.listarRecebidas(equipeId, status);
    }

    @PatchMapping("/transferencia/{id}/aceitar")
    public Notificacao aceitar(
            @PathVariable Long id,
            @Validated @RequestBody NotificacaoAceiteRequest request) {
        return notificacaoService.aceitar(id, request);
    }
}
