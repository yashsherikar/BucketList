package com.wishroom.backend.controller;

import lombok.RequiredArgsConstructor;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;

@RestController
@RequestMapping("/api/health")
@RequiredArgsConstructor
public class HealthController {

    private final JdbcTemplate jdbcTemplate;

    // Hitting the DB here (not just returning "UP") is deliberate: the same cron
    // ping that keeps Render awake also runs a query, so Neon's compute doesn't
    // autosuspend and the first real user request isn't stuck behind a cold DB.
    // ponytail: SELECT 1 every ping keeps Neon warm 24/7, which can burn through
    // the free-tier compute-hour cap. If that bites, either lengthen the cron
    // interval or move to a Neon paid plan (no autosuspend).
    @GetMapping
    public ResponseEntity<Map<String, String>> health() {
        String db;
        try {
            jdbcTemplate.queryForObject("SELECT 1", Integer.class);
            db = "UP";
        } catch (Exception e) {
            db = "DOWN";
        }
        return ResponseEntity.ok(Map.of("status", "UP", "db", db));
    }
}
