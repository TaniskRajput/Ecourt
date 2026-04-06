package com.ecourt.config;

import com.ecourt.service.LegacyUserDataNormalizationService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.ApplicationRunner;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class LegacyUserDataBackfillConfig {

    private static final Logger log = LoggerFactory.getLogger(LegacyUserDataBackfillConfig.class);

    @Bean
    ApplicationRunner normalizeLegacyUsersOnStartup(LegacyUserDataNormalizationService normalizationService) {
        return args -> {
            int updatedUsers = normalizationService.normalizeLegacyLocalUsers();
            if (updatedUsers > 0) {
                log.info("Normalized {} legacy local user records for current auth requirements.", updatedUsers);
            }
        };
    }
}
