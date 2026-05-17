function toText(value) {
  return String(value ?? "").trim();
}

function toKey(value) {
  return toText(value).toLowerCase();
}

function toArray(value) {
  if (Array.isArray(value)) return value;
  if (value == null) return [];
  return [value];
}

function rowMatchesSelected(row, filter, selectedValues) {
  if (!selectedValues?.length) return true;

  const rowValues = toArray(filter.getValue(row)).map(toText).filter(Boolean);
  if (!rowValues.length) return false;

  const rowKeySet = new Set(rowValues.map(toKey));
  return selectedValues.some((selected) => rowKeySet.has(toKey(selected)));
}

export function filterRowsByCascade(rows, filters, selectedByFilter) {
  if (!Array.isArray(rows) || !Array.isArray(filters)) return [];

  return rows.filter((row) =>
    filters.every((filter) => {
      const selectedValues = selectedByFilter?.[filter.id] || [];
      return rowMatchesSelected(row, filter, selectedValues);
    }),
  );
}
