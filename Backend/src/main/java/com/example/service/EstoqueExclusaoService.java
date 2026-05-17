package com.example.service;

import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.example.entity.Estoque;
import com.example.enums.ManutencaoStatus;
import com.example.exception.BusinessException;
import com.example.exception.ResourceNotFoundException;
import com.example.repository.ExecucaoRepository;
import com.example.repository.EstoqueRepository;
import com.example.repository.ManutencaoRepository;
import com.example.repository.OficinaRepository;
import com.example.repository.RelatorioRepository;
import com.example.repository.SolicitacaoPecaRepository;
import com.example.util.RoleUtils;

import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
public class EstoqueExclusaoService {

    private final EstoqueRepository repository;
    private final ManutencaoRepository manutencaoRepository;
    private final ExecucaoRepository execucaoRepository;
    private final OficinaRepository oficinaRepository;
    private final RelatorioRepository relatorioRepository;
    private final SolicitacaoPecaRepository solicitacaoPecaRepository;
    private final ExecucaoService execucaoService;
    private final EstoqueChecklistVinculoService estoqueChecklistVinculoService;

    @Transactional
    public void deletar(Long id) {
        Estoque estoque = repository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Equipamento nao encontrado"));

        if (Boolean.FALSE.equals(estoque.getAtivo())) {
            return;
        }

        if (manutencaoRepository.existsByEquipamentoIdAndStatus(id, ManutencaoStatus.PENDENTE)) {
            throw new BusinessException(
                    "Nao e possivel excluir este equipamento: ele esta com manutencao PENDENTE. Conclua ou inutilize a manutencao primeiro.");
        }

        if (estoque.getEquipeResponsavel() != null || estoque.getEquipe() != null) {
            estoque.setEquipeResponsavel(null);
            estoque.setEquipe(null);
        }

        estoqueChecklistVinculoService.desvincularChecklistModelos(estoque.getId());
        execucaoService.arquivarRelatoriosEEncerrarChecklistsPorEstoque(estoque.getId());

        manutencaoRepository.desvinculaEquipamentoConcluido(estoque.getId());

        if (possuiHistoricoAssociado(estoque.getId())) {
            estoque.setAtivo(false);
            repository.save(estoque);
            return;
        }

        repository.deleteById(id);
    }

    @Transactional
    public Map<String, Integer> deletarTodosAtivos(String actorTipo, List<Long> idsFiltro) {
        if (!RoleUtils.isGerencia(actorTipo)) {
            throw new BusinessException("Apenas GERENCIA pode excluir todos os equipamentos do estoque.");
        }

        List<Long> ativos;
        if (idsFiltro != null && !idsFiltro.isEmpty()) {
            ativos = repository.findIdsAtivosByIds(idsFiltro.stream().filter((id) -> id != null).distinct().toList());
        } else {
            ativos = repository.findIdsAtivos();
        }
        int total = ativos.size();

        if (ativos.isEmpty()) {
            Map<String, Integer> vazio = new HashMap<>();
            vazio.put("total", 0);
            vazio.put("excluidos", 0);
            vazio.put("bloqueados", 0);
            vazio.put("erros", 0);
            return vazio;
        }

        Set<Long> bloqueadosSet = new HashSet<>(manutencaoRepository.findEquipamentoIdsComPendencia(ativos));
        List<Long> processaveis = ativos.stream()
                .filter((id) -> !bloqueadosSet.contains(id))
                .toList();

        int bloqueados = bloqueadosSet.size();

        int excluidos = 0;
        int erros = 0;

        if (!processaveis.isEmpty()) {
            try {
                repository.limparVinculoEquipeByIds(processaveis);
                estoqueChecklistVinculoService.desvincularChecklistModelos(processaveis);
                manutencaoRepository.desvinculaEquipamentoConcluidoPorIds(processaveis);
                excluidos = repository.inativarByIds(processaveis);
                erros = Math.max(0, processaveis.size() - excluidos);
            } catch (RuntimeException error) {
                erros = processaveis.size();
                excluidos = 0;
            }
        }

        Map<String, Integer> resumo = new HashMap<>();
        resumo.put("total", total);
        resumo.put("excluidos", excluidos);
        resumo.put("bloqueados", bloqueados);
        resumo.put("erros", erros);
        return resumo;
    }

    private boolean possuiHistoricoAssociado(Long estoqueId) {

        return oficinaRepository.existsByEquipamentoId(estoqueId)

                || !manutencaoRepository
                .findByEquipamentoIdOrderByDataEntradaDesc(estoqueId)
                .isEmpty()

                || !execucaoRepository
                .findByEstoqueIdOrderByDataDesc(
                        estoqueId,
                        org.springframework.data.domain.PageRequest.of(0, 1)
                )
                .isEmpty()

                || !relatorioRepository
                .findByEstoqueIdOrderByDataDesc(
                        estoqueId,
                        org.springframework.data.domain.PageRequest.of(0, 1)
                )
                .isEmpty()

                || !solicitacaoPecaRepository
                .findByEquipamentoIdOrderByDataSolicitacaoDesc(
                        estoqueId,
                        org.springframework.data.domain.PageRequest.of(0, 1)
                )
                .isEmpty();
    }

}
