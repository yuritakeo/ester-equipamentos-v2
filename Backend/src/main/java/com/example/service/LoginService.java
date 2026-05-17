package com.example.service;

import java.util.Locale;

import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

import com.example.entity.Usuario;
import com.example.exception.BusinessException;
import com.example.repository.UsuarioRepository;

import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
public class LoginService {

    private final UsuarioRepository usuarioRepository;
    private final PasswordEncoder passwordEncoder;

    public Usuario authenticate(String username, String senha) {

        String normalizedUsername = username == null
                ? ""
                : username.trim().toUpperCase(Locale.ROOT);

        Usuario user = usuarioRepository.findByUsernameIgnoreCase(normalizedUsername)
                .orElseThrow(() -> new BusinessException("USUARIO_NAO_ENCONTRADO"));

        if (!passwordEncoder.matches(senha, user.getSenha())) {
            throw new BusinessException("SENHA_INVALIDA");
        }

        // ✅ usuário deve estar ativo
        if (user.getAtivo() == null || !user.getAtivo()) {
            throw new BusinessException("USUARIO_INATIVO");
        }

        // ✅ usuario (evita Lazy + no Session)
        Usuario usuario = usuarioRepository.buscarCompleto(user.getId())
                .orElseThrow(() -> new RuntimeException("Erro ao carregar usuario completo"));

        // ✅ equipe válida
        if (usuario.getEquipe() == null
                || usuario.getEquipe().getAtivo() == null
                || !usuario.getEquipe().getAtivo()) {
            throw new BusinessException("EQUIPE_INVALIDA");
        }

        return usuario;
    }
}