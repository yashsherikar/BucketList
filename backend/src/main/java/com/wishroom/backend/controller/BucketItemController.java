package com.wishroom.backend.controller;

import com.wishroom.backend.dto.ItemDtos.*;
import com.wishroom.backend.service.BucketItemService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/rooms/{roomId}/items")
@RequiredArgsConstructor
public class BucketItemController {

    private final BucketItemService bucketItemService;

    @PostMapping("/preview")
    public ResponseEntity<LinkPreviewResponse> previewLink(
            Authentication auth, @PathVariable String roomId, @RequestBody Map<String, String> body
    ) {
        return ResponseEntity.ok(bucketItemService.previewLink(userId(auth), roomId, body.get("url")));
    }

    @PostMapping
    public ResponseEntity<ItemResponse> addItem(
            Authentication auth, @PathVariable String roomId, @Valid @RequestBody AddItemRequest request
    ) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(bucketItemService.addItem(userId(auth), roomId, request));
    }

    @GetMapping
    public ResponseEntity<List<ItemResponse>> listItems(Authentication auth, @PathVariable String roomId) {
        return ResponseEntity.ok(bucketItemService.listItems(userId(auth), roomId));
    }

    @PatchMapping("/{itemId}")
    public ResponseEntity<ItemResponse> updateItem(
            Authentication auth, @PathVariable String roomId, @PathVariable String itemId,
            @RequestBody UpdateItemRequest request
    ) {
        return ResponseEntity.ok(bucketItemService.updateItem(userId(auth), roomId, itemId, request));
    }

    @PostMapping("/{itemId}/buy")
    public ResponseEntity<ItemResponse> markBought(
            Authentication auth, @PathVariable String roomId, @PathVariable String itemId
    ) {
        return ResponseEntity.ok(bucketItemService.markBought(userId(auth), roomId, itemId));
    }

    @PostMapping("/{itemId}/unbuy")
    public ResponseEntity<ItemResponse> markWishlisted(
            Authentication auth, @PathVariable String roomId, @PathVariable String itemId
    ) {
        return ResponseEntity.ok(bucketItemService.markWishlisted(userId(auth), roomId, itemId));
    }

    @DeleteMapping("/{itemId}")
    public ResponseEntity<Void> deleteItem(
            Authentication auth, @PathVariable String roomId, @PathVariable String itemId
    ) {
        bucketItemService.deleteItem(userId(auth), roomId, itemId);
        return ResponseEntity.noContent().build();
    }

    private String userId(Authentication auth) {
        return (String) auth.getPrincipal();
    }
}
