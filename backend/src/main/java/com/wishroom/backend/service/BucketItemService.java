package com.wishroom.backend.service;

import com.wishroom.backend.dto.ItemDtos.*;
import com.wishroom.backend.entity.BucketItem;
import com.wishroom.backend.entity.ItemStatus;
import com.wishroom.backend.entity.User;
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

    /**
     * Product titles scraped from retailer pages are often full marketing copy
     * ("boAt Rockerz Plus 440 | Best-in-Segment Wireless Headphones with Dual
     * Drivers & 60 Hours Playback"), which makes a poor search query — shopping
     * search APIs match much better on just the product name. This trims at the
     * first common separator (|, –, -, :) and caps the length, falling back to
     * the full title if that leaves nothing usable.
     */
    private String buildSearchQuery(BucketItem item) {
        String title = item.getTitle();
        if (title == null || title.isBlank()) {
            return item.getUrl();
        }

        String cleaned = title.split("[|\u2013\u2014:]")[0].trim();
        // A lone hyphen is common inside model numbers (e.g. "MX-500"), so only
        // split on " - " (surrounded by spaces) to avoid mangling those.
        cleaned = cleaned.split(" - ")[0].trim();

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
        item.setUpdatedAt(Instant.now());

        item = bucketItemRepository.save(item);
        return toResponse(item);
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
                java.util.stream.Stream.of(item.getAddedByUserId(), item.getBoughtByUserId())
                        .filter(java.util.Objects::nonNull)
                        .toList()
        ).stream().collect(Collectors.toMap(User::getId, u -> u));

        User addedBy = usersById.get(item.getAddedByUserId());
        User boughtBy = item.getBoughtByUserId() != null ? usersById.get(item.getBoughtByUserId()) : null;

        return new ItemResponse(
                item.getId(), item.getRoomId(), item.getUrl(), item.getTitle(), item.getImageUrl(),
                item.getNotes(), item.getSource(), item.getPrice(), item.getCurrency(),
                item.getStatus().name(), item.getAddedByUserId(),
                addedBy != null ? addedBy.getName() : "Unknown",
                item.getBoughtByUserId(),
                boughtBy != null ? boughtBy.getName() : null,
                item.getBoughtAt(), item.getCreatedAt(), item.getUpdatedAt()
        );
    }
}
