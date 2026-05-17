package com.example.service;

import org.springframework.stereotype.Service;

import com.example.dto.UsuarioRequest;
import com.example.entity.TipoCategoria;
import com.example.exception.BusinessException;
import com.example.exception.ResourceNotFoundException;
import com.example.repository.TipoCategoriaRepository;
import com.example.util.RoleUtils;

import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
public class UsuarioCargoValidatorService {

    private final TipoCategoriaRepository tipoCategoriaRepository;

    public TipoCategoria obterTipoCategoriaObrigatorio(UsuarioRequest request) {
        if (request.getTipoCadastroId() == null) {
            throw new BusinessException("Selecione um tipo de cadastro");
        }

        return tipoCategoriaRepository.findById(request.getTipoCadastroId())
                .orElseThrow(() -> new ResourceNotFoundException("Tipo de cadastro nao encontrado"));
    }

    public void validarPermissaoAtribuicaoCargo(String actorTipo, TipoCategoria tipoCategoriaSolicitada) {
        String tipoSolicitado = RoleUtils.normalizeRole(tipoCategoriaSolicitada == null ? null : tipoCategoriaSolicitada.getNome());
        String tipoAtor = RoleUtils.normalizeRole(actorTipo);

        if (RoleUtils.isGerencia(tipoSolicitado) && !RoleUtils.isAdministrative(tipoAtor) && !"GERENTE".equals(tipoAtor)) {
            throw new BusinessException("Apenas GERENCIA e GERENTE podem definir o tipo de usuario como GERENCIA");
        }
    }
}