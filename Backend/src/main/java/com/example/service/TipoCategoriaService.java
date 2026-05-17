package com.example.service;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;

import com.example.entity.TipoCategoria;
import com.example.exception.BusinessException;
import com.example.exception.ResourceNotFoundException;
import com.example.repository.TipoCategoriaRepository;
import com.example.util.RoleUtils;

import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
public class TipoCategoriaService {

    private static final String PREFIXO_CANTEIRO = "CANTEIRO";
    private static final String PREFIXO_EQUIPE = "EQUIPE";

    private final TipoCategoriaRepository repository;

    public void deletar(Long id) {
        if (!repository.existsById(id)) {
            throw new ResourceNotFoundException("Tipo de categoria não encontrado");
        }
        repository.deleteById(id);
    }

    public TipoCategoria atualizar(Long id, TipoCategoria tipoCategoria) {
        if (!repository.existsById(id)) {
            throw new ResourceNotFoundException("Tipo de categoria não encontrado");
        }
        tipoCategoria.setId(id);
        return repository.save(tipoCategoria);
    }

    public TipoCategoria getTipoCategoriaById(Long id) {
        return repository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Tipo de categoria não encontrado"));
    }

    public TipoCategoria salvar(TipoCategoria tipoCategoria, String actorTipo) {

        validateCreatePermission(actorTipo);

        String nomeNormalizado = normalizeNome(tipoCategoria);

        repository.findByNomeIgnoreCase(nomeNormalizado)
                .ifPresent(existente -> {
                    throw new BusinessException("Este tipo de equipe ja existe");
                });

        TipoCategoria novoTipo = TipoCategoria.builder()
                .nome(nomeNormalizado)
                .build();

        return repository.save(novoTipo);
    }

    public Page<TipoCategoria> listar(Pageable pageable) {
        return repository.findAll(pageable);
    }

    private void validateCreatePermission(String actorTipo) {
        String tipo = RoleUtils.normalizeRole(actorTipo);

        boolean permitido = "ADMIN".equals(tipo) || RoleUtils.isGerencia(tipo);

        if (!permitido) {
            throw new BusinessException("Somente ADMIN ou GERENCIA podem criar novos tipos de equipe");
        }
    }

    private String normalizeNome(TipoCategoria tipoCategoria) {

        String nome = tipoCategoria == null || tipoCategoria.getNome() == null
                ? ""
                : tipoCategoria.getNome().trim();

        if (nome.isBlank()) {
            throw new BusinessException("Nome do tipo de equipe obrigatorio");
        }

        String nomeNormalizadoUpper = nome.toUpperCase();

        if (!nomeNormalizadoUpper.startsWith(PREFIXO_CANTEIRO)
                && !nomeNormalizadoUpper.startsWith(PREFIXO_EQUIPE)) {
            throw new BusinessException(
                    "O tipo de equipe deve comecar com \"Canteiro\" ou \"Equipe\"");
        }

        return nome;
    }
}