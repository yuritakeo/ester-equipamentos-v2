package com.example.service;

import java.util.HashSet;
import java.util.List;
import java.util.Set;

import org.springframework.core.io.Resource;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import com.example.dto.ChecklistModeloListagemDTO;
import com.example.dto.ChecklistModeloRequest;
import com.example.entity.ChecklistModelo;
import com.example.entity.Estoque;
import com.example.exception.BusinessException;
import com.example.repository.ChecklistModeloRepository;

@Service
public class ChecklistModeloService {

    private final ChecklistModeloRepository repository;
    private final ChecklistModeloConsultaService checklistModeloConsultaService;
    private final ChecklistModeloVinculoService checklistModeloVinculoService;
    private final ChecklistModeloArquivoService checklistModeloArquivoService;

    // ✅ CONSTRUTOR MANUAL (resolve problema do Lombok)
    public ChecklistModeloService(
            ChecklistModeloRepository repository,
            ChecklistModeloConsultaService checklistModeloConsultaService,
            ChecklistModeloVinculoService checklistModeloVinculoService,
            ChecklistModeloArquivoService checklistModeloArquivoService) {

        this.repository = repository;
        this.checklistModeloConsultaService = checklistModeloConsultaService;
        this.checklistModeloVinculoService = checklistModeloVinculoService;
        this.checklistModeloArquivoService = checklistModeloArquivoService;
    }

    @Transactional
    public ChecklistModelo salvar(ChecklistModeloRequest request) {
        checklistModeloVinculoService.validarEquipamentosExistentes(request.getEquipamentoIds());
        checklistModeloVinculoService.desvincularEquipamentosDeOutrosModelos(request.getEquipamentoIds(), null);

        ChecklistModelo checklistModelo = ChecklistModelo.builder()
                .nome(validarNomeObrigatorio(request.getNome()))
                .equipamentos(checklistModeloVinculoService.resolverEquipamentos(request.getEquipamentoIds()))
                .build();

        ChecklistModelo salvo = repository.save(checklistModelo);
        return checklistModeloConsultaService.buscarPorId(salvo.getId());
    }

    public ChecklistModelo importar(String nome, MultipartFile arquivo) {
        return checklistModeloArquivoService.importar(nome, arquivo);
    }

    @Transactional
    public ChecklistModelo atualizarArquivo(Long id, MultipartFile arquivo) {
        ChecklistModelo checklistModelo = checklistModeloConsultaService.buscarPorId(id);
        return checklistModeloArquivoService.atualizarArquivo(checklistModelo, arquivo);
    }

    @Transactional
    public ChecklistModelo atualizar(Long id, ChecklistModeloRequest request) {
        checklistModeloVinculoService.validarEquipamentosExistentes(request.getEquipamentoIds());

        ChecklistModelo checklistModelo = checklistModeloConsultaService.buscarPorId(id);

        checklistModeloVinculoService.desvincularEquipamentosDeOutrosModelos(request.getEquipamentoIds(), id);

        Set<Long> equipamentosAntes = checklistModelo.getEquipamentos().stream()
                .map(Estoque::getId)
                .collect(java.util.stream.Collectors.toSet());

        Set<Long> equipamentosDepois = new HashSet<>(
                request.getEquipamentoIds() == null ? List.of() : request.getEquipamentoIds()
        );

        if (request.getNome() != null && !request.getNome().isBlank()) {
            checklistModelo.setNome(request.getNome().trim());
        }

        checklistModelo.setEquipamentos(
                checklistModeloVinculoService.resolverEquipamentos(request.getEquipamentoIds())
        );

        ChecklistModelo modeloAtualizado = repository.save(checklistModelo);

        equipamentosAntes.removeAll(equipamentosDepois);
        checklistModeloVinculoService.arquivarRelatoriosECortarVinculo(id, equipamentosAntes);

        return checklistModeloConsultaService.buscarPorId(modeloAtualizado.getId());
    }

    public ChecklistModelo buscarPorId(Long id) {
        return checklistModeloConsultaService.buscarPorId(id);
    }

    // ✅ PAGINADO (correto)
    public Page<ChecklistModelo> listar(Pageable pageable) {
        return checklistModeloConsultaService.listar(pageable);
    }

    // ✅ AQUI FOI A GRANDE CORREÇÃO
    public Page<ChecklistModeloListagemDTO> listarResumo(Pageable pageable) {

        return repository.findAllListagem(pageable)
                .map(projection -> new ChecklistModeloListagemDTO(
                        projection.getId(),
                        projection.getNome(),
                        projection.getArquivoNome(),
                        projection.getArquivoOriginalNome(),
                        projection.getData()
                ));
    }

    @Transactional
    public void deletar(Long id) {
        ChecklistModelo checklistModelo = checklistModeloConsultaService.buscarPorId(id);

        checklistModeloArquivoService.excluirArquivoSeExistir(checklistModelo);
        checklistModeloVinculoService.limparExecucoesPorChecklistModelo(id);

        repository.deleteById(id);
    }

    public Resource baixarArquivo(Long id) {
        ChecklistModelo checklistModelo = checklistModeloConsultaService.buscarPorId(id);
        return checklistModeloArquivoService.baixarArquivo(checklistModelo);
    }

    public void preencherConteudoArquivoAusente() {
        checklistModeloArquivoService.preencherConteudoArquivoAusente();
    }

    public String getArquivoOriginalNome(Long id) {
        ChecklistModelo checklistModelo = checklistModeloConsultaService.buscarPorId(id);
        return checklistModeloArquivoService.getArquivoOriginalNome(checklistModelo);
    }

    private String validarNomeObrigatorio(String nome) {
        if (nome == null || nome.isBlank()) {
            throw new BusinessException("Nome do modelo e obrigatorio.");
        }

        return nome.trim();
    }
}