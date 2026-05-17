package com.example.repository;

import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;

import com.example.entity.Notificacao;
import com.example.enums.NotificacaoStatus;

public interface NotificacaoRepository extends JpaRepository<Notificacao, Long> {

    @Override
    @EntityGraph(attributePaths = {
            "estoque",
            "estoque.empresa",
            "estoque.equipeResponsavel",
            "estoque.equipeResponsavel.tipoCategoria",
            "equipeOrigem",
            "equipeOrigem.tipoCategoria",
            "equipeDestino",
            "equipeDestino.tipoCategoria"
    })
    Optional<Notificacao> findById(Long id);

    @EntityGraph(attributePaths = {
            "estoque",
            "estoque.empresa",
            "estoque.equipeResponsavel",
            "estoque.equipeResponsavel.tipoCategoria",
            "equipeOrigem",
            "equipeOrigem.tipoCategoria",
            "equipeDestino",
            "equipeDestino.tipoCategoria"
    })
    List<Notificacao> findByEquipeDestinoIdOrderByDataCriacaoDesc(Long equipeDestinoId);

    @EntityGraph(attributePaths = {
            "estoque",
            "estoque.empresa",
            "estoque.equipeResponsavel",
            "estoque.equipeResponsavel.tipoCategoria",
            "equipeOrigem",
            "equipeOrigem.tipoCategoria",
            "equipeDestino",
            "equipeDestino.tipoCategoria"
    })
    List<Notificacao> findByEquipeDestinoIdAndStatusOrderByDataCriacaoDesc(Long equipeDestinoId, NotificacaoStatus status);

    boolean existsByEstoqueIdAndStatus(Long estoqueId, NotificacaoStatus status);
}
