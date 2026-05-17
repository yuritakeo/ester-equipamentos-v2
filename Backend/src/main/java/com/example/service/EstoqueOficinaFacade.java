package com.example.service;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.example.dto.DirecionarEquipeRequest;
import com.example.entity.Estoque;
import com.example.entity.Oficina;
import com.example.exception.ResourceNotFoundException;

import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
public class EstoqueOficinaFacade {
    private final OficinaService oficinaService;
    private final EstoqueService estoqueService;
    private final DirecionamentoHistoricoService direcionamentoHistoricoService;

    /**
     * Move equipamento para oficina/canteiro e desvincula equipe se necessário.
     */
    @Transactional
    public Estoque moverParaOficina(Long estoqueId) {
        // 1. Buscar equipamento
        Estoque estoque = estoqueService.getEstoqueById(estoqueId);
        com.example.entity.Equipe equipeOrigem = estoque.getEquipeResponsavel() != null
                ? estoque.getEquipeResponsavel()
                : estoque.getEquipe();
        // 2. Verificar se tem equipe vinculada
        if (estoque.getEquipeResponsavel() != null || estoque.getEquipe() != null) {
            // 3. Remover vínculo da equipe
            estoque.setEquipeResponsavel(null);
            estoque.setEquipe(null);
            estoque = estoqueService.atualizar(estoque.getId(),
                com.example.dto.EstoqueRequest.builder()
                    .nomeEquipamento(estoque.getNomeEquipamento())
                    .tagPatrimonio(estoque.getTagPatrimonio())
                    .valorUnitario(estoque.getValorUnitario())
                    .valorLocacao(estoque.getValorLocacao())
                    .fotoBase64(estoque.getFotoBase64())
                    .fotoBase64Secundaria(estoque.getFotoBase64Secundaria())
                    .empresaId(estoque.getEmpresa().getId())
                    .canteiroId(estoque.getCanteiro() != null ? estoque.getCanteiro().getId() : null)
                    .equipeId(null)
                    .equipeResponsavelId(null)
                    .build()
            );
        }
        // 4. Registrar na oficina
        oficinaService.salvarNovoEquipamento(estoque, null);
        direcionamentoHistoricoService.registrarMovimentoParaCanteiro(estoque, equipeOrigem, null);
        // 5. Retornar novo estado
        return estoque;
    }
    // (removido campos duplicados)

    /**
     * Direciona um equipamento para uma equipe e remove o registro da oficina.
     */
    @Transactional
    public Estoque direcionarParaEquipe(Long oficinaId, DirecionarEquipeRequest request) {
        try {
            Oficina oficina = oficinaService.buscarPorId(oficinaId);
            Estoque estoqueAtualizado = estoqueService.direcionarParaEquipe(oficina.getEquipamento(), request.getEquipeId());
            oficinaService.deletar(oficinaId);
            return estoqueAtualizado;
        } catch (ResourceNotFoundException ex) {
            // Fallback para compatibilidade: quando o id enviado for do equipamento, direciona direto pelo estoque.
            return estoqueService.direcionarParaEquipe(oficinaId, request.getEquipeId());
        }
    }

    /**
     * Sempre que um novo equipamento for criado, ele é registrado na oficina automaticamente.
     */
    @Transactional
    public void registrarNaOficina(Estoque estoque) {
        oficinaService.salvarNovoEquipamento(estoque, "Equipamento Cadastrado");
        direcionamentoHistoricoService.registrarCadastroNoCanteiro(estoque, "Equipamento cadastrado");
    }
}
