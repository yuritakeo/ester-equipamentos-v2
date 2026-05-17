package com.example.service;

import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.example.dto.OficinaRequest;
import com.example.entity.Estoque;
import com.example.entity.Oficina;
import com.example.exception.ResourceNotFoundException;
import com.example.repository.EstoqueRepository;
import com.example.repository.OficinaRepository;

import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
public class OficinaService {

    private final OficinaRepository repository;
    private final EstoqueRepository estoqueRepository;

    /**
     * Cria ou atualiza registro único de oficina por equipamento
     */
    @Transactional
    public void salvarNovoEquipamento(Estoque estoque, String observacao) {

        Page<Oficina> page = repository.findByEquipamentoIdOrderByDataDesc(
                estoque.getId(),
                org.springframework.data.domain.PageRequest.of(0, 2)
        );

        List<Oficina> registros = page.getContent();

        if (!registros.isEmpty()) {
            Oficina atual = registros.get(0);

            if (observacao != null && !observacao.trim().isEmpty()) {
                atual.setObservacao(observacao.trim());
                repository.save(atual);
            }

            // remove duplicados excedentes (se houver)
            if (registros.size() > 1) {
                repository.deleteAll(registros.subList(1, registros.size()));
            }

            return;
        }

        Oficina oficina = Oficina.builder()
                .equipamento(estoque)
                .observacao(observacao)
                .build();

        repository.save(oficina);
    }

    public Oficina salvar(OficinaRequest request) {

        Estoque equipamento = estoqueRepository.findById(request.getEquipamentoId())
                .orElseThrow(() -> new ResourceNotFoundException("Equipamento nao encontrado"));

        if (equipamento.getEquipeResponsavel() != null || equipamento.getEquipe() != null) {
            equipamento.setEquipeResponsavel(null);
            equipamento.setEquipe(null);
            estoqueRepository.save(equipamento);
        }

        Page<Oficina> page = repository.findByEquipamentoIdOrderByDataDesc(
                equipamento.getId(),
                org.springframework.data.domain.PageRequest.of(0, 1)
        );

        List<Oficina> registros = page.getContent();

        if (!registros.isEmpty()) {
            Oficina existente = registros.get(0);

            if (request.getObservacao() != null && !request.getObservacao().trim().isEmpty()) {
                existente.setObservacao(request.getObservacao().trim());
                return repository.save(existente);
            }

            return existente;
        }

        Oficina oficina = Oficina.builder()
                .equipamento(equipamento)
                .observacao(request.getObservacao())
                .build();

        return repository.save(oficina);
    }

    public Oficina buscarPorId(Long id) {
        return repository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Registro de canteiro nao encontrado"));
    }

    // ✅ CORRIGIDO: PAGINADO + DEDUP
    public Page<Oficina> listar(Pageable pageable) {

        Page<Oficina> page = repository.findAll(pageable);

        List<Oficina> deduplicados = deduplicar(page.getContent());

        return new org.springframework.data.domain.PageImpl<>(
                deduplicados,
                pageable,
                page.getTotalElements()
        );
    }

    // ✅ CORRIGIDO: PAGINADO
    public Page<Oficina> listarPorEquipamento(Long equipamentoId, Pageable pageable) {

        Page<Oficina> page = repository.findByEquipamentoIdOrderByDataDesc(
                equipamentoId,
                pageable
        );

        List<Oficina> filtrados = page.getContent().stream()
                .filter(r -> r.getEquipamento() != null)
                .filter(r -> !Boolean.FALSE.equals(r.getEquipamento().getAtivo()))
                .toList();

        return new org.springframework.data.domain.PageImpl<>(
                filtrados,
                pageable,
                page.getTotalElements()
        );
    }

    public void deletar(Long id) {
        if (!repository.existsById(id)) {
            throw new ResourceNotFoundException("Registro de canteiro nao encontrado");
        }
        repository.deleteById(id);
    }

    @Transactional
    public void deletarPorEquipamentoId(Long equipamentoId) {
        if (equipamentoId == null) return;
        repository.deleteByEquipamentoId(equipamentoId);
    }

    private List<Oficina> deduplicar(List<Oficina> registros) {

        Map<String, Oficina> unicos = new LinkedHashMap<>();

        registros.stream()
                .sorted(Comparator
                        .comparing(Oficina::getData, Comparator.nullsLast(Comparator.reverseOrder()))
                        .thenComparing(Oficina::getId, Comparator.nullsLast(Comparator.reverseOrder())))
                .filter(r -> r.getEquipamento() != null)
                .filter(r -> !Boolean.FALSE.equals(r.getEquipamento().getAtivo()))
                .forEach(registro -> {

                    String tag = normalizarTag(registro.getEquipamento().getTagPatrimonio());

                    String chave = tag != null
                            ? "tag:" + tag
                            : "fallback-id:" + registro.getEquipamento().getId();

                    unicos.putIfAbsent(chave, registro);
                });

        return List.copyOf(unicos.values());
    }

    private String normalizarTag(String tag) {
        if (tag == null) return null;

        String limpa = tag.trim();
        if (limpa.isEmpty()) return null;

        return limpa.toUpperCase();
    }
}