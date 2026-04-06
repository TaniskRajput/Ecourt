package com.ecourt.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;

@Configuration
public class SecurityBeansConfig {

    private static final String BCRYPT_PREFIX = "$2";

    @Bean
    public PasswordEncoder passwordEncoder() {
        BCryptPasswordEncoder delegate = new BCryptPasswordEncoder();

        return new PasswordEncoder() {
            @Override
            public String encode(CharSequence rawPassword) {
                return delegate.encode(rawPassword);
            }

            @Override
            public boolean matches(CharSequence rawPassword, String storedPassword) {
                if (rawPassword == null || storedPassword == null) {
                    return false;
                }

                if (storedPassword.startsWith(BCRYPT_PREFIX)) {
                    return delegate.matches(rawPassword, storedPassword);
                }

                // Support legacy pre-seeded accounts that still store raw passwords.
                return storedPassword.contentEquals(rawPassword);
            }
        };
    }

}
