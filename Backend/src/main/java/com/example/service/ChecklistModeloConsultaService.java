package com.example.service;

import java.util.ArrayList;
import java.util.List;
import java.util.stream.Collectors;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.example.dto.ChecklistModeloEquipamentoResumoDTO;
import com.example.dto.ChecklistModeloListagemDTO;
import com.example.entity.ChecklistModelo;
import com.example.entity.Estoque;
import com.example.exception.ResourceNotFoundException;
import com.example.repository.ChecklistModeloListagemProjection;
import com.example.repository.ChecklistModeloRepository;
import com.example.repository.ChecklistModeloVinculoResumoProjection;

@Service
public class ChecklistModeloConsultaService {

    private final ChecklistModeloRepository repository;

    // ✅ construtor manual (sem lombok)
    public ChecklistModeloConsultaService(ChecklistModeloRepository repository) {
        this.repository = repository;
    }

    @Transactional(readOnly = true)
    public ChecklistModelo buscarPorId(Long id) {
        ChecklistModelo modelo = repository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Checklist modelo nao encontrado"));

        return inicializarRelacionamentos(modelo);
    }


    // // TODO: AQQUI TEM UM PONTO DE ATENÇÃO QUE ESTÁ UMA DEFINIÇÃO MANUAL PARA 0 A 50 E EMBAIXO ESTÁ A OPÇÃO RECOMENDADA
    // @Transactional(readOnly = true)
    // public List<ChecklistModelo> listar() {
    //     return repository.findAll(PageRequest.of(0, 50))
    //             .stream()
    //             .map(this::inicializarRelacionamentos)
    //             .toList();
    // }
    // ⚠️ cuidado (ainda pode estourar memória)
    @Transactional(readOnly = true)
    public Page<ChecklistModelo> listar(Pageable pageable) {
        return repository.findAll(pageable)
                .map(this::inicializarRelacionamentos);
    }




    // ✅ ✅ AQUI ESTÁ A CORREÇÃO REAL
    @Transactional(readOnly = true)
    public Page<ChecklistModeloListagemDTO> listarResumo(Pageable pageable) {

        Page<ChecklistModeloListagemProjection> page =
                repository.findAllListagem(pageable);

        Page<ChecklistModeloListagemDTO> dtoPage =
                page.map(this::mapearListagem);

        var modeloIds = dtoPage.getContent()
                .stream()
                .map(ChecklistModeloListagemDTO::getId)
                .toList();

        
        List<ChecklistModeloVinculoResumoProjection> vinculos =
                modeloIds.isEmpty()
                ? List.of()
                : repository.findVinculosResumoByModeloIds(modeloIds);


        java.util.Map<Long, ChecklistModeloListagemDTO> mapa =
                dtoPage.getContent().stream()
                        .collect(Collectors.toMap(
                                ChecklistModeloListagemDTO::getId,
                                item -> item
                        ));

        for (ChecklistModeloVinculoResumoProjection vinculo : vinculos) {

            ChecklistModeloListagemDTO modelo =
                    mapa.get(vinculo.getModeloId());

            if (modelo == null) continue;

            modelo.getEquipamentos().add(
                    new ChecklistModeloEquipamentoResumoDTO(
                            vinculo.getEquipamentoId(),
                            vinculo.getEquipamentoNomeEquipamento(),
                            vinculo.getEquipamentoTagPatrimonio()
                    )
            );
        }

        return dtoPage;
    }

    public ChecklistModelo inicializarRelacionamentos(ChecklistModelo modelo) {

        if (modelo == null) {
            return null;
        }

        java.util.List<Estoque> equipamentos = modelo.getEquipamentos();

        if (equipamentos == null) {
            modelo.setEquipamentos(new ArrayList<>());
            return modelo;
        }

        equipamentos.size();

        equipamentos.forEach(equipamento -> {
            if (equipamento == null) return;

            if (equipamento.getEmpresa() != null) {
                equipamento.getEmpresa().getNome();
            }

            if (equipamento.getEquipe() != null) {
                equipamento.getEquipe().getNome();

                if (equipamento.getEquipe().getTipoCategoria() != null) {
                    equipamento.getEquipe().getTipoCategoria().getNome();
                }
            }

            if (equipamento.getEquipeResponsavel() != null) {
                equipamento.getEquipeResponsavel().getNome();

                if (equipamento.getEquipeResponsavel().getTipoCategoria() != null) {
                    equipamento.getEquipeResponsavel().getTipoCategoria().getNome();
                }
            }
        });

        return modelo;
    }

    private ChecklistModeloListagemDTO mapearListagem(ChecklistModeloListagemProjection projection) {

        return new ChecklistModeloListagemDTO(
                projection.getId(),
                projection.getNome(),
                projection.getArquivoNome(),
                projection.getArquivoOriginalNome(),
                projection.getData()
        );
    }
}