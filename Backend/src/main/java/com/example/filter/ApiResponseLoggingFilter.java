package com.example.filter;

import java.io.IOException;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;

@Component
public class ApiResponseLoggingFilter extends OncePerRequestFilter {

    private static final Logger log = LoggerFactory.getLogger(ApiResponseLoggingFilter.class);

    @Override
    protected boolean shouldNotFilter(HttpServletRequest request) {
        String path = request.getRequestURI();
        return !(path.startsWith("/api/relatorios") || path.startsWith("/api/estoques"));
    }

    @Override
    protected void doFilterInternal(
            HttpServletRequest request,
            HttpServletResponse response,
            FilterChain filterChain) throws ServletException, IOException {
        long startedAt = System.nanoTime();

        filterChain.doFilter(request, response);

        long elapsedMs = (System.nanoTime() - startedAt) / 1_000_000L;
        String contentLength = response.getHeader("Content-Length");
        log.info(
                "api_response path={} method={} status={} durationMs={} responseBytes={}",
                request.getRequestURI(),
                request.getMethod(),
                response.getStatus(),
                elapsedMs,
                contentLength != null ? contentLength : "desconhecido");
    }
}
