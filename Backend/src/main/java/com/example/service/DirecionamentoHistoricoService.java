package com.example.service;

import java.util.List;
import java.util.Locale;
import java.util.Objects;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.example.dto.DirecionamentoHistoricoDTO;
import com.example.entity.Canteiro;
import com.example.entity.DirecionamentoHistorico;
import com.example.entity.Empresa;
import com.example.entity.Equipe;
import com.example.entity.Estoque;
import com.example.repository.DirecionamentoHistoricoRepository;

import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
public class DirecionamentoHistoricoService {

    private static final String TIPO_CADASTRO = "CADASTRO";
    private static final String TIPO_CANTEIRO = "CANTEIRO";
    private static final String TIPO_EQUIPE = "EQUIPE";
    private static final String TIPO_MANUTENCAO = "MANUTENCAO";

    private final DirecionamentoHistoricoRepository repository;

    public List<DirecionamentoHistoricoDTO> listarTodos() {
        return repository.findAllByOrderByDataEventoDesc()
                .stream()
                .map(DirecionamentoHistoricoDTO::new)
                .toList();
    }

    @Transactional
    public void registrarCadastroNoCanteiro(Estoque estoque, String observacao) {
        var command = new DirecionamentoHistoricoCommand(
                DirecionamentoHistoricoAcao.CADASTRO_CANTEIRO.valor(),
                TIPO_CADASTRO,
                null,
                "Cadastro",
                "Sistema",
                TIPO_CANTEIRO,
                canteiroId(estoque),
                nomeCanteiro(estoque),
                TIPO_CANTEIRO,
                observacao,
                estoque);
        executar(command);
    }

    @Transactional
    public void registrarMovimentoParaCanteiro(Estoque estoque, Equipe equipeOrigem, String observacao) {
        var command = new DirecionamentoHistoricoCommand(
                DirecionamentoHistoricoAcao.MOVER_PARA_CANTEIRO.valor(),
                equipeOrigem != null ? TIPO_EQUIPE : TIPO_CANTEIRO,
                equipeOrigem != null ? equipeOrigem.getId() : canteiroId(estoque),
                equipeOrigem != null ? nomeEquipe(equipeOrigem) : nomeCanteiro(estoque),
                equipeOrigem != null ? categoriaEquipe(equipeOrigem) : TIPO_CANTEIRO,
                TIPO_CANTEIRO,
                canteiroId(estoque),
                nomeCanteiro(estoque),
                TIPO_CANTEIRO,
                observacao,
                estoque);
        executar(command);
    }

    @Transactional
    public void registrarMovimentoParaEquipe(Estoque estoque, Equipe equipeOrigem, Equipe equipeDestino, String observacao) {
        if (equipeDestino == null) {
            return;
        }

        if (equipeOrigem != null && Objects.equals(equipeOrigem.getId(), equipeDestino.getId())) {
            return;
        }

        var command = new DirecionamentoHistoricoCommand(
                DirecionamentoHistoricoAcao.DIRECIONAR_EQUIPE.valor(),
                equipeOrigem != null ? TIPO_EQUIPE : TIPO_CANTEIRO,
                equipeOrigem != null ? equipeOrigem.getId() : canteiroId(estoque),
                equipeOrigem != null ? nomeEquipe(equipeOrigem) : nomeCanteiro(estoque),
                equipeOrigem != null ? categoriaEquipe(equipeOrigem) : TIPO_CANTEIRO,
                TIPO_EQUIPE,
                equipeDestino.getId(),
                nomeEquipe(equipeDestino),
                categoriaEquipe(equipeDestino),
                observacao,
                estoque);
        executar(command);
    }

    @Transactional
    public void registrarTransferenciaEntreEquipes(Estoque estoque, Equipe equipeOrigem, Equipe equipeDestino, String observacao) {
        if (equipeOrigem == null || equipeDestino == null || Objects.equals(equipeOrigem.getId(), equipeDestino.getId())) {
            return;
        }

        var command = new DirecionamentoHistoricoCommand(
                DirecionamentoHistoricoAcao.TRANSFERENCIA_EQUIPE.valor(),
                TIPO_EQUIPE,
                equipeOrigem.getId(),
                nomeEquipe(equipeOrigem),
                categoriaEquipe(equipeOrigem),
                TIPO_EQUIPE,
                equipeDestino.getId(),
                nomeEquipe(equipeDestino),
                categoriaEquipe(equipeDestino),
                observacao,
                estoque);
        executar(command);
    }

    @Transactional
    public void registrarEntradaManutencao(Estoque estoque, Equipe equipeOrigem, String observacao) {
        var command = new DirecionamentoHistoricoCommand(
                DirecionamentoHistoricoAcao.ENTRADA_MANUTENCAO.valor(),
                equipeOrigem != null ? TIPO_EQUIPE : TIPO_CANTEIRO,
                equipeOrigem != null ? equipeOrigem.getId() : canteiroId(estoque),
                equipeOrigem != null ? nomeEquipe(equipeOrigem) : nomeCanteiro(estoque),
                equipeOrigem != null ? categoriaEquipe(equipeOrigem) : TIPO_CANTEIRO,
                TIPO_MANUTENCAO,
                null,
                "Manutencao",
                "Oficina/Manutencao",
                observacao,
                estoque);
        executar(command);
    }

    @Transactional
    public void registrarSaidaManutencaoParaEquipe(Estoque estoque, Equipe equipeDestino, String observacao) {
        if (equipeDestino == null) {
            return;
        }

        var command = new DirecionamentoHistoricoCommand(
                DirecionamentoHistoricoAcao.RETORNO_MANUTENCAO_EQUIPE.valor(),
                TIPO_MANUTENCAO,
                null,
                "Manutencao",
                "Oficina/Manutencao",
                TIPO_EQUIPE,
                equipeDestino.getId(),
                nomeEquipe(equipeDestino),
                categoriaEquipe(equipeDestino),
                observacao,
                estoque);
        executar(command);
    }

    @Transactional
    public void registrarSaidaManutencaoParaCanteiro(Estoque estoque, String observacao) {
        var command = new DirecionamentoHistoricoCommand(
                DirecionamentoHistoricoAcao.RETORNO_MANUTENCAO_CANTEIRO.valor(),
                TIPO_MANUTENCAO,
                null,
                "Manutencao",
                "Oficina/Manutencao",
                TIPO_CANTEIRO,
                canteiroId(estoque),
                nomeCanteiro(estoque),
                TIPO_CANTEIRO,
                observacao,
                estoque);
        executar(command);
    }

    private void executar(DirecionamentoHistoricoCommand command) {
        registrar(
                command.estoque(),
                command.acao(),
                command.origemTipo(),
                command.origemReferenciaId(),
                command.origemNome(),
                command.origemCategoria(),
                command.destinoTipo(),
                command.destinoReferenciaId(),
                command.destinoNome(),
                command.destinoCategoria(),
                command.observacao());
    }

    private void registrar(
            Estoque estoque,
            String acao,
            String origemTipo,
            Long origemReferenciaId,
            String origemNome,
            String origemCategoria,
            String destinoTipo,
            Long destinoReferenciaId,
            String destinoNome,
            String destinoCategoria,
            String observacao) {
        if (estoque == null || estoque.getId() == null) {
            return;
        }

        DirecionamentoHistorico entity = DirecionamentoHistorico.builder()
                .equipamentoIdSnapshot(estoque.getId())
                .nomeEquipamentoSnapshot(normalizarTexto(estoque.getNomeEquipamento(), "Sem nome"))
                .tagPatrimonioSnapshot(normalizarTexto(estoque.getTagPatrimonio(), "Sem tag"))
                .empresaNomeSnapshot(nomeEmpresa(estoque.getEmpresa()))
                .valorUnitarioSnapshot(estoque.getValorUnitario())
                .acao(normalizarTexto(acao, "DIRECIONAMENTO"))
                .origemTipo(normalizarTexto(origemTipo, TIPO_CADASTRO))
                .origemReferenciaId(origemReferenciaId)
                .origemNomeSnapshot(normalizarTexto(origemNome, "Origem desconhecida"))
                .origemCategoriaSnapshot(normalizarTexto(origemCategoria, "Sem categoria"))
                .destinoTipo(normalizarTexto(destinoTipo, TIPO_CANTEIRO))
                .destinoReferenciaId(destinoReferenciaId)
                .destinoNomeSnapshot(normalizarTexto(destinoNome, "Destino desconhecido"))
                .destinoCategoriaSnapshot(normalizarTexto(destinoCategoria, "Sem categoria"))
                .observacao(normalizarObservacao(observacao))
                .build();

        repository.save(entity);
    }

    private Long canteiroId(Estoque estoque) {
        return estoque != null && estoque.getCanteiro() != null ? estoque.getCanteiro().getId() : null;
    }

    private String nomeCanteiro(Estoque estoque) {
        Canteiro canteiro = estoque != null ? estoque.getCanteiro() : null;
        String nome = canteiro != null ? canteiro.getNome() : null;
        return normalizarTexto(nome, "Canteiro");
    }

    private String nomeEquipe(Equipe equipe) {
        return normalizarTexto(equipe != null ? equipe.getNome() : null, "Sem equipe");
    }

    private String categoriaEquipe(Equipe equipe) {
        String categoria = equipe != null && equipe.getTipoCategoria() != null ? equipe.getTipoCategoria().getNome() : null;
        return normalizarTexto(categoria, "Sem categoria");
    }

    private String nomeEmpresa(Empresa empresa) {
        return normalizarTexto(empresa != null ? empresa.getNome() : null, "Sem empresa");
    }

    private String normalizarObservacao(String valor) {
        String texto = valor == null ? "" : valor.trim();
        return texto.isEmpty() ? null : texto;
    }

    private String normalizarTexto(String valor, String fallback) {
        String texto = valor == null ? "" : valor.trim();
        if (!texto.isEmpty()) {
            return texto;
        }

        String padrao = fallback == null ? "" : fallback.trim();
        return padrao.isEmpty() ? "Sem informacao" : padrao.toUpperCase(Locale.ROOT).equals(padrao)
                ? padrao
                : padrao;
    }
}
