package com.example.service;

import java.util.Comparator;
import java.util.HashSet;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;

import com.example.dto.EstoqueListagemDTO;
import com.example.repository.EstoqueRepository;
import com.example.repository.ManutencaoRepository;
import com.example.repository.OficinaRepository;

import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
public class EstoqueListagemService {

    private final EstoqueRepository repository;
    private final OficinaRepository oficinaRepository;
    private final ManutencaoRepository manutencaoRepository;

    // ✅ SOMENTE PAGINAÇÃO (correto)
    public Page<EstoqueListagemDTO> listarPaginado(int page, int size) {

        Page<EstoqueListagemDTO> pagina = repository.findResumoAtivos(
                PageRequest.of(page, size)
        );

        List<EstoqueListagemDTO> deduplicados = deduplicarResumoPorTag(
                pagina.getContent()
        );

        return new org.springframework.data.domain.PageImpl<>(
                deduplicados,
                pagina.getPageable(),
                pagina.getTotalElements()
        );
    }

    public Page<EstoqueListagemDTO> listarPorEmpresaPaginado(Long empresaId, int page, int size) {

        Page<EstoqueListagemDTO> pagina = repository.findResumoAtivosByEmpresaId(
                empresaId,
                PageRequest.of(page, size)
        );

        List<EstoqueListagemDTO> deduplicados = deduplicarResumoPorTag(
                pagina.getContent()
        );

        return new org.springframework.data.domain.PageImpl<>(
                deduplicados,
                pagina.getPageable(),
                pagina.getTotalElements()
        );
    }

    // ✅ AGORA roda só em pequenos volumes (página)
    private List<EstoqueListagemDTO> deduplicarResumoPorTag(List<EstoqueListagemDTO> registros) {
        if (registros == null || registros.isEmpty()) {
            return List.of();
        }

        Set<Long> idsNaOficina = new HashSet<>(
                oficinaRepository.findEquipamentoIdsComPassagemNaOficina()
        );

        Set<Long> idsNaManutencaoPendente = new HashSet<>(
                manutencaoRepository.findEquipamentoIdsComPendenciaAberta()
        );

        Map<String, EstoqueListagemDTO> unicosPorTag = new LinkedHashMap<>();

        for (EstoqueListagemDTO registro : registros) {
            String tagNormalizada = normalizarTag(registro.getTagPatrimonio());

            String chaveUnica = tagNormalizada != null
                    ? "tag:" + tagNormalizada.toLowerCase(Locale.ROOT)
                    : "fallback-id:" + registro.getId();

            EstoqueListagemDTO atual = unicosPorTag.get(chaveUnica);

            if (atual == null || compararPrioridadeRegistro(
                    registro, atual, idsNaOficina, idsNaManutencaoPendente) < 0) {

                unicosPorTag.put(chaveUnica, registro);
            }
        }

        return unicosPorTag.values().stream()
                .sorted(Comparator
                        .comparing((EstoqueListagemDTO item) ->
                                String.valueOf(item.getNomeEquipamento() == null ? "" : item.getNomeEquipamento()),
                                String.CASE_INSENSITIVE_ORDER)
                        .thenComparing(item ->
                                String.valueOf(item.getTagPatrimonio() == null ? "" : item.getTagPatrimonio()),
                                String.CASE_INSENSITIVE_ORDER)
                        .thenComparingLong(this::idParaOrdenacao))
                .toList();
    }

    private int compararPrioridadeRegistro(
            EstoqueListagemDTO candidato,
            EstoqueListagemDTO atual,
            Set<Long> idsNaOficina,
            Set<Long> idsNaManutencaoPendente
    ) {
        int prioridadeCandidato = calcularPrioridade(candidato, idsNaOficina, idsNaManutencaoPendente);
        int prioridadeAtual = calcularPrioridade(atual, idsNaOficina, idsNaManutencaoPendente);

        if (prioridadeCandidato != prioridadeAtual) {
            return Integer.compare(prioridadeAtual, prioridadeCandidato);
        }

        return Long.compare(idOuMinimo(atual), idOuMinimo(candidato));
    }

    private int calcularPrioridade(
            EstoqueListagemDTO registro,
            Set<Long> idsNaOficina,
            Set<Long> idsNaManutencaoPendente
    ) {
        long id = idOuMinimo(registro);
        int prioridade = 0;

        if (idsNaManutencaoPendente.contains(id)) prioridade += 8;
        if (idsNaOficina.contains(id)) prioridade += 6;
        if (registro.getEquipeResponsavel() != null || registro.getEquipe() != null) prioridade += 4;
        if (registro.getCanteiro() != null) prioridade += 2;

        return prioridade;
    }

    private long idParaOrdenacao(EstoqueListagemDTO registro) {
        return registro != null && registro.getId() != null
                ? registro.getId()
                : Long.MAX_VALUE;
    }

    private long idOuMinimo(EstoqueListagemDTO registro) {
        return registro != null && registro.getId() != null
                ? registro.getId()
                : Long.MIN_VALUE;
    }

    private String normalizarTag(String tagPatrimonio) {
        if (tagPatrimonio == null) return null;

        String tagNormalizada = tagPatrimonio.trim();
        return tagNormalizada.isEmpty() ? null : tagNormalizada;
    }
}