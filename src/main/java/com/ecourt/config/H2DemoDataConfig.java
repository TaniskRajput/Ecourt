package com.ecourt.config;

import com.ecourt.model.CourtCase;
import com.ecourt.model.User;
import com.ecourt.repository.CourtCaseRepository;
import com.ecourt.repository.UserRepository;
import org.springframework.boot.CommandLineRunner;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Profile;
import org.springframework.security.crypto.password.PasswordEncoder;

import java.time.LocalDate;

@Configuration
@Profile("h2")
public class H2DemoDataConfig {

    @Bean
    CommandLineRunner seedH2DemoData(
            UserRepository userRepository,
            CourtCaseRepository courtCaseRepository,
            PasswordEncoder passwordEncoder
    ) {
        return args -> {
            ensureUser(userRepository, passwordEncoder, "alisha", "alisha@ecourt.local", "alisha", "ADMIN");
            ensureUser(userRepository, passwordEncoder, "clientdemo", "clientdemo@ecourt.local", "clientdemo", "CLIENT");
            ensureUser(userRepository, passwordEncoder, "lawyerdemo", "lawyerdemo@ecourt.local", "lawyerdemo", "LAWYER");
            ensureUser(userRepository, passwordEncoder, "judgedemo", "judgedemo@ecourt.local", "judgedemo", "JUDGE");

            if (courtCaseRepository.count() == 0) {
                CourtCase courtCase = new CourtCase();
                courtCase.setCaseNumber("ECOURT-DEMO-0001");
                courtCase.setTitle("Demo Property Dispute");
                courtCase.setDescription("Sample case seeded for the H2 demo profile.");
                courtCase.setStatus("PENDING");
                courtCase.setFiledDate(LocalDate.now());
                courtCase.setClientUsername("clientdemo");
                courtCase.setLawyerUsername("lawyerdemo");
                courtCase.setJudgeUsername(null);
                courtCaseRepository.save(courtCase);
            }
        };
    }

    private void ensureUser(
            UserRepository userRepository,
            PasswordEncoder passwordEncoder,
            String username,
            String email,
            String rawPassword,
            String role
    ) {
        if (userRepository.findByUsername(username).isPresent()) {
            return;
        }

        User user = new User();
        user.setUsername(username);
        user.setEmail(email);
        user.setPassword(passwordEncoder.encode(rawPassword));
        user.setRole(role);
        user.setActive(true);
        userRepository.save(user);
    }
}
