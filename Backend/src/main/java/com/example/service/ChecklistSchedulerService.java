package com.example.service;

import java.time.DayOfWeek;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.time.temporal.TemporalAdjusters;
import java.util.ArrayList;
import java.util.List;

import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

@Service
@RequiredArgsConstructor
@Slf4j
public class ChecklistSchedulerService {

    private static final String ZONE = "America/Sao_Paulo";
    private static final ZoneId ZONE_ID = ZoneId.of(ZONE);

    /**
     * Tamanho do lote usado no agendamento.
     * Quanto menor o lote, menor o uso de memoria RAM durante a geracao semanal.
     */
    private static final int TAMANHO_LOTE = 100;

    private final ExecucaoService execucaoService;
    private final RelatorioService relatorioService;

    /**
     * Roda toda segunda-feira as 00:01 no horario de Sao Paulo.
     *
     * Fluxo otimizado:
     * 1. Busca somente IDs das execucoes da semana anterior.
     * 2. Processa em lotes pequenos.
     * 3. Gera relatorios sem carregar a Execucao completa com EntityGraph.
     * 4. Reseta somente os checklists cujo relatorio foi gerado ou ja existia.
     */
    @Scheduled(cron = "0 1 0 * * MON", zone = ZONE)
    public void gerarRelatoriosSemanaAnterior() {
        Periodo periodo = calcularSemanaAnterior();

        log.info(
                "[SCHEDULED] Iniciando geracao de relatorios semanais. Periodo: {} ate {} exclusivo.",
                periodo.getInicio(),
                periodo.getFimExclusivo()
        );

        long ultimoIdProcessado = 0L;
        long relatoriosProcessados = 0L;
        long falhas = 0L;
        long checklistsResetados = 0L;

        while (true) {
            List<Long> idsExecucoes = execucaoService.buscarIdsPorPeriodoEmLote(
                    periodo.getInicio(),
                    periodo.getFimExclusivo(),
                    ultimoIdProcessado,
                    TAMANHO_LOTE
            );

            if (idsExecucoes.isEmpty()) {
                break;
            }

            ultimoIdProcessado = idsExecucoes.get(idsExecucoes.size() - 1);

            List<Long> idsComRelatorioGerado = new ArrayList<>(idsExecucoes.size());

            for (Long execucaoId : idsExecucoes) {
                try {
                    relatorioService.gerarPorExecucaoSeNaoExistir(execucaoId);
                    idsComRelatorioGerado.add(execucaoId);
                    relatoriosProcessados++;
                } catch (Exception e) {
                    falhas++;
                    log.error("Erro ao gerar relatorio para execucao {}.", execucaoId, e);
                }
            }

            try {
                checklistsResetados += execucaoService.resetarChecklistsPorIds(idsComRelatorioGerado);
            } catch (Exception e) {
                log.error("Erro ao resetar checklists do lote. IDs: {}", idsComRelatorioGerado, e);
            }

            if (idsExecucoes.size() < TAMANHO_LOTE) {
                break;
            }
        }

        log.info(
                "[SCHEDULED] Finalizado. Relatorios gerados/ja existentes: {}. Falhas: {}. Checklists resetados: {}.",
                relatoriosProcessados,
                falhas,
                checklistsResetados
        );
    }

    private Periodo calcularSemanaAnterior() {
        LocalDate hoje = LocalDate.now(ZONE_ID);
        LocalDate segundaSemanaAtual = hoje.with(TemporalAdjusters.previousOrSame(DayOfWeek.MONDAY));
        LocalDate segundaSemanaAnterior = segundaSemanaAtual.minusWeeks(1);

        return new Periodo(
                segundaSemanaAnterior.atStartOfDay(),
                segundaSemanaAtual.atStartOfDay()
        );
    }

    private static final class Periodo {

        private final LocalDateTime inicio;
        private final LocalDateTime fimExclusivo;

        private Periodo(LocalDateTime inicio, LocalDateTime fimExclusivo) {
            this.inicio = inicio;
            this.fimExclusivo = fimExclusivo;
        }

        private LocalDateTime getInicio() {
            return inicio;
        }

        private LocalDateTime getFimExclusivo() {
            return fimExclusivo;
        }
    }
}