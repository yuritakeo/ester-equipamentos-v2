package com.example.dto;

import java.util.List;

import jakarta.validation.constraints.NotEmpty;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class EstoqueExclusaoLoteRequest {

    @NotEmpty(message = "Lista de IDs não pode estar vazia")
    private List<Long> ids;
}