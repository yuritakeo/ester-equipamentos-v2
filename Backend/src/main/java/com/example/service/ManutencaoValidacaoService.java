package com.example.service;

import org.springframework.stereotype.Service;

import com.example.enums.ManutencaoStatus;
import com.example.exception.BusinessException;
import com.example.repository.ManutencaoRepository;

import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
public class ManutencaoValidacaoService {

    private final ManutencaoRepository manutencaoRepository;

    public void validarStatusInicial(ManutencaoStatus status) {
        if (status != ManutencaoStatus.PENDENTE) {
            throw new BusinessException("Novo registro de manutencao deve iniciar como PENDENTE.");
        }
    }

    public void validarEquipamentoSemPendenciaAberta(Long equipamentoId) {
        if (manutencaoRepository.existsByEquipamentoIdAndStatus(equipamentoId, ManutencaoStatus.PENDENTE)) {
            throw new BusinessException("Este equipamento ja esta com manutencao pendente.");
        }
    }

    public void validarEquipamentoDaSubmanutencao(Long equipamentoIdEsperado, Long equipamentoIdInformado) {
        if (equipamentoIdInformado == null || equipamentoIdEsperado.equals(equipamentoIdInformado)) {
            return;
        }

        throw new BusinessException("A submanutencao deve usar o mesmo equipamento da manutencao principal.");
    }
}