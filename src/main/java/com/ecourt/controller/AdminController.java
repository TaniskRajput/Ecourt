package com.ecourt.controller;

import com.ecourt.dto.UserSummaryResponse;
import com.ecourt.service.AdminService;
import org.springframework.web.bind.annotation.*;
import java.util.List;

@RestController
@RequestMapping("/admin")
public class AdminController {

    private final AdminService adminService;

    public AdminController(AdminService adminService) {
        this.adminService = adminService;
    }

    @GetMapping("/users")
    public List<UserSummaryResponse> getAllUsers() {
        return adminService.getAllUsers();
    }
}
