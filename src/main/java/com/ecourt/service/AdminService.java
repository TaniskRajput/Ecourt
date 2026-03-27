package com.ecourt.service;

import com.ecourt.dto.UserSummaryResponse;
import com.ecourt.repository.UserRepository;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
public class AdminService {

    private final UserRepository userRepository;

    public AdminService(UserRepository userRepository) {
        this.userRepository = userRepository;
    }

    public List<UserSummaryResponse> getAllUsers() {
        return userRepository.findAll()
                .stream()
                .map(user -> new UserSummaryResponse(user.getUsername(), user.getEmail(), user.getRole()))
                .toList();
    }
}
