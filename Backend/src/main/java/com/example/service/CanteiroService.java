package com.example.service;

import java.util.List;
import org.springframework.stereotype.Service;

import com.example.dto.CanteiroRequest;
import com.example.entity.Canteiro;
import com.example.exception.BusinessException;
import com.example.exception.ResourceNotFoundException;
import com.example.repository.CanteiroRepository;
import com.example.repository.EstoqueRepository;
import com.example.util.RoleUtils;

import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
public class CanteiroService {

    private final CanteiroRepository repository;
    private final EstoqueRepository estoqueRepository;

    public List<Canteiro> listar() {
        return repository.findAllByOrderByNomeAsc();
    }

    public Canteiro criar(CanteiroRequest request, String actorTipo) {
        validarPermissaoGestao(actorTipo);
        String nome = normalizarNome(request.getNome());
        validarNomeDuplicado(nome, null);
        return repository.save(Canteiro.builder().nome(nome).build());
    }

    public Canteiro atualizar(Long id, CanteiroRequest request, String actorTipo) {
        validarPermissaoGestao(actorTipo);
        Canteiro canteiro = repository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Canteiro nao encontrado"));

        String nome = normalizarNome(request.getNome());
        validarNomeDuplicado(nome, canteiro.getId());
        canteiro.setNome(nome);
        return repository.save(canteiro);
    }

    public void excluir(Long id, String actorTipo) {
        validarPermissaoGestao(actorTipo);
        Canteiro canteiro = repository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Canteiro nao encontrado"));

        if (estoqueRepository.existsByCanteiroId(canteiro.getId())) {
            throw new BusinessException("Nao e possivel excluir canteiro vinculado a equipamentos");
        }

        repository.deleteById(canteiro.getId());
    }

    private void validarPermissaoGestao(String actorTipo) {
        String tipo = RoleUtils.normalizeRole(actorTipo);
        if (!RoleUtils.isGerencia(tipo) && !"GERENTE".equals(tipo)) {
            throw new BusinessException("Apenas GERENCIA ou GERENTE podem gerenciar canteiros");
        }
    }

    private void validarNomeDuplicado(String nome, Long idAtual) {
        boolean duplicado = idAtual == null
                ? repository.existsByNomeIgnoreCase(nome)
                : repository.existsByNomeIgnoreCaseAndIdNot(nome, idAtual);

        if (duplicado) {
            throw new BusinessException("Ja existe um canteiro com esse nome");
        }
    }

    private String normalizarNome(String nome) {
        if (nome == null || nome.isBlank()) {
            throw new BusinessException("Nome do canteiro obrigatorio");
        }
        return nome.trim();
    }

}
