package com.example.service;

import org.springframework.stereotype.Service;

import com.example.dto.UsuarioRequest;
import com.example.entity.Equipe;
import com.example.entity.TipoCategoria;
import com.example.exception.BusinessException;
import com.example.exception.ResourceNotFoundException;
import com.example.repository.EquipeRepository;

import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
public class UsuarioEquipeResolverService {

    private final EquipeRepository equipeRepository;

    public Equipe resolverParaCriacao(UsuarioRequest request, TipoCategoria tipoCategoria) {
        if (request.getEquipeId() != null) {
            Equipe equipe = equipeRepository.findById(request.getEquipeId())
                    .orElseThrow(() -> new ResourceNotFoundException("Equipe nao encontrada"));
            validarTipoCadastro(tipoCategoria, equipe);
            return equipe;
        }

        String nomeEquipe = normalizarNomeEquipeObrigatorio(request.getNomeEquipe());
        validarNomeEquipeDuplicado(nomeEquipe, null);

        Equipe novaEquipe = new Equipe();
        novaEquipe.setNome(nomeEquipe);
        novaEquipe.setTipoCategoria(tipoCategoria);
        novaEquipe.setAtivo(true);
        return equipeRepository.save(novaEquipe);
    }

    public Equipe resolverParaEdicao(Equipe equipeAtual, UsuarioRequest request, TipoCategoria tipoCategoria) {
        if (request.getEquipeId() != null) {
            Equipe equipeExistente = equipeRepository.findById(request.getEquipeId())
                    .orElseThrow(() -> new ResourceNotFoundException("Equipe nao encontrada"));

            if (equipeAtual != null && equipeAtual.getId() != null && equipeAtual.getId().equals(equipeExistente.getId())) {
                return atualizarEquipeExistente(equipeExistente, request, tipoCategoria);
            }

            validarTipoCadastro(tipoCategoria, equipeExistente);
            return equipeExistente;
        }

        if (equipeAtual == null) {
            return resolverParaCriacao(request, tipoCategoria);
        }

        String nomeEquipe = normalizarNomeEquipeObrigatorio(request.getNomeEquipe());
        validarNomeEquipeDuplicado(nomeEquipe, equipeAtual.getId());

        equipeAtual.setNome(nomeEquipe);
        equipeAtual.setTipoCategoria(tipoCategoria);
        return equipeRepository.save(equipeAtual);
    }

    private Equipe atualizarEquipeExistente(Equipe equipe, UsuarioRequest request, TipoCategoria tipoCategoria) {
        String nomeEquipe = normalizarNomeEquipeObrigatorio(request.getNomeEquipe());
        validarNomeEquipeDuplicado(nomeEquipe, equipe.getId());

        equipe.setNome(nomeEquipe);
        equipe.setTipoCategoria(tipoCategoria);
        return equipeRepository.save(equipe);
    }

    private void validarTipoCadastro(TipoCategoria tipoCategoria, Equipe equipe) {
        if (tipoCategoria == null) {
            return;
        }

        if (equipe.getTipoCategoria() == null) {
            throw new BusinessException("A equipe informada nao possui tipo de cadastro vinculado");
        }

        if (!tipoCategoria.getId().equals(equipe.getTipoCategoria().getId())) {
            throw new BusinessException("O tipo de cadastro nao corresponde a equipe informada");
        }
    }

    private String normalizarNomeEquipeObrigatorio(String nomeEquipe) {
        if (nomeEquipe == null || nomeEquipe.isBlank()) {
            throw new BusinessException("Equipe obrigatoria");
        }

        return nomeEquipe.trim();
    }

    private void validarNomeEquipeDuplicado(String nomeEquipe, Long equipeIdAtual) {
        Equipe equipeComMesmoNome = equipeRepository.findByNome(nomeEquipe).orElse(null);
        if (equipeComMesmoNome == null) {
            return;
        }

        if (equipeIdAtual == null || !equipeComMesmoNome.getId().equals(equipeIdAtual)) {
            throw new BusinessException("Esta equipe ja existe");
        }
    }
}