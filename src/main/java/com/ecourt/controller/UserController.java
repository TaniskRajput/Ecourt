package com.ecourt.controller;

import com.ecourt.dto.UserProfileResponse;
import com.ecourt.dto.UserProfileUpdateRequest;
import com.ecourt.service.UserService;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/users")
public class UserController {

    private final UserService userService;

    public UserController(UserService userService) {
        this.userService = userService;
    }

    @GetMapping("/me")
    public UserProfileResponse getMyProfile(Authentication authentication) {
        return userService.getUserProfile(authentication.getName());
    }

    @PutMapping("/me")
    public UserProfileResponse updateMyProfile(
            @RequestParam(required = false) String username,
            @RequestBody UserProfileUpdateRequest request,
            Authentication authentication) {
        return userService.updateUserProfile(authentication.getName(), username, request);
    }
}
