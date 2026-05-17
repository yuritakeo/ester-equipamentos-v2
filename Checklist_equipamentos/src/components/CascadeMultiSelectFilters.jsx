import { useEffect, useMemo, useState } from "react";
import Select from "react-select";
import { compareNaturalText } from "../utils/sort";
import "../Styles/cascadeFilters.css";

const selectStyles = {
  control: (base, state) => ({
    ...base,
    minHeight: 34,
    borderRadius: 6,
    borderColor: state.isFocused ? "#2563eb" : "#c7ced9",
    boxShadow: state.isFocused ? "0 0 0 2px rgba(37, 99, 235, 0.14)" : "none",
    fontSize: 13,
    backgroundColor: "#ffffff",
    ":hover": {
      borderColor: state.isFocused ? "#2563eb" : "#9aa6b8",
    },
  }),
  valueContainer: (base) => ({
    ...base,
    padding: "0 6px",
    gap: 4,
  }),
  placeholder: (base) => ({
    ...base,
    color: "#64748b",
    fontSize: 13,
  }),
  multiValue: (base) => ({
    ...base,
    borderRadius: 999,
    backgroundColor: "#eaf1ff",
  }),
  multiValueLabel: (base) => ({
    ...base,
    color: "#1d4ed8",
    fontWeight: 700,
    fontSize: 11,
  }),
  multiValueRemove: (base) => ({
    ...base,
    borderRadius: 999,
  }),
  indicatorSeparator: (base) => ({
    ...base,
    marginTop: 5,
    marginBottom: 5,
  }),
  menuPortal: (base) => ({ ...base, zIndex: 9999 }),
  menu: (base) => ({ ...base, borderRadius: 8, overflow: "hidden" }),
  option: (base, state) => ({
    ...base,
    fontSize: 13,
    backgroundColor: state.isSelected ? "#2563eb" : state.isFocused ? "#eff6ff" : "#fff",
    color: state.isSelected ? "#fff" : "#0f172a",
  }),
};

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

function uniqueSorted(values) {
  return Array.from(new Set(values.filter(Boolean))).sort(compareNaturalText);
}

function optionListFromRows(rows, getValue) {
  const values = rows.flatMap((row) => toArray(getValue(row)).map(toText).filter(Boolean));
  return uniqueSorted(values).map((value) => ({ value, label: value }));
}

function rowMatchesSelected(row, filter, selectedValues) {
  if (!selectedValues?.length) return true;

  const rowValues = toArray(filter.getValue(row)).map(toText).filter(Boolean);
  if (!rowValues.length) return false;

  const rowKeySet = new Set(rowValues.map(toKey));
  return selectedValues.some((selected) => rowKeySet.has(toKey(selected)));
}

export default function CascadeMultiSelectFilters({
  rows = [],
  filters = [],
  value = {},
  onChange,
  className = "",
  storageKey = "",
  onClearAll,
}) {
  const [hydrated, setHydrated] = useState(!storageKey);

  const valueHash = useMemo(() => {
    return filters
      .map((filter) => `${filter.id}:${(value?.[filter.id] || []).join("|")}`)
      .join(";");
  }, [filters, value]);

  useEffect(() => {
    if (!storageKey) {
      return;
    }

    try {
      const raw = window.localStorage.getItem(storageKey);
      if (raw) {
        const parsed = JSON.parse(raw);
        onChange?.((estadoAtual) => ({
          ...estadoAtual,
          ...filters.reduce((acc, filter) => {
            acc[filter.id] = uniqueSorted(toArray(parsed?.[filter.id]).map(toText).filter(Boolean));
            return acc;
          }, {}),
        }));
      }
    } catch (_error) {
      // Ignora estado inválido no localStorage.
    }
    setHydrated(true);
  }, [filters, onChange, storageKey]);

  useEffect(() => {
    if (!storageKey || !hydrated) return;

    const payload = filters.reduce((acc, filter) => {
      acc[filter.id] = uniqueSorted((value?.[filter.id] || []).map(toText).filter(Boolean));
      return acc;
    }, {});

    const hasAny = Object.values(payload).some((items) => items.length > 0);
    if (!hasAny) {
      window.localStorage.removeItem(storageKey);
      return;
    }

    window.localStorage.setItem(storageKey, JSON.stringify(payload));
  }, [filters, hydrated, storageKey, valueHash, value]);

  const optionMap = useMemo(() => {
    return filters.reduce((acc, filter) => {
      const rowsBase = rows.filter((row) =>
        filters.every((outroFiltro) => {
          if (outroFiltro.id === filter.id) return true;
          return rowMatchesSelected(row, outroFiltro, value?.[outroFiltro.id] || []);
        }),
      );
      const options = optionListFromRows(rowsBase, filter.getValue);
      acc[filter.id] = options;
      return acc;
    }, {});
  }, [filters, rows, value]);

  useEffect(() => {
    if (!filters.length) return;

    let alterou = false;
    const proximo = {};

    filters.forEach((filter) => {
      const selecionados = uniqueSorted((value?.[filter.id] || []).map(toText).filter(Boolean));
      const permitidos = new Set((optionMap[filter.id] || []).map((item) => item.value));
      const saneado = selecionados.filter((item) => permitidos.has(item));
      proximo[filter.id] = saneado;
      if (saneado.length !== selecionados.length) alterou = true;
    });

    if (alterou) {
      onChange?.((estadoAtual) => ({
        ...estadoAtual,
        ...proximo,
      }));
    }
  }, [filters, onChange, optionMap, value]);

  function atualizarSelecao(filterId, updater) {
    const atual = value?.[filterId] || [];
    const proximo = uniqueSorted(updater(atual).map(toText).filter(Boolean));
    onChange?.((estadoAtual) => ({
      ...estadoAtual,
      [filterId]: proximo,
    }));
  }

  function limparTodos() {
    onChange?.((estadoAtual) => ({
      ...estadoAtual,
      ...filters.reduce((acc, filter) => {
        acc[filter.id] = [];
        return acc;
      }, {}),
    }));

    onClearAll?.();
  }

  return (
    <section className={`cascade-filters ${className}`.trim()}>
      {filters.map((filter) => {
        const selectedValues = value?.[filter.id] || [];
        const allOptions = optionMap[filter.id] || [];
        const selectedOptions = allOptions.filter((option) => selectedValues.includes(option.value));

        return (
          <article key={filter.id} className="cascade-filter-select">
            <Select
              classNamePrefix="smart-select"
              isMulti
              isClearable
              closeMenuOnSelect={false}
              hideSelectedOptions={false}
              placeholder={filter.placeholder || filter.label}
              value={selectedOptions}
              options={allOptions}
              onChange={(selected) => atualizarSelecao(filter.id, () => (selected || []).map((item) => item.value))}
              noOptionsMessage={() => "Nenhuma opcao disponivel"}
              menuPortalTarget={typeof document !== "undefined" ? document.body : null}
              styles={selectStyles}
            />
          </article>
        );
      })}
      <button type="button" className="cascade-filter-clear-all" onClick={limparTodos}>Limpar filtros</button>
    </section>
  );
}
