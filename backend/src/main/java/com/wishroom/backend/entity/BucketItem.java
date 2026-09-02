package com.wishroom.backend.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.Instant;

@Entity
@Table(name = "bucket_items")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class BucketItem {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private String id;

    @Column(name = "room_id", nullable = false)
    private String roomId;

    @Column(nullable = false, length = 2048)
    private String url;

    private String title;

    @Column(length = 1024)
    private String imageUrl;

    @Column(length = 2000)
    private String notes;

    /** Site name detected from the link, e.g. "amazon.in", "flipkart.com" */
    private String source;

    /** Manually entered by whoever added/updated the item. Nullable until user fills it in. */
    private Double price;

    @Builder.Default
    private String currency = "INR";

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    @Builder.Default
    private ItemStatus status = ItemStatus.WISHLISTED;

    /** Nullable in the DB so ddl-auto can add the column to tables that already have rows. */
    @Enumerated(EnumType.STRING)
    @Builder.Default
    private ItemPriority priority = ItemPriority.NICE_TO_HAVE;

    @Column(nullable = false)
    private String addedByUserId;

    /** Set while status == RESERVED — whoever called "I'll get this". */
    private String reservedByUserId;

    private String boughtByUserId;

    private Instant boughtAt;

    @Column(nullable = false)
    @Builder.Default
    private Instant createdAt = Instant.now();

    @Column(nullable = false)
    @Builder.Default
    private Instant updatedAt = Instant.now();
}
