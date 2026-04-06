package com.ecourt;

import com.ecourt.model.User;
import com.ecourt.repository.UserRepository;
import com.ecourt.service.LegacyUserDataNormalizationService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;

import static org.assertj.core.api.Assertions.assertThat;

@SpringBootTest
class LegacyUserDataNormalizationServiceTest {

    @Autowired
    private LegacyUserDataNormalizationService normalizationService;

    @Autowired
    private UserRepository userRepository;

    @BeforeEach
    void setUp() {
        userRepository.deleteAll();
    }

    @Test
    void normalizesLegacyLocalUsersMissingVerificationAndAuthProvider() {
        User legacyWithoutProvider = saveUser("legacy1", "legacy1@example.com", false, true, "");
        User legacyLocalUnverified = saveUser("legacy2", "legacy2@example.com", false, true, "LOCAL");
        User googleUser = saveUser("google1", "google1@example.com", false, true, "GOOGLE");

        int updatedUsers = normalizationService.normalizeLegacyLocalUsers();

        User refreshedLegacyWithoutProvider = userRepository.findById(legacyWithoutProvider.getId()).orElseThrow();
        User refreshedLegacyLocalUnverified = userRepository.findById(legacyLocalUnverified.getId()).orElseThrow();
        User refreshedGoogleUser = userRepository.findById(googleUser.getId()).orElseThrow();

        assertThat(updatedUsers).isEqualTo(2);
        assertThat(refreshedLegacyWithoutProvider.getAuthProvider()).isEqualTo("LOCAL");
        assertThat(refreshedLegacyWithoutProvider.isEmailVerified()).isTrue();
        assertThat(refreshedLegacyLocalUnverified.getAuthProvider()).isEqualTo("LOCAL");
        assertThat(refreshedLegacyLocalUnverified.isEmailVerified()).isTrue();
        assertThat(refreshedGoogleUser.getAuthProvider()).isEqualTo("GOOGLE");
        assertThat(refreshedGoogleUser.isEmailVerified()).isFalse();
    }

    private User saveUser(String username, String email, boolean emailVerified, boolean active, String authProvider) {
        User user = new User();
        user.setUsername(username);
        user.setEmail(email);
        user.setPassword("$2a$10$abcdefghijklmnopqrstuv");
        user.setEmailVerified(emailVerified);
        user.setRole("CLIENT");
        user.setActive(active);
        user.setAuthProvider(authProvider);
        return userRepository.save(user);
    }
}
