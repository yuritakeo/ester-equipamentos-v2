export function normalizeUserRole(value) {
  return String(value || "").trim().toUpperCase();
}

export function isGerenciaRole(value) {
  const role = normalizeUserRole(value);
  return role === "GERENCIA" || role === "GERENCIAL";
}

export function isDeveloperEquivalentRole(value) {
  const role = normalizeUserRole(value);
  return role === "DEVELOPER" || isGerenciaRole(role);
}

export function isAdminLikeRole(value) {
  const role = normalizeUserRole(value);
  return role === "ADMIN" || isDeveloperEquivalentRole(role);
}

export function isOperationalRole(value) {
  const role = normalizeUserRole(value);
  return role !== "ADMIN" && role !== "DEVELOPER" && !isGerenciaRole(role);
}
