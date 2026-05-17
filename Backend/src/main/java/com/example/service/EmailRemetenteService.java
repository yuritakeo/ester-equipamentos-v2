package com.example.service;

import java.util.Locale;
import java.util.Properties;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;

import com.example.entity.EmailRemetente;
import com.example.exception.BusinessException;
import com.example.exception.ResourceNotFoundException;
import com.example.repository.EmailRemetenteRepository;
import com.example.util.RoleUtils;

import jakarta.mail.Authenticator;
import jakarta.mail.MessagingException;
import jakarta.mail.PasswordAuthentication;
import jakarta.mail.Session;
import jakarta.mail.Transport;
import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
public class EmailRemetenteService {

    private final EmailRemetenteRepository emailRemetenteRepository;

    public EmailRemetente getById(Long id) {
        return emailRemetenteRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Email remetente nao encontrado"));
    }

    // ✅ PAGINADO (corrigido)
    public Page<EmailRemetente> getAll(Pageable pageable) {
        return emailRemetenteRepository.findAll(pageable);
    }

    public EmailRemetente save(EmailRemetente emailRemetente, String actorTipo) {
        if (!RoleUtils.isGerencia(actorTipo)) {
            throw new BusinessException("Apenas GERENCIA pode cadastrar email remetente");
        }

        if (emailRemetente == null || emailRemetente.getEmail() == null || emailRemetente.getEmail().isBlank()) {
            throw new BusinessException("Email do remetente obrigatorio");
        }

        if (emailRemetente.getSenha() == null || emailRemetente.getSenha().isBlank()) {
            throw new BusinessException("Senha do remetente obrigatoria");
        }

        String emailNormalizado = emailRemetente.getEmail().trim().toLowerCase(Locale.ROOT);

        if (emailRemetenteRepository.findByEmailIgnoreCase(emailNormalizado).isPresent()) {
            throw new BusinessException("Este email remetente ja esta cadastrado.");
        }

        validarCredenciais(emailNormalizado, emailRemetente.getSenha());
        emailRemetente.setEmail(emailNormalizado);

        return emailRemetenteRepository.save(emailRemetente);
    }

    public void delete(Long id) {
        if (!emailRemetenteRepository.existsById(id)) {
            throw new ResourceNotFoundException("Email remetente nao encontrado");
        }

        emailRemetenteRepository.deleteById(id);
    }

    private void validarCredenciais(String email, String senha) {
        SmtpConfig smtpConfig = resolveSmtpConfig(email);

        Properties properties = new Properties();
        properties.put("mail.smtp.auth", "true");
        properties.put("mail.smtp.starttls.enable", String.valueOf(smtpConfig.startTls()));
        properties.put("mail.smtp.host", smtpConfig.host());
        properties.put("mail.smtp.port", String.valueOf(smtpConfig.port()));
        properties.put("mail.smtp.ssl.enable", String.valueOf(smtpConfig.ssl()));
        properties.put("mail.smtp.connectiontimeout", "10000");
        properties.put("mail.smtp.timeout", "10000");
        properties.put("mail.smtp.writetimeout", "10000");

        Session session = Session.getInstance(properties, new Authenticator() {
            @Override
            protected PasswordAuthentication getPasswordAuthentication() {
                return new PasswordAuthentication(email, senha);
            }
        });

        try (Transport transport = session.getTransport("smtp")) {
            transport.connect(smtpConfig.host(), smtpConfig.port(), email, senha);
        } catch (MessagingException ex) {
            throw new BusinessException(
                    "Nao foi possivel validar o remetente. Confira se o email existe e se a senha esta correta.");
        }
    }

    private SmtpConfig resolveSmtpConfig(String email) {
        int arrobaIndex = email == null ? -1 : email.indexOf('@');

        String domain = arrobaIndex >= 0
                ? email.substring(arrobaIndex + 1).toLowerCase(Locale.ROOT)
                : "";

        if (domain.contains("gmail.com")) {
            return new SmtpConfig("smtp.gmail.com", 587, true, false);
        }

        if (domain.contains("outlook.com") || domain.contains("hotmail.com") || domain.contains("live.com")) {
            return new SmtpConfig("smtp.office365.com", 587, true, false);
        }

        if (domain.contains("yahoo.com")) {
            return new SmtpConfig("smtp.mail.yahoo.com", 587, true, false);
        }

        throw new BusinessException(
                "Nao foi possivel identificar o SMTP do remetente. Use um email Gmail, Outlook ou Yahoo.");
    }

    private record SmtpConfig(String host, int port, boolean startTls, boolean ssl) {
    }
}