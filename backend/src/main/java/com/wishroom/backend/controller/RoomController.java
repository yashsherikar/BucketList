package com.wishroom.backend.controller;

import com.wishroom.backend.dto.RoomDtos.*;
import com.wishroom.backend.service.RoomService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/rooms")
@RequiredArgsConstructor
public class RoomController {

    private final RoomService roomService;

    @PostMapping
    public ResponseEntity<RoomResponse> createRoom(
            Authentication auth, @Valid @RequestBody CreateRoomRequest request
    ) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(roomService.createRoom(userId(auth), request));
    }

    @PostMapping("/join")
    public ResponseEntity<RoomResponse> joinRoom(
            Authentication auth, @Valid @RequestBody JoinRoomRequest request
    ) {
        return ResponseEntity.ok(roomService.joinRoom(userId(auth), request));
    }

    @GetMapping
    public ResponseEntity<List<RoomResponse>> listMyRooms(Authentication auth) {
        return ResponseEntity.ok(roomService.listRoomsForUser(userId(auth)));
    }

    @GetMapping("/{roomId}")
    public ResponseEntity<RoomDetailResponse> getRoom(Authentication auth, @PathVariable String roomId) {
        return ResponseEntity.ok(roomService.getRoomDetail(userId(auth), roomId));
    }

    @PostMapping("/{roomId}/leave")
    public ResponseEntity<Void> leaveRoom(Authentication auth, @PathVariable String roomId) {
        roomService.leaveRoom(userId(auth), roomId);
        return ResponseEntity.noContent().build();
    }

    @DeleteMapping("/{roomId}")
    public ResponseEntity<Void> deleteRoom(Authentication auth, @PathVariable String roomId) {
        roomService.deleteRoom(userId(auth), roomId);
        return ResponseEntity.noContent().build();
    }

    private String userId(Authentication auth) {
        return (String) auth.getPrincipal();
    }
}
