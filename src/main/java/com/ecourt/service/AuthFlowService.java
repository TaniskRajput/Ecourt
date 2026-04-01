package com.ecourt.service;

import com.ecourt.dto.GoogleAuthRequest;
import com.ecourt.dto.OtpVerificationRequest;
import com.ecourt.dto.OtpVerificationResponse;
import com.ecourt.dto.PasswordResetCompleteRequest;
import com.ecourt.dto.PasswordResetRequest;
import com.ecourt.dto.RegisterCompleteRequest;
import com.ecourt.dto.RegisterOtpRequest;
import com.ecourt.model.AuthOtp;
import com.ecourt.model.OtpPurpose;
import com.ecourt.model.User;
import com.ecourt.repository.AuthOtpRepository;
import com.ecourt.repository.UserRepository;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.security.SecureRandom;
import java.time.Duration;
import java.time.Instant;
import java.util.UUID;

@Service
@Transactional
public class AuthFlowService {

    private static final Duration OTP_TTL = Duration.ofMinutes(10);
    private static final Duration VERIFIED_TICKET_TTL = Duration.ofMinutes(15);

    private final UserRepository userRepository;
    private final AuthOtpRepository authOtpRepository;
    private final UserService userService;
    private final AuthEmailService authEmailService;
    private final SecureRandom secureRandom = new SecureRandom();

    public AuthFlowService(
            UserRepository userRepository,
            AuthOtpRepository authOtpRepository,
            UserService userService,
            AuthEmailService authEmailService) {
        this.userRepository = userRepository;
        this.authOtpRepository = authOtpRepository;
        this.userService = userService;
        this.authEmailService = authEmailService;
    }

