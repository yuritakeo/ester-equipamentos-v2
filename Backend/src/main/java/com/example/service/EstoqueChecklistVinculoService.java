package com.example.service;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

import com.example.dto.ChecklistModeloVinculoDTO;
import com.example.entity.Estoque;
import com.example.repository.ChecklistModeloRepository;
import com.example.repository.ChecklistModeloVinculoResumoProjection;

@Service
public class EstoqueChecklistVinculoService {

    private static final Logger log = LoggerFactory.getLogger(EstoqueChecklistVinculoService.class);

    private final ChecklistModeloRepository checklistModeloRepository;

    // ✅ construtor manual (evita problema com Lombok)
    public EstoqueChecklistVinculoService(ChecklistModeloRepository checklistModeloRepository) {
        this.checklistModeloRepository = checklistModeloRepository;
    }

    public void preencherVinculosChecklistModelo(List<Estoque> estoques) {

        if (estoques == null || estoques.isEmpty()) {
            return;
        }

        try {
            Set<Long> estoqueIds = estoques.stream()
                    .map(Estoque::getId)
                    .filter(id -> id != null)
                    .collect(java.util.stream.Collectors.toSet());

            if (estoqueIds.isEmpty()) {
                return;
            }

            Map<Long, List<ChecklistModeloVinculoDTO>> modelosPorEquipamento = new HashMap<>();

            // ✅ ✅ CORREÇÃO AQUI (SEM PAGINAÇÃO)
            for (ChecklistModeloVinculoResumoProjection vinculoResumo :
                    checklistModeloRepository.findVinculosResumoByEquipamentoIdsSemPaginacao(
                            new ArrayList<>(estoqueIds))) {

                if (vinculoResumo.getEquipamentoId() == null || vinculoResumo.getModeloId() == null) {
                    continue;
                }

                ChecklistModeloVinculoDTO vinculo = new ChecklistModeloVinculoDTO(
                        vinculoResumo.getModeloId(),
                        vinculoResumo.getModeloNome()
                );

                modelosPorEquipamento
                        .computeIfAbsent(vinculoResumo.getEquipamentoId(), chave -> new ArrayList<>())
                        .add(vinculo);
            }

            for (Estoque estoque : estoques) {

                if (estoque == null || estoque.getId() == null) {
                    continue;
                }

                List<ChecklistModeloVinculoDTO> vinculos =
                        modelosPorEquipamento.getOrDefault(estoque.getId(), List.of());

                estoque.setChecklistModelosVinculados(new ArrayList<>(vinculos));
            }

        } catch (RuntimeException ex) {

            log.warn("Falha ao preencher vinculos de checklist no estoque: {}", ex.getMessage());

            for (Estoque estoque : estoques) {
                if (estoque != null) {
                    estoque.setChecklistModelosVinculados(new ArrayList<>());
                }
            }
        }
    }

    public void desvincularChecklistModelos(Long estoqueId) {
        if (estoqueId != null) {
            checklistModeloRepository.deleteVinculosByEquipamentoIds(List.of(estoqueId));
        }
    }

    public void desvincularChecklistModelos(List<Long> estoqueIds) {

        if (estoqueIds == null || estoqueIds.isEmpty()) {
            return;
        }

        List<Long> ids = estoqueIds.stream()
                .filter(id -> id != null)
                .distinct()
                .toList();

        if (ids.isEmpty()) {
            return;
        }

        checklistModeloRepository.deleteVinculosByEquipamentoIds(ids);
    }
}