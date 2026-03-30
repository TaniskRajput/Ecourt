package com.ecourt.controller;

import com.ecourt.dto.AuthResponse;
import com.ecourt.dto.LoginRequest;
import com.ecourt.dto.MessageResponse;
import com.ecourt.dto.RegisterRequest;
import com.ecourt.security.CustomUserDetails;
import jakarta.validation.Valid;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import com.ecourt.security.JwtService;
import com.ecourt.service.UserService;
import org.springframework.web.bind.annotation.*;

/**
 * REST Controller responsible for User Authentication.
 * 
 * WHY IT IS USED:
 * This file provides publicly accessible endpoints that allow users to register
 * for the platform
 * and authenticate themselves. It acts as the gateway to the E-Court system,
 * intercepting initial
 * access requests and delegating to the AuthenticationManager to verify
 * credentials before
 * issuing JSON Web Tokens (JWTs) for subsequent authenticated API calls.
 *
 * FUNCTIONS OVERVIEW:
 * - register: Accepts new user details, validates them, and creates a new
 * CLIENT or LAWYER account.
 * - login: Authenticates existing credentials against the database and returns
 * a signed JWT alongside basic user info.
 */
@RestController
@RequestMapping("/auth")
public class AuthController {

    private final AuthenticationManager authenticationManager;
    private final JwtService jwtService;
    private final UserService userService;

    public AuthController(
            AuthenticationManager authenticationManager,
            JwtService jwtService,
            UserService userService) {
        this.authenticationManager = authenticationManager;
        this.jwtService = jwtService;
        this.userService = userService;
    }

    @PostMapping("/register")
    public MessageResponse register(@Valid @RequestBody RegisterRequest request) {
        return new MessageResponse(userService.register(request));
    }

    @PostMapping("/login")
    public AuthResponse login(@Valid @RequestBody LoginRequest request) {

        Authentication authentication = authenticationManager.authenticate(
                new UsernamePasswordAuthenticationToken(
                        request.getUsername(),
                        request.getPassword()));

        CustomUserDetails userDetails = (CustomUserDetails) authentication.getPrincipal();
        String token = jwtService.generateToken(userDetails.getUsername());

        return new AuthResponse(token, userDetails.getUsername(), userDetails.getUser().getRole());
    }
}
