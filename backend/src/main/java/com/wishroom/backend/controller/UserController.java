package com.wishroom.backend.controller;

import com.wishroom.backend.entity.User;
import com.wishroom.backend.exception.ApiExceptions.NotFoundException;
import com.wishroom.backend.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;

@RestController
@RequestMapping("/api/users")
@RequiredArgsConstructor
public class UserController {

    private final UserRepository userRepository;

    @GetMapping("/me")
    public Map<String, String> me(Authentication auth) {
        String userId = (String) auth.getPrincipal();
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new NotFoundException("User not found"));
        return Map.of("id", user.getId(), "name", user.getName(), "email", user.getEmail());
    }
}
