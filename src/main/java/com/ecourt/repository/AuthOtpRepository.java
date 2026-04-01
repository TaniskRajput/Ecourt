package com.ecourt.repository;

import com.ecourt.model.AuthOtp;
import com.ecourt.model.OtpPurpose;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface AuthOtpRepository extends JpaRepository<AuthOtp, Long> {

    Optional<AuthOtp> findTopByEmailAndPurposeOrderByCreatedAtDesc(String email, OtpPurpose purpose);

    Optional<AuthOtp> findByEmailAndPurposeAndVerificationTicket(String email, OtpPurpose purpose, String verificationTicket);

    List<AuthOtp> findByEmailAndPurpose(String email, OtpPurpose purpose);
}
