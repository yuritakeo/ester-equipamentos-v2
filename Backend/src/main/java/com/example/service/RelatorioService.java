package com.example.service;

import java.util.List;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.example.dto.RelatorioListagemDTO;
import com.example.dto.RelatorioEstoqueResumoDTO;
import com.example.dto.RelatorioRequest;
import com.example.entity.Equipe;
import com.example.entity.Execucao;
import com.example.entity.Estoque;
import com.example.entity.Relatorio;
import com.example.exception.ResourceNotFoundException;
import com.example.repository.EquipeRepository;
import com.example.repository.ExecucaoRelatorioProjection;
import com.example.repository.ExecucaoRepository;
import com.example.repository.EstoqueRepository;
import com.example.repository.RelatorioListagemProjection;
import com.example.repository.RelatorioRepository;

import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
public class RelatorioService {

    private static final int TAMANHO_MAXIMO_PAGINA = 100;

    private final RelatorioRepository repository;
    private final EquipeRepository equipeRepository;
    private final EstoqueRepository estoqueRepository;
    private final ExecucaoRepository execucaoRepository;

    @Transactional
    public Relatorio salvar(RelatorioRequest request) {
        Equipe equipe = equipeRepository.findById(request.getEquipeId())
                .orElseThrow(() -> new ResourceNotFoundException("Equipe nao encontrada"));

        Estoque estoque = estoqueRepository.findById(request.getEstoqueId())
                .orElseThrow(() -> new ResourceNotFoundException("Equipamento nao encontrado"));

        Execucao execucao = null;
        if (request.getChecklistExecucaoId() != null) {
            execucao = execucaoRepository.findById(request.getChecklistExecucaoId())
                    .orElseThrow(() -> new ResourceNotFoundException("Execucao nao encontrada"));
        }

        Relatorio relatorio = Relatorio.builder()
                .equipe(equipe)
                .estoque(estoque)
                .checklistExecucao(execucao)
                .build();

        return repository.save(relatorio);
    }

    @Transactional
    public Relatorio gerarPorExecucao(Long execucaoId) {
        if (execucaoId == null) {
            throw new ResourceNotFoundException("Execucao nao encontrada");
        }

        if (repository.existsByChecklistExecucaoId(execucaoId)) {
            return repository.findByChecklistExecucaoId(execucaoId)
                    .orElseThrow(() -> new ResourceNotFoundException("Relatorio nao encontrado"));
        }

        Execucao execucao = execucaoRepository.findById(execucaoId)
                .orElseThrow(() -> new ResourceNotFoundException("Execucao nao encontrada"));

        Relatorio relatorio = Relatorio.builder()
                .equipe(execucao.getEquipe())
                .estoque(execucao.getEstoque())
                .checklistExecucao(execucao)
                .build();

        return repository.save(relatorio);
    }

    @Transactional
    public void gerarPorExecucaoSeNaoExistir(Long execucaoId) {
        if (execucaoId == null) return;

        if (repository.existsByChecklistExecucaoId(execucaoId)) return;

        ExecucaoRelatorioProjection dados = execucaoRepository.findDadosRelatorioById(execucaoId)
                .orElseThrow(() -> new ResourceNotFoundException("Execucao nao encontrada"));

        Relatorio relatorio = Relatorio.builder()
                .equipe(dados.getEquipeId() == null ? null : equipeRepository.getReferenceById(dados.getEquipeId()))
                .estoque(dados.getEstoqueId() == null ? null : estoqueRepository.getReferenceById(dados.getEstoqueId()))
                .checklistExecucao(execucaoRepository.getReferenceById(dados.getId()))
                .build();

        repository.save(relatorio);
    }

    @Transactional(readOnly = true)
    public Relatorio buscarPorId(Long id) {
        return repository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Relatorio nao encontrado"));
    }

    // ✅ REMOVIDO listar() SEM PAGINAÇÃO

    public Page<RelatorioListagemDTO> listarPaginado(int page, int size) {
        return repository.findAllListagem(criarPageRequest(page, size))
                .map(this::mapearListagem);
    }

    public Page<Relatorio> listarEntidadesPaginado(int page, int size) {
        return repository.findAll(criarPageRequest(page, size));
    }

    // ✅ CORRIGIDO
    public Page<Relatorio> listarPorEquipe(Long equipeId, int page, int size) {
        return repository.findByEquipeIdOrderByDataDesc(
                equipeId,
                criarPageRequest(page, size)
        );
    }

