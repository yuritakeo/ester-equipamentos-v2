package com.example.service;

import java.io.ByteArrayInputStream;
import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.util.Base64;
import java.util.Properties;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;

import com.example.dto.SolicitacaoPecaRequest;
import com.example.entity.Email;
import com.example.entity.EmailRemetente;
import com.example.entity.Estoque;
import com.example.entity.SolicitacaoPeca;
import com.example.enums.EmailTipo;
import com.example.enums.SolicitacaoPecaStatus;
import com.example.exception.BusinessException;
import com.example.exception.ResourceNotFoundException;
import com.example.repository.EmailRemetenteRepository;
import com.example.repository.EmailRepository;
import com.example.repository.EstoqueRepository;
import com.example.repository.SolicitacaoPecaRepository;

import jakarta.activation.DataHandler;
import jakarta.mail.Authenticator;
import jakarta.mail.Message;
import jakarta.mail.MessagingException;
import jakarta.mail.PasswordAuthentication;
import jakarta.mail.Session;
import jakarta.mail.Transport;
import jakarta.mail.internet.InternetAddress;
import jakarta.mail.internet.MimeBodyPart;
import jakarta.mail.internet.MimeMessage;
import jakarta.mail.internet.MimeMultipart;
import jakarta.mail.util.ByteArrayDataSource;
import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
public class SolicitacaoPecaService {

    private final SolicitacaoPecaRepository repository;
    private final EstoqueRepository estoqueRepository;
    private final EmailRepository emailRepository;
    private final EmailRemetenteRepository emailRemetenteRepository;

    public SolicitacaoPeca salvar(SolicitacaoPecaRequest request) {

        Estoque equipamento = estoqueRepository.findById(request.getEquipamentoId())
                .orElseThrow(() -> new ResourceNotFoundException("Equipamento nao encontrado"));

        if (Boolean.FALSE.equals(equipamento.getAtivo())) {
            throw new BusinessException("Equipamento inativo no estoque. Registro mantido apenas para historico.");
        }

        Email emailDestino = emailRepository.findById(request.getEmailId())
                .orElseThrow(() -> new ResourceNotFoundException("Email destinatario nao encontrado"));

        EmailRemetente emailRemetente = emailRemetenteRepository.findById(request.getEmailRemetenteId())
                .orElseThrow(() -> new ResourceNotFoundException("Email remetente nao encontrado"));

        validarEmails(emailDestino, emailRemetente);

        SolicitacaoPeca solicitacao = SolicitacaoPeca.builder()
                .equipamento(equipamento)
                .email(emailDestino)
                .emailRemetente(emailRemetente)
                .assunto(request.getAssunto())
                .descricao(request.getDescricao())
                .anexoNome(request.getAnexoNome())
                .anexoTipo(request.getAnexoTipo())
                .anexoBase64(request.getAnexoBase64())
                .status(request.getStatus() != null ? request.getStatus() : SolicitacaoPecaStatus.SOLICITADO)
                .build();

        SolicitacaoPeca salvo = repository.save(solicitacao);

        enviarEmailReal(salvo);

        return salvo;
    }

    public SolicitacaoPeca buscarPorId(Long id) {
        return repository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Solicitacao de peca nao encontrada"));
    }

    // ✅ PAGINADO
    public Page<SolicitacaoPeca> listar(Pageable pageable) {
        return repository.findAll(pageable);
    }

    // ✅ PAGINADO
    public Page<SolicitacaoPeca> listarPorEquipamento(Long equipamentoId, Pageable pageable) {
        return repository.findByEquipamentoIdOrderByDataSolicitacaoDesc(equipamentoId, pageable);
    }

    public void deletar(Long id) {
        if (!repository.existsById(id)) {
            throw new ResourceNotFoundException("Solicitacao de peca nao encontrada");
        }
        repository.deleteById(id);
    }

    private void validarEmails(Email destino, EmailRemetente remetente) {

        if (destino == null) {
            throw new BusinessException("Email destinatario obrigatorio");
        }

        if (remetente == null) {
            throw new BusinessException("Email remetente obrigatorio");
        }

        if (destino.getTipo() != null && destino.getTipo() != EmailTipo.DESTINATARIO) {
            throw new BusinessException("O email selecionado como destinatario e invalido");
        }

        if (remetente.getSenha() == null || remetente.getSenha().isBlank()) {
            throw new BusinessException("O remetente informado nao possui senha cadastrada");
        }
    }

    private void enviarEmailReal(SolicitacaoPeca solicitacao) {

        EmailRemetente remetente = solicitacao.getEmailRemetente();
        Email destino = solicitacao.getEmail();

        try {
            SmtpConfig smtpConfig = resolveSmtpConfig(remetente.getEmail());

            Properties properties = new Properties();
            properties.put("mail.smtp.auth", "true");
            properties.put("mail.smtp.starttls.enable", String.valueOf(smtpConfig.startTls()));
            properties.put("mail.smtp.host", smtpConfig.host());
            properties.put("mail.smtp.port", String.valueOf(smtpConfig.port()));
            properties.put("mail.smtp.ssl.enable", String.valueOf(smtpConfig.ssl()));

            Session session = Session.getInstance(properties, new Authenticator() {
                @Override
                protected PasswordAuthentication getPasswordAuthentication() {
                    return new PasswordAuthentication(remetente.getEmail(), remetente.getSenha());
                }
            });

            MimeMessage message = new MimeMessage(session);
            message.setFrom(new InternetAddress(remetente.getEmail()));
            message.setRecipients(Message.RecipientType.TO, InternetAddress.parse(destino.getEmail()));
            message.setSubject(solicitacao.getAssunto(), StandardCharsets.UTF_8.name());

            MimeBodyPart textPart = new MimeBodyPart();
            textPart.setText(
                    solicitacao.getDescricao() == null ? "" : solicitacao.getDescricao(),
                    StandardCharsets.UTF_8.name()
            );

            MimeMultipart multipart = new MimeMultipart();
            multipart.addBodyPart(textPart);

            if (solicitacao.getAnexoBase64() != null && !solicitacao.getAnexoBase64().isBlank()) {

                MimeBodyPart attachmentPart = new MimeBodyPart();

                byte[] bytes = extractBase64Bytes(solicitacao.getAnexoBase64());

                ByteArrayDataSource dataSource =
                        new ByteArrayDataSource(new ByteArrayInputStream(bytes), solicitacao.getAnexoTipo());

                attachmentPart.setDataHandler(new DataHandler(dataSource));
                attachmentPart.setFileName(solicitacao.getAnexoNome());

                multipart.addBodyPart(attachmentPart);
            }

            message.setContent(multipart);

            Transport.send(message);

        } catch (MessagingException | IOException ex) {
            throw new BusinessException("Nao foi possivel enviar o email real: " + ex.getMessage());
        }
    }

    private byte[] extractBase64Bytes(String dataUrl) {

        String base64 = dataUrl;

        int commaIndex = dataUrl.indexOf(',');

        if (commaIndex >= 0) {
            base64 = dataUrl.substring(commaIndex + 1);
        }

        return Base64.getDecoder().decode(base64);
    }

    private SmtpConfig resolveSmtpConfig(String email) {

        int arrobaIndex = email == null ? -1 : email.indexOf('@');

        String domain = arrobaIndex >= 0
                ? email.substring(arrobaIndex + 1).toLowerCase()
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
                "Nao foi possivel identificar o SMTP do remetente. Use um email Gmail, Outlook ou Yahoo."
        );
    }

    private record SmtpConfig(String host, int port, boolean startTls, boolean ssl) {
    }
}