    public String sendRegistrationOtp(RegisterOtpRequest request) {
        String username = userService.normalizeUsername(request.getUsername());
        String email = userService.normalizeEmail(request.getEmail());
        String role = userService.normalizeSelfServiceRole(request.getRole());

        if (userRepository.existsByUsername(username)) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Username already exists");
        }
        if (userRepository.existsByEmail(email)) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Email already exists");
        }

        invalidateExistingOtps(email, OtpPurpose.REGISTRATION);
        AuthOtp record = buildOtpRecord(email, username, role, generateOtp(), OtpPurpose.REGISTRATION);
        authOtpRepository.save(record);
        authEmailService.sendRegistrationOtp(email, record.getOtpCode(), username);
        return "OTP sent to your email. Verify it to continue registration.";
    }

    public OtpVerificationResponse verifyRegistrationOtp(OtpVerificationRequest request) {
        return verifyOtp(userService.normalizeEmail(request.getEmail()), request.getOtp(), OtpPurpose.REGISTRATION,
                "Email verified. You can now create your password.");
    }

    public String completeRegistration(RegisterCompleteRequest request) {
        String username = userService.normalizeUsername(request.getUsername());
        String email = userService.normalizeEmail(request.getEmail());
        String role = userService.normalizeSelfServiceRole(request.getRole());
        String password = userService.validateAndConfirmPassword(request.getPassword(), request.getConfirmPassword());

        if (userRepository.existsByUsername(username)) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Username already exists");
        }
        if (userRepository.existsByEmail(email)) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Email already exists");
        }

        AuthOtp verifiedOtp = getVerifiedOtp(email, OtpPurpose.REGISTRATION, request.getVerificationTicket());
        if (!username.equals(verifiedOtp.getUsername()) || !role.equals(verifiedOtp.getRole())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                    "Registration details do not match the verified email session.");
        }

        userService.createVerifiedUser(username, email, password, role, "LOCAL", null);
        verifiedOtp.setUsed(true);
        authOtpRepository.save(verifiedOtp);
        return "Registration completed successfully.";
    }

    public String sendPasswordResetOtp(PasswordResetRequest request) {
        String email = userService.normalizeEmail(request.getEmail());
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "No account found for this email."));

        if (!user.isEmailVerified()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Email is not verified for this account.");
        }
        if (!"LOCAL".equalsIgnoreCase(user.getAuthProvider())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                    "This account uses " + user.getAuthProvider() + " sign-in.");
        }

        invalidateExistingOtps(email, OtpPurpose.PASSWORD_RESET);
        AuthOtp record = buildOtpRecord(email, user.getUsername(), user.getRole(), generateOtp(), OtpPurpose.PASSWORD_RESET);
        authOtpRepository.save(record);
        authEmailService.sendPasswordResetOtp(email, record.getOtpCode(), user.getUsername());
        return "Password reset OTP sent to your email.";
    }

    public OtpVerificationResponse verifyPasswordResetOtp(OtpVerificationRequest request) {
        return verifyOtp(userService.normalizeEmail(request.getEmail()), request.getOtp(), OtpPurpose.PASSWORD_RESET,
                "OTP verified. You can now set a new password.");
    }

    public String completePasswordReset(PasswordResetCompleteRequest request) {
        String email = userService.normalizeEmail(request.getEmail());
        String password = userService.validateAndConfirmPassword(request.getPassword(), request.getConfirmPassword());

        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "No account found for this email."));
        AuthOtp verifiedOtp = getVerifiedOtp(email, OtpPurpose.PASSWORD_RESET, request.getVerificationTicket());

        user.setPassword(userService.encodePassword(password));
        userRepository.save(user);
        verifiedOtp.setUsed(true);
        authOtpRepository.save(verifiedOtp);
        return "Password reset successful.";
    }

    public String explainGoogleSignInStatus(GoogleAuthRequest request) {
        throw new ResponseStatusException(
                HttpStatus.NOT_IMPLEMENTED,
                "Google sign-in requires Google OAuth client configuration and token verification wiring before it can be enabled safely.");
    }

    private OtpVerificationResponse verifyOtp(String email, String otp, OtpPurpose purpose, String successMessage) {
        AuthOtp record = authOtpRepository.findTopByEmailAndPurposeOrderByCreatedAtDesc(email, purpose)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.BAD_REQUEST, "No OTP request found."));

        if (record.isUsed()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "This OTP has already been used.");
        }
        if (record.getExpiresAt().isBefore(Instant.now())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "OTP has expired. Request a new one.");
        }
        if (!record.getOtpCode().equals(otp == null ? "" : otp.trim())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Invalid OTP.");
        }

        record.setVerified(true);
        record.setVerifiedAt(Instant.now());
        record.setVerificationTicket(UUID.randomUUID().toString());
        record.setExpiresAt(Instant.now().plus(VERIFIED_TICKET_TTL));
        authOtpRepository.save(record);

        return new OtpVerificationResponse(successMessage, record.getVerificationTicket(), VERIFIED_TICKET_TTL.toSeconds());
    }

    private AuthOtp getVerifiedOtp(String email, OtpPurpose purpose, String verificationTicket) {
        AuthOtp record = authOtpRepository.findByEmailAndPurposeAndVerificationTicket(email, purpose, verificationTicket)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.BAD_REQUEST, "Verification session not found."));

        if (!record.isVerified() || record.isUsed()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Verification session is no longer valid.");
        }
        if (record.getExpiresAt().isBefore(Instant.now())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Verification session expired. Start again.");
        }

        return record;
    }

    private AuthOtp buildOtpRecord(String email, String username, String role, String otp, OtpPurpose purpose) {
        AuthOtp record = new AuthOtp();
        record.setEmail(email);
        record.setUsername(username);
        record.setRole(role);
        record.setOtpCode(otp);
        record.setPurpose(purpose);
        record.setExpiresAt(Instant.now().plus(OTP_TTL));
        return record;
    }

    private void invalidateExistingOtps(String email, OtpPurpose purpose) {
        for (AuthOtp existing : authOtpRepository.findByEmailAndPurpose(email, purpose)) {
            existing.setUsed(true);
        }
    }

    private String generateOtp() {
        return String.valueOf(secureRandom.nextInt(900000) + 100000);
    }
}
