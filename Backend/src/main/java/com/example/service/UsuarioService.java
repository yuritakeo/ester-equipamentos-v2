package com.example.service;

import java.util.Locale;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

import com.example.dto.UsuarioRequest;
import com.example.dto.UsuarioResponse;
import com.example.entity.Equipe;
import com.example.entity.Usuario;
import com.example.exception.BusinessException;
import com.example.exception.ResourceNotFoundException;
import com.example.repository.UsuarioRepository;

import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
public class UsuarioService {

    private final UsuarioRepository usuarioRepository;
    private final UsuarioCargoValidatorService usuarioCargoValidatorService;
    private final UsuarioEquipeResolverService usuarioEquipeResolverService;
    private final PasswordEncoder passwordEncoder;

    public UsuarioResponse getById(Long id) {
        return usuarioRepository.findById(id)
                .map(this::toResponse)
                .orElseThrow(() -> new ResourceNotFoundException("Usuario nao encontrado"));
    }

    public void delete(Long id) {
        if (!usuarioRepository.existsById(id)) {
            throw new ResourceNotFoundException("Usuario nao encontrado");
        }
        usuarioRepository.deleteById(id);
    }

    // ✅ PAGINADO (corrigido)
    public Page<UsuarioResponse> getAll(Pageable pageable) {

        return usuarioRepository.findAll(pageable)
                .map(user -> {

                    Usuario completo = usuarioRepository.buscarCompleto(user.getId())
                            .orElseThrow(() -> new RuntimeException("Erro ao carregar usuario"));

                    return toResponse(completo);
                });
    }

    public UsuarioResponse save(UsuarioRequest request, String actorTipo) {

        String normalizedUsername = normalizeUsername(request.getUsername());
        String normalizedPassword = normalizePasswordRequired(request.getSenha());

        if (usuarioRepository.existsByUsernameIgnoreCase(normalizedUsername)) {
            throw new BusinessException("Ja existe um usuario com esse username");
        }

        var tipoCategoria = usuarioCargoValidatorService.obterTipoCategoriaObrigatorio(request);
        usuarioCargoValidatorService.validarPermissaoAtribuicaoCargo(actorTipo, tipoCategoria);

        Equipe equipe = usuarioEquipeResolverService.resolverParaCriacao(request, tipoCategoria);

        Usuario usuario = Usuario.builder()
                .username(normalizedUsername)
                .senha(passwordEncoder.encode(normalizedPassword))
                .equipe(equipe)
                .ativo(true)
                .build();

        Usuario salvo = usuarioRepository.save(usuario);

        Usuario completo = usuarioRepository.buscarCompleto(salvo.getId())
                .orElseThrow(() -> new RuntimeException("Erro ao buscar usuario completo"));

        return toResponse(completo);
    }


    public UsuarioResponse update(Long id, UsuarioRequest request, String actorTipo) {

        Usuario usuario = usuarioRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Usuario nao encontrado"));

        String normalizedUsername = normalizeUsername(request.getUsername());

        Usuario existente = usuarioRepository.findByUsernameIgnoreCase(normalizedUsername).orElse(null);

        if (existente != null && !existente.getId().equals(usuario.getId())) {
            throw new BusinessException("Ja existe um usuario com esse username");
        }

        var tipoCategoria = usuarioCargoValidatorService.obterTipoCategoriaObrigatorio(request);
        usuarioCargoValidatorService.validarPermissaoAtribuicaoCargo(actorTipo, tipoCategoria);

        usuario.setUsername(normalizedUsername);

        if (hasPassword(request.getSenha())) {
            usuario.setSenha(passwordEncoder.encode(request.getSenha().trim()));
        }

        usuario.setEquipe(
                usuarioEquipeResolverService.resolverParaEdicao(
                        usuario.getEquipe(),
                        request,
                        tipoCategoria
                )
        );

        return toResponse(usuarioRepository.save(usuario));
    }

    public UsuarioResponse inativar(Long id) {

        Usuario usuario = usuarioRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Usuario nao encontrado"));

        usuario.setAtivo(false);

        Usuario salvo = usuarioRepository.save(usuario);

        Usuario completo = usuarioRepository.buscarCompleto(salvo.getId())
                .orElseThrow(() -> new RuntimeException("Erro ao buscar usuario completo"));

        return toResponse(completo);
    }

    private String normalizeUsername(String username) {

        if (username == null || username.isBlank()) {
            throw new BusinessException("Username obrigatorio");
        }

        String normalized = username.trim().toUpperCase(Locale.ROOT);

        if (normalized.length() != 7) {
            throw new BusinessException("O username deve ter exatamente 7 caracteres");
        }

        return normalized;
    }

    private String normalizePasswordRequired(String password) {

        if (password == null || password.isBlank()) {
            throw new BusinessException("Senha obrigatoria");
        }

        return password.trim();
    }

    private boolean hasPassword(String password) {
        return password != null && !password.isBlank();
    }

    public UsuarioResponse toResponse(Usuario usuario) {

        Long tipoId = usuario.getEquipe() != null && usuario.getEquipe().getTipoCategoria() != null
                ? usuario.getEquipe().getTipoCategoria().getId()
                : null;

        String tipoNome = usuario.getEquipe() != null && usuario.getEquipe().getTipoCategoria() != null
                ? usuario.getEquipe().getTipoCategoria().getNome()
                : null;

        return UsuarioResponse.builder()
                .id(usuario.getId())
                .username(usuario.getUsername())
                .equipeId(usuario.getEquipe() != null ? usuario.getEquipe().getId() : null)
                .equipe(usuario.getEquipe() != null ? usuario.getEquipe().getNome() : null)
                .tipoCadastroId(tipoId)
                .tipoCadastro(tipoNome)
                .tipoCategoriaId(tipoId)
                .tipoCategoria(tipoNome)
                .ativo(usuario.getAtivo() != null ? usuario.getAtivo() : Boolean.TRUE)
                .tipoUsuario(tipoNome != null ? tipoNome.toUpperCase() : null)
                .build();
    }
}