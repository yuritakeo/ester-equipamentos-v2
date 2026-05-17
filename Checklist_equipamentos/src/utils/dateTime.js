const SAO_PAULO_TIME_ZONE = "America/Sao_Paulo";

export function parseDateValue(value) {
  if (!value) return null;
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return null;
  return parsed;
}

export function formatDateTimeBR(value) {
  const parsed = parseDateValue(value);
  if (!parsed) return "-";

  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
    timeZone: SAO_PAULO_TIME_ZONE,
  }).format(parsed);
}

export function formatDateBR(value) {
  const parsed = parseDateValue(value);
  if (!parsed) return "-";

  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeZone: SAO_PAULO_TIME_ZONE,
  }).format(parsed);
}

export function toIsoDateBrazil(value) {
  const parsed = parseDateValue(value);
  if (!parsed) return "";

  const formatter = new Intl.DateTimeFormat("en-CA", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    timeZone: SAO_PAULO_TIME_ZONE,
  });

  const parts = formatter.formatToParts(parsed);
  const year = parts.find((part) => part.type === "year")?.value || "";
  const month = parts.find((part) => part.type === "month")?.value || "";
  const day = parts.find((part) => part.type === "day")?.value || "";
  if (!year || !month || !day) return "";

  return `${year}-${month}-${day}`;
}
