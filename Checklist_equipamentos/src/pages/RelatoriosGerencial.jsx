import { useContext, useEffect, useMemo, useRef, useState } from "react";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import CascadeMultiSelectFilters from "../components/CascadeMultiSelectFilters";
import Modal from "../components/Modal";
import OutletLoading from "../components/OutletLoading";
import { AuthContext } from "../context/AuthContext";
import { api } from "../services/api";
import { filterRowsByCascade } from "../utils/cascadeFilters";
import { formatDateBR } from "../utils/dateTime";
import logoEmpresas from "../assets/logo-empresas.png";
import { isDeveloperEquivalentRole, isOperationalRole, normalizeUserRole } from "../utils/userRoles";
import "../Styles/operacoes.css";

const PIE_COLORS = [
  "#2563eb",
  "#0ea5e9",
  "#14b8a6",
  "#22c55e",
  "#84cc16",
  "#f59e0b",
  "#f97316",
  "#ef4444",
  "#ec4899",
  "#8b5cf6",
  "#6366f1",
  "#64748b",
];

const MAINTENANCE_PERIOD_LABELS = {
  TODOS: "Todo historico",
  ULTIMOS_7: "Ultimos 7 dias",
  ULTIMOS_30: "Ultimos 30 dias",
  ULTIMOS_90: "Ultimos 90 dias",
  ULTIMOS_180: "Ultimos 180 dias",
  ANO_ATUAL: "Ano atual",
};

const DIRECTION_PERIOD_LABELS = {
  TODOS: "Todo historico",
  ULTIMOS_7: "Ultimos 7 dias",
  ULTIMOS_30: "Ultimos 30 dias",
  ULTIMOS_90: "Ultimos 90 dias",
  ULTIMOS_180: "Ultimos 180 dias",
  ANO_ATUAL: "Ano atual",
};

const MAINTENANCE_STATUS_LABELS = {
  PENDENTE: "Pendente",
  CONCLUIDO: "Concluido",
  INUTILIZADO: "Inutilizado",
};

const ECONOMIC_REPLACEMENT_THRESHOLD = 0.3;
const RATE_WINDOW_DAYS = 30;
const SPENDING_WINDOWS = {
  SEMANA: { label: "Semana", days: 7 },
  MES: { label: "Mes", days: 30 },
  ANO: { label: "Ano", days: 365 },
};

const COST_ANALYSIS_GUIDE = [
  "1. Veja o painel de Gasto por periodo para identificar quem esta consumindo mais em semana, mes e ano.",
  "2. Veja o painel de Dinamica de falhas para validar se lambda(t) e alpha(t) estao subindo.",
  "3. Use o painel VM x VE para decidir troca: quando VM >= 30% do VE, o equipamento entra em zona de substituicao.",
  "4. Confirme no painel Criticos e no grafico exponencial o tempo previsto para atingir o VE.",
];

const COST_ANALYSIS_SIGLAS = [
  { sigla: "VE", descricao: "Valor do equipamento (valor unitario)." },
  { sigla: "VMC", descricao: "Valor medio de manutencao por falha (VM / N)." },
  { sigla: "VM", descricao: "Valor acumulado de manutencao." },
  { sigla: "N(t)", descricao: "Numero acumulado de falhas ao longo do tempo." },
  { sigla: "lambda(t)", descricao: "Taxa de falhas (dN/dt)." },
  { sigla: "alpha(t)", descricao: "Aceleracao de falhas (d2N/dt2)." },
  { sigla: "FF", descricao: "Fator de confiabilidade no painel (quanto maior, melhor)." },
  { sigla: "Cmedio", descricao: "Custo medio no tempo analisado." },
  { sigla: "t_troca", descricao: "Tempo estimado para atingir o limiar economico de troca." },
];

function formatCurrency(value) {
  const amount = Number(value ?? 0);
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(Number.isFinite(amount) ? amount : 0);
}

function formatNumber(value) {
  const amount = Number(value ?? 0);
  return new Intl.NumberFormat("pt-BR").format(Number.isFinite(amount) ? amount : 0);
}

function toPositiveNumber(value) {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 0;
}

function toFiniteNumber(value, fallback = 0) {
  const parsed = Number(value ?? fallback);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function formatDateShort(value) {
  return formatDateBR(value);
}

function formatDateTimeShort(value) {
  if (!value) return "-";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "-";

  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(parsed);
}

function formatPercent(value, fractionDigits = 1) {
  const parsed = toFiniteNumber(value, 0);
  return `${parsed.toFixed(fractionDigits)}%`;
}

function formatSigned(value, fractionDigits = 2) {
  const parsed = toFiniteNumber(value, 0);
  const sign = parsed > 0 ? "+" : "";
  return `${sign}${parsed.toFixed(fractionDigits)}`;
}

function carregarImagemBase64(src) {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.crossOrigin = "anonymous";
    image.onload = () => {
      try {
        const canvas = document.createElement("canvas");
        canvas.width = image.naturalWidth || image.width;
        canvas.height = image.naturalHeight || image.height;

        const context = canvas.getContext("2d");
        if (!context) {
          reject(new Error("Nao foi possivel preparar a logo para o PDF."));
          return;
        }

        context.drawImage(image, 0, 0);
        resolve(canvas.toDataURL("image/png"));
      } catch {
        reject(new Error("Nao foi possivel preparar a logo para o PDF."));
      }
    };
    image.onerror = () => reject(new Error("Nao foi possivel carregar a logo para o PDF."));
    image.src = src;
  });
}

function normalizeGroupKey(value) {
  return String(value || "").trim().toLowerCase();
}

function formatDirectionType(value) {
  const normalized = String(value || "").trim().toUpperCase();

  if (normalized === "EQUIPE") return "Equipe";
  if (normalized === "CANTEIRO") return "Canteiro";
  if (normalized === "MANUTENCAO") return "Manutencao";
  if (normalized === "CADASTRO") return "Cadastro";
  return normalized || "Sem tipo";
}

function formatDirectionAction(value) {
  const normalized = String(value || "").trim().toUpperCase();

  if (normalized === "CADASTRO_CANTEIRO") return "Cadastro no canteiro";
  if (normalized === "MOVER_PARA_CANTEIRO") return "Retorno ao canteiro";
  if (normalized === "DIRECIONAR_EQUIPE") return "Direcionado para equipe";
  if (normalized === "TRANSFERENCIA_EQUIPE") return "Transferencia entre equipes";
  if (normalized === "ENTRADA_MANUTENCAO") return "Entrada em manutencao";
  if (normalized === "RETORNO_MANUTENCAO_EQUIPE") return "Saida da manutencao para equipe";
  if (normalized === "RETORNO_MANUTENCAO_CANTEIRO") return "Saida da manutencao para canteiro";
  return normalized || "Direcionamento";
}

function formatMaintenanceStatus(value) {
  return MAINTENANCE_STATUS_LABELS[String(value || "").toUpperCase()] || String(value || "Desconhecido");
}

