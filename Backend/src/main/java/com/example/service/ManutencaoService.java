package com.example.service;

import java.util.List;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.example.dto.ManutencaoRequest;
import com.example.entity.Email;
import com.example.entity.Equipe;
import com.example.entity.Estoque;
import com.example.entity.Manutencao;
import com.example.enums.ManutencaoStatus;
import com.example.exception.BusinessException;
import com.example.exception.ResourceNotFoundException;
import com.example.repository.EmailRepository;
import com.example.repository.EstoqueRepository;
import com.example.repository.ManutencaoRepository;

import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
public class ManutencaoService {

    private final ManutencaoRepository repository;
    private final EstoqueRepository estoqueRepository;
    private final EmailRepository emailRepository;
    private final ManutencaoTransicaoService manutencaoTransicaoService;
    private final ManutencaoValidacaoService manutencaoValidacaoService;
    private final DirecionamentoHistoricoService direcionamentoHistoricoService;

    @Transactional
    public Manutencao salvar(ManutencaoRequest request) {
        Estoque equipamento = estoqueRepository.findById(request.getEquipamentoId())
                .orElseThrow(() -> new ResourceNotFoundException("Equipamento nao encontrado"));

        manutencaoTransicaoService.validarEquipamentoAtivo(equipamento);
        manutencaoValidacaoService.validarStatusInicial(request.getStatus());
        manutencaoValidacaoService.validarEquipamentoSemPendenciaAberta(equipamento.getId());

        Equipe equipeUltima = manutencaoTransicaoService.prepararEquipamentoParaNovaManutencao(equipamento);

        Email email = null;
        if (request.getEmailId() != null) {
            email = emailRepository.findById(request.getEmailId())
                    .orElseThrow(() -> new ResourceNotFoundException("Email nao encontrado"));
        }

        Manutencao manutencao = Manutencao.builder()
                .equipamento(equipamento)
                .equipeUltima(equipeUltima)
                .equipeConclusao(null)
                .email(email)
                .status(ManutencaoStatus.PENDENTE)
                .observacao(normalizarTexto(request.getObservacao()))
                .valorUnitarioEquipamento(equipamento.getValorUnitario())
                .build();

        manutencaoTransicaoService.preencherSnapshotEquipamento(manutencao, equipamento);
        direcionamentoHistoricoService.registrarEntradaManutencao(
                equipamento,
                equipeUltima,
                request.getObservacao());

        return repository.save(manutencao);
    }

    @Transactional
    public Manutencao salvarSubmanutencao(Long manutencaoPaiId, ManutencaoRequest request) {
        Manutencao manutencaoPai = repository.findById(manutencaoPaiId)
                .orElseThrow(() -> new ResourceNotFoundException("Manutencao principal nao encontrada"));

        if (manutencaoPai.getManutencaoPai() != null) {
            throw new BusinessException("Nao e permitido criar submanutencao de outra submanutencao.");
        }

        if (manutencaoPai.getStatus() != ManutencaoStatus.PENDENTE) {
            throw new BusinessException("A manutencao principal precisa estar PENDENTE para receber submanutencoes.");
        }

        Estoque equipamento = manutencaoPai.getEquipamento();
        if (equipamento == null) {
            throw new BusinessException("A manutencao principal nao possui equipamento vinculado.");
        }

        manutencaoTransicaoService.validarEquipamentoAtivo(equipamento);
        manutencaoValidacaoService.validarStatusInicial(request.getStatus());
        manutencaoValidacaoService.validarEquipamentoDaSubmanutencao(equipamento.getId(), request.getEquipamentoId());

        Email email = manutencaoPai.getEmail();
        if (request.getEmailId() != null) {
            email = emailRepository.findById(request.getEmailId())
                    .orElseThrow(() -> new ResourceNotFoundException("Email nao encontrado"));
        }

        Manutencao subManutencao = Manutencao.builder()
                .equipamento(equipamento)
                .manutencaoPai(manutencaoPai)
                .equipeUltima(manutencaoPai.getEquipeUltima())
                .equipeConclusao(null)
                .email(email)
                .status(ManutencaoStatus.PENDENTE)
                .observacao(normalizarTexto(request.getObservacao()))
                .descricao(normalizarTexto(request.getDescricao()))
                .fotoNotaFiscal(normalizarTexto(request.getFotoNotaFiscal()))
                .valorTotal(request.getValorTotal())
                .valorUnitarioEquipamento(
                        manutencaoPai.getValorUnitarioEquipamento() != null
                                ? manutencaoPai.getValorUnitarioEquipamento()
                                : equipamento.getValorUnitario())
                .build();

        manutencaoTransicaoService.preencherSnapshotEquipamento(subManutencao, equipamento);

        return repository.save(subManutencao);
    }

    @Transactional
    public Manutencao atualizar(Long id, ManutencaoRequest request, Long actorUserId) {
        Manutencao manutencao = repository.findById(id)
            .orElseThrow(() -> new ResourceNotFoundException("Manutencao nao encontrada"));

        Estoque equipamento = estoqueRepository.findById(request.getEquipamentoId())
            .orElseThrow(() -> new ResourceNotFoundException("Equipamento nao encontrado"));

        Email email = null;
        if (request.getEmailId() != null) {
            email = emailRepository.findById(request.getEmailId())
                .orElseThrow(() -> new ResourceNotFoundException("Email nao encontrado"));
        }

        manutencao.setEquipamento(equipamento);
        manutencao.setEmail(email);
        manutencao.setObservacao(normalizarTexto(request.getObservacao()));
        manutencaoTransicaoService.preencherSnapshotEquipamento(manutencao, equipamento);

        if (manutencao.getValorUnitarioEquipamento() == null) {
            manutencao.setValorUnitarioEquipamento(equipamento.getValorUnitario());
        }

        manutencaoTransicaoService.aplicarTransicaoAtualizacao(manutencao, request, actorUserId);

        return repository.save(manutencao);
    }

    private String normalizarTexto(String valor) {
        if (valor == null) {
            return null;
        }

        String texto = valor.trim();
        return texto.isEmpty() ? null : texto;
    }

    public Manutencao buscarPorId(Long id) {
        return repository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Manutencao nao encontrada"));
    }

    public List<Manutencao> listar() {
        return repository.findByManutencaoPaiIsNullOrderByDataEntradaDesc();
    }

    public List<Manutencao> listarPorEquipamento(Long equipamentoId) {
        return repository.findByEquipamentoIdOrderByDataEntradaDesc(equipamentoId);
    }

    public void deletar(Long id) {
        if (!repository.existsById(id)) {
            throw new ResourceNotFoundException("Manutencao nao encontrada");
        }
        repository.deleteById(id);
    }
}