    // ✅ CORRIGIDO (antes era List)
    public Page<RelatorioListagemDTO> listarPorEstoque(Long estoqueId, int page, int size) {
        return repository.findListagemByEstoqueId(
                estoqueId,
                criarPageRequest(page, size)
        ).map(this::mapearListagem);
    }

    @Transactional(readOnly = true)
    public Page<RelatorioEstoqueResumoDTO> listarResumoPorEstoque(Long estoqueId, int page, int size) {
        return repository.findResumoByEstoqueId(
                estoqueId,
                criarPageRequest(page, size)
        );
    }

    @Transactional
    public void deletar(Long id) {
        if (!repository.existsById(id)) {
            throw new ResourceNotFoundException("Relatorio nao encontrado");
        }
        repository.deleteById(id);
    }

    private PageRequest criarPageRequest(int page, int size) {
        int paginaSegura = Math.max(page, 0);
        int tamanhoSeguro = Math.min(Math.max(size, 1), TAMANHO_MAXIMO_PAGINA);
        return PageRequest.of(paginaSegura, tamanhoSeguro);
    }

    private RelatorioListagemDTO mapearListagem(RelatorioListagemProjection projection) {

        RelatorioListagemDTO.TipoCategoriaDTO equipeTipoCategoria =
                new RelatorioListagemDTO.TipoCategoriaDTO(
                        projection.getEquipeTipoCategoriaId(),
                        projection.getEquipeTipoCategoriaNome());

        RelatorioListagemDTO.EquipeDTO equipe =
                new RelatorioListagemDTO.EquipeDTO(
                        projection.getEquipeId(),
                        projection.getEquipeNome(),
                        equipeTipoCategoria);

        RelatorioListagemDTO.TipoCategoriaDTO equipeResponsavelTipoCategoria =
                new RelatorioListagemDTO.TipoCategoriaDTO(
                        projection.getEstoqueEquipeResponsavelTipoCategoriaId(),
                        projection.getEstoqueEquipeResponsavelTipoCategoriaNome());

        RelatorioListagemDTO.EquipeDTO equipeResponsavel =
                new RelatorioListagemDTO.EquipeDTO(
                        projection.getEstoqueEquipeResponsavelId(),
                        projection.getEstoqueEquipeResponsavelNome(),
                        equipeResponsavelTipoCategoria);

        RelatorioListagemDTO.EmpresaDTO empresa =
                new RelatorioListagemDTO.EmpresaDTO(
                        projection.getEstoqueEmpresaId(),
                        projection.getEstoqueEmpresaNome());

        RelatorioListagemDTO.EstoqueDTO estoque =
                new RelatorioListagemDTO.EstoqueDTO(
                        projection.getEstoqueId(),
                        projection.getEstoqueNomeEquipamento(),
                        projection.getEstoqueTagPatrimonio(),
                        projection.getEstoqueAtivo(),
                        empresa,
                        equipeResponsavel);

        RelatorioListagemDTO.ExecucaoDTO checklistExecucao = null;

        if (projection.getChecklistExecucaoId() != null) {
            RelatorioListagemDTO.TipoCategoriaDTO execucaoEquipeTipoCategoria =
                    new RelatorioListagemDTO.TipoCategoriaDTO(
                            projection.getChecklistExecucaoEquipeTipoCategoriaId(),
                            projection.getChecklistExecucaoEquipeTipoCategoriaNome());

            RelatorioListagemDTO.EquipeDTO execucaoEquipe =
                    new RelatorioListagemDTO.EquipeDTO(
                            projection.getChecklistExecucaoEquipeId(),
                            projection.getChecklistExecucaoEquipeNome(),
                            execucaoEquipeTipoCategoria);

            RelatorioListagemDTO.ChecklistModeloDTO checklistModelo =
                    new RelatorioListagemDTO.ChecklistModeloDTO(
                            projection.getChecklistModeloId(),
                            projection.getChecklistModeloNome(),
                            projection.getChecklistModeloArquivoNome());

            checklistExecucao = new RelatorioListagemDTO.ExecucaoDTO(
                    projection.getChecklistExecucaoId(),
                    projection.getChecklistExecucaoData(),
                    projection.getChecklistExecucaoRespostasJson(),
                    execucaoEquipe,
                    estoque,
                    checklistModelo);
        }

        return new RelatorioListagemDTO(
                projection.getId(),
                projection.getData(),
                equipe,
                checklistExecucao,
                estoque);
    }
}