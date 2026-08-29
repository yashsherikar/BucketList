package com.wishroom.backend.service;

import com.wishroom.backend.dto.RoomDtos.*;
import com.wishroom.backend.entity.Room;
import com.wishroom.backend.entity.RoomMember;
import com.wishroom.backend.entity.RoomRole;
import com.wishroom.backend.entity.User;
import com.wishroom.backend.exception.ApiExceptions.*;
import com.wishroom.backend.repository.BucketItemRepository;
import com.wishroom.backend.repository.RoomMemberRepository;
import com.wishroom.backend.repository.RoomRepository;
import com.wishroom.backend.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.security.SecureRandom;
import java.util.List;
import java.util.Map;

@Service
@RequiredArgsConstructor
public class RoomService {

    private static final String INVITE_CODE_CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // no 0/O/1/I to avoid confusion
    private static final SecureRandom RANDOM = new SecureRandom();

    private final RoomRepository roomRepository;
    private final RoomMemberRepository roomMemberRepository;
    private final BucketItemRepository bucketItemRepository;
    private final UserRepository userRepository;

    public RoomResponse createRoom(String ownerId, CreateRoomRequest request) {
        Room room = Room.builder()
                .name(request.name().trim())
                .description(request.description())
                .ownerId(ownerId)
                .inviteCode(generateUniqueInviteCode())
                .build();
        room = roomRepository.save(room);

        roomMemberRepository.save(RoomMember.builder()
                .roomId(room.getId())
                .userId(ownerId)
                .role(RoomRole.OWNER)
                .build());

        return toRoomResponse(room, 1, 0);
    }

    public RoomResponse joinRoom(String userId, JoinRoomRequest request) {
        Room room = roomRepository.findByInviteCode(request.inviteCode().trim().toUpperCase())
                .orElseThrow(() -> new NotFoundException("No room found for that invite code"));

        if (roomMemberRepository.existsByRoomIdAndUserId(room.getId(), userId)) {
            throw new ConflictException("You're already a member of this room");
        }

        roomMemberRepository.save(RoomMember.builder()
                .roomId(room.getId())
                .userId(userId)
                .role(RoomRole.MEMBER)
                .build());

        int memberCount = roomMemberRepository.findByRoomId(room.getId()).size();
        int itemCount = bucketItemRepository.findByRoomIdOrderByCreatedAtDesc(room.getId()).size();
        return toRoomResponse(room, memberCount, itemCount);
    }

    public List<RoomResponse> listRoomsForUser(String userId) {
        List<RoomMember> memberships = roomMemberRepository.findByUserId(userId);
        return memberships.stream()
                .map(m -> roomRepository.findById(m.getRoomId()).orElse(null))
                .filter(r -> r != null)
                .map(room -> {
                    int memberCount = roomMemberRepository.findByRoomId(room.getId()).size();
                    int itemCount = bucketItemRepository.findByRoomIdOrderByCreatedAtDesc(room.getId()).size();
                    return toRoomResponse(room, memberCount, itemCount);
                })
                .toList();
    }

    public RoomDetailResponse getRoomDetail(String userId, String roomId) {
        Room room = requireMembership(userId, roomId);

        List<RoomMember> members = roomMemberRepository.findByRoomId(roomId);
        Map<String, User> usersById = userRepository.findAllById(members.stream().map(RoomMember::getUserId).toList())
                .stream()
                .collect(java.util.stream.Collectors.toMap(User::getId, u -> u));

        List<MemberResponse> memberResponses = members.stream()
                .map(m -> {
                    User u = usersById.get(m.getUserId());
                    return new MemberResponse(
                            m.getUserId(),
                            u != null ? u.getName() : "Unknown",
                            u != null ? u.getEmail() : "",
                            m.getRole().name()
                    );
                })
                .toList();

        return new RoomDetailResponse(
                room.getId(), room.getName(), room.getDescription(), room.getInviteCode(),
                room.getOwnerId(), memberResponses, room.getCreatedAt()
        );
    }

    public void leaveRoom(String userId, String roomId) {
        Room room = roomRepository.findById(roomId)
                .orElseThrow(() -> new NotFoundException("Room not found"));

        if (room.getOwnerId().equals(userId)) {
            throw new BadRequestException("Room owner can't leave — delete the room instead");
        }

        if (!roomMemberRepository.existsByRoomIdAndUserId(roomId, userId)) {
            throw new NotFoundException("You're not a member of this room");
        }

        roomMemberRepository.deleteByRoomIdAndUserId(roomId, userId);
    }

    public void deleteRoom(String userId, String roomId) {
        Room room = roomRepository.findById(roomId)
                .orElseThrow(() -> new NotFoundException("Room not found"));

        if (!room.getOwnerId().equals(userId)) {
            throw new ForbiddenException("Only the room owner can delete this room");
        }

        bucketItemRepository.findByRoomIdOrderByCreatedAtDesc(roomId).forEach(bucketItemRepository::delete);
        roomMemberRepository.findByRoomId(roomId).forEach(roomMemberRepository::delete);
        roomRepository.delete(room);
    }

    /** Verifies the user belongs to the room and returns it, else throws. Used by other services too. */
    public Room requireMembership(String userId, String roomId) {
        Room room = roomRepository.findById(roomId)
                .orElseThrow(() -> new NotFoundException("Room not found"));

        if (!roomMemberRepository.existsByRoomIdAndUserId(roomId, userId)) {
            throw new ForbiddenException("You don't have access to this room");
        }
        return room;
    }

    private String generateUniqueInviteCode() {
        String code;
        do {
            StringBuilder sb = new StringBuilder(7);
            for (int i = 0; i < 7; i++) {
                sb.append(INVITE_CODE_CHARS.charAt(RANDOM.nextInt(INVITE_CODE_CHARS.length())));
            }
            code = sb.toString();
        } while (roomRepository.existsByInviteCode(code));
        return code;
    }

    private RoomResponse toRoomResponse(Room room, int memberCount, int itemCount) {
        return new RoomResponse(
                room.getId(), room.getName(), room.getDescription(), room.getInviteCode(),
                room.getOwnerId(), memberCount, itemCount, room.getCreatedAt()
        );
    }
}
