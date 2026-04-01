package com.ecourt.dto;

public record OtpVerificationResponse(
        String message,
        String verificationTicket,
        long expiresInSeconds) {
}
