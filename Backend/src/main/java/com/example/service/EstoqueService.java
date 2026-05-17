package com.example.service;

import java.math.BigDecimal;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.ConcurrentMap;
import java.util.function.Supplier;

import org.springframework.data.domain.Page;
import org.springframework.stereotype.Service;

import com.example.dto.EstoqueListagemDTO;
import com.example.dto.EstoqueRequest;
import com.example.entity.Canteiro;
import com.example.entity.Empresa;
import com.example.entity.Equipe;
import com.example.entity.Estoque;
import com.example.exception.BusinessException;
import com.example.exception.ResourceNotFoundException;
import com.example.repository.CanteiroRepository;
import com.example.repository.EmpresaRepository;
import com.example.repository.EquipeRepository;
import com.example.repository.EstoqueRepository;

import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
public class EstoqueService {

    private final ConcurrentMap<String, Object> duplicidadeLocks = new ConcurrentHashMap<>();

    private final EstoqueRepository repository;
    private final CanteiroRepository canteiroRepository;
    private final EmpresaRepository empresaRepository;
    private final EquipeRepository equipeRepository;
    private final EstoqueChecklistVinculoService estoqueChecklistVinculoService;
    private final EstoqueExclusaoService estoqueExclusaoService;
    private final EstoqueListagemService estoqueListagemService;
    private final EstoqueDirecionamentoService estoqueDirecionamentoService;

    public void deletar(Long id) {
        estoqueExclusaoService.deletar(id);
    }

    public Map<String, Integer> deletarTodosAtivos(String actorTipo) {
        return estoqueExclusaoService.deletarTodosAtivos(actorTipo, null);
    }

    public Map<String, Integer> deletarTodosAtivos(String actorTipo, List<Long> idsFiltro) {
        return estoqueExclusaoService.deletarTodosAtivos(actorTipo, idsFiltro);
    }

    public Estoque getEstoqueById(Long id) {
        Estoque estoque = repository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Equipamento nao encontrado"));

        if (Boolean.FALSE.equals(estoque.getAtivo())) {
            throw new ResourceNotFoundException("Equipamento nao encontrado");
        }

        estoqueChecklistVinculoService.preencherVinculosChecklistModelo(List.of(estoque));
        return estoque;
    }

    public Estoque salvar(EstoqueRequest request) {
        return executarComLockDeDuplicidade(request, () -> {
            validarDuplicidadeEquipamento(request, null);

            Empresa empresa = empresaRepository.findById(request.getEmpresaId())
                    .orElseThrow(() -> new ResourceNotFoundException("Empresa nao encontrada"));

            Equipe equipe = null;
            if (request.getEquipeId() != null) {
                equipe = equipeRepository.findById(request.getEquipeId())
                        .orElseThrow(() -> new ResourceNotFoundException("Equipe nao encontrada"));
            }

            Canteiro canteiro = buscarCanteiro(request.getCanteiroId());

            Estoque estoque = Estoque.builder()
                    .nomeEquipamento(request.getNomeEquipamento())
                    .tagPatrimonio(request.getTagPatrimonio())
                    .valorUnitario(normalizarValorMonetario(request.getValorUnitario()))
                    .valorLocacao(normalizarValorMonetario(request.getValorLocacao()))
                    .fotoBase64(request.getFotoBase64())
                    .fotoBase64Secundaria(request.getFotoBase64Secundaria())
                    .empresa(empresa)
                    .canteiro(canteiro)
                    .equipe(equipe)
                    .equipeResponsavel(buscarEquipeResponsavel(request.getEquipeResponsavelId()))
                    .ativo(true)
                    .build();

            return repository.save(estoque);
        });
    }

    public Estoque atualizar(Long id, EstoqueRequest request) {
        return executarComLockDeDuplicidade(request, () -> {
            Estoque estoque = repository.findById(id)
                    .orElseThrow(() -> new ResourceNotFoundException("Equipamento nao encontrado"));

            if (Boolean.FALSE.equals(estoque.getAtivo())) {
                throw new ResourceNotFoundException("Equipamento nao encontrado");
            }

            validarDuplicidadeEquipamento(request, id);

            Empresa empresa = empresaRepository.findById(request.getEmpresaId())
                    .orElseThrow(() -> new ResourceNotFoundException("Empresa nao encontrada"));

            Equipe equipe = null;
            if (request.getEquipeId() != null) {
                equipe = equipeRepository.findById(request.getEquipeId())
                        .orElseThrow(() -> new ResourceNotFoundException("Equipe nao encontrada"));
            }

            Canteiro canteiro = buscarCanteiro(request.getCanteiroId());

            estoque.setNomeEquipamento(request.getNomeEquipamento());
            estoque.setTagPatrimonio(request.getTagPatrimonio());
            estoque.setValorUnitario(normalizarValorMonetario(request.getValorUnitario()));
            estoque.setValorLocacao(normalizarValorMonetario(request.getValorLocacao()));

            if (Boolean.TRUE.equals(request.getAtualizarFotos())) {
                estoque.setFotoBase64(request.getFotoBase64());
                estoque.setFotoBase64Secundaria(request.getFotoBase64Secundaria());
            }

            estoque.setEmpresa(empresa);
            estoque.setCanteiro(canteiro);
            estoque.setEquipe(equipe);
            estoque.setEquipeResponsavel(buscarEquipeResponsavel(request.getEquipeResponsavelId()));

            return repository.save(estoque);
        });
    }

