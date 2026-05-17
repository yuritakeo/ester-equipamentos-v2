package com.example.service;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.List;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.example.dto.EquipamentoLocadoRequest;
import com.example.dto.PecaLocadaRequest;
import com.example.entity.Empresa;
import com.example.entity.EquipamentoLocado;
import com.example.entity.Equipe;
import com.example.entity.PecaLocada;
import com.example.exception.BusinessException;
import com.example.exception.ResourceNotFoundException;
import com.example.repository.EmpresaRepository;
import com.example.repository.EquipamentoLocadoRepository;
import com.example.repository.EquipeRepository;
import com.example.repository.EstoqueRepository;

import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
public class EquipamentoLocadoService {

    private final EquipamentoLocadoRepository repository;
    private final EmpresaRepository empresaRepository;
    private final EquipeRepository equipeRepository;
    private final EstoqueRepository estoqueRepository;

    @Transactional(readOnly = true)
    public List<EquipamentoLocado> listar() {
        return repository.findAllDetailed();
    }

    @Transactional(readOnly = true)
    public EquipamentoLocado buscarPorId(Long id) {
        return repository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Equipamento locado nao encontrado"));
    }

    @Transactional
    public EquipamentoLocado salvar(EquipamentoLocadoRequest request) {
        validarTagDuplicada(request.getTag(), null);
        EquipamentoLocado equipamentoLocado = EquipamentoLocado.builder().build();
        aplicarRequest(equipamentoLocado, request);
        return repository.save(equipamentoLocado);
    }

    @Transactional
    public EquipamentoLocado atualizar(Long id, EquipamentoLocadoRequest request) {
        validarTagDuplicada(request.getTag(), id);
        EquipamentoLocado equipamentoLocado = buscarPorId(id);
        aplicarRequest(equipamentoLocado, request);
        return repository.save(equipamentoLocado);
    }

    @Transactional
    public void deletar(Long id) {
        EquipamentoLocado equipamentoLocado = buscarPorId(id);
        repository.delete(equipamentoLocado);
    }

    private void aplicarRequest(EquipamentoLocado equipamentoLocado, EquipamentoLocadoRequest request) {
        Empresa empresa = empresaRepository.findById(request.getEmpresaId())
                .orElseThrow(() -> new ResourceNotFoundException("Empresa nao encontrada"));

        Equipe equipe = null;
        if (request.getEquipeId() != null) {
            equipe = equipeRepository.findById(request.getEquipeId())
                    .orElseThrow(() -> new ResourceNotFoundException("Equipe nao encontrada"));
        }

        equipamentoLocado.setNomeLocado(normalizarTexto(request.getNomeLocado()));
        equipamentoLocado.setContrato(normalizarTextoOpcional(request.getContrato()));
        equipamentoLocado.setTag(normalizarTextoOpcional(request.getTag()));
        equipamentoLocado.setEmpresa(empresa);
        equipamentoLocado.setQuantidade(request.getQuantidade() == null ? 0 : Math.max(request.getQuantidade(), 0));
        equipamentoLocado.setValorLocacao(normalizarValorMonetario(request.getValorLocacao()));
        equipamentoLocado.setValorUnitario(normalizarValorMonetario(request.getValorUnitario()));
        equipamentoLocado.setFotoUrl(normalizarTextoOpcional(request.getFotoUrl()));
        equipamentoLocado.setFotoUrl2(normalizarTextoOpcional(request.getFotoUrl2()));
        equipamentoLocado.setStatus(normalizarTextoOpcional(request.getStatus()));
        equipamentoLocado.setObra(normalizarTextoOpcional(request.getObra()));
        equipamentoLocado.setEquipe(equipe);
        equipamentoLocado.setDataLocacao(normalizarTextoOpcional(request.getDataLocacao()));
        equipamentoLocado.setDataSaida(normalizarTextoOpcional(request.getDataSaida()));
        equipamentoLocado.setIndenizacaoValor(request.getIndenizacaoValor());
        equipamentoLocado.setIndenizacaoDescricao(normalizarTextoOpcional(request.getIndenizacaoDescricao()));

        List<PecaLocada> pecasAtualizadas = new ArrayList<>();
        for (PecaLocadaRequest pecaRequest : request.getPecas() == null ? List.<PecaLocadaRequest>of() : request.getPecas()) {
            if (pecaRequest == null) {
                continue;
            }

            String nomePeca = normalizarTextoOpcional(pecaRequest.getNome());
            Integer quantidadePeca = pecaRequest.getQuantidade();
            if (nomePeca == null || quantidadePeca == null) {
                continue;
            }

            pecasAtualizadas.add(PecaLocada.builder()
                    .nome(nomePeca)
                    .quantidade(Math.max(quantidadePeca, 0))
                    .equipamentoLocado(equipamentoLocado)
                    .build());
        }

        equipamentoLocado.getPecas().clear();
        equipamentoLocado.getPecas().addAll(pecasAtualizadas);
    }

    private void validarTagDuplicada(String tag, Long equipamentoLocadoId) {
        String tagNormalizada = normalizarTextoOpcional(tag);
        if (tagNormalizada == null) {
            return;
        }

        if (repository.existsOutroEquipamentoComMesmaTag(tagNormalizada, equipamentoLocadoId)
                || estoqueRepository.existsOutroEquipamentoComMesmaTag(tagNormalizada, null)) {
            throw new BusinessException("Esta TAG ja esta cadastrada em outro equipamento.");
        }
    }

    private BigDecimal normalizarValorMonetario(BigDecimal valor) {
        return valor == null ? BigDecimal.ZERO : valor;
    }

    private String normalizarTexto(String valor) {
        return valor == null ? "" : valor.trim();
    }

    private String normalizarTextoOpcional(String valor) {
        if (valor == null) {
            return null;
        }

        String normalizado = valor.trim();
        return normalizado.isEmpty() ? null : normalizado;
    }
}
