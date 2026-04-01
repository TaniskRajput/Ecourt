package com.ecourt.service;

public interface AuthEmailService {

    void sendRegistrationOtp(String email, String otpCode, String username);

    void sendPasswordResetOtp(String email, String otpCode, String username);
}
