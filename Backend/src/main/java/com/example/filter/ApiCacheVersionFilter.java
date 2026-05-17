package com.example.filter;

import java.io.IOException;
import java.util.Set;

import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import com.example.service.ApiCacheVersionService;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;

@Component
@RequiredArgsConstructor
public class ApiCacheVersionFilter extends OncePerRequestFilter {

    private static final Set<String> READ_ONLY_MUTATION_PATHS = Set.of(
            "/api/login",
            "/api/gerar-pdf");

    private final ApiCacheVersionService apiCacheVersionService;

    @Override
    protected boolean shouldNotFilter(HttpServletRequest request) {
        return !request.getRequestURI().startsWith("/api/");
    }

    @Override
    protected void doFilterInternal(
            HttpServletRequest request,
            HttpServletResponse response,
            FilterChain filterChain) throws ServletException, IOException {

        filterChain.doFilter(request, response);

        ApiCacheVersionService.VersionSnapshot snapshot = shouldBumpVersion(request, response)
                ? apiCacheVersionService.bumpVersion()
                : apiCacheVersionService.getCurrentVersion();

        response.setHeader("X-App-Data-Version", String.valueOf(snapshot.version()));
        response.setHeader("X-App-Data-Updated-At", snapshot.updatedAt().toString());
    }

    private boolean shouldBumpVersion(HttpServletRequest request, HttpServletResponse response) {
        String method = request.getMethod();
        String path = request.getRequestURI();

        if (!("POST".equalsIgnoreCase(method)
                || "PUT".equalsIgnoreCase(method)
                || "PATCH".equalsIgnoreCase(method)
                || "DELETE".equalsIgnoreCase(method))) {
            return false;
        }

        if (READ_ONLY_MUTATION_PATHS.contains(path) || path.startsWith("/api/cache/")) {
            return false;
        }

        return response.getStatus() >= 200 && response.getStatus() < 400;
    }
}
