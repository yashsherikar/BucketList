package com.wishroom.backend.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public class AuthDtos {

    public record RegisterRequest(
            @NotBlank(message = "Name is required") String name,
            @NotBlank @Email(message = "Enter a valid email") String email,
            @NotBlank @Size(min = 6, message = "Password must be at least 6 characters") String password
    ) {}

    public record LoginRequest(
            @NotBlank @Email(message = "Enter a valid email") String email,
            @NotBlank String password
    ) {}

    public record AuthResponse(
            String token,
            String userId,
            String name,
            String email
    ) {}
}
