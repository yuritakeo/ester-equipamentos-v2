package com.example.repository;

import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;

import com.example.entity.DirecionamentoHistorico;

public interface DirecionamentoHistoricoRepository extends JpaRepository<DirecionamentoHistorico, Long> {

    List<DirecionamentoHistorico> findAllByOrderByDataEventoDesc();
}
