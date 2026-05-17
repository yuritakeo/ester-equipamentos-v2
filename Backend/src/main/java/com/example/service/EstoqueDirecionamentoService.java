package com.example.service;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.example.entity.Equipe;
import com.example.entity.Estoque;
import com.example.exception.ResourceNotFoundException;
import com.example.repository.EquipeRepository;
import com.example.repository.EstoqueRepository;
import com.example.repository.OficinaRepository;

import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
public class EstoqueDirecionamentoService {

    private final EstoqueRepository repository;
    private final EquipeRepository equipeRepository;
    private final OficinaRepository oficinaRepository;
    private final DirecionamentoHistoricoService direcionamentoHistoricoService;

    @Transactional
    public Estoque direcionarParaEquipe(Estoque estoque, Long equipeId) {
        if (Boolean.FALSE.equals(estoque.getAtivo())) {
            throw new ResourceNotFoundException("Equipamento nao encontrado");
        }

        Equipe equipeOrigem = estoque.getEquipeResponsavel() != null
                ? estoque.getEquipeResponsavel()
                : estoque.getEquipe();
        Equipe equipe = equipeRepository.findById(equipeId)
                .orElseThrow(() -> new ResourceNotFoundException("Equipe nao encontrada"));

        estoque.setEquipeResponsavel(equipe);
        Estoque estoqueAtualizado = repository.save(estoque);
        oficinaRepository.deleteByEquipamentoId(estoque.getId());
        direcionamentoHistoricoService.registrarMovimentoParaEquipe(estoqueAtualizado, equipeOrigem, equipe, null);
        return estoqueAtualizado;
    }

    @Transactional
    public Estoque direcionarParaEquipe(Long estoqueId, Long equipeId) {
        Estoque estoque = repository.findById(estoqueId)
                .orElseThrow(() -> new ResourceNotFoundException("Equipamento nao encontrado"));

        return direcionarParaEquipe(estoque, equipeId);
    }
}
