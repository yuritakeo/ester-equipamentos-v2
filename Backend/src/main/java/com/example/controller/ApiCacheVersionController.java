package com.example.controller;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.example.service.ApiCacheVersionService;

import lombok.RequiredArgsConstructor;

@RestController
@RequestMapping("/api/cache")
@RequiredArgsConstructor
public class ApiCacheVersionController {

    private final ApiCacheVersionService apiCacheVersionService;

    @GetMapping("/version")
    public VersionResponse getVersion() {
        ApiCacheVersionService.VersionSnapshot snapshot = apiCacheVersionService.getCurrentVersion();
        return new VersionResponse(snapshot.version(), snapshot.updatedAt().toString());
    }

    public record VersionResponse(long version, String updatedAt) {
    }
}
