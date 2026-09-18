package com.kitchenledger.web.dto;

public record LoginResponse(String token, long expiresInSeconds, UserResponse user) {
}
