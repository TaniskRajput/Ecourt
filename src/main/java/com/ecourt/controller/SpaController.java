package com.ecourt.controller;

import jakarta.servlet.http.HttpServletRequest;
import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.RequestMapping;

/**
 * Forwards all non-API routes to index.html so React Router can handle client-side navigation.
 */
@Controller
public class SpaController {

    @RequestMapping(value = {
            "/",
            "/login",
            "/register",
            "/dashboard",
            "/dashboard/**",
            "/track",
            "/track/**"
    })
    public String forward(HttpServletRequest request) {
        return "forward:/index.html";
    }
}
