package com.wishroom.backend.dto;

import jakarta.validation.constraints.NotBlank;

import java.time.Instant;

public class ItemDtos {

    public record AddItemRequest(
            @NotBlank(message = "Product link is required") String url,
            String notes,
            Double price
    ) {}

    public record UpdateItemRequest(
            String title,
            String imageUrl,
            String notes,
            Double price,
            String currency
    ) {}

    public record ItemResponse(
            String id,
            String roomId,
            String url,
            String title,
            String imageUrl,
            String notes,
            String source,
            Double price,
            String currency,
            String status,
            String addedByUserId,
            String addedByName,
            String boughtByUserId,
            String boughtByName,
            Instant boughtAt,
            Instant createdAt,
            Instant updatedAt
    ) {}

    /** Preview returned right after the backend fetches Open Graph metadata for a pasted link. */
    public record LinkPreviewResponse(
            String url,
            String title,
            String imageUrl,
            String source,
            Double detectedPrice
    ) {}
}
