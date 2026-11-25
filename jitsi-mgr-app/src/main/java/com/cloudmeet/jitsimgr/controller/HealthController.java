package com.cloudmeet.jitsimgr.controller;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

import java.time.Instant;
import java.util.HashMap;
import java.util.Map;

@RestController
public class HealthController {

    @GetMapping("/health")
    public ResponseEntity<Map<String, Object>> health() {
        Map<String, Object> health = new HashMap<>();
        health.put("status", "healthy");
        health.put("service", "jitsi-mgr");
        health.put("version", "0.1.0");
        health.put("timestamp", Instant.now().toString());
        
        return ResponseEntity.ok(health);
    }
}
