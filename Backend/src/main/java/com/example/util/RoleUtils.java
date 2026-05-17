package com.example.util;

import java.util.Locale;

public final class RoleUtils {

    private RoleUtils() {
    }

    public static String normalizeRole(String role) {
        return role == null ? "" : role.trim().toUpperCase(Locale.ROOT);
    }

    public static boolean isGerencia(String role) {
        String normalized = normalizeRole(role);
        return "GERENCIA".equals(normalized) || "GERENCIAL".equals(normalized);
    }

    public static boolean isDeveloperEquivalent(String role) {
        String normalized = normalizeRole(role);
        return "DEVELOPER".equals(normalized) || isGerencia(normalized);
    }

    public static boolean isAdministrative(String role) {
        String normalized = normalizeRole(role);
        return "ADMIN".equals(normalized) || isDeveloperEquivalent(normalized);
    }

    public static boolean isOperational(String role) {
        String normalized = normalizeRole(role);
        return !"ADMIN".equals(normalized) && !"DEVELOPER".equals(normalized) && !isGerencia(normalized);
    }
}
