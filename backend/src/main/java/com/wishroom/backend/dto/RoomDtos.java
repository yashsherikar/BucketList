package com.wishroom.backend.dto;

import jakarta.validation.constraints.NotBlank;

import java.time.Instant;
import java.util.List;

public class RoomDtos {

    public record CreateRoomRequest(
            @NotBlank(message = "Room name is required") String name,
            String description
    ) {}

    public record JoinRoomRequest(
            @NotBlank(message = "Invite code is required") String inviteCode
    ) {}

    public record MemberResponse(
            String userId,
            String name,
            String email,
            String role
    ) {}

    public record RoomResponse(
            String id,
            String name,
            String description,
            String inviteCode,
            String ownerId,
            int memberCount,
            int itemCount,
            Instant createdAt
    ) {}

    public record RoomDetailResponse(
            String id,
            String name,
            String description,
            String inviteCode,
            String ownerId,
            List<MemberResponse> members,
            Instant createdAt
    ) {}
}
