package com.example.service;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.example.dto.ChecklistModeloResumoDTO;
import com.example.dto.EstoqueExecucaoResumoDTO;
import com.example.dto.ExecucaoPainelDTO;
import com.example.dto.ExecucaoRequest;
import com.example.dto.ExecucaoResumoDTO;
import com.example.entity.ChecklistModelo;
import com.example.entity.Equipe;
import com.example.entity.Estoque;
import com.example.entity.Execucao;
import com.example.exception.BusinessException;
import com.example.exception.ResourceNotFoundException;
import com.example.repository.ChecklistModeloRepository;
import com.example.repository.EquipeRepository;
import com.example.repository.EstoqueRepository;
import com.example.repository.ExecucaoPainelProjection;
import com.example.repository.ExecucaoRepository;
import com.example.repository.ExecucaoResumoProjection;

import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
public class ExecucaoService {

    private static final int TAMANHO_LOTE = 100;
    private static final int TAMANHO_MAXIMO_PAGINA = 100;

    private final ExecucaoRepository repository;
    private final EquipeRepository equipeRepository;
    private final EstoqueRepository estoqueRepository;
    private final ChecklistModeloRepository checklistModeloRepository;
    private final RelatorioService relatorioService;

    @Transactional
    public void resetarChecklistsSemana(LocalDateTime inicio, LocalDateTime fim) {
        if (inicio == null || fim == null) return;

        LocalDateTime fimExclusivo = fim.plusNanos(1);
        long ultimoId = 0L;

        while (true) {
            List<Long> ids = buscarIdsPorPeriodoEmLote(inicio, fimExclusivo, ultimoId, TAMANHO_LOTE);

            if (ids.isEmpty()) break;

            ultimoId = ids.get(ids.size() - 1);
            resetarChecklistsPorIds(ids);

            if (ids.size() < TAMANHO_LOTE) break;
        }
    }

    @Transactional
    public void arquivarRelatoriosEEncerrarChecklistsPorEstoque(Long estoqueId) {
        if (estoqueId == null) return;

        long ultimoId = 0L;

        while (true) {
            List<Long> ids = repository.findIdsPorEstoqueDepoisDoId(
                    estoqueId,
                    ultimoId,
                    PageRequest.of(0, TAMANHO_LOTE)
            );

            if (ids.isEmpty()) break;

            ultimoId = ids.get(ids.size() - 1);

            for (Long execucaoId : ids) {
                relatorioService.gerarPorExecucaoSeNaoExistir(execucaoId);
            }

            repository.limparChecklistModeloPorIds(ids);

            if (ids.size() < TAMANHO_LOTE) break;
        }
    }

    @Transactional(readOnly = true)
    public List<Long> buscarIdsPorPeriodoEmLote(
            LocalDateTime inicio,
            LocalDateTime fimExclusivo,
            long ultimoId,
            int limite
    ) {
        if (inicio == null || fimExclusivo == null) return List.of();

        int limiteSeguro = Math.min(Math.max(limite, 1), TAMANHO_MAXIMO_PAGINA);

        return repository.findIdsPorPeriodoDepoisDoId(
                inicio,
                fimExclusivo,
                Math.max(ultimoId, 0L),
                PageRequest.of(0, limiteSeguro)
        );
    }

    @Transactional
    public int resetarChecklistsPorIds(List<Long> ids) {
        if (ids == null || ids.isEmpty()) return 0;
        return repository.deleteEmLotePorIds(ids);
    }

    // ✅ CORRIGIDO: AGORA PAGINADO
    public Page<Execucao> buscarPorPeriodo(
            LocalDateTime inicio,
            LocalDateTime fim,
            int page,
            int size
    ) {
        return repository.findByDataBetween(
                inicio,
                fim,
                criarPageRequest(page, size)
        );
    }

    @Transactional
    public Execucao salvar(ExecucaoRequest request) {
        Equipe equipe = equipeRepository.findById(request.getEquipeId())
                .orElseThrow(() -> new ResourceNotFoundException("Equipe nao encontrada"));

        Estoque estoque = estoqueRepository.findById(request.getEstoqueId())
                .orElseThrow(() -> new ResourceNotFoundException("Equipamento nao encontrado"));

        ChecklistModelo checklistModelo = checklistModeloRepository.findById(request.getChecklistModeloId())
                .orElseThrow(() -> new ResourceNotFoundException("Modelo de checklist nao encontrado"));

        validarChecklistDoDia(estoque.getId());

        Execucao execucao = Execucao.builder()
                .equipe(equipe)
                .estoque(estoque)
                .checklistModelo(checklistModelo)
                .respostasJson(request.getRespostasJson())
                .build();

        return repository.save(execucao);
    }

