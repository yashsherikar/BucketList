package com.wishroom.backend.repository;

import com.wishroom.backend.entity.BucketItem;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface BucketItemRepository extends JpaRepository<BucketItem, String> {
    List<BucketItem> findByRoomIdOrderByCreatedAtDesc(String roomId);
    List<BucketItem> findByImageUrlIsNull();
}