package com.example.service;

import java.util.Locale;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;

import com.example.entity.Email;
import com.example.enums.EmailTipo;
import com.example.exception.BusinessException;
import com.example.exception.ResourceNotFoundException;
import com.example.repository.EmailRepository;

import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
public class EmailService {

    private final EmailRepository emailRepository;

    public Email getEmailById(Long id) {
        return emailRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Email nao encontrado"));
    }

    public void deleteEmail(Long id) {
        if (!emailRepository.existsById(id)) {
            throw new ResourceNotFoundException("Email nao encontrado");
        }
        emailRepository.deleteById(id);
    }

    public Email saveEmail(Email email, String actorTipo) {

        if (email == null || email.getEmail() == null || email.getEmail().isBlank()) {
            throw new BusinessException("Email obrigatorio");
        }

        String emailNormalizado = email.getEmail().trim().toLowerCase(Locale.ROOT);
        EmailTipo tipo = email.getTipo() != null ? email.getTipo() : EmailTipo.DESTINATARIO;

        if (tipo != EmailTipo.DESTINATARIO) {
            throw new BusinessException("Esta rota aceita apenas email destinatario");
        }

        return emailRepository
                .findByEmailIgnoreCaseAndTipo(emailNormalizado, tipo)
                .orElseGet(() -> {
                    email.setEmail(emailNormalizado);
                    email.setTipo(tipo);
                    return emailRepository.save(email);
                });
    }

    // ✅ PAGINADO (corrigido)
    public Page<Email> getAllEmails(Pageable pageable) {
        return emailRepository.findAll(pageable);
    }
}