    @Transactional(readOnly = true)
    public Execucao buscarPorId(Long id) {
        return repository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Execucao nao encontrada"));
    }

    // ✅ REMOVIDO listar() SEM PAGINAÇÃO

    public Page<Execucao> listarPaginado(int page, int size) {
        return repository.findAll(criarPageRequest(page, size));
    }

    // ✅ REMOVIDO listarResumo()

    public Page<ExecucaoResumoDTO> listarResumoPaginado(int page, int size) {
        return repository.findAllResumo(criarPageRequest(page, size))
                .map(this::mapearResumo);
    }

    // ✅ CORRIGIDO
    public Page<Execucao> listarPorEquipe(Long equipeId, int page, int size) {
        return repository.findByEquipeIdOrderByDataDesc(
                equipeId,
                criarPageRequest(page, size)
        );
    }

    public Page<Execucao> listarPorEstoque(Long estoqueId, int page, int size) {
        return repository.findByEstoqueIdOrderByDataDesc(
                estoqueId,
                criarPageRequest(page, size)
        );
    }

    @Transactional(readOnly = true)
    public List<ExecucaoPainelDTO> listarSemanaAtualPorEstoque(Long estoqueId) {
        LocalDate hoje = LocalDate.now();
        LocalDate inicioSemana = hoje.minusDays(hoje.getDayOfWeek().getValue() - 1L);

        LocalDateTime inicio = inicioSemana.atStartOfDay();
        LocalDateTime fimExclusivo = inicioSemana.plusDays(7).atStartOfDay();

        return repository.findPainelSemanaAtualByEstoqueIdAndDataBetween(
                        estoqueId,
                        inicio,
                        fimExclusivo
                ).stream()
                .map(this::mapearPainel)
                .toList();
    }

    @Transactional
    public void deletar(Long id) {
        if (!repository.existsById(id)) {
            throw new ResourceNotFoundException("Execucao nao encontrada");
        }
        repository.deleteById(id);
    }

    private void validarChecklistDoDia(Long estoqueId) {
        LocalDate hoje = LocalDate.now();
        LocalDateTime inicio = hoje.atStartOfDay();
        LocalDateTime fimExclusivo = hoje.plusDays(1).atStartOfDay();

        if (repository.existsByEstoqueIdAndDataGreaterThanEqualAndDataLessThan(
                estoqueId, inicio, fimExclusivo)) {
            throw new BusinessException("Este equipamento ja possui checklist registrado hoje.");
        }
    }

    private PageRequest criarPageRequest(int page, int size) {
        int paginaSegura = Math.max(page, 0);
        int tamanhoSeguro = Math.min(Math.max(size, 1), TAMANHO_MAXIMO_PAGINA);
        return PageRequest.of(paginaSegura, tamanhoSeguro);
    }

    private ExecucaoResumoDTO mapearResumo(ExecucaoResumoProjection projection) {
        return new ExecucaoResumoDTO(
                projection.getId(),
                projection.getData(),
                projection.getNcCount(),
                projection.getEstoqueId(),
                projection.getEstoqueNomeEquipamento(),
                projection.getEstoqueTagPatrimonio(),
                projection.getEstoqueEmpresaId(),
                projection.getEstoqueEmpresaNome(),
                projection.getEstoqueEquipeResponsavelId(),
                projection.getEstoqueEquipeResponsavelNome(),
                projection.getEstoqueEquipeResponsavelTipoCategoriaId(),
                projection.getEstoqueEquipeResponsavelTipoCategoriaNome(),
                projection.getChecklistModeloId(),
                projection.getChecklistModeloNome(),
                projection.getChecklistModeloArquivoNome());
    }

    private ExecucaoPainelDTO mapearPainel(ExecucaoPainelProjection projection) {
        return new ExecucaoPainelDTO(
                projection.getId(),
                projection.getData(),
                projection.getRespostasJson(),
                new EstoqueExecucaoResumoDTO(
                        projection.getEstoqueId(),
                        projection.getEstoqueNomeEquipamento(),
                        projection.getEstoqueTagPatrimonio(),
                        projection.getEstoqueEmpresaId(),
                        projection.getEstoqueEmpresaNome(),
                        projection.getEstoqueEquipeResponsavelId(),
                        projection.getEstoqueEquipeResponsavelNome(),
                        projection.getEstoqueEquipeResponsavelTipoCategoriaId(),
                        projection.getEstoqueEquipeResponsavelTipoCategoriaNome()),
                projection.getChecklistModeloId() == null && projection.getChecklistModeloNome() == null
                        ? null
                        : new ChecklistModeloResumoDTO(
                                projection.getChecklistModeloId(),
                                projection.getChecklistModeloNome(),
                                projection.getChecklistModeloArquivoNome()));
    }
}