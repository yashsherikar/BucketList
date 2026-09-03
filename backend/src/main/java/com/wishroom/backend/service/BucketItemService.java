package com.wishroom.backend.service;

import com.wishroom.backend.dto.ItemDtos.*;
import com.wishroom.backend.entity.BucketItem;
import com.wishroom.backend.entity.ItemPriority;
import com.wishroom.backend.entity.ItemStatus;
import com.wishroom.backend.entity.User;
import com.wishroom.backend.exception.ApiExceptions.BadRequestException;
import com.wishroom.backend.exception.ApiExceptions.ForbiddenException;
import com.wishroom.backend.exception.ApiExceptions.NotFoundException;
import com.wishroom.backend.repository.BucketItemRepository;
import com.wishroom.backend.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class BucketItemService {

    private final BucketItemRepository bucketItemRepository;
    private final UserRepository userRepository;
    private final RoomService roomService;
    private final LinkMetadataService linkMetadataService;
    private final PriceComparisonService priceComparisonService;

    public LinkPreviewResponse previewLink(String userId, String roomId, String url) {
        roomService.requireMembership(userId, roomId);
        return linkMetadataService.fetchPreview(url);
    }

    public ComparePricesResponse comparePrices(String userId, String roomId, String itemId) {
        roomService.requireMembership(userId, roomId);
        BucketItem item = getItemInRoom(roomId, itemId);
        String query = buildSearchQuery(item);
        return priceComparisonService.comparePrices(query);
    }

    /** Marketing filler that only hurts shopping-search matching. */
    private static final java.util.Set<String> QUERY_NOISE = java.util.Set.of(
            "with", "for", "and", "the", "best", "premium", "new", "original", "genuine",
            "combo", "pack", "set", "of", "free", "offer", "buy", "online", "india",
            "official", "brand", "latest", "edition", "warranty", "pcs", "piece", "pieces",
            "men", "man", "women", "woman", "unisex"
    );

    /**
     * Product titles scraped from retailer pages are often full marketing copy
     * ("boAt Rockerz Plus 440 | Best-in-Segment Wireless Headphones with Dual
     * Drivers & 60 Hours Playback"), which makes a poor search query. Drops
     * bracketed blurbs, cuts at the first strong separator, then keeps only the
     * first few meaningful words. Falls back to the raw title if nothing usable.
     */
    private String buildSearchQuery(BucketItem item) {
        String title = item.getTitle();
        if (title == null || title.isBlank()) {
            return item.getUrl();
        }

        // 1. drop bracketed blurbs: "(100ml)", "[2024 Model]", "{Combo}"
        String s = title.replaceAll("[\\(\\[\\{][^\\)\\]\\}]*[\\)\\]\\}]", " ");
        // 2. cut at the first strong separator \u2014 everything after is feature spam
        s = s.split("[|\u2013\u2014:\u00b7]")[0];
        s = s.split(" - ")[0];

        // 3. keep the first ~6 meaningful words (brand + model + a descriptor or two)
        StringBuilder q = new StringBuilder();
        int kept = 0;
        for (String w : s.trim().split("\\s+")) {
            String bare = w.replaceAll("[^\\p{L}\\p{Nd}.+-]", "");
            if (bare.isBlank() || QUERY_NOISE.contains(bare.toLowerCase())) continue;
            if (q.length() > 0) q.append(' ');
            q.append(bare);
            if (++kept >= 6) break;
        }
        String cleaned = q.toString().trim();

        if (cleaned.length() < 4) {
            cleaned = title.trim();
        }
        if (cleaned.length() > 80) {
            cleaned = cleaned.substring(0, 80).trim();
        }
        return cleaned;
    }

    public ItemResponse addItem(String userId, String roomId, AddItemRequest request) {
        roomService.requireMembership(userId, roomId);

        LinkPreviewResponse preview = linkMetadataService.fetchPreview(request.url());

        BucketItem item = BucketItem.builder()
                .roomId(roomId)
                .url(preview.url())
                .title(preview.title())
                .imageUrl(preview.imageUrl())
                .source(preview.source())
                .notes(request.notes())
                .price(request.price() != null ? request.price() : preview.detectedPrice())
                .addedByUserId(userId)
                .status(ItemStatus.WISHLISTED)
                .priority(parsePriority(request.priority()))
                .build();

        item = bucketItemRepository.save(item);
        return toResponse(item);
    }

    public List<ItemResponse> listItems(String userId, String roomId) {
        roomService.requireMembership(userId, roomId);
        List<BucketItem> items = bucketItemRepository.findByRoomIdOrderByCreatedAtDesc(roomId);
        return items.stream().map(this::toResponse).toList();
    }

    public ItemResponse updateItem(String userId, String roomId, String itemId, UpdateItemRequest request) {
        roomService.requireMembership(userId, roomId);
        BucketItem item = getItemInRoom(roomId, itemId);

        // Only the person who added an item can edit it.
        if (!item.getAddedByUserId().equals(userId)) {
            throw new ForbiddenException("Only the person who added this item can edit it");
        }

        if (request.title() != null) item.setTitle(request.title());
        if (request.imageUrl() != null) item.setImageUrl(request.imageUrl());
        if (request.notes() != null) item.setNotes(request.notes());
        if (request.price() != null) item.setPrice(request.price());
        if (request.currency() != null) item.setCurrency(request.currency());
        if (request.priority() != null) item.setPriority(parsePriority(request.priority()));
        item.setUpdatedAt(Instant.now());

        item = bucketItemRepository.save(item);
        return toResponse(item);
    }

    public ItemResponse reserveItem(String userId, String roomId, String itemId) {
        roomService.requireMembership(userId, roomId);
        BucketItem item = getItemInRoom(roomId, itemId);

        if (item.getStatus() != ItemStatus.WISHLISTED) {
            throw new BadRequestException("This item is already reserved or bought");
        }

        item.setStatus(ItemStatus.RESERVED);
        item.setReservedByUserId(userId);
        item.setUpdatedAt(Instant.now());

        item = bucketItemRepository.save(item);
        return toResponse(item);
    }

    public ItemResponse releaseItem(String userId, String roomId, String itemId) {
        roomService.requireMembership(userId, roomId);
        BucketItem item = getItemInRoom(roomId, itemId);

        if (item.getStatus() != ItemStatus.RESERVED) {
            throw new BadRequestException("This item isn't reserved");
        }
        if (!userId.equals(item.getReservedByUserId())) {
            throw new ForbiddenException("Only the person who reserved this item can release it");
        }

        item.setStatus(ItemStatus.WISHLISTED);
        item.setReservedByUserId(null);
        item.setUpdatedAt(Instant.now());

        item = bucketItemRepository.save(item);
        return toResponse(item);
    }

    public ItemResponse markBought(String userId, String roomId, String itemId) {
        roomService.requireMembership(userId, roomId);
        BucketItem item = getItemInRoom(roomId, itemId);

        item.setStatus(ItemStatus.BOUGHT);
        item.setBoughtByUserId(userId);
        item.setBoughtAt(Instant.now());
        item.setReservedByUserId(null);
        item.setUpdatedAt(Instant.now());

        item = bucketItemRepository.save(item);
        return toResponse(item);
    }

    public ItemResponse markWishlisted(String userId, String roomId, String itemId) {
        roomService.requireMembership(userId, roomId);
        BucketItem item = getItemInRoom(roomId, itemId);

        item.setStatus(ItemStatus.WISHLISTED);
        item.setBoughtByUserId(null);
        item.setBoughtAt(null);
        item.setReservedByUserId(null);
        item.setUpdatedAt(Instant.now());

        item = bucketItemRepository.save(item);
        return toResponse(item);
    }

    private ItemPriority parsePriority(String raw) {
        if (raw == null || raw.isBlank()) return ItemPriority.NICE_TO_HAVE;
        try {
            return ItemPriority.valueOf(raw.trim().toUpperCase());
        } catch (IllegalArgumentException e) {
            return ItemPriority.NICE_TO_HAVE;
        }
    }

    public void deleteItem(String userId, String roomId, String itemId) {
        roomService.requireMembership(userId, roomId);
        BucketItem item = getItemInRoom(roomId, itemId);

        // Anyone in the room can add; only the person who added it (or the room owner) can remove it.
        var room = roomService.requireMembership(userId, roomId);
        if (!item.getAddedByUserId().equals(userId) && !room.getOwnerId().equals(userId)) {
            throw new ForbiddenException("Only the person who added this item or the room owner can remove it");
        }

        bucketItemRepository.delete(item);
    }

    private BucketItem getItemInRoom(String roomId, String itemId) {
        BucketItem item = bucketItemRepository.findById(itemId)
                .orElseThrow(() -> new NotFoundException("Item not found"));
        if (!item.getRoomId().equals(roomId)) {
            throw new NotFoundException("Item not found in this room");
        }
        return item;
    }

    private ItemResponse toResponse(BucketItem item) {
        Map<String, User> usersById = userRepository.findAllById(
                java.util.stream.Stream.of(item.getAddedByUserId(), item.getReservedByUserId(), item.getBoughtByUserId())
                        .filter(java.util.Objects::nonNull)
                        .toList()
        ).stream().collect(Collectors.toMap(User::getId, u -> u));

        User addedBy = usersById.get(item.getAddedByUserId());
        User reservedBy = item.getReservedByUserId() != null ? usersById.get(item.getReservedByUserId()) : null;
        User boughtBy = item.getBoughtByUserId() != null ? usersById.get(item.getBoughtByUserId()) : null;

        String priority = (item.getPriority() != null ? item.getPriority() : ItemPriority.NICE_TO_HAVE).name();

        return new ItemResponse(
                item.getId(), item.getRoomId(), item.getUrl(), item.getTitle(), item.getImageUrl(),
                item.getNotes(), item.getSource(), item.getPrice(), item.getCurrency(),
                item.getStatus().name(), priority,
                item.getAddedByUserId(),
                addedBy != null ? addedBy.getName() : "Unknown",
                item.getReservedByUserId(),
                reservedBy != null ? reservedBy.getName() : null,
                item.getBoughtByUserId(),
                boughtBy != null ? boughtBy.getName() : null,
                item.getBoughtAt(), item.getCreatedAt(), item.getUpdatedAt()
        );
    }
}