function parseDateOrNull(value) {
  if (!value) return null;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function getMaintenanceReferenceDate(item) {
  return parseDateOrNull(item?.dataEntrada || item?.dataSaida);
}

function monthKey(date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

function monthLabel(key) {
  const [year, month] = String(key).split("-");
  const yearNumber = Number(year);
  const monthNumber = Number(month);
  if (!Number.isFinite(yearNumber) || !Number.isFinite(monthNumber)) return String(key);
  const normalizedDate = new Date(yearNumber, Math.max(0, monthNumber - 1), 1);
  return new Intl.DateTimeFormat("pt-BR", { month: "short", year: "2-digit" }).format(normalizedDate).replace(".", "");
}

function trendLabel(alpha) {
  if (alpha > 0.05) return "Falhas acelerando";
  if (alpha < -0.05) return "Falhas desacelerando";
  return "Regime estavel";
}

function getPercentileThreshold(values, percentile = 0.75) {
  const valid = (Array.isArray(values) ? values : [])
    .map((value) => toFiniteNumber(value))
    .filter((value) => value > 0)
    .sort((a, b) => a - b);

  if (!valid.length) return 0;
  if (valid.length === 1) return valid[0];

  const p = Math.min(1, Math.max(0, percentile));
  const index = (valid.length - 1) * p;
  const lower = Math.floor(index);
  const upper = Math.ceil(index);

  if (lower === upper) return valid[lower];
  const weight = index - lower;
  return valid[lower] + ((valid[upper] - valid[lower]) * weight);
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function getMaintenancePeriodLabels(dateValue, now = new Date()) {
  const labels = [MAINTENANCE_PERIOD_LABELS.TODOS];
  if (!dateValue) return labels;

  const date = new Date(dateValue);
  if (Number.isNaN(date.getTime())) return labels;

  if (date.getFullYear() === now.getFullYear()) {
    labels.push(MAINTENANCE_PERIOD_LABELS.ANO_ATUAL);
  }

  const diffMs = now.getTime() - date.getTime();
  const diffDays = diffMs / (1000 * 60 * 60 * 24);

  if (diffDays <= 180) labels.push(MAINTENANCE_PERIOD_LABELS.ULTIMOS_180);
  if (diffDays <= 90) labels.push(MAINTENANCE_PERIOD_LABELS.ULTIMOS_90);
  if (diffDays <= 30) labels.push(MAINTENANCE_PERIOD_LABELS.ULTIMOS_30);
  if (diffDays <= 7) labels.push(MAINTENANCE_PERIOD_LABELS.ULTIMOS_7);

  return labels;
}

function getDirectionPeriodLabels(dateValue, now = new Date()) {
  const labels = [DIRECTION_PERIOD_LABELS.TODOS];
  if (!dateValue) return labels;

  const date = new Date(dateValue);
  if (Number.isNaN(date.getTime())) return labels;

  if (date.getFullYear() === now.getFullYear()) {
    labels.push(DIRECTION_PERIOD_LABELS.ANO_ATUAL);
  }

  const diffMs = now.getTime() - date.getTime();
  const diffDays = diffMs / (1000 * 60 * 60 * 24);

  if (diffDays <= 180) labels.push(DIRECTION_PERIOD_LABELS.ULTIMOS_180);
  if (diffDays <= 90) labels.push(DIRECTION_PERIOD_LABELS.ULTIMOS_90);
  if (diffDays <= 30) labels.push(DIRECTION_PERIOD_LABELS.ULTIMOS_30);
  if (diffDays <= 7) labels.push(DIRECTION_PERIOD_LABELS.ULTIMOS_7);

  return labels;
}

function getDirectionTeamNames(item) {
  const teams = [];

  if (String(item?.origemTipo || "").toUpperCase() === "EQUIPE" && item?.origemNome) {
    teams.push(String(item.origemNome).trim());
  }
  if (String(item?.destinoTipo || "").toUpperCase() === "EQUIPE" && item?.destinoNome) {
    teams.push(String(item.destinoNome).trim());
  }

  return teams.filter(Boolean);
}

function polarToCartesian(cx, cy, radius, angleInRadians) {
  return {
    x: cx + radius * Math.cos(angleInRadians),
    y: cy + radius * Math.sin(angleInRadians),
  };
}

function PieChartPanel({
  title,
  data,
  totalLabel,
  totalValue,
  formatter = formatNumber,
  secondaryTotalLabel,
  secondaryTotalValue,
  secondaryFormatter = formatNumber,
  activeKey,
  onSliceClick,
  emptyText = "Sem dados para exibir.",
}) {
  const [internalActiveKey, setInternalActiveKey] = useState("");
  const [modoLupaAtivo, setModoLupaAtivo] = useState(true);
  const normalized = useMemo(() => {
    return (Array.isArray(data) ? data : [])
      .map((item, index) => ({
        ...item,
        key: item?.key ?? `${item?.label ?? "item"}-${index}`,
        label: item?.label ?? "Sem nome",
        value: toPositiveNumber(item?.value),
      }))
      .filter((item) => item.value > 0)
      .sort((a, b) => b.value - a.value || String(a.label).localeCompare(String(b.label), "pt-BR"));
  }, [data]);

  const total = useMemo(() => normalized.reduce((sum, item) => sum + item.value, 0), [normalized]);

  const segments = useMemo(() => {
    if (!normalized.length || total <= 0) return [];

    if (normalized.length === 1) {
      return [
        {
          ...normalized[0],
          color: PIE_COLORS[0],
          full: true,
          usedLupa: false,
        },
      ];
    }

    const fullCircle = Math.PI * 2;
    const rawAngles = normalized.map((item) => (item.value / total) * fullCircle);
    let adjustedAngles = [...rawAngles];

    if (modoLupaAtivo) {
      const minAngle = Math.min(0.16, (fullCircle / normalized.length) * 0.92);
      const tinyIndexes = [];
      const largerIndexes = [];

      adjustedAngles.forEach((angle, index) => {
        if (angle < minAngle) tinyIndexes.push(index);
        else largerIndexes.push(index);
      });

      if (tinyIndexes.length && largerIndexes.length) {
        const deficit = tinyIndexes.reduce((sum, index) => sum + (minAngle - adjustedAngles[index]), 0);
        const reducible = largerIndexes.reduce((sum, index) => sum + (adjustedAngles[index] - minAngle), 0);

        if (reducible > 0) {
          const ratio = Math.min(1, deficit / reducible);

          tinyIndexes.forEach((index) => {
            adjustedAngles[index] = minAngle;
          });

          largerIndexes.forEach((index) => {
            adjustedAngles[index] = adjustedAngles[index] - ((adjustedAngles[index] - minAngle) * ratio);
          });
        }
      }
    }

    let start = -Math.PI / 2;
    return normalized.map((item, index) => {
      const angle = adjustedAngles[index];
      const rawAngle = rawAngles[index];
      const end = start + angle;
      const largeArcFlag = angle > Math.PI ? 1 : 0;
      const startPoint = polarToCartesian(80, 80, 72, start);
      const endPoint = polarToCartesian(80, 80, 72, end);
      const path = [
        `M 80 80`,
        `L ${startPoint.x} ${startPoint.y}`,
        `A 72 72 0 ${largeArcFlag} 1 ${endPoint.x} ${endPoint.y}`,
        "Z",
      ].join(" ");

      const segment = {
        ...item,
        color: PIE_COLORS[index % PIE_COLORS.length],
        path,
        usedLupa: modoLupaAtivo && angle > rawAngle,
      };

      start = end;
      return segment;
    });
  }, [modoLupaAtivo, normalized, total]);

  const isControlled = activeKey !== undefined;
  const selectedKey = isControlled ? activeKey : internalActiveKey;

  useEffect(() => {
    if (!internalActiveKey) return;
    const exists = segments.some((segment) => String(segment.key) === String(internalActiveKey));
    if (!exists) {
      setInternalActiveKey("");
    }
  }, [segments, internalActiveKey]);

  function handleSelect(segment) {
    onSliceClick?.(segment);

    if (!isControlled) {
      setInternalActiveKey((previous) => (String(previous) === String(segment.key) ? "" : segment.key));
    }
  }

  return (
    <article className="gerencial-card">
      <header className="gerencial-card-head">
        <div className="gerencial-card-title-row">
          <h3>{title}</h3>
          <button
            type="button"
            className={`gerencial-lupa-btn ${modoLupaAtivo ? "active" : ""}`}
            onClick={() => setModoLupaAtivo((current) => !current)}
          >
            Lupa {modoLupaAtivo ? "ON" : "OFF"}
          </button>
        </div>
        <div className="gerencial-total-stack">
          <div className="gerencial-total-chip">
            <span>{totalLabel}</span>
            <strong>{formatter(totalValue)}</strong>
          </div>
          {secondaryTotalLabel ? (
            <div className="gerencial-total-chip">
              <span>{secondaryTotalLabel}</span>
              <strong>{secondaryFormatter(secondaryTotalValue)}</strong>
            </div>
          ) : null}
        </div>
      </header>

      {!segments.length ? (
        <div className="operacoes-feedback">{emptyText}</div>
      ) : (
        <div className="gerencial-pie-layout">
          <svg viewBox="0 0 160 160" className="gerencial-pie-svg" role="img" aria-label={title}>
            <circle cx="80" cy="80" r="72" className="gerencial-pie-track" />
            {segments.map((segment) =>
              segment.full ? (
                <circle
                  key={segment.key}
                  cx="80"
                  cy="80"
                  r="72"
                  fill={segment.color}
                  onClick={() => handleSelect(segment)}
                  className={`gerencial-pie-slice ${String(selectedKey) === String(segment.key) ? "active" : ""}`}
                />
              ) : (
                <path
                  key={segment.key}
                  d={segment.path}
                  fill={segment.color}
                  onClick={() => handleSelect(segment)}
                  className={`gerencial-pie-slice ${String(selectedKey) === String(segment.key) ? "active" : ""} ${segment.usedLupa ? "lupa" : ""}`}
                />
              ),
            )}
            <circle cx="80" cy="80" r="38" className="gerencial-pie-center" />
            <text x="80" y="74" textAnchor="middle" className="gerencial-pie-total-label">
              Total
            </text>
            <text x="80" y="92" textAnchor="middle" className="gerencial-pie-total-value">
              {formatNumber(total)}
            </text>
          </svg>

          <div className="gerencial-legend">
            {segments.map((segment) => (
              <button
                key={segment.key}
                type="button"
                className={`gerencial-legend-item ${String(selectedKey) === String(segment.key) ? "active" : ""}`}
                onClick={() => handleSelect(segment)}
              >
                <span className="gerencial-legend-dot" style={{ backgroundColor: segment.color }} />
                <span className="gerencial-legend-text">
                  <strong>{segment.label}</strong>
                  <small>
                    {formatter(segment.value)}
                  </small>
                </span>
              </button>
            ))}
          </div>
        </div>
      )}
    </article>
  );
}

function SimpleBarChartPanel({
  title,
  data,
  formatter = formatNumber,
  emptyText = "Sem dados para exibir.",
}) {
  const normalized = useMemo(() => {
    return (Array.isArray(data) ? data : [])
      .map((item) => ({
        label: item?.label ?? "Sem nome",
        value: toPositiveNumber(item?.value),
      }))
      .filter((item) => item.value > 0)
      .sort((a, b) => b.value - a.value)
      .slice(0, 8);
  }, [data]);

  const maxValue = useMemo(() => {
    return Math.max(1, ...normalized.map((item) => item.value));
  }, [normalized]);

  return (
    <article className="gerencial-card">
      <header className="gerencial-card-head">
        <h3>{title}</h3>
      </header>
      {!normalized.length ? (
        <div className="operacoes-feedback">{emptyText}</div>
      ) : (
        <div className="gerencial-bar-list">
          {normalized.map((item) => {
            const percentual = Math.max(8, Math.round((item.value / maxValue) * 100));
            return (
              <div key={`${title}-${item.label}`} className="gerencial-bar-row">
                <div className="gerencial-bar-meta">
                  <span>{item.label}</span>
                  <strong>{formatter(item.value)}</strong>
                </div>
                <div className="gerencial-bar-track">
                  <div className="gerencial-bar-fill" style={{ width: `${percentual}%` }} />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </article>
  );
}

function EquipmentDirectionHistoryPanel({
  title,
  data,
  totalLabel,
  totalValue,
  secondaryTotalLabel,
  secondaryTotalValue,
  activeKey,
  onSelect,
  emptyText = "Sem historico de direcionamento para exibir.",
}) {
  const normalized = useMemo(() => {
    return (Array.isArray(data) ? data : [])
      .map((item) => ({
        ...item,
        key: item?.key ?? `${item?.label ?? "item"}`,
        label: item?.label ?? "Sem nome",
        value: toPositiveNumber(item?.value),
      }))
      .filter((item) => item.value > 0)
      .sort((a, b) => b.value - a.value || String(a.label).localeCompare(String(b.label), "pt-BR"));
  }, [data]);

  const maxValue = useMemo(() => Math.max(1, ...normalized.map((item) => item.value)), [normalized]);

  return (
    <article className="gerencial-card">
      <header className="gerencial-card-head">
        <div className="gerencial-card-title-row">
          <h3>{title}</h3>
          <div className="gerencial-total-stack">
            <div className="gerencial-total-chip">
              <span>{totalLabel}</span>
              <strong>{formatNumber(totalValue)}</strong>
            </div>
            <div className="gerencial-total-chip">
              <span>{secondaryTotalLabel}</span>
              <strong>{formatNumber(secondaryTotalValue)}</strong>
            </div>
          </div>
        </div>
      </header>

      {!normalized.length ? (
        <div className="operacoes-feedback">{emptyText}</div>
      ) : (
        <div className="gerencial-history-list">
          {normalized.map((item) => {
            const percentual = Math.max(10, Math.round((item.value / maxValue) * 100));
            return (
              <button
                key={item.key}
                type="button"
                className={`gerencial-history-row ${String(activeKey) === String(item.key) ? "active" : ""}`}
                onClick={() => onSelect?.(item)}
              >
                <div className="gerencial-history-row-head">
                  <div className="gerencial-history-row-meta">
                    <strong>{item.nomeEquipamento || item.label}</strong>
                    <span>TAG: {item.tagPatrimonio || "Sem tag"}</span>
                    <small>{item.empresaNome || "Sem empresa"}</small>
                  </div>
                  <strong>{formatNumber(item.value)}</strong>
                </div>
                <div className="gerencial-history-track">
                  <div className="gerencial-history-fill" style={{ width: `${percentual}%` }} />
                </div>
              </button>
            );
          })}
        </div>
      )}
    </article>
  );
}

function EquipmentDirectionTimelinePanel({
  equipamento,
  emptyText = "Selecione um equipamento no grafico para abrir o historico completo de direcionamento.",
}) {
  const eventos = Array.isArray(equipamento?.events) ? equipamento.events : [];
  const equipesCongeladas = new Set();

  eventos.forEach((item) => {
    if (String(item?.origemTipo || "").toUpperCase() === "EQUIPE") {
      equipesCongeladas.add(`${item?.origemReferenciaId || item?.origemNome}-${item?.origemNome}`);
    }
    if (String(item?.destinoTipo || "").toUpperCase() === "EQUIPE") {
      equipesCongeladas.add(`${item?.destinoReferenciaId || item?.destinoNome}-${item?.destinoNome}`);
    }
  });

  return (
    <article className="gerencial-card">
      <header className="gerencial-card-head">
        <div className="gerencial-card-title-row">
          <h3>{equipamento ? `Historico congelado: ${equipamento.nomeEquipamento}` : "Historico congelado"}</h3>
          <div className="gerencial-total-stack">
            <div className="gerencial-total-chip">
              <span>Direcionamentos</span>
              <strong>{formatNumber(eventos.length)}</strong>
            </div>
            <div className="gerencial-total-chip">
              <span>Equipes registradas</span>
              <strong>{formatNumber(equipesCongeladas.size)}</strong>
            </div>
          </div>
        </div>
      </header>

      {!equipamento || !eventos.length ? (
        <div className="operacoes-feedback">{emptyText}</div>
      ) : (
        <div className="gerencial-history-timeline">
          {eventos.map((item, index) => (
            <article key={item.id} className="gerencial-history-event">
              <div className="gerencial-history-event-head">
                <strong>{`${index + 1}. ${formatDirectionAction(item.acao)}`}</strong>
                <span>{formatDateTimeShort(item.dataEvento)}</span>
              </div>

              <div className="gerencial-history-route">
                <div className="gerencial-history-node">
                  <small>{formatDirectionType(item.origemTipo)}</small>
                  <strong>{item.origemNome || "-"}</strong>
                  <span>{item.origemCategoria || "-"}</span>
                </div>
                <span className="gerencial-history-arrow">→</span>
                <div className="gerencial-history-node">
                  <small>{formatDirectionType(item.destinoTipo)}</small>
                  <strong>{item.destinoNome || "-"}</strong>
                  <span>{item.destinoCategoria || "-"}</span>
                </div>
              </div>

              {item.observacao && <p className="gerencial-history-note">{item.observacao}</p>}
            </article>
          ))}
        </div>
      )}
    </article>
  );
}

function MaintenanceColumnChart({
  data,
  totalRegistros,
  totalGasto,
  emptyText = "Sem registros para esse filtro.",
}) {
  const scrollRef = useRef(null);
  const dragStateRef = useRef({
    active: false,
    startX: 0,
    startScrollLeft: 0,
  });

  const normalized = useMemo(() => {
    return (Array.isArray(data) ? data : []).map((item) => ({
      ...item,
      vezes: Number(item?.vezes || 0),
      gastoTotal: toPositiveNumber(item?.gastoTotal),
    }));
  }, [data]);

  const maxVezes = useMemo(() => Math.max(1, ...normalized.map((item) => item.vezes)), [normalized]);
  const maxGasto = useMemo(() => Math.max(1, ...normalized.map((item) => item.gastoTotal)), [normalized]);

  function handleMouseDown(event) {
    const container = scrollRef.current;
    if (!container) return;

    dragStateRef.current.active = true;
    dragStateRef.current.startX = event.clientX;
    dragStateRef.current.startScrollLeft = container.scrollLeft;
  }

  function handleMouseMove(event) {
    const container = scrollRef.current;
    if (!container || !dragStateRef.current.active) return;

    const delta = event.clientX - dragStateRef.current.startX;
    container.scrollLeft = dragStateRef.current.startScrollLeft - delta;
  }

  function stopDragging() {
    dragStateRef.current.active = false;
  }

  return (
    <article className="gerencial-card gerencial-manutencao-card">
      <header className="gerencial-card-head">
        <h3>Manutencao por equipamento</h3>
        <div className="gerencial-total-chip">
          <span>Registros / gasto total</span>
          <strong>{formatNumber(totalRegistros)} | {formatCurrency(totalGasto)}</strong>
        </div>
      </header>

      {!normalized.length ? (
        <div className="operacoes-feedback">{emptyText}</div>
      ) : (
        <>
          <div className="gerencial-manutencao-legend">
            <span className="chip vezes">Coluna azul: quantidade de idas para manutencao</span>
            <span className="chip gasto">Coluna laranja: gasto total do equipamento</span>
            <small>Arraste com o mouse para navegar pelas datas e ver registros antigos.</small>
          </div>

          <div
            ref={scrollRef}
            className="gerencial-manutencao-scroll"
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={stopDragging}
            onMouseLeave={stopDragging}
          >
            <div className="gerencial-manutencao-chart" style={{ width: `${Math.max(800, normalized.length * 126)}px` }}>
              {normalized.map((item) => {
                const heightVezes = Math.max(10, (item.vezes / maxVezes) * 180);
                const heightGasto = item.gastoTotal > 0 ? Math.max(10, (item.gastoTotal / maxGasto) * 180) : 8;
                const title = `${item.nomeEquipamento} | TAG ${item.tagPatrimonio || "Sem tag"} | ${item.vezes}x manutencao | ${formatCurrency(item.gastoTotal)} gasto total`;

                return (
                  <div key={item.key} className="gerencial-manutencao-col-group">
                    <div className="gerencial-manutencao-bars">
                      <div className="gerencial-manutencao-bar vezes" style={{ height: `${heightVezes}px` }} title={title} />
                      <div className="gerencial-manutencao-bar gasto" style={{ height: `${heightGasto}px` }} title={title} />
                    </div>
                    <div className="gerencial-manutencao-col-meta">
                      <strong>{item.nomeEquipamento}</strong>
                      <span>TAG: {item.tagPatrimonio || "Sem tag"}</span>
                      <span>{item.vezes}x</span>
                      <span>{formatCurrency(item.gastoTotal)}</span>
                      <small>{formatDateShort(item.ultimaData)}</small>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </>
      )}
    </article>
  );
}

function FailureDynamicsPanel({
  data,
  totalFalhas,
  totalVM,
  limiarEconomicoGlobal,
  custoMedioGlobal,
  tempoTrocaGlobalMeses,
  emptyText = "Sem historico suficiente para calcular dinamica de falhas.",
}) {
  const normalized = useMemo(() => (Array.isArray(data) ? data : []), [data]);
  const maxLambda = useMemo(() => Math.max(1, ...normalized.map((item) => toPositiveNumber(item?.lambda))), [normalized]);
  const maxAlphaAbs = useMemo(() => Math.max(0.1, ...normalized.map((item) => Math.abs(toFiniteNumber(item?.alpha)))), [normalized]);

  return (
    <article className="gerencial-card gerencial-card-span-2">
      <header className="gerencial-card-head">
        <h3>Dinamica de falhas e custo no tempo</h3>
        <div className="gerencial-total-stack">
          <div className="gerencial-total-chip">
            <span>N(t) acumulado / VM(t)</span>
            <strong>{formatNumber(totalFalhas)} | {formatCurrency(totalVM)}</strong>
          </div>
          <div className="gerencial-total-chip">
            <span>Cmedio / Limiar 30% VE / t_troca</span>
            <strong>
              {formatCurrency(custoMedioGlobal)} | {formatCurrency(limiarEconomicoGlobal)} | {Number.isFinite(tempoTrocaGlobalMeses) ? `${tempoTrocaGlobalMeses.toFixed(1)} meses` : "Sem estimativa"}
            </strong>
          </div>
        </div>
      </header>

      {!normalized.length ? (
        <div className="operacoes-feedback">{emptyText}</div>
      ) : (
        <div className="gerencial-dinamica-list">
          <div className="gerencial-dinamica-legend">
            <span className="chip lambda">lambda(t): taxa de falhas (falhas/mes)</span>
            <span className="chip alpha">alpha(t): aceleracao (delta da taxa)</span>
            <small>N(t) cresce com as falhas acumuladas; VM(t) cresce com o custo acumulado.</small>
          </div>

          {normalized.map((item) => {
            const lambdaWidth = Math.max(4, Math.round((toPositiveNumber(item.lambda) / maxLambda) * 100));
            const alphaWidth = Math.max(4, Math.round((Math.abs(toFiniteNumber(item.alpha)) / maxAlphaAbs) * 48));
            const alphaPositive = toFiniteNumber(item.alpha) >= 0;

            return (
              <div key={item.key} className="gerencial-dinamica-row">
                <div className="gerencial-dinamica-meta">
                  <strong>{item.label}</strong>
                  <span>N(t): {formatNumber(item.nAcumulado)}</span>
                  <span>VM(t): {formatCurrency(item.vmAcumulado)}</span>
                </div>

                <div className="gerencial-dinamica-track-wrap">
                  <div className="gerencial-dinamica-track">
                    <div className="gerencial-dinamica-fill lambda" style={{ width: `${lambdaWidth}%` }} />
                  </div>
                  <small>lambda(t) = {toFiniteNumber(item.lambda).toFixed(2)}</small>
                </div>

                <div className="gerencial-dinamica-track-wrap">
                  <div className="gerencial-alpha-track">
                    <div className="gerencial-alpha-axis" />
                    <div
                      className={`gerencial-alpha-fill ${alphaPositive ? "up" : "down"}`}
                      style={alphaPositive ? { left: "50%", width: `${alphaWidth}%` } : { right: "50%", width: `${alphaWidth}%` }}
                    />
                  </div>
                  <small>
                    alpha(t) = {formatSigned(item.alpha)} ({trendLabel(item.alpha)})
                  </small>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </article>
  );
}

function EconomicThresholdPanel({
  data,
  emptyText = "Sem dados economicos para comparar VM(t) com VE.",
}) {
  const normalized = useMemo(() => {
    return (Array.isArray(data) ? data : [])
      .map((item) => ({
        ...item,
        vmVeRatio: toFiniteNumber(item?.vmVeRatio),
      }))
      .sort((a, b) => b.vmVeRatio - a.vmVeRatio || String(a.nomeEquipamento).localeCompare(String(b.nomeEquipamento), "pt-BR"))
      .slice(0, 12);
  }, [data]);

  return (
    <article className="gerencial-card">
      <header className="gerencial-card-head">
        <h3>Criterio economico de substituicao</h3>
        <div className="gerencial-total-chip">
          <span>Regra: VM(t) {">="} 30% de VE</span>
          <strong>Limiar de troca por equipamento</strong>
        </div>
      </header>

      {!normalized.length ? (
        <div className="operacoes-feedback">{emptyText}</div>
      ) : (
        <div className="gerencial-threshold-list">
          {normalized.map((item) => {
            const ratioPercent = toFiniteNumber(item.vmVeRatio) * 100;
            const fillWidth = Math.min(100, Math.max(3, ratioPercent));
            const excedente = Math.max(0, ratioPercent - 100);
            const status = item.deveSubstituir ? "Substituir" : item.indiceCriticidade >= 2 ? "Alerta" : "Monitorar";

            return (
              <div key={item.key} className="gerencial-threshold-row">
                <div className="gerencial-threshold-meta">
                  <strong>{item.nomeEquipamento}</strong>
                  <span>TAG: {item.tagPatrimonio || "Sem tag"}</span>
                  <span>VM: {formatCurrency(item.vm)}</span>
                  <span>VE: {formatCurrency(item.ve)}</span>
                </div>

                <div className="gerencial-threshold-main">
                  <div className="gerencial-threshold-track">
                    <span className="gerencial-threshold-marker" style={{ left: `${ECONOMIC_REPLACEMENT_THRESHOLD * 100}%` }} />
                    <span className={`gerencial-threshold-fill ${item.deveSubstituir ? "danger" : "ok"}`} style={{ width: `${fillWidth}%` }} />
                  </div>
                  <div className="gerencial-threshold-foot">
                    <small>{formatPercent(ratioPercent)} do VE (limite: {formatPercent(ECONOMIC_REPLACEMENT_THRESHOLD * 100)})</small>
                    <small className={`gerencial-chip-status ${item.deveSubstituir ? "danger" : "neutral"}`}>{status}</small>
                    {excedente > 0 ? <small>Excedente: {formatPercent(excedente)}</small> : null}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </article>
  );
}

function CriticalIndicatorsPanel({
  data,
  emptyText = "Sem equipamentos com dados suficientes para classificacao de criticidade.",
}) {
  const normalized = useMemo(() => {
    return (Array.isArray(data) ? data : [])
      .sort((a, b) => b.indiceCriticidade - a.indiceCriticidade || b.vmVeRatio - a.vmVeRatio)
      .slice(0, 10);
  }, [data]);

  return (
    <article className="gerencial-card">
      <header className="gerencial-card-head">
        <h3>Indicadores criticos para troca</h3>
        <div className="gerencial-total-chip">
          <span>Regras avaliadas</span>
          <strong>Falhas, alpha, VM e limite economico</strong>
        </div>
      </header>

      {!normalized.length ? (
        <div className="operacoes-feedback">{emptyText}</div>
      ) : (
        <div className="gerencial-critical-list">
          {normalized.map((item) => {
            const decisao = item.deveSubstituir
              ? "Substituir agora"
              : item.indiceCriticidade >= 3
                ? "Planejar troca"
                : item.alpha > 0
                  ? "Acompanhar de perto"
                  : "Estavel";

            return (
              <div key={`crit-${item.key}`} className="gerencial-critical-row">
                <div className="gerencial-critical-main">
                  <strong>{item.nomeEquipamento}</strong>
                  <small>TAG: {item.tagPatrimonio || "Sem tag"}</small>
                </div>
                <div className="gerencial-critical-metrics">
                  <span>FF: {formatPercent(item.ff * 100, 1)}</span>
                  <span>lambda: {toFiniteNumber(item.lambdaMes).toFixed(2)}/mes</span>
                  <span>alpha: {formatSigned(item.alpha)}</span>
                  <span>VM/VE: {formatPercent(item.vmVeRatio * 100, 1)}</span>
                  <span>Cmedio: {formatCurrency(item.cmedioMes)}</span>
                  <span>t_troca: {Number.isFinite(item.tempoTrocaMeses) ? `${item.tempoTrocaMeses.toFixed(1)} meses` : "n/a"}</span>
                </div>
                <div className="gerencial-critical-flags">
                  {item.falhasEscalada ? <small className="gerencial-flag">Falhas em escalada</small> : null}
                  {item.alpha > 0 ? <small className="gerencial-flag">alpha {">"} 0</small> : null}
                  {item.vmCrescimentoRapido ? <small className="gerencial-flag">VM crescendo rapido</small> : null}
                  {item.deveSubstituir ? <small className="gerencial-flag danger">VM {">="} 30% VE</small> : null}
                  <small className={`gerencial-chip-status ${item.deveSubstituir ? "danger" : "neutral"}`}>{decisao}</small>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </article>
  );
}

function SpendingByPeriodPanel({
  dataByPeriod,
  periodoAtivo,
  onPeriodoChange,
  emptyText = "Sem gastos registrados para os equipamentos selecionados.",
}) {
  const periodoSelecionado = SPENDING_WINDOWS[periodoAtivo] ? periodoAtivo : "SEMANA";
  const periodos = Object.keys(SPENDING_WINDOWS);
  const dadosAtivos = dataByPeriod?.[periodoSelecionado] || { total: 0, limiteAlto: 0, top: [], highSpenders: [] };

  return (
    <article className="gerencial-card gerencial-card-span-2">
      <header className="gerencial-card-head">
        <h3>Gasto alto por semana, mes e ano</h3>
        <div className="gerencial-total-stack">
          <div className="gerencial-total-chip">
            <span>Periodo ativo</span>
            <strong>{SPENDING_WINDOWS[periodoSelecionado].label}</strong>
          </div>
          <div className="gerencial-total-chip">
            <span>Total / Limite alto (P75)</span>
            <strong>{formatCurrency(dadosAtivos.total)} | {formatCurrency(dadosAtivos.limiteAlto)}</strong>
          </div>
        </div>
      </header>

      <div className="gerencial-period-switch">
        {periodos.map((periodo) => (
          <button
            key={periodo}
            type="button"
            className={`gerencial-period-btn ${periodoSelecionado === periodo ? "active" : ""}`}
            onClick={() => onPeriodoChange?.(periodo)}
          >
            {SPENDING_WINDOWS[periodo].label}
          </button>
        ))}
      </div>

      {!dadosAtivos.top.length ? (
        <div className="operacoes-feedback">{emptyText}</div>
      ) : (
        <div className="gerencial-spending-grid">
          <div className="gerencial-spending-list">
            {dadosAtivos.top.map((item) => {
              const width = Math.max(6, Math.round((toPositiveNumber(item.value) / Math.max(1, dadosAtivos.top[0]?.value || 1)) * 100));
              const high = toPositiveNumber(item.value) >= toPositiveNumber(dadosAtivos.limiteAlto);

              return (
                <div key={`spend-${periodoSelecionado}-${item.key}`} className="gerencial-spending-row">
                  <div className="gerencial-spending-meta">
                    <strong>{item.label}</strong>
                    <span>TAG: {item.tagPatrimonio || "Sem tag"}</span>
                    <span>{formatCurrency(item.value)}</span>
                  </div>
                  <div className="gerencial-spending-track">
                    <span className={`gerencial-spending-fill ${high ? "high" : ""}`} style={{ width: `${width}%` }} />
                  </div>
                </div>
              );
            })}
          </div>

          <div className="gerencial-spending-highlight">
            <h4>Equipamentos gastando muito ({SPENDING_WINDOWS[periodoSelecionado].label})</h4>
            {!dadosAtivos.highSpenders.length ? (
              <p>Nenhum equipamento acima do limite dinamico neste periodo.</p>
            ) : (
              <ul>
                {dadosAtivos.highSpenders.map((item) => (
                  <li key={`high-${periodoSelecionado}-${item.key}`}>
                    <strong>{item.label}</strong> - {formatCurrency(item.value)}
                  </li>
                ))}
              </ul>
            )}
            <small>Limite dinamico: percentil 75 dos equipamentos filtrados.</small>
          </div>
        </div>
      )}
    </article>
  );
}

function ExponentialForecastPanel({
  data,
  emptyText = "Sem dados suficientes para projeção exponencial de custo.",
}) {
  const normalized = useMemo(() => {
    return (Array.isArray(data) ? data : [])
      .sort((a, b) => {
        const ta = Number.isFinite(a.tempoAtingirVeExpMeses) ? a.tempoAtingirVeExpMeses : Number.POSITIVE_INFINITY;
        const tb = Number.isFinite(b.tempoAtingirVeExpMeses) ? b.tempoAtingirVeExpMeses : Number.POSITIVE_INFINITY;
        return ta - tb || b.vmVeRatio - a.vmVeRatio || b.vm - a.vm;
      })
      .slice(0, 8);
  }, [data]);

  return (
    <article className="gerencial-card gerencial-card-span-2">
      <header className="gerencial-card-head">
        <h3>Previsao exponencial ate atingir VE</h3>
        <div className="gerencial-total-chip">
          <span>Base: aceleracao de custo manutencao</span>
          <strong>VM(t) previsto por equipamento filtrado</strong>
        </div>
      </header>

      {!normalized.length ? (
        <div className="operacoes-feedback">{emptyText}</div>
      ) : (
        <div className="gerencial-forecast-list">
          {normalized.map((item) => {
            const values = Array.isArray(item.projecaoCustoValores) && item.projecaoCustoValores.length >= 2
              ? item.projecaoCustoValores
              : [toPositiveNumber(item.vm), toPositiveNumber(item.vm)];

            const width = 240;
            const height = 90;
            const padding = 10;
            const innerWidth = width - (padding * 2);
            const innerHeight = height - (padding * 2);
            const maxValue = Math.max(1, toPositiveNumber(item.ve), ...values.map((value) => toPositiveNumber(value)));
            const points = values.map((value, index) => {
              const x = padding + ((values.length <= 1 ? 0 : index / (values.length - 1)) * innerWidth);
              const y = height - padding - ((toPositiveNumber(value) / maxValue) * innerHeight);
              return { x, y };
            });
            const path = points
              .map((point, index) => `${index === 0 ? "M" : "L"} ${point.x.toFixed(2)} ${point.y.toFixed(2)}`)
              .join(" ");
            const veY = height - padding - ((toPositiveNumber(item.ve) / maxValue) * innerHeight);
            const tempoHit = item.tempoAtingirVeExpMeses;
            const statusTexto = !Number.isFinite(tempoHit)
              ? "Sem previsao de atingimento"
              : tempoHit <= 0
                ? "Ja atingiu o VE"
                : `Atinge VE em ~${tempoHit.toFixed(1)} meses`;
            const altaAceleracao = toFiniteNumber(item.aceleracaoCustoMes) > 0;

            return (
              <div key={`forecast-${item.key}`} className="gerencial-forecast-row">
                <div className="gerencial-forecast-meta">
                  <strong>{item.nomeEquipamento}</strong>
                  <span>TAG: {item.tagPatrimonio || "Sem tag"}</span>
                  <span>VM atual: {formatCurrency(item.vm)}</span>
                  <span>VE: {formatCurrency(item.ve)}</span>
                  <span>k exp: {toFiniteNumber(item.taxaExpCustoMes).toFixed(3)} /mes</span>
                  <span>aceleracao: {formatCurrency(item.aceleracaoCustoMes)} /janela</span>
                  <small className={`gerencial-chip-status ${altaAceleracao ? "danger" : "neutral"}`}>{statusTexto}</small>
                </div>

                <div className="gerencial-forecast-chart-wrap">
                  <svg viewBox={`0 0 ${width} ${height}`} className="gerencial-forecast-svg" role="img" aria-label={`Previsao de custo para ${item.nomeEquipamento}`}>
                    <line x1={padding} y1={veY} x2={width - padding} y2={veY} className="gerencial-forecast-ve-line" />
                    <path d={path} className={`gerencial-forecast-path ${item.modeloProjecao === "LINEAR" ? "linear" : "exp"}`} />
                    <circle cx={points[0]?.x || padding} cy={points[0]?.y || (height - padding)} r="2.8" className="gerencial-forecast-point-current" />
                  </svg>
                  <small>
                    Horizonte: {toFiniteNumber(item.horizonteProjecaoMeses).toFixed(0)} meses | Modelo: {item.modeloProjecao === "LINEAR" ? "Linear (fallback)" : "Exponencial"}
                  </small>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </article>
  );
}

export default function RelatoriosGerencial() {
  const { usuario } = useContext(AuthContext);
  const [estoques, setEstoques] = useState([]);
  const [historicoDirecionamentos, setHistoricoDirecionamentos] = useState([]);
  const [manutencoes, setManutencoes] = useState([]);
  const [equipes, setEquipes] = useState([]);
  const [usuarios, setUsuarios] = useState([]);
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState("");
  const [graficoAtivo, setGraficoAtivo] = useState("EQUIPAMENTOS");
  const [equipamentosSubTelaAtiva, setEquipamentosSubTelaAtiva] = useState("RESUMO");
  const [equipamentoNomeSelecionadoKey, setEquipamentoNomeSelecionadoKey] = useState("");
  const [equipamentoHistoricoSelecionadoKey, setEquipamentoHistoricoSelecionadoKey] = useState("");
  const [historicoFiltrosCascata, setHistoricoFiltrosCascata] = useState({
    periodo: [],
    equipamento: [],
    tag: [],
    equipe: [],
  });
  const [manutencaoFiltrosCascata, setManutencaoFiltrosCascata] = useState({
    periodo: [],
    equipamento: [],
    equipeUltima: [],
    tag: [],
    status: [],
    manutencaoAgora: [],
  });
  const [custosFiltrosCascata, setCustosFiltrosCascata] = useState({
    periodo: [],
    equipamento: [],
    equipeUltima: [],
    tag: [],
    status: [],
    manutencaoAgora: [],
  });
  const [custoPeriodoAtivo, setCustoPeriodoAtivo] = useState("SEMANA");
  const [legendaCustosAberta, setLegendaCustosAberta] = useState(false);

  const tipoCategoriaUsuario = normalizeUserRole(
    usuario?.tipoCategoria?.nome
    || usuario?.tipoCategoria
    || usuario?.tipo_categoria
    || usuario?.tipoUsuario
    || "",
  );
  const podeAcessarAnaliseCustos = isDeveloperEquivalentRole(tipoCategoriaUsuario);

  useEffect(() => {
    if (podeAcessarAnaliseCustos) return;
    if (graficoAtivo !== "CUSTOS") return;
    setGraficoAtivo("EQUIPAMENTOS");
  }, [podeAcessarAnaliseCustos, graficoAtivo]);

  useEffect(() => {
    async function fetchDadosGerenciais() {
      setLoading(true);
      setErro("");

      try {
        const [estoquesResult, historicoResult, manutencoesResult, equipesResult, usuariosResult] = await Promise.allSettled([
          api.get("/api/estoques"),
          api.get("/api/historico-direcionamentos"),
          api.get("/api/manutencoes"),
          api.get("/api/equipes"),
          api.get("/api/usuarios"),
        ]);

        if (estoquesResult.status !== "fulfilled") {
          throw estoquesResult.reason;
        }

        setEstoques(Array.isArray(estoquesResult.value) ? estoquesResult.value : []);
        setHistoricoDirecionamentos(historicoResult.status === "fulfilled" && Array.isArray(historicoResult.value) ? historicoResult.value : []);
        setManutencoes(manutencoesResult.status === "fulfilled" && Array.isArray(manutencoesResult.value) ? manutencoesResult.value : []);
        setEquipes(equipesResult.status === "fulfilled" && Array.isArray(equipesResult.value) ? equipesResult.value : []);
        setUsuarios(usuariosResult.status === "fulfilled" && Array.isArray(usuariosResult.value) ? usuariosResult.value : []);
      } catch (errorFetch) {
        setErro(errorFetch.message || "Erro ao buscar relatorios gerenciais.");
      } finally {
        setLoading(false);
      }
    }

    fetchDadosGerenciais();
  }, []);

  const equipamentosUnicos = useMemo(() => {
    return (Array.isArray(estoques) ? estoques : [])
      .filter((item) => item?.id != null);
  }, [estoques]);

  const equipamentoNomeData = useMemo(() => {
    const grouped = new Map();

    equipamentosUnicos.forEach((item) => {
      const nome = String(item?.nomeEquipamento || "Sem nome").trim() || "Sem nome";
      const key = normalizeGroupKey(nome);
      const valorUnitario = toPositiveNumber(item?.valorUnitario);
      const entry = grouped.get(key) || { key, label: nome, value: 0, equipamentos: [] };
      entry.value += valorUnitario;
      entry.equipamentos.push(item);
      grouped.set(key, entry);
    });

    return Array.from(grouped.values()).sort((a, b) => b.value - a.value || a.label.localeCompare(b.label, "pt-BR"));
  }, [equipamentosUnicos]);

  const somaValoresUnitariosTotal = useMemo(() => {
    return equipamentoNomeData.reduce((sum, item) => sum + toPositiveNumber(item.value), 0);
  }, [equipamentoNomeData]);

  useEffect(() => {
    if (!equipamentoNomeData.length) {
      setEquipamentoNomeSelecionadoKey("");
      return;
    }

    setEquipamentoNomeSelecionadoKey((anterior) => {
      if (equipamentoNomeData.some((item) => String(item.key) === String(anterior))) {
        return anterior;
      }
      return equipamentoNomeData[0].key;
    });
  }, [equipamentoNomeData]);

  const equipamentoSelecionado = useMemo(() => {
    return equipamentoNomeData.find((item) => String(item.key) === String(equipamentoNomeSelecionadoKey)) || null;
  }, [equipamentoNomeData, equipamentoNomeSelecionadoKey]);

  const equipamentoTagData = useMemo(() => {
    if (!equipamentoSelecionado) return [];

    return equipamentoSelecionado.equipamentos
      .map((item) => {
        const tag = String(item?.tagPatrimonio || "Sem tag").trim() || "Sem tag";
        return {
          key: `${item.id}-${tag}`,
          label: tag,
          value: toPositiveNumber(item?.valorUnitario),
        };
      })
      .sort((a, b) => b.value - a.value || a.label.localeCompare(b.label, "pt-BR"));
  }, [equipamentoSelecionado]);

  const somaValoresSelecionado = useMemo(() => {
    return equipamentoTagData.reduce((sum, item) => sum + toPositiveNumber(item.value), 0);
  }, [equipamentoTagData]);

  const historicoDefinicoesFiltro = useMemo(() => ([
    {
      id: "periodo",
      label: "Data periodo",
      getValue: (item) => getDirectionPeriodLabels(item?.dataEvento),
    },
    {
      id: "equipamento",
      label: "Equipamento",
      getValue: (item) => item?.nomeEquipamento,
    },
    {
      id: "tag",
      label: "TAG",
      getValue: (item) => item?.tagPatrimonio,
    },
    {
      id: "equipe",
      label: "Nome equipe",
      getValue: (item) => getDirectionTeamNames(item),
    },
  ]), []);

  const historicoDirecionamentosFiltrados = useMemo(() => {
    return filterRowsByCascade(historicoDirecionamentos, historicoDefinicoesFiltro, historicoFiltrosCascata);
  }, [historicoDefinicoesFiltro, historicoDirecionamentos, historicoFiltrosCascata]);

  const equipamentoDirecionamentoData = useMemo(() => {
    const grouped = new Map();

    (Array.isArray(historicoDirecionamentosFiltrados) ? historicoDirecionamentosFiltrados : []).forEach((item, index) => {
      const equipamentoId = item?.equipamentoId ?? `sem-id-${index}`;
      const nomeEquipamento = String(item?.nomeEquipamento || "Sem nome").trim() || "Sem nome";
      const tagPatrimonio = String(item?.tagPatrimonio || "Sem tag").trim() || "Sem tag";
      const key = `${equipamentoId}-${normalizeGroupKey(nomeEquipamento)}-${normalizeGroupKey(tagPatrimonio)}`;
      const atual = grouped.get(key) || {
        key,
        label: `${nomeEquipamento} (${tagPatrimonio})`,
        nomeEquipamento,
        tagPatrimonio,
        empresaNome: item?.empresaNome || "Sem empresa",
        valorUnitario: toPositiveNumber(item?.valorUnitario),
        value: 0,
        events: [],
      };

      atual.value += 1;
      atual.events.push(item);
      grouped.set(key, atual);
    });

    return Array.from(grouped.values())
      .map((item) => ({
        ...item,
        events: [...item.events].sort((a, b) => new Date(b?.dataEvento || 0).getTime() - new Date(a?.dataEvento || 0).getTime()),
      }))
      .sort((a, b) => b.value - a.value || a.nomeEquipamento.localeCompare(b.nomeEquipamento, "pt-BR"));
  }, [historicoDirecionamentosFiltrados]);

  const totalDirecionamentosRegistrados = useMemo(() => {
    return equipamentoDirecionamentoData.reduce((sum, item) => sum + toPositiveNumber(item.value), 0);
  }, [equipamentoDirecionamentoData]);

  useEffect(() => {
    if (!equipamentoDirecionamentoData.length) {
      setEquipamentoHistoricoSelecionadoKey("");
      return;
    }

    setEquipamentoHistoricoSelecionadoKey((anterior) => {
      if (equipamentoDirecionamentoData.some((item) => String(item.key) === String(anterior))) {
        return anterior;
      }
      return equipamentoDirecionamentoData[0].key;
    });
  }, [equipamentoDirecionamentoData]);

  const equipamentoHistoricoSelecionado = useMemo(() => {
    return equipamentoDirecionamentoData.find((item) => String(item.key) === String(equipamentoHistoricoSelecionadoKey)) || null;
  }, [equipamentoDirecionamentoData, equipamentoHistoricoSelecionadoKey]);

  async function exportarHistoricoDirecionamentoPdf() {
    const equipamentoSelecionado = equipamentoHistoricoSelecionado;
    const eventos = Array.isArray(equipamentoSelecionado?.events) ? equipamentoSelecionado.events : [];

    if (!equipamentoSelecionado || !eventos.length) {
      window.alert("Nenhum historico filtrado para exportar.");
      return;
    }

    const doc = new jsPDF("p", "mm", "a4");
    const logoBase64 = await carregarImagemBase64(logoEmpresas);
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const filtrosAtivos = [
      ...(historicoFiltrosCascata.periodo || []).map((item) => `Periodo: ${item}`),
      ...(historicoFiltrosCascata.equipamento || []).map((item) => `Equipamento: ${item}`),
      ...(historicoFiltrosCascata.tag || []).map((item) => `TAG: ${item}`),
      ...(historicoFiltrosCascata.equipe || []).map((item) => `Equipe: ${item}`),
    ];
    const resumoExportacao = `Resumo: Direcionamentos ${formatNumber(eventos.length)} | Equipes registradas ${formatNumber(new Set(eventos.flatMap((item) => getDirectionTeamNames(item))).size)}`;
    const linhasFiltros = doc.splitTextToSize(
      filtrosAtivos.length ? filtrosAtivos.join("  |  ") : "Nenhum filtro aplicado",
      pageWidth - 28,
    );
    const inicioTabela = 40 + (linhasFiltros.length * 4);

    const desenharFundo = () => {
      doc.setFillColor(215, 218, 220);
      doc.rect(0, 0, pageWidth, pageHeight, "F");
    };

    const desenharLogoCabecalho = () => {
      const margemDireita = 10;
      const topoLogo = 7;
      const maxLogoWidth = 46;
      const maxLogoHeight = 18;
      const proporcaoLogo = 920 / 565;

      let logoWidth = maxLogoWidth;
      let logoHeight = logoWidth / proporcaoLogo;

      if (logoHeight > maxLogoHeight) {
        logoHeight = maxLogoHeight;
        logoWidth = logoHeight * proporcaoLogo;
      }

      const posX = pageWidth - margemDireita - logoWidth;
      const posY = topoLogo + (maxLogoHeight - logoHeight) / 2;

      doc.addImage(logoBase64, "PNG", posX, posY, logoWidth, logoHeight, undefined, "NONE");
    };

    const desenharHeader = () => {
      doc.setFont("times", "bold");
      doc.setFontSize(18);
      doc.setTextColor(0, 0, 0);
      doc.text("RELATORIO DE DIRECIONAMENTO", pageWidth / 2, 12, { align: "center" });

      doc.setFont("helvetica", "normal");
      doc.setFontSize(10);
      doc.text(`Gerado em: ${new Date().toLocaleString()}`, 14, 18);
      doc.text(`Equipamento: ${equipamentoSelecionado.nomeEquipamento || "-"} | TAG: ${equipamentoSelecionado.tagPatrimonio || "Sem tag"}`, 14, 24);
      doc.text(resumoExportacao, 14, 30);

      doc.setFont("helvetica", "bold");
      doc.setFontSize(11);
      doc.text("Filtros Aplicados:", 14, 35);

      doc.setFont("helvetica", "normal");
      doc.setFontSize(9);
      doc.text(linhasFiltros, 14, 40);
    };

    const dados = eventos.map((item, index) => [
      String(index + 1),
      formatDateTimeShort(item?.dataEvento),
      formatDirectionAction(item?.acao),
      `${formatDirectionType(item?.origemTipo)}: ${item?.origemNome || "-"}`,
      `${formatDirectionType(item?.destinoTipo)}: ${item?.destinoNome || "-"}`,
      item?.observacao || "-",
    ]);

    autoTable(doc, {
      startY: inicioTabela,
      head: [["#", "Data", "Acao", "Origem", "Destino", "Observacao"]],
      body: dados,
      willDrawPage: () => {
        desenharFundo();
      },
      headStyles: {
        fillColor: [158, 204, 93],
        textColor: [0, 0, 0],
        halign: "center",
      },
      bodyStyles: {
        fillColor: [233, 241, 222],
        textColor: [0, 0, 0],
        halign: "center",
      },
      alternateRowStyles: {
        fillColor: [225, 235, 212],
      },
      styles: {
        fontSize: 8,
        lineColor: [120, 120, 120],
        lineWidth: 0.15,
        cellPadding: 2,
      },
      margin: { top: 38, bottom: 16 },
    });

    const totalPaginas = doc.getNumberOfPages();

    for (let paginaAtual = 1; paginaAtual <= totalPaginas; paginaAtual += 1) {
      doc.setPage(paginaAtual);
      desenharLogoCabecalho();
      desenharHeader();
      doc.setFont("helvetica", "normal");
      doc.setFontSize(10);
      doc.text(`Pagina ${paginaAtual} de ${totalPaginas}`, pageWidth - 14, pageHeight - 6, { align: "right" });
    }

    window.open(doc.output("bloburl"), "_blank");
  }

  const manutencaoDefinicoesFiltro = useMemo(() => ([
    {
      id: "periodo",
      label: "Periodo",
      getValue: (item) => getMaintenancePeriodLabels(item?.dataEntrada || item?.dataSaida),
    },
    {
      id: "equipamento",
      label: "Equipamentos em manutencao",
      getValue: (item) => item?.equipamento?.nomeEquipamento,
    },
    {
      id: "equipeUltima",
      label: "Ultima equipe",
      getValue: (item) => item?.equipeUltima?.nome || item?.equipamento?.equipeResponsavel?.nome || item?.equipamento?.equipe?.nome,
    },
    {
      id: "tag",
      label: "Tags",
      getValue: (item) => item?.equipamento?.tagPatrimonio,
    },
    {
      id: "status",
      label: "Status",
      getValue: (item) => formatMaintenanceStatus(item?.status),
    },
    {
      id: "manutencaoAgora",
      label: "Em manutencao agora",
      getValue: (item) => (String(item?.status || "").toUpperCase() === "PENDENTE" ? "Sim" : "Nao"),
    },
  ]), []);

  const manutencoesBaseComEquip = useMemo(() => {
    return manutencoes.filter((item) => item?.equipamento?.id != null);
  }, [manutencoes]);

  const manutencoesFiltradasNoGerencial = useMemo(() => {
    return filterRowsByCascade(manutencoesBaseComEquip, manutencaoDefinicoesFiltro, manutencaoFiltrosCascata);
  }, [manutencoesBaseComEquip, manutencaoDefinicoesFiltro, manutencaoFiltrosCascata]);

  const manutencoesFiltradasParaCustos = useMemo(() => {
    return filterRowsByCascade(manutencoesBaseComEquip, manutencaoDefinicoesFiltro, custosFiltrosCascata);
  }, [manutencoesBaseComEquip, manutencaoDefinicoesFiltro, custosFiltrosCascata]);

  const manutencaoGraficoColunasData = useMemo(() => {
    const grouped = new Map();

    manutencoesFiltradasNoGerencial.forEach((item) => {
      const equipamento = item?.equipamento;
      if (!equipamento?.id) return;

      const key = String(equipamento.id);
      const atual = grouped.get(key) || {
        key,
        nomeEquipamento: equipamento?.nomeEquipamento || "Sem nome",
        tagPatrimonio: equipamento?.tagPatrimonio || "",
        vezes: 0,
        gastoTotal: 0,
        ultimaData: null,
      };

      atual.vezes += 1;
      atual.gastoTotal += toPositiveNumber(item?.valorTotal);

      const dataRef = item?.dataEntrada || item?.dataSaida;
      if (dataRef) {
        if (!atual.ultimaData || new Date(dataRef) > new Date(atual.ultimaData)) {
          atual.ultimaData = dataRef;
        }
      }

      grouped.set(key, atual);
    });

    return Array.from(grouped.values()).sort((a, b) => {
      const ta = a.ultimaData ? new Date(a.ultimaData).getTime() : 0;
      const tb = b.ultimaData ? new Date(b.ultimaData).getTime() : 0;
      return ta - tb || a.nomeEquipamento.localeCompare(b.nomeEquipamento, "pt-BR", { sensitivity: "base" });
    });
  }, [manutencoesFiltradasNoGerencial]);

  const manutencaoTotalVezesFiltrado = useMemo(() => {
    return manutencaoGraficoColunasData.reduce((sum, item) => sum + item.vezes, 0);
  }, [manutencaoGraficoColunasData]);

  const manutencaoTotalGastoFiltrado = useMemo(() => {
    return manutencaoGraficoColunasData.reduce((sum, item) => sum + item.gastoTotal, 0);
  }, [manutencaoGraficoColunasData]);

  const equipamentoValorMap = useMemo(() => {
    const map = new Map();
    equipamentosUnicos.forEach((item) => {
      if (item?.id == null) return;
      map.set(String(item.id), toPositiveNumber(item?.valorUnitario));
    });
    return map;
  }, [equipamentosUnicos]);

  const custoModeloPorEquipamento = useMemo(() => {
    const grouped = new Map();

    manutencoesFiltradasParaCustos.forEach((item) => {
      const equipamento = item?.equipamento;
      if (equipamento?.id == null) return;

      const key = String(equipamento.id);
      const atual = grouped.get(key) || {
        key,
        equipamentoId: equipamento.id,
        nomeEquipamento: equipamento?.nomeEquipamento || "Sem nome",
        tagPatrimonio: equipamento?.tagPatrimonio || "",
        nFalhas: 0,
        vm: 0,
        ve: 0,
        datasFalhas: [],
        registrosCustos: [],
      };

      atual.nFalhas += 1;
      const valorManutencao = toPositiveNumber(item?.valorTotal);
      atual.vm += valorManutencao;

      const veRegistro = toPositiveNumber(item?.valorUnitarioEquipamento);
      const veEquipamento = toPositiveNumber(equipamento?.valorUnitario);
      const veMapa = toPositiveNumber(equipamentoValorMap.get(key));
      atual.ve = Math.max(atual.ve, veRegistro, veEquipamento, veMapa);

      const dataFalha = getMaintenanceReferenceDate(item);
      if (dataFalha) {
        atual.datasFalhas.push(dataFalha);
        atual.registrosCustos.push({ date: dataFalha, valor: valorManutencao });
      }

      grouped.set(key, atual);
    });

    const now = new Date();
    const millisPerDay = 1000 * 60 * 60 * 24;
    const cutoffRecent = now.getTime() - (RATE_WINDOW_DAYS * millisPerDay);
    const cutoffPrevious = now.getTime() - ((RATE_WINDOW_DAYS * 2) * millisPerDay);
    const cutoffOlder = now.getTime() - ((RATE_WINDOW_DAYS * 3) * millisPerDay);

    return Array.from(grouped.values())
      .map((item) => {
        const datasOrdenadas = [...item.datasFalhas].sort((a, b) => a.getTime() - b.getTime());
        const primeiraData = datasOrdenadas[0] || now;
        const ultimaData = datasOrdenadas[datasOrdenadas.length - 1] || now;
        const dataFim = ultimaData > now ? ultimaData : now;

        const elapsedDays = Math.max(1, Math.ceil((dataFim.getTime() - primeiraData.getTime()) / millisPerDay));
        const elapsedMonths = Math.max(1, elapsedDays / RATE_WINDOW_DAYS);
        const lambdaMes = item.nFalhas / elapsedMonths;
        const ff = Math.exp(-lambdaMes);

        let falhasRecentes = 0;
        let falhasJanelaAnterior = 0;
        let falhasJanelaMaisAntiga = 0;

        datasOrdenadas.forEach((date) => {
          const time = date.getTime();
          if (time >= cutoffRecent) {
            falhasRecentes += 1;
            return;
          }

          if (time >= cutoffPrevious) {
            falhasJanelaAnterior += 1;
            return;
          }

          if (time >= cutoffOlder) {
            falhasJanelaMaisAntiga += 1;
          }
        });

        const lambdaRecente = falhasRecentes;
        const lambdaAnterior = falhasJanelaAnterior;
        const alpha = lambdaRecente - lambdaAnterior;

        const vm = toPositiveNumber(item.vm);
        const ve = toPositiveNumber(item.ve);
        const vmc = item.nFalhas > 0 ? vm / item.nFalhas : 0;
        const limiarTroca = ve * ECONOMIC_REPLACEMENT_THRESHOLD;
        const vmVeRatio = ve > 0 ? vm / ve : 0;
        const cmedioMes = vm / elapsedMonths;
        const tempoTrocaMeses = cmedioMes > 0 ? limiarTroca / cmedioMes : Number.POSITIVE_INFINITY;

        const falhasEscalada = falhasRecentes > falhasJanelaAnterior && falhasJanelaAnterior > falhasJanelaMaisAntiga;
        const vmCrescimentoRapido = ve > 0 && cmedioMes >= (ve * 0.03);
        const deveSubstituir = ve > 0 && vm >= limiarTroca;

        const custoRecenteMes = (Array.isArray(item.registrosCustos) ? item.registrosCustos : [])
          .filter((registro) => registro.date.getTime() >= cutoffRecent)
          .reduce((sum, registro) => sum + toPositiveNumber(registro.valor), 0);
        const custoMesAnterior = (Array.isArray(item.registrosCustos) ? item.registrosCustos : [])
          .filter((registro) => registro.date.getTime() >= cutoffPrevious && registro.date.getTime() < cutoffRecent)
          .reduce((sum, registro) => sum + toPositiveNumber(registro.valor), 0);
        const aceleracaoCustoMes = custoRecenteMes - custoMesAnterior;
        const taxaExpCustoMesRaw = custoMesAnterior > 0
          ? aceleracaoCustoMes / custoMesAnterior
          : (custoRecenteMes > 0 ? 0.18 : 0);
        const taxaExpCustoMes = clamp(toFiniteNumber(taxaExpCustoMesRaw, 0), -0.5, 1.25);

        let modeloProjecao = "EXPONENCIAL";
        let tempoAtingirVeExpMeses = Number.POSITIVE_INFINITY;
        if (ve > 0 && vm >= ve) {
          tempoAtingirVeExpMeses = 0;
        } else if (ve > 0 && vm > 0 && taxaExpCustoMes > 0) {
          tempoAtingirVeExpMeses = Math.log(ve / vm) / taxaExpCustoMes;
        } else if (ve > 0 && custoRecenteMes > 0) {
          modeloProjecao = "LINEAR";
          tempoAtingirVeExpMeses = (ve - vm) / custoRecenteMes;
        }

        const tempoAtingirPositivo = Number.isFinite(tempoAtingirVeExpMeses)
          ? Math.max(0, tempoAtingirVeExpMeses)
          : Number.POSITIVE_INFINITY;
        const horizonteProjecaoMeses = Number.isFinite(tempoAtingirPositivo)
          ? clamp(Math.ceil(tempoAtingirPositivo * 1.25), 6, 36)
          : 24;
        const projecaoCustoValores = Array.from({ length: horizonteProjecaoMeses + 1 }, (_, index) => {
          if (modeloProjecao === "EXPONENCIAL" && taxaExpCustoMes > 0) {
            return Math.min(ve * 1.8, vm * Math.exp(taxaExpCustoMes * index));
          }
          return Math.min(ve * 1.8, vm + (custoRecenteMes * index));
        });

        const indiceCriticidade = [
          falhasEscalada,
          alpha > 0,
          vmCrescimentoRapido,
          deveSubstituir,
          ff < 0.6,
        ].filter(Boolean).length;

        return {
          ...item,
          primeiraData: primeiraData.toISOString(),
          ultimaData: ultimaData.toISOString(),
          vm,
          ve,
          vmc,
          ff,
          lambdaMes,
          alpha,
          falhasEscalada,
          vmCrescimentoRapido,
          deveSubstituir,
          vmVeRatio,
          cmedioMes,
          tempoTrocaMeses,
          custoRecenteMes,
          custoMesAnterior,
          aceleracaoCustoMes,
          taxaExpCustoMes,
          tempoAtingirVeExpMeses: tempoAtingirPositivo,
          horizonteProjecaoMeses,
          projecaoCustoValores,
          modeloProjecao,
          indiceCriticidade,
        };
      })
      .sort((a, b) => b.indiceCriticidade - a.indiceCriticidade || b.vmVeRatio - a.vmVeRatio || b.vm - a.vm);
  }, [manutencoesFiltradasParaCustos, equipamentoValorMap]);

  const custoFalhasTimelineData = useMemo(() => {
    const grouped = new Map();

    manutencoesFiltradasParaCustos.forEach((item) => {
      const dataRef = getMaintenanceReferenceDate(item);
      if (!dataRef) return;

      const key = monthKey(dataRef);
      const atual = grouped.get(key) || {
        key,
        date: new Date(dataRef.getFullYear(), dataRef.getMonth(), 1),
        falhas: 0,
        custo: 0,
      };

      atual.falhas += 1;
      atual.custo += toPositiveNumber(item?.valorTotal);
      grouped.set(key, atual);
    });

    let nAcumulado = 0;
    let vmAcumulado = 0;
    let lambdaAnterior = 0;

    return Array.from(grouped.values())
      .sort((a, b) => a.date.getTime() - b.date.getTime())
      .map((item, index) => {
        nAcumulado += item.falhas;
        vmAcumulado += item.custo;
        const lambda = item.falhas;
        const alpha = index === 0 ? 0 : lambda - lambdaAnterior;
        lambdaAnterior = lambda;

        return {
          key: item.key,
          label: monthLabel(item.key),
          lambda,
          alpha,
          nAcumulado,
          vmAcumulado,
        };
      })
      .slice(-12);
  }, [manutencoesFiltradasParaCustos]);

  const custoModeloResumo = useMemo(() => {
    const totalFalhas = custoModeloPorEquipamento.reduce((sum, item) => sum + item.nFalhas, 0);
    const totalVM = custoModeloPorEquipamento.reduce((sum, item) => sum + item.vm, 0);
    const totalVE = custoModeloPorEquipamento.reduce((sum, item) => sum + item.ve, 0);
    const limiarEconomicoGlobal = totalVE * ECONOMIC_REPLACEMENT_THRESHOLD;
    const janelaMeses = Math.max(1, custoFalhasTimelineData.length);
    const custoMedioGlobal = totalVM / janelaMeses;
    const tempoTrocaGlobalMeses = custoMedioGlobal > 0
      ? limiarEconomicoGlobal / custoMedioGlobal
      : Number.POSITIVE_INFINITY;

    return {
      totalFalhas,
      totalVM,
      totalVE,
      limiarEconomicoGlobal,
      custoMedioGlobal,
      tempoTrocaGlobalMeses,
    };
  }, [custoModeloPorEquipamento, custoFalhasTimelineData]);

  const equipamentosCriticosData = useMemo(() => {
    return custoModeloPorEquipamento
      .filter((item) => item.deveSubstituir || item.indiceCriticidade >= 3 || (item.alpha > 0 && item.vmCrescimentoRapido))
      .sort((a, b) => b.indiceCriticidade - a.indiceCriticidade || b.vmVeRatio - a.vmVeRatio || b.vm - a.vm);
  }, [custoModeloPorEquipamento]);

  const gastoPorPeriodoData = useMemo(() => {
    const now = new Date();
    const millisPerDay = 1000 * 60 * 60 * 24;
    const periodMaps = Object.keys(SPENDING_WINDOWS).reduce((acc, key) => {
      acc[key] = new Map();
      return acc;
    }, {});

    manutencoesFiltradasParaCustos.forEach((item) => {
      const equipamento = item?.equipamento;
      const equipamentoId = equipamento?.id;
      if (equipamentoId == null) return;

      const dataRef = getMaintenanceReferenceDate(item);
      if (!dataRef) return;

      const diffDays = (now.getTime() - dataRef.getTime()) / millisPerDay;
      if (diffDays < 0) return;

      const valor = toPositiveNumber(item?.valorTotal);
      if (valor <= 0) return;

      Object.entries(SPENDING_WINDOWS).forEach(([periodo, config]) => {
        if (diffDays > config.days) return;

        const mapPeriodo = periodMaps[periodo];
        const key = String(equipamentoId);
        const atual = mapPeriodo.get(key) || {
          key,
          label: equipamento?.nomeEquipamento || "Sem nome",
          tagPatrimonio: equipamento?.tagPatrimonio || "",
          value: 0,
        };

        atual.value += valor;
        mapPeriodo.set(key, atual);
      });
    });

    return Object.keys(SPENDING_WINDOWS).reduce((acc, periodo) => {
      const values = Array.from(periodMaps[periodo].values())
        .sort((a, b) => b.value - a.value || String(a.label).localeCompare(String(b.label), "pt-BR"));
      const limiteAlto = getPercentileThreshold(values.map((item) => item.value), 0.75);
      const highSpenders = values
        .filter((item) => item.value >= limiteAlto && item.value > 0)
        .slice(0, 8);

      acc[periodo] = {
        total: values.reduce((sum, item) => sum + toPositiveNumber(item.value), 0),
        limiteAlto,
        top: values.slice(0, 10),
        highSpenders,
      };

      return acc;
    }, {});
  }, [manutencoesFiltradasParaCustos]);

  const equipesCountData = useMemo(() => {
    const grouped = new Map();

    equipamentosUnicos.forEach((item) => {
      const equipeNome = item?.equipeResponsavel?.nome || item?.equipe?.nome || "Sem equipe";
      grouped.set(equipeNome, (grouped.get(equipeNome) || 0) + 1);
    });

    return Array.from(grouped.entries()).map(([label, value]) => ({ label, value }));
  }, [equipamentosUnicos]);

  const equipesValorData = useMemo(() => {
    const grouped = new Map();

    equipamentosUnicos.forEach((item) => {
      const equipeNome = item?.equipeResponsavel?.nome || item?.equipe?.nome || "Sem equipe";
      grouped.set(equipeNome, (grouped.get(equipeNome) || 0) + toPositiveNumber(item?.valorUnitario));
    });

    return Array.from(grouped.entries()).map(([label, value]) => ({ label, value }));
  }, [equipamentosUnicos]);

  const equipesEnviosOficinaData = useMemo(() => {
    const grouped = new Map();

    manutencoesBaseComEquip.forEach((item) => {
      const equipeNome = String(
        item?.equipeUltima?.nome || item?.equipamento?.equipeResponsavel?.nome || item?.equipamento?.equipe?.nome || "Sem equipe",
      ).trim() || "Sem equipe";
      const key = normalizeGroupKey(equipeNome);
      const atual = grouped.get(key) || {
        key,
        label: equipeNome,
        value: 0,
      };

      atual.value += 1;
      grouped.set(key, atual);
    });

    return Array.from(grouped.values()).sort((a, b) => b.value - a.value || a.label.localeCompare(b.label, "pt-BR"));
  }, [manutencoesBaseComEquip]);

  const equipesTotalEquipamentos = useMemo(() => {
    return equipesCountData.reduce((sum, item) => sum + toPositiveNumber(item.value), 0);
  }, [equipesCountData]);

  const equipesComLoginSistemaTotal = useMemo(() => {
    const equipeIdsComLogin = new Set(
      (Array.isArray(usuarios) ? usuarios : [])
        .filter((usuario) => usuario?.ativo !== false)
        .map((usuario) => usuario?.equipeId ?? usuario?.equipe?.id)
        .filter((id) => id != null),
    );

    return (Array.isArray(equipes) ? equipes : []).filter((equipe) => {
      const operacional = isOperationalRole(equipe?.tipoCategoria?.nome);
      return operacional && equipe?.ativo !== false && equipeIdsComLogin.has(equipe?.id);
    }).length;
  }, [equipes, usuarios]);

  const botoesGraficos = [
    { key: "EQUIPAMENTOS", label: "Equipamentos" },
    { key: "MANUTENCAO", label: "Manutenção" },
    { key: "CUSTOS", label: "Análise de Custos" },
    { key: "EQUIPES", label: "Equipes" },
  ];

  if (loading) return <OutletLoading message="Carregando relatorios gerenciais..." />;
  if (erro) return <div className="operacoes-feedback erro">{erro}</div>;

  return (
    <div className="relatorios-page">
      <section className="relatorios-hero">
        <p className="operacoes-kicker">Gerencial</p>
        <h1>Relatorios Gerencial</h1>
        <p className="relatorios-subtitle">
          Escolha um painel para visualizar os indicadores de equipamentos, manutenção, custos e equipes.
        </p>
      </section>

      <section className="gerencial-selector-wrap">
        <div className="gerencial-selector-grid">
          {botoesGraficos.map((botao) => {
            const botaoDesabilitado = botao.key === "CUSTOS" && !podeAcessarAnaliseCustos;

            return (
              <button
                key={botao.key}
                type="button"
                className={`gerencial-selector-btn ${graficoAtivo === botao.key ? "active" : ""}`}
                disabled={botaoDesabilitado}
                title={botaoDesabilitado ? "Apenas usuarios GERENCIA podem acessar Analise de Custos." : ""}
                onClick={() => {
                  if (botaoDesabilitado) return;
                  setGraficoAtivo(botao.key);
                }}
              >
                {botao.label}
              </button>
            );
          })}
        </div>
      </section>

      {graficoAtivo === "EQUIPAMENTOS" && (
        <>
          <section className="gerencial-subselector">
            <button
              type="button"
              className={`gerencial-subselector-btn ${equipamentosSubTelaAtiva === "RESUMO" ? "active" : ""}`}
              onClick={() => setEquipamentosSubTelaAtiva("RESUMO")}
            >
              Resumo atual
            </button>
            <button
              type="button"
              className={`gerencial-subselector-btn ${equipamentosSubTelaAtiva === "HISTORICO" ? "active" : ""}`}
              onClick={() => setEquipamentosSubTelaAtiva("HISTORICO")}
            >
              Historico de direcionamento
            </button>
          </section>

          {equipamentosSubTelaAtiva === "RESUMO" ? (
            <section className="gerencial-charts-grid">
              <PieChartPanel
                title="Equipamentos agrupados por nome"
                data={equipamentoNomeData}
                totalLabel="Soma dos valores unitarios (geral)"
                totalValue={somaValoresUnitariosTotal}
                formatter={formatCurrency}
                activeKey={equipamentoNomeSelecionadoKey}
                onSliceClick={(segment) => setEquipamentoNomeSelecionadoKey(segment.key)}
                emptyText="Nenhum equipamento encontrado para montar o grafico."
              />

              <PieChartPanel
                title={equipamentoSelecionado ? `Detalhe por TAG: ${equipamentoSelecionado.label}` : "Detalhe por TAG"}
                data={equipamentoTagData}
                totalLabel="Soma dos valores unitarios (selecionado)"
                totalValue={somaValoresSelecionado}
                formatter={formatCurrency}
                emptyText="Clique em uma divisao do grafico de equipamentos para ver o detalhamento por TAG."
              />
            </section>
          ) : (
            <section className="gerencial-charts-grid">
              <div className="operacoes-filters gerencial-manutencao-filtros gerencial-custos-filtros gerencial-historico-filtros">
                <CascadeMultiSelectFilters
                  rows={historicoDirecionamentos}
                  filters={historicoDefinicoesFiltro}
                  value={historicoFiltrosCascata}
                  onChange={setHistoricoFiltrosCascata}
                  storageKey="smart-filters:relatorios-gerencial:historico-direcionamento"
                />
                <div className="gerencial-custos-header-actions">
                  <button
                    type="button"
                    className="operacoes-primary-btn"
                    onClick={exportarHistoricoDirecionamentoPdf}
                    disabled={!equipamentoHistoricoSelecionado?.events?.length}
                  >
                    Exportar relatorio em PDF
                  </button>
                </div>
              </div>

              <EquipmentDirectionHistoryPanel
                title="Todos os equipamentos por quantidade de direcionamentos"
                data={equipamentoDirecionamentoData}
                totalLabel="Direcionamentos congelados"
                totalValue={totalDirecionamentosRegistrados}
                secondaryTotalLabel="Equipamentos com historico"
                secondaryTotalValue={equipamentoDirecionamentoData.length}
                activeKey={equipamentoHistoricoSelecionadoKey}
                onSelect={(segment) => setEquipamentoHistoricoSelecionadoKey(segment.key)}
                emptyText="Nenhum direcionamento historico foi registrado ainda."
              />

              <EquipmentDirectionTimelinePanel
                equipamento={equipamentoHistoricoSelecionado}
                emptyText="Selecione um equipamento no grafico para abrir o historico completo de equipes e destinos congelados."
              />
            </section>
          )}
        </>
      )}

      {graficoAtivo === "MANUTENCAO" && (
        <section className="gerencial-charts-grid gerencial-charts-grid-single">
          <div className="operacoes-filters gerencial-manutencao-filtros">
            <CascadeMultiSelectFilters
              rows={manutencoesBaseComEquip}
              filters={manutencaoDefinicoesFiltro}
              value={manutencaoFiltrosCascata}
              onChange={setManutencaoFiltrosCascata}
              storageKey="smart-filters:relatorios-gerencial:manutencao"
            />
          </div>

          <MaintenanceColumnChart
            data={manutencaoGraficoColunasData}
            totalRegistros={manutencaoTotalVezesFiltrado}
            totalGasto={manutencaoTotalGastoFiltrado}
            emptyText="Sem registros de manutencao no periodo/filtros selecionados."
          />
        </section>
      )}

      {graficoAtivo === "CUSTOS" && podeAcessarAnaliseCustos && (
        <section className="gerencial-charts-grid gerencial-custos-grid">
          <div className="operacoes-filters gerencial-manutencao-filtros gerencial-custos-filtros">
            <div className="gerencial-custos-header-actions">
              <button
                type="button"
                className="operacoes-secondary-btn gerencial-legenda-btn"
                onClick={() => setLegendaCustosAberta(true)}
              >
                Legenda da analise
              </button>
            </div>
            <CascadeMultiSelectFilters
              rows={manutencoesBaseComEquip}
              filters={manutencaoDefinicoesFiltro}
              value={custosFiltrosCascata}
              onChange={setCustosFiltrosCascata}
              storageKey="smart-filters:relatorios-gerencial:custos"
            />
          </div>

          <SpendingByPeriodPanel
            dataByPeriod={gastoPorPeriodoData}
            periodoAtivo={custoPeriodoAtivo}
            onPeriodoChange={setCustoPeriodoAtivo}
            emptyText="Sem custos registrados para o periodo e equipamentos selecionados."
          />

          <ExponentialForecastPanel
            data={custoModeloPorEquipamento}
            emptyText="Sem historico de custo suficiente para projetar o atingimento do valor unitario."
          />

          <FailureDynamicsPanel
            data={custoFalhasTimelineData}
            totalFalhas={custoModeloResumo.totalFalhas}
            totalVM={custoModeloResumo.totalVM}
            limiarEconomicoGlobal={custoModeloResumo.limiarEconomicoGlobal}
            custoMedioGlobal={custoModeloResumo.custoMedioGlobal}
            tempoTrocaGlobalMeses={custoModeloResumo.tempoTrocaGlobalMeses}
            emptyText="Sem dados suficientes para medir N(t), lambda(t) e alpha(t)."
          />

          <EconomicThresholdPanel
            data={custoModeloPorEquipamento}
            emptyText="Sem equipamentos para comparar VM(t) com VE no filtro atual."
          />

          <CriticalIndicatorsPanel
            data={equipamentosCriticosData}
            emptyText="Nenhum equipamento em estado critico para os filtros de custos selecionados."
          />
        </section>
      )}
      {graficoAtivo === "EQUIPES" && (
        <section className="gerencial-charts-grid">
          <PieChartPanel
            title="Distribuição de equipamentos por equipe"
            data={equipesCountData}
            totalLabel="Total de equipamentos"
            totalValue={equipesTotalEquipamentos}
            formatter={formatNumber}
            secondaryTotalLabel="Total de equipes"
            secondaryTotalValue={equipesComLoginSistemaTotal}
            secondaryFormatter={formatNumber}
            emptyText="Sem equipamentos para distribuição por equipe."
          />
          <SimpleBarChartPanel
            title="Valores unitários por equipe"
            data={equipesValorData}
            formatter={formatCurrency}
            emptyText="Sem valores unitários por equipe."
          />
          <SimpleBarChartPanel
            title="Equipes que mais enviam equipamentos para oficina"
            data={equipesEnviosOficinaData}
            formatter={formatNumber}
            emptyText="Sem envios de equipamentos para oficina no histórico."
          />
        </section>
      )}

      {!!equipes.length && (
        <p className="gerencial-footer-note">
          Equipes cadastradas consideradas no painel: {equipes.length}.
        </p>
      )}

      {legendaCustosAberta && (
        <Modal onClose={() => setLegendaCustosAberta(false)} size="lg">
          <div className="operacoes-modal gerencial-legenda-modal">
            <h2>Legenda da analise de custos</h2>
            <p>Use este guia para interpretar os paineis e tomar decisao de manutencao ou troca.</p>

            <div className="gerencial-legenda-section">
              <h3>Como analisar</h3>
              <ul className="gerencial-legenda-list">
                {COST_ANALYSIS_GUIDE.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </div>

            <div className="gerencial-legenda-section">
              <h3>Siglas</h3>
              <div className="gerencial-legenda-siglas">
                {COST_ANALYSIS_SIGLAS.map((item) => (
                  <div key={item.sigla} className="gerencial-legenda-sigla-item">
                    <strong>{item.sigla}</strong>
                    <span>{item.descricao}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="operacoes-modal-actions">
              <button type="button" className="operacoes-primary-btn" onClick={() => setLegendaCustosAberta(false)}>
                Fechar
              </button>
            </div>
          </div>
        </Modal>
      )}

    </div>
  );
}
