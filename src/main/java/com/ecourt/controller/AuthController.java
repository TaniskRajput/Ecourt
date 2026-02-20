package com.ecourt.controller;

import com.ecourt.dto.LoginRequest;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.*;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import com.ecourt.security.JwtService;

import com.ecourt.dto.RegisterRequest;
import com.ecourt.service.UserService;

@RestController
@RequestMapping("/auth")
public class AuthController {

    @Autowired
    private AuthenticationManager authenticationManager;
    @Autowired
    private JwtService jwtService;

    @Autowired
    private UserService userService;

    // REGISTER
    @PostMapping("/register")
    public String register(@RequestBody RegisterRequest request) {
        return userService.register(request);
    }

    // LOGIN
    @PostMapping("/login")
    public String login(@RequestBody LoginRequest request) {

        Authentication authentication = authenticationManager.authenticate(
                new UsernamePasswordAuthenticationToken(
                        request.getUsername(),
                        request.getPassword()
                )
        );

        if (authentication.isAuthenticated()) {
            return jwtService.generateToken(request.getUsername());
        }

        return "Invalid Credentials";
    }

}
