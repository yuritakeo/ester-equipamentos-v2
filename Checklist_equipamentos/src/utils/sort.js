const naturalCollator = new Intl.Collator("pt-BR", {
  numeric: true,
  sensitivity: "base",
});

export function toSortableText(value) {
  return String(value ?? "").trim();
}

export function compareNaturalText(a, b) {
  return naturalCollator.compare(toSortableText(a), toSortableText(b));
}

export function compareByTextKeys(a, b, ...getters) {
  for (const getter of getters) {
    const diff = compareNaturalText(getter?.(a), getter?.(b));
    if (diff !== 0) return diff;
  }

  return 0;
}

export function sortByTextKeys(list, ...getters) {
  return [...(Array.isArray(list) ? list : [])].sort((a, b) => compareByTextKeys(a, b, ...getters));
}
