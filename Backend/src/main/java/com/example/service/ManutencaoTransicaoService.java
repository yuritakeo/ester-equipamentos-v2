package com.example.service;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.Locale;

import org.springframework.stereotype.Service;

import com.example.dto.ManutencaoRequest;
import com.example.dto.OficinaRequest;
import com.example.entity.Equipe;
import com.example.entity.Estoque;
import com.example.entity.Manutencao;
import com.example.entity.Usuario;
import com.example.enums.ManutencaoStatus;
import com.example.exception.BusinessException;
import com.example.exception.ResourceNotFoundException;
import com.example.repository.EquipeRepository;
import com.example.repository.EstoqueRepository;
import com.example.repository.ManutencaoRepository;
import com.example.repository.OficinaRepository;
import com.example.repository.UsuarioRepository;
import com.example.util.RoleUtils;

import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
public class ManutencaoTransicaoService {

    private static final String DESTINO_EQUIPE = "EQUIPE";
    private static final String DESTINO_OFICINA = "OFICINA";

    private final ManutencaoRepository manutencaoRepository;
    private final EstoqueRepository estoqueRepository;
    private final EquipeRepository equipeRepository;
    private final UsuarioRepository usuarioRepository;
    private final OficinaRepository oficinaRepository;
    private final OficinaService oficinaService;
    private final ExecucaoService execucaoService;
    private final DirecionamentoHistoricoService direcionamentoHistoricoService;

    public Equipe prepararEquipamentoParaNovaManutencao(Estoque equipamento) {
        Equipe equipeUltima = obterEquipeAtualDoEquipamento(equipamento);
        limparVinculoEquipe(equipamento);
        oficinaRepository.deleteByEquipamentoId(equipamento.getId());
        return equipeUltima;
    }

    public void aplicarTransicaoAtualizacao(Manutencao manutencao, ManutencaoRequest request, Long actorUserId) {
        if (manutencao.getManutencaoPai() != null) {
            atualizarSubmanutencao(manutencao, request, actorUserId);
            return;
        }

        if (request.getStatus() == ManutencaoStatus.CONCLUIDO) {
            concluirManutencao(manutencao, request, actorUserId);
            return;
        }

        if (request.getStatus() == ManutencaoStatus.INUTILIZADO) {
            inutilizarEquipamento(manutencao, request, actorUserId);
            return;
        }

        manutencao.setStatus(ManutencaoStatus.PENDENTE);
    }

    public void validarSubmanutencoesConcluidas(Long manutencaoId) {
        if (manutencaoRepository.existsByManutencaoPaiIdAndStatus(manutencaoId, ManutencaoStatus.PENDENTE)) {
            throw new BusinessException("Conclua as submanutencoes pendentes antes de finalizar a manutencao principal.");
        }
    }

    public void validarEquipamentoAtivo(Estoque equipamento) {
        if (Boolean.FALSE.equals(equipamento.getAtivo())) {
            throw new BusinessException("Equipamento inativo no estoque. Registro mantido apenas para historico.");
        }
    }

    public void preencherSnapshotEquipamento(Manutencao manutencao, Estoque equipamento) {
        if (manutencao == null || equipamento == null) {
            return;
        }

        manutencao.setNomeEquipamentoSnapshot(equipamento.getNomeEquipamento());
        manutencao.setTagPatrimonioSnapshot(equipamento.getTagPatrimonio());
        manutencao.setCanteiroIdSnapshot(equipamento.getCanteiro() != null ? equipamento.getCanteiro().getId() : null);
        manutencao.setCanteiroNomeSnapshot(equipamento.getCanteiro() != null ? equipamento.getCanteiro().getNome() : null);
    }

    private void concluirManutencao(Manutencao manutencao, ManutencaoRequest request, Long actorUserId) {
        Estoque equipamento = manutencao.getEquipamento();
        validarEquipamentoAtivo(equipamento);
        validarSubmanutencoesConcluidas(manutencao.getId());

        manutencao.setStatus(ManutencaoStatus.CONCLUIDO);
        manutencao.setDataSaida(LocalDateTime.now());
        manutencao.setDescricao(normalizarTexto(request.getDescricao()));
        manutencao.setFotoNotaFiscal(normalizarTexto(request.getFotoNotaFiscal()));
        manutencao.setValorTotal(somarValorPrincipalComSubmanutencoes(manutencao, request.getValorTotal()));
        manutencao.setEquipeConclusao(buscarEquipeDoUsuario(actorUserId));

        String destino = normalizarDestino(request.getDestinoAposConclusao());
        if (DESTINO_EQUIPE.equals(destino)) {
            Equipe equipeDestino = buscarEquipeDestinoConclusao(request.getEquipeDestinoId(), manutencao.getEquipeUltima());
            equipamento.setEquipeResponsavel(equipeDestino);
            equipamento.setEquipe(null);
            estoqueRepository.save(equipamento);
            oficinaRepository.deleteByEquipamentoId(equipamento.getId());
            direcionamentoHistoricoService.registrarSaidaManutencaoParaEquipe(
                    equipamento,
                    equipeDestino,
                    request.getDescricao());
            return;
        }

        equipamento.setEquipeResponsavel(null);
        equipamento.setEquipe(null);
        estoqueRepository.save(equipamento);

        OficinaRequest oficinaRequest = new OficinaRequest();
        oficinaRequest.setEquipamentoId(equipamento.getId());
        oficinaRequest.setObservacao(normalizarTexto(request.getDescricao()));
        oficinaService.salvar(oficinaRequest);
        direcionamentoHistoricoService.registrarSaidaManutencaoParaCanteiro(
                equipamento,
                request.getDescricao());
    }

