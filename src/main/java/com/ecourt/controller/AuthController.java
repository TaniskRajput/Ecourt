package com.ecourt.controller;

import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.ecourt.dto.AuthResponse;
import com.ecourt.dto.GoogleAuthRequest;
import com.ecourt.dto.LoginRequest;
import com.ecourt.dto.MessageResponse;
import com.ecourt.dto.OtpVerificationRequest;
import com.ecourt.dto.OtpVerificationResponse;
import com.ecourt.dto.PasswordResetCompleteRequest;
import com.ecourt.dto.PasswordResetRequest;
import com.ecourt.dto.RegisterCompleteRequest;
import com.ecourt.dto.RegisterOtpRequest;
import com.ecourt.dto.RegisterRequest;
import com.ecourt.model.User;
import com.ecourt.security.JwtService;
import com.ecourt.service.AuthFlowService;
import com.ecourt.service.UserService;

import jakarta.validation.Valid;

/**
 * REST Controller responsible for User Authentication.
 *
 * WHY IT IS USED: This file provides publicly accessible endpoints that allow
 * users to register for the platform and authenticate themselves. It acts as
 * the gateway to the E-Court system, intercepting initial access requests and
 * delegating to the AuthenticationManager to verify credentials before issuing
 * JSON Web Tokens (JWTs) for subsequent authenticated API calls.
 *
 * FUNCTIONS OVERVIEW: - register: Accepts new user details, validates them, and
 * creates a new CLIENT or LAWYER account. - login: Authenticates existing
 * credentials against the database and returns a signed JWT alongside basic
 * user info.
 */
@RestController
@RequestMapping("/auth")
public class AuthController {

    private final JwtService jwtService;
    private final UserService userService;
    private final AuthFlowService authFlowService;

    public AuthController(
            JwtService jwtService,
            UserService userService,
            AuthFlowService authFlowService) {
        this.jwtService = jwtService;
        this.userService = userService;
        this.authFlowService = authFlowService;
    }

    @PostMapping("/register/request-otp")
    public MessageResponse requestRegistrationOtp(@Valid @RequestBody RegisterOtpRequest request) {
        return new MessageResponse(authFlowService.sendRegistrationOtp(request));
    }

    @PostMapping("/register/verify-otp")
    public OtpVerificationResponse verifyRegistrationOtp(@Valid @RequestBody OtpVerificationRequest request) {
        return authFlowService.verifyRegistrationOtp(request);
    }

    @PostMapping("/register/complete")
    public MessageResponse completeRegistration(@Valid @RequestBody RegisterCompleteRequest request) {
        return new MessageResponse(authFlowService.completeRegistration(request));
    }

    @PostMapping("/password/request-reset")
    public MessageResponse requestPasswordReset(@Valid @RequestBody PasswordResetRequest request) {
        return new MessageResponse(authFlowService.sendPasswordResetOtp(request));
    }

    @PostMapping("/password/verify-otp")
    public OtpVerificationResponse verifyPasswordResetOtp(@Valid @RequestBody OtpVerificationRequest request) {
        return authFlowService.verifyPasswordResetOtp(request);
    }

    @PostMapping("/password/reset")
    public MessageResponse completePasswordReset(@Valid @RequestBody PasswordResetCompleteRequest request) {
        return new MessageResponse(authFlowService.completePasswordReset(request));
    }

    @PostMapping("/google")
    public MessageResponse googleAuth(@Valid @RequestBody GoogleAuthRequest request) {
        return new MessageResponse(authFlowService.explainGoogleSignInStatus(request));
    }

    @PostMapping("/register")
    public MessageResponse register(@Valid @RequestBody RegisterRequest request) {
        return new MessageResponse(userService.register(request));
    }

    @PostMapping("/login")
    public AuthResponse login(@Valid @RequestBody LoginRequest request) {
        User user = userService.authenticateForLogin(request.getUsername(), request.getPassword());
        String token = jwtService.generateToken(user.getUsername());
        return new AuthResponse(token, user.getUsername(), user.getRole());
    }
}
