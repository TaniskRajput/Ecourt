package com.ecourt.service;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.mail.MailException;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;
import static org.springframework.http.HttpStatus.SERVICE_UNAVAILABLE;

@Service
public class SmtpAuthEmailService implements AuthEmailService {

    private static final Logger log = LoggerFactory.getLogger(SmtpAuthEmailService.class);

    private final JavaMailSender mailSender;
    private final boolean mailEnabled;
    private final String fromAddress;

    public SmtpAuthEmailService(
            ObjectProvider<JavaMailSender> mailSenderProvider,
            @Value("${app.mail.enabled:false}") boolean mailEnabled,
            @Value("${app.mail.from:no-reply@ecourt.local}") String fromAddress) {
        this.mailSender = mailSenderProvider.getIfAvailable();
        this.mailEnabled = mailEnabled;
        this.fromAddress = fromAddress;
    }

    @Override
    public void sendRegistrationOtp(String email, String otpCode, String username) {
        sendEmail(
                email,
                "E-Court registration OTP",
                "Hello " + username + ",\n\n"
                        + "Your E-Court registration OTP is: " + otpCode + "\n"
                        + "It is valid for 10 minutes.\n\n"
                        + "If you did not request this, please ignore this email.\n");
    }

    @Override
    public void sendPasswordResetOtp(String email, String otpCode, String username) {
        sendEmail(
                email,
                "E-Court password reset OTP",
                "Hello " + username + ",\n\n"
                        + "Your E-Court password reset OTP is: " + otpCode + "\n"
                        + "It is valid for 10 minutes.\n\n"
                        + "If you did not request this, please ignore this email.\n");
    }

    private void sendEmail(String to, String subject, String body) {
        if (!mailEnabled) {
            log.info("Mail is disabled. OTP email to {} was not sent. Body: {}", to, body.replace('\n', ' '));
            return;
        }

        if (mailSender == null) {
            throw new ResponseStatusException(
                    SERVICE_UNAVAILABLE,
                    "Mail is enabled but no mail sender is configured. Check SMTP settings.");
        }

        try {
            SimpleMailMessage message = new SimpleMailMessage();
            message.setFrom(fromAddress);
            message.setTo(to);
            message.setSubject(subject);
            message.setText(body);
            mailSender.send(message);
            log.info("Sent auth email to {}", to);
        } catch (MailException ex) {
            log.error("Failed to send auth email to {}", to, ex);
            throw new ResponseStatusException(
                    SERVICE_UNAVAILABLE,
                    "Unable to send email right now. Check mail configuration and try again.");
        }
    }
}
