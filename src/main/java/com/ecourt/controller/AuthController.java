package com.ecourt.controller;

import com.ecourt.dto.AuthResponse;
import com.ecourt.dto.LoginRequest;
import com.ecourt.security.CustomUserDetails;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.*;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import com.ecourt.security.JwtService;

import com.ecourt.dto.RegisterRequest;
import com.ecourt.service.UserService;

import java.util.HashMap;
import java.util.Map;

@RestController
@RequestMapping("/auth")
public class AuthController {

    @Autowired
    private AuthenticationManager authenticationManager;
    @Autowired
    private JwtService jwtService;

    @Autowired
    private UserService userService;

    @PostMapping("/register")
    public String register(@RequestBody RegisterRequest request) {
        return userService.register(request);
    }

    @PostMapping("/login")
    public Map<String, Object> login(@RequestBody LoginRequest request) {

        Authentication authentication = authenticationManager.authenticate(
                new UsernamePasswordAuthenticationToken(
                        request.getUsername(),
                        request.getPassword()
                )
        );

        if (authentication.isAuthenticated()) {

            String token = jwtService.generateToken(request.getUsername());

            CustomUserDetails userDetails =
                    (CustomUserDetails) authentication.getPrincipal();

            Map<String, Object> response = new HashMap<>();
            response.put("token", token);
            response.put("username", userDetails.getUsername());
            response.put("role", userDetails.getUser().getRole());

            return response;
        }

        throw new RuntimeException("Invalid Credentials");
    }
}