    private void inutilizarEquipamento(Manutencao manutencao, ManutencaoRequest request, Long actorUserId) {
        Estoque equipamento = manutencao.getEquipamento();
        validarEquipamentoAtivo(equipamento);
        validarSubmanutencoesConcluidas(manutencao.getId());

        manutencao.setStatus(ManutencaoStatus.INUTILIZADO);
        manutencao.setDataSaida(LocalDateTime.now());
        manutencao.setDescricao(normalizarTexto(request.getDescricao()));
        manutencao.setFotoNotaFiscal(normalizarTexto(request.getFotoNotaFiscal()));
        manutencao.setValorTotal(request.getValorTotal());
        manutencao.setEquipeConclusao(buscarEquipeDoUsuario(actorUserId));

        inativarEquipamentoPorManutencao(equipamento);
        oficinaRepository.deleteByEquipamentoId(equipamento.getId());
    }

    private void atualizarSubmanutencao(Manutencao manutencao, ManutencaoRequest request, Long actorUserId) {
        Estoque equipamento = manutencao.getEquipamento();
        validarEquipamentoAtivo(equipamento);
        ManutencaoStatus statusAtual = manutencao.getStatus();

        manutencao.setDescricao(normalizarTexto(request.getDescricao()));
        manutencao.setFotoNotaFiscal(normalizarTexto(request.getFotoNotaFiscal()));
        manutencao.setValorTotal(request.getValorTotal());

        if (request.getStatus() == ManutencaoStatus.PENDENTE) {
            manutencao.setStatus(ManutencaoStatus.PENDENTE);
            manutencao.setDataSaida(null);
            manutencao.setEquipeConclusao(null);
            return;
        }

        if (request.getStatus() != ManutencaoStatus.CONCLUIDO) {
            throw new BusinessException("Submanutencao aceita apenas status PENDENTE ou CONCLUIDO.");
        }

        manutencao.setStatus(ManutencaoStatus.CONCLUIDO);
        if (statusAtual != ManutencaoStatus.CONCLUIDO || manutencao.getDataSaida() == null) {
            manutencao.setDataSaida(LocalDateTime.now());
        }
        if (manutencao.getEquipeConclusao() == null) {
            manutencao.setEquipeConclusao(buscarEquipeDoUsuario(actorUserId));
        }
    }

    private Equipe buscarEquipeDestinoConclusao(Long equipeDestinoId, Equipe equipeUltima) {
        if (equipeDestinoId != null) {
            Equipe equipe = equipeRepository.findById(equipeDestinoId)
                    .orElseThrow(() -> new ResourceNotFoundException("Equipe de destino nao encontrada"));

            validarEquipeOperacionalAtiva(equipe);
            return equipe;
        }

        if (equipeUltima != null) {
            validarEquipeOperacionalAtiva(equipeUltima);
            return equipeUltima;
        }

        throw new BusinessException("Selecione uma equipe de destino para concluir a manutencao.");
    }

    private void validarEquipeOperacionalAtiva(Equipe equipe) {
        if (equipe == null) {
            throw new BusinessException("Equipe de destino invalida.");
        }

        if (Boolean.FALSE.equals(equipe.getAtivo())) {
            throw new BusinessException("Equipe de destino inativa.");
        }

        String tipo = equipe.getTipoCategoria() == null ? "" : String.valueOf(equipe.getTipoCategoria().getNome()).trim();
        if (!RoleUtils.isOperational(tipo)) {
            throw new BusinessException("A equipe de destino deve ser operacional.");
        }
    }

    private Equipe obterEquipeAtualDoEquipamento(Estoque equipamento) {
        if (equipamento.getEquipeResponsavel() != null) {
            return equipamento.getEquipeResponsavel();
        }
        return equipamento.getEquipe();
    }

    private BigDecimal somarValorPrincipalComSubmanutencoes(Manutencao manutencao, BigDecimal valorPrincipal) {
        BigDecimal total = valorPrincipal != null ? valorPrincipal : BigDecimal.ZERO;

        if (manutencao.getSubManutencoes() == null || manutencao.getSubManutencoes().isEmpty()) {
            return total;
        }

        for (Manutencao subManutencao : manutencao.getSubManutencoes()) {
            if (subManutencao == null || subManutencao.getValorTotal() == null) {
                continue;
            }
            total = total.add(subManutencao.getValorTotal());
        }

        return total;
    }

    private String normalizarDestino(String destino) {
        String normalized = destino == null ? "" : destino.trim().toUpperCase(Locale.ROOT);
        if (DESTINO_EQUIPE.equals(normalized)) {
            return DESTINO_EQUIPE;
        }
        return DESTINO_OFICINA;
    }

    private Equipe buscarEquipeDoUsuario(Long actorUserId) {
        if (actorUserId == null) {
            return null;
        }

        Usuario usuario = usuarioRepository.findById(actorUserId).orElse(null);
        if (usuario == null) {
            return null;
        }

        return usuario.getEquipe();
    }

    private String normalizarTexto(String valor) {
        if (valor == null) {
            return null;
        }

        String texto = valor.trim();
        return texto.isEmpty() ? null : texto;
    }

    private void inativarEquipamentoPorManutencao(Estoque equipamento) {
        if (Boolean.FALSE.equals(equipamento.getAtivo())) {
            return;
        }

        execucaoService.arquivarRelatoriosEEncerrarChecklistsPorEstoque(equipamento.getId());
        equipamento.setAtivo(false);
        estoqueRepository.save(equipamento);
    }

    private void limparVinculoEquipe(Estoque equipamento) {
        if (equipamento.getEquipeResponsavel() == null && equipamento.getEquipe() == null) {
            return;
        }

        equipamento.setEquipeResponsavel(null);
        equipamento.setEquipe(null);
        estoqueRepository.save(equipamento);
    }
}
