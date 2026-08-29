package com.wishroom.backend.repository;

import com.wishroom.backend.entity.RoomMember;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface RoomMemberRepository extends JpaRepository<RoomMember, String> {
    List<RoomMember> findByUserId(String userId);
    List<RoomMember> findByRoomId(String roomId);
    Optional<RoomMember> findByRoomIdAndUserId(String roomId, String userId);
    boolean existsByRoomIdAndUserId(String roomId, String userId);
    void deleteByRoomIdAndUserId(String roomId, String userId);
}
