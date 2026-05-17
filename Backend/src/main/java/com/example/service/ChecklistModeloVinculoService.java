package com.example.service;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;

import org.springframework.stereotype.Service;

import com.example.entity.Estoque;
import com.example.entity.Execucao;
import com.example.exception.ResourceNotFoundException;
import com.example.repository.ChecklistModeloRepository;
import com.example.repository.ChecklistModeloVinculoResumoProjection;
import com.example.repository.EstoqueRepository;
import com.example.repository.ExecucaoRepository;

@Service
public class ChecklistModeloVinculoService {

    private final ChecklistModeloRepository repository;
    private final EstoqueRepository estoqueRepository;
    private final ExecucaoRepository execucaoRepository;

    // ✅ construtor manual (resolve Lombok no VS Code)
    public ChecklistModeloVinculoService(
            ChecklistModeloRepository repository,
            EstoqueRepository estoqueRepository,
            ExecucaoRepository execucaoRepository) {
        this.repository = repository;
        this.estoqueRepository = estoqueRepository;
        this.execucaoRepository = execucaoRepository;
    }

    public void validarEquipamentosExistentes(List<Long> equipamentoIds) {
        if (equipamentoIds == null || equipamentoIds.isEmpty()) {
            return;
        }

        List<Long> idsInvalidos = equipamentoIds.stream()
                .distinct()
                .filter(id -> !estoqueRepository.existsById(id))
                .toList();

        if (!idsInvalidos.isEmpty()) {
            throw new ResourceNotFoundException("Equipamentos nao encontrados: " + idsInvalidos);
        }
    }

    public List<Estoque> resolverEquipamentos(List<Long> equipamentoIds) {

        if (equipamentoIds == null || equipamentoIds.isEmpty()) {
            return new ArrayList<>();
        }

        List<Long> ids = equipamentoIds.stream()
                .filter(equipamentoId -> equipamentoId != null)
                .distinct()
                .toList();

        Map<Long, Estoque> equipamentosPorId =
                estoqueRepository.findAllById(ids)
                        .stream()
                        .collect(java.util.stream.Collectors.toMap(Estoque::getId, e -> e));

        List<Long> idsNaoEncontrados = ids.stream()
                .filter(id -> !equipamentosPorId.containsKey(id))
                .toList();

        if (!idsNaoEncontrados.isEmpty()) {
            throw new ResourceNotFoundException("Equipamento nao encontrado: " + idsNaoEncontrados.get(0));
        }

        return ids.stream()
                .map(equipamentosPorId::get)
                .collect(java.util.stream.Collectors.toCollection(ArrayList::new));
    }

    public void desvincularEquipamentosDeOutrosModelos(List<Long> equipamentoIds, Long modeloAtualId) {

        if (equipamentoIds == null || equipamentoIds.isEmpty()) {
            return;
        }

        List<Long> idsSelecionados = equipamentoIds.stream()
                .filter(id -> id != null)
                .distinct()
                .toList();

        if (idsSelecionados.isEmpty()) {
            return;
        }

        // ✅ usa SEM paginação (regra de negócio)
        Map<Long, Set<Long>> removidosPorModelo = new HashMap<>();

        for (ChecklistModeloVinculoResumoProjection vinculo :
                repository.findVinculosResumoByEquipamentoIdsSemPaginacao(idsSelecionados)) {

            if (vinculo.getModeloId() == null
                    || vinculo.getEquipamentoId() == null
                    || (modeloAtualId != null && modeloAtualId.equals(vinculo.getModeloId()))) {
                continue;
            }

            removidosPorModelo
                    .computeIfAbsent(vinculo.getModeloId(), chave -> new HashSet<>())
                    .add(vinculo.getEquipamentoId());
        }

        // arquiva execuções afetadas
        removidosPorModelo.forEach(this::arquivarRelatoriosECortarVinculo);

        if (modeloAtualId == null) {
            repository.deleteVinculosByEquipamentoIds(idsSelecionados);
            return;
        }

        repository.deleteVinculosByEquipamentoIdsAndModeloIdNot(idsSelecionados, modeloAtualId);
    }
    public void arquivarRelatoriosECortarVinculo(Long modeloId, Set<Long> equipamentoIds) {

        if (modeloId == null || equipamentoIds == null || equipamentoIds.isEmpty()) {
            return;
        }

        List<Execucao> execucoes = execucaoRepository
                .findByChecklistModeloId(
                        modeloId,
                        org.springframework.data.domain.PageRequest.of(0, 200)
                )
                .getContent()
                .stream()
                .filter(execucao ->
                        execucao.getEstoque() != null &&
                                equipamentoIds.contains(execucao.getEstoque().getId()))
                .toList();

        limparChecklistModeloDasExecucoes(execucoes);
    }

    public void limparExecucoesPorChecklistModelo(Long modeloId) {

        if (modeloId == null) {
            return;
        }

        List<Execucao> execucoesComModelo =
                execucaoRepository
                        .findByChecklistModeloId(
                                modeloId,
                                org.springframework.data.domain.PageRequest.of(0, 200)
                        )
                        .getContent();

        limparChecklistModeloDasExecucoes(execucoesComModelo);
    }

    private void limparChecklistModeloDasExecucoes(List<Execucao> execucoes) {

        for (Execucao execucao : execucoes) {
            execucao.setChecklistModelo(null);
        }

        if (!execucoes.isEmpty()) {
            execucaoRepository.saveAll(execucoes);
        }
    }
}
