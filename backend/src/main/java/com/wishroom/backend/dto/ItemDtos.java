package com.wishroom.backend.dto;

import jakarta.validation.constraints.NotBlank;

import java.time.Instant;
import java.util.List;

public class ItemDtos {

    public record AddItemRequest(
            @NotBlank(message = "Product link is required") String url,
            String notes,
            Double price,
            String priority
    ) {}

    public record UpdateItemRequest(
            String title,
            String imageUrl,
            String notes,
            Double price,
            String currency,
            String priority
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
            String priority,
            String addedByUserId,
            String addedByName,
            String reservedByUserId,
            String reservedByName,
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

    /** A single retailer's offer for a product, returned by the price-comparison search. */
    public record PriceOffer(
            String platform,
            String title,
            Double price,
            String currency,
            String link,
            String thumbnail
    ) {}

    public record ComparePricesResponse(
            String query,
            List<PriceOffer> offers,
            String matchedTitle,          // the product the search actually locked onto — null if none
            List<String> matchedImages    // its photos, so the user can swipe through and eyeball the match
    ) {}
}
