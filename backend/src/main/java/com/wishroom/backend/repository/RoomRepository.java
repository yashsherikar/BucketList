package com.wishroom.backend.repository;

import com.wishroom.backend.entity.Room;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface RoomRepository extends JpaRepository<Room, String> {
    Optional<Room> findByInviteCode(String inviteCode);
    boolean existsByInviteCode(String inviteCode);
}