    // ✅ SOMENTE PAGINAÇÃO (corrigido)
    public Page<EstoqueListagemDTO> listarPaginado(int page, int size) {
        return estoqueListagemService.listarPaginado(page, size);
    }

    public Page<EstoqueListagemDTO> listarPorEmpresaPaginado(Long empresaId, int page, int size) {
        return estoqueListagemService.listarPorEmpresaPaginado(empresaId, page, size);
    }

    public Estoque direcionarParaEquipe(Estoque estoque, Long equipeId) {
        return estoqueDirecionamentoService.direcionarParaEquipe(estoque, equipeId);
    }

    public Estoque direcionarParaEquipe(Long estoqueId, Long equipeId) {
        return estoqueDirecionamentoService.direcionarParaEquipe(estoqueId, equipeId);
    }

    private <T> T executarComLockDeDuplicidade(EstoqueRequest request, Supplier<T> acao) {
        String chaveDuplicidade = construirChaveDuplicidade(request);
        if (chaveDuplicidade == null) {
            return acao.get();
        }

        Object lock = duplicidadeLocks.computeIfAbsent(chaveDuplicidade, key -> new Object());

        synchronized (lock) {
            try {
                return acao.get();
            } finally {
                duplicidadeLocks.remove(chaveDuplicidade, lock);
            }
        }
    }

    private String construirChaveDuplicidade(EstoqueRequest request) {
        if (request == null) return null;

        String tagNormalizada = normalizarTag(request.getTagPatrimonio());
        if (tagNormalizada != null) {
            return "tag:" + tagNormalizada.toLowerCase(Locale.ROOT);
        }

        String nomeNormalizado = normalizarNomeEquipamento(request.getNomeEquipamento());
        BigDecimal valorUnitario = normalizarValorMonetario(request.getValorUnitario());
        BigDecimal valorLocacao = normalizarValorMonetario(request.getValorLocacao());

        return "sem-tag:" + nomeNormalizado + "|" +
                valorUnitario.toPlainString() + "|" +
                valorLocacao.toPlainString();
    }

    private Equipe buscarEquipeResponsavel(Long equipeResponsavelId) {
        if (equipeResponsavelId == null) return null;

        return equipeRepository.findById(equipeResponsavelId)
                .orElseThrow(() -> new ResourceNotFoundException("Equipe responsavel nao encontrada"));
    }

    private Canteiro buscarCanteiro(Long canteiroId) {
        if (canteiroId == null) return null;

        return canteiroRepository.findById(canteiroId)
                .orElseThrow(() -> new ResourceNotFoundException("Canteiro nao encontrado"));
    }

    private BigDecimal normalizarValorMonetario(BigDecimal valor) {
        return valor == null ? BigDecimal.ZERO : valor;
    }

    private String normalizarNomeEquipamento(String nomeEquipamento) {
        return nomeEquipamento == null ? "" : nomeEquipamento.trim();
    }

    private void validarDuplicidadeEquipamento(EstoqueRequest request, Long estoqueId) {
        String tagNormalizada = normalizarTag(request.getTagPatrimonio());
        if (tagNormalizada != null) {
            validarTagDuplicada(tagNormalizada, estoqueId);
            return;
        }

        validarEquipamentoSemTagDuplicado(request, estoqueId);
    }

    private void validarEquipamentoSemTagDuplicado(EstoqueRequest request, Long estoqueId) {
        String nomeNormalizado = normalizarNomeEquipamento(request.getNomeEquipamento());
        BigDecimal valorUnitario = normalizarValorMonetario(request.getValorUnitario());
        BigDecimal valorLocacao = normalizarValorMonetario(request.getValorLocacao());

        if (repository.existsOutroEquipamentoSemTagComMesmoNomeEValores(
                nomeNormalizado,
                valorUnitario,
                valorLocacao,
                estoqueId)) {
            throw new BusinessException("Este equipamento ja esta cadastrado");
        }
    }

    private void validarTagDuplicada(String tagPatrimonio, Long estoqueId) {
        String tagNormalizada = normalizarTag(tagPatrimonio);
        if (tagNormalizada == null) return;

        if (repository.existsOutroEquipamentoComMesmaTag(tagNormalizada, estoqueId)) {
            throw new BusinessException("Este equipamento ja esta cadastrado");
        }
    }

    private String normalizarTag(String tagPatrimonio) {
        if (tagPatrimonio == null) return null;

        String tagNormalizada = tagPatrimonio.trim();
        return tagNormalizada.isEmpty() ? null : tagNormalizada;
    }
}
