package com.ecourt.service;

import com.ecourt.model.User;
import com.ecourt.repository.UserRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class LegacyUserDataNormalizationService {

    private final UserRepository userRepository;

    public LegacyUserDataNormalizationService(UserRepository userRepository) {
        this.userRepository = userRepository;
    }

    @Transactional
    public int normalizeLegacyLocalUsers() {
        int updatedUsers = 0;

        for (User user : userRepository.findAll()) {
            boolean updated = false;
            String authProvider = user.getAuthProvider();
            boolean missingAuthProvider = authProvider == null || authProvider.trim().isEmpty();
            boolean localAccount = missingAuthProvider || "LOCAL".equalsIgnoreCase(authProvider);

            if (!localAccount) {
                continue;
            }

            if (missingAuthProvider) {
                user.setAuthProvider("LOCAL");
                updated = true;
            }

            if (!user.isEmailVerified()) {
                user.setEmailVerified(true);
                updated = true;
            }

            if (updated) {
                updatedUsers++;
            }
        }

        return updatedUsers;
    }
}
