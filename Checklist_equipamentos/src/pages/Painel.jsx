import { Fragment, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import * as XLSX from "xlsx";
import Modal from "../components/Modal";
import CascadeMultiSelectFilters from "../components/CascadeMultiSelectFilters";
import { api } from "../services/api";
import { AuthContext } from "../context/AuthContext";
import { filterRowsByCascade } from "../utils/cascadeFilters";
import { buildParsedFromExecution, filterExecutionsForWeek, parseExecPayload, saveChecklistPdf, weekOrder } from "../utils/checklistPdf";
import { compareByTextKeys, sortByTextKeys } from "../utils/sort";
import { isAdminLikeRole, isOperationalRole, normalizeUserRole } from "../utils/userRoles";
import "../Styles/operacoes.css";

const fmtDate = (v = new Date()) => new Intl.DateTimeFormat("pt-BR", { dateStyle: "short" }).format(new Date(v));
const fmtDateTime = (v) => (v ? new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short" }).format(new Date(v)) : "-");
const sameDay = (a, b) => new Date(a).toDateString() === new Date(b).toDateString();
const normalize = (v) => String(v ?? "").replace(/\s+/g, " ").trim();
const respLabel = (v) => (v === "C" ? "Conforme" : v === "NC" ? "Nao Conforme" : v === "NA" ? "Nao Aplicavel" : "-");
const flattenExecItems = (payload) => (payload?.secoes || []).flatMap((s) => (s.itens || []).map((item) => ({ ...item, secao: s.secao })));
const normalizeCompare = (value) => normalize(value).toLowerCase();
const countNcAnswers = (payload) => flattenExecItems(payload).filter((item) => item?.resposta === "NC").length;
const compareByEquipeCarga = (a, b) => {
  const quantidadeA = Array.isArray(a?.equipamentos) ? a.equipamentos.length : 0;
  const quantidadeB = Array.isArray(b?.equipamentos) ? b.equipamentos.length : 0;

  if (quantidadeA !== quantidadeB) {
    return quantidadeB - quantidadeA;
  }

  return compareByTextKeys(a, b, (item) => item?.equipe?.nome, (item) => item?.equipe?.tipoCategoria?.nome);
};

const toExecucaoResumo = (execucao) => {
  const payload = parseExecPayload(execucao);

  return {
    id: execucao?.id ?? null,
    data: execucao?.data ?? null,
    ncCount: countNcAnswers(payload),
    estoque: execucao?.estoque
      ? {
        id: execucao.estoque.id,
        nomeEquipamento: execucao.estoque.nomeEquipamento,
        tagPatrimonio: execucao.estoque.tagPatrimonio,
        empresa: execucao.estoque.empresa,
        equipeResponsavel: execucao.estoque.equipeResponsavel,
      }
      : null,
    checklistModelo: execucao?.checklistModelo
      ? {
        id: execucao.checklistModelo.id,
        nome: execucao.checklistModelo.nome,
        arquivoNome: execucao.checklistModelo.arquivoNome,
      }
      : null,
  };
};

function findExecItem(payload, question) {
  const items = flattenExecItems(payload);

  return (
    items.find((item) => item.secao === question.secao && String(item.item) === String(question.item)) ||
    items.find((item) => String(item.item) === String(question.item) && normalizeCompare(item.descricao) === normalizeCompare(question.descricao)) ||
    items.find((item) => normalizeCompare(item.descricao) === normalizeCompare(question.descricao)) ||
    null
  );
}

function parseRows(rows) {
  const questions = [];
  const titleRow = (rows || []).find((r) => r.some((c) => normalize(c).toUpperCase().includes("CHECKLIST"))) || rows?.[0] || [];
  const titleCell = titleRow.find((c) => normalize(c).toUpperCase().includes("CHECKLIST"));
  const title = normalize(titleCell) || "Checklist";
  const topRawCells = (rows || [])
    .slice(0, 8)
    .flatMap((row) => (row || []).map((cell) => String(cell ?? "").trim()))
    .filter(Boolean);
  const headerMetaCell = topRawCells.find((cell) => /^CL-/i.test(cell) && /REVIS/i.test(cell) && /DATA\s*:/i.test(cell)) || "";
  const headerMetaLines = headerMetaCell
    ? headerMetaCell.split(/\r?\n/).map((line) => line.trim()).filter(Boolean)
    : [];
  const codeMatch = headerMetaLines[0] || "";
  const revisionMatch = headerMetaLines[1] || "";
  const dateMatch = headerMetaLines[2] || "";
  let secao = "Itens Gerais";
  for (const row of rows || []) {
    const a = normalize(row?.[0]);
    const b = normalize(row?.[1]);
    const crit = normalize(row?.[5]);
    const rowText = row.map(normalize).join(" ").toUpperCase();
    const isHeaderLabel = ["EMPRESA:", "EMPRESA", "MARCA:", "MARCA", "TAG:", "TAG", "ITEM", "DESCRICAO"].includes(a.toUpperCase());
    const isMetaRow = rowText.includes("SITUACAO DOS ITENS VERIFICADOS") || rowText.includes("SEGUNDA") || rowText.includes("TERCA") || rowText.includes("QUARTA") || rowText.includes("QUINTA") || rowText.includes("SEXTA") || rowText.includes("SABADO") || rowText.includes("DOMINGO");
    if (!a && !b) continue;
    if (isHeaderLabel || isMetaRow) continue;
    if (a && !b && !/^\d+$/.test(a) && !rowText.includes("AVALIA") && !rowText.includes("ASSINATURA") && !rowText.includes("IDENTIFICA")) { secao = a; continue; }
    if (rowText.includes("AVALIA") || rowText.includes("ASSINATURA")) break;
    if (/^\d+$/.test(a) || typeof row?.[0] === "number") questions.push({ id: `${secao}-${a}`, item: String(row?.[0]).trim(), descricao: b, secao, criticidade: crit });
  }
  return {
    title,
    questions,
    headerCode: codeMatch,
    headerRevision: revisionMatch,
    headerDate: dateMatch,
  };
}

function extractRevisionNumberFromTopRows(rows) {
  const topText = (rows || [])
    .slice(0, 10)
    .flatMap((row) => (row || []).map((cell) => String(cell ?? "").trim()))
    .join(" ")
    .toUpperCase();

  const match = topText.match(/REVIS(?:A|Ã)O\s*:\s*0*(\d+)/i);
  return Number.parseInt(match?.[1] || "0", 10) || 0;
}

function selectChecklistSheetRows(workbook) {
  const sheetsMeta = Array.isArray(workbook?.Workbook?.Sheets) ? workbook.Workbook.Sheets : [];
  const candidates = workbook.SheetNames.map((sheetName, index) => {
    const worksheet = workbook.Sheets[sheetName];
    const rows = XLSX.utils.sheet_to_json(worksheet, { header: 1, blankrows: false, defval: "" });
    const topText = (rows || [])
      .slice(0, 10)
      .flatMap((row) => (row || []).map((cell) => String(cell ?? "").trim()))
      .join(" ")
      .toUpperCase();

    const visible = sheetsMeta[index]?.Hidden == null || sheetsMeta[index]?.Hidden === 0;
    const hasChecklist = topText.includes("CHECKLIST");
    const hasHeaderFields = topText.includes("EMPRESA:") && topText.includes("MARCA:") && topText.includes("TAG:");
    const weekdaysFound = ["SEGUNDA", "TERCA", "QUARTA", "QUINTA", "SEXTA", "SABADO", "DOMINGO"].filter((day) => topText.includes(day)).length;
    const revision = extractRevisionNumberFromTopRows(rows);
    const score = (visible ? 1000 : -1000) + (hasChecklist ? 300 : 0) + (hasHeaderFields ? 250 : 0) + (weekdaysFound * 20) + (revision * 100) + index;

    return { rows, score, revision, index };
  });

  candidates.sort((a, b) => (b.score - a.score) || (b.revision - a.revision) || (b.index - a.index));
  return candidates[0]?.rows || [];
}

export default function Painel() {
  const { usuario } = useContext(AuthContext);
  const [equipes, setEquipes] = useState([]), [equipamentos, setEquipamentos] = useState([]), [equipamentosLocados, setEquipamentosLocados] = useState([]), [usuarios, setUsuarios] = useState([]), [modelos, setModelos] = useState([]), [execucoes, setExecucoes] = useState([]), [oficinas, setOficinas] = useState([]);
  const [notificacoesRecebidas, setNotificacoesRecebidas] = useState([]);
  const [loading, setLoading] = useState(true), [erro, setErro] = useState(""), [ok, setOk] = useState(""), [checklistErro, setChecklistErro] = useState("");
  const [mostrarAnaliseEquipes, setMostrarAnaliseEquipes] = useState(false);
  const [mostrarChecklistNcDia, setMostrarChecklistNcDia] = useState(false);
  const [editor, setEditor] = useState(null), [viewer, setViewer] = useState(null), [answers, setAnswers] = useState({}), [operador, setOperador] = useState(""), [assinaturas, setAssinaturas] = useState({ encarregado: "", operador: "" });
  const [sigModal, setSigModal] = useState({ open: false, target: null });
  const [avisoSemChecklistId, setAvisoSemChecklistId] = useState(null);
  const [modalEnvio, setModalEnvio] = useState({ open: false, card: null });
  const [equipeDestinoId, setEquipeDestinoId] = useState("");
  const [salvandoEnvio, setSalvandoEnvio] = useState(false);
  const [aceitandoEnvioId, setAceitandoEnvioId] = useState(null);
  const [erroEnvio, setErroEnvio] = useState("");
  const [modalHistoricoEquipe, setModalHistoricoEquipe] = useState({ open: false, equipe: null });
  const [filtrosHistoricoEquipe, setFiltrosHistoricoEquipe] = useState({
    origem: [],
    equipamento: [],
    tag: [],
    destino: [],
    status: [],
  });
  const [filtrosAdminCards, setFiltrosAdminCards] = useState({
    equipe: [],
    equipamento: [],
    tag: [],
  });
  const [filtrosEquipeCards, setFiltrosEquipeCards] = useState({
    equipamento: [],
    tag: [],
    empresa: [],
    status: [],
  });
  const [filtrosNotificacoes, setFiltrosNotificacoes] = useState({
    origem: [],
    equipamento: [],
    tag: [],
  });
  const [cache, setCache] = useState({});
  const canvasRef = useRef(null), drawingRef = useRef(false), avisoTimeoutRef = useRef(null);
  const tipo = normalizeUserRole(usuario?.tipoCategoria);
  const isAdminOrDev = isAdminLikeRole(tipo);

  const carregarResumoExecucoesPaginado = useCallback(async () => {
    const primeiraPagina = await api.get("/api/execucoes/resumo?page=0&size=300");
    const listaInicial = Array.isArray(primeiraPagina?.content)
      ? primeiraPagina.content
      : Array.isArray(primeiraPagina)
        ? primeiraPagina
        : [];

    setExecucoes(listaInicial);

    const totalPages = Number(primeiraPagina?.totalPages || 0);
    if (!Number.isFinite(totalPages) || totalPages <= 1) {
      return;
    }

    const paginasRestantes = Array.from({ length: totalPages - 1 }, (_, i) => i + 1);
    const lotes = [];
    for (let i = 0; i < paginasRestantes.length; i += 3) {
      lotes.push(paginasRestantes.slice(i, i + 3));
    }

    for (const lote of lotes) {
      const respostas = await Promise.all(
        lote.map((pageIndex) => api.get(`/api/execucoes/resumo?page=${pageIndex}&size=300`)),
      );

      const adicionais = respostas.flatMap((resposta) =>
        Array.isArray(resposta?.content)
          ? resposta.content
          : Array.isArray(resposta)
            ? resposta
            : [],
      );

      if (adicionais.length) {
        setExecucoes((atual) => {
          const mapa = new Map((atual || []).map((item) => [item?.id, item]));
          adicionais.forEach((item) => {
            if (item?.id != null) {
              mapa.set(item.id, item);
            }
          });

          return Array.from(mapa.values()).sort((a, b) => new Date(b?.data || 0) - new Date(a?.data || 0));
        });
      }
    }
  }, []);

  const carregarNotificacoesRecebidas = useCallback(async (equipesCarregadas) => {
    try {
      if (isAdminOrDev) {
        const equipesOperacionais = (Array.isArray(equipesCarregadas) ? equipesCarregadas : []).filter((item) => {
          return item?.id != null && item?.ativo !== false && isOperationalRole(item?.tipoCategoria?.nome);
        });

        const lotes = await Promise.all(
          equipesOperacionais.map((item) => api.get(`/api/notificacoes/transferencia/recebidas/${item.id}`)),
        );

        const unicas = new Map();
        lotes.flat().forEach((notificacao) => {
          if (notificacao?.id != null) unicas.set(notificacao.id, notificacao);
        });

        setNotificacoesRecebidas(Array.from(unicas.values()));
        return;
      }

      if (usuario?.equipeId) {
        const notificacoes = await api.get(`/api/notificacoes/transferencia/recebidas/${usuario.equipeId}`);
        setNotificacoesRecebidas(Array.isArray(notificacoes) ? notificacoes : []);
        return;
      }

      setNotificacoesRecebidas([]);
    } catch (error) {
      if (String(error?.message || "").includes("404")) {
        setNotificacoesRecebidas([]);
      }
    }
  }, [isAdminOrDev, usuario?.equipeId]);

  const carregarPainel = useCallback(async () => {
    setLoading(true);

    try {
      const requisicoes = [
        api.get("/api/equipes"),
        api.get("/api/estoques"),
        api.get("/api/equipamentos-locados"),
        api.get("/api/usuarios"),
        api.get("/api/checklist-modelos"),
        carregarResumoExecucoesPaginado(),
        api.get("/api/oficinas"),
      ];

      const [a, b, c, d, e, , f] = await Promise.all(requisicoes);
      setEquipes(Array.isArray(a) ? a : []);
      setEquipamentos(Array.isArray(b) ? b : []);
      setEquipamentosLocados(Array.isArray(c) ? c : []);
      setUsuarios(Array.isArray(d) ? d : []);
      setModelos(Array.isArray(e) ? e : []);
      setOficinas(Array.isArray(f) ? f : []);

      setErro("");
      carregarNotificacoesRecebidas(Array.isArray(a) ? a : []);
    } catch (error) {
      setErro(error.message || "Nao foi possivel carregar o painel.");
    } finally {
      setLoading(false);
    }
  }, [carregarNotificacoesRecebidas, carregarResumoExecucoesPaginado]);

  useEffect(() => {
    carregarPainel();
  }, [carregarPainel]);

  const equipeUsuario = useMemo(() => equipes.find((e) => e.id === usuario?.equipeId) || null, [equipes, usuario]);
  const encarregadoNome = String(equipeUsuario?.nome || usuario?.nome || usuario?.username || "").trim() || "Encarregado";
  const modelosPorEquip = useMemo(() => {
    const map = new Map();
    modelos.forEach((m) => (m.equipamentos || []).forEach((eq) => { if (!map.has(eq.id)) map.set(eq.id, m); }));
    return map;
  }, [modelos]);
  const historicoPorEquip = useMemo(() => {
    const map = new Map();
    execucoes.forEach((e) => { const id = e?.estoque?.id; if (!id) return; if (!map.has(id)) map.set(id, []); map.get(id).push(e); });
    for (const [, list] of map) list.sort((a, b) => new Date(b.data) - new Date(a.data));
    return map;
  }, [execucoes]);
  const equipamentoIdsNaOficina = useMemo(() => new Set((oficinas || []).map((o) => o?.equipamento?.id).filter((id) => id != null)), [oficinas]);
  const cardsEquipe = useMemo(() => (
    sortByTextKeys([
      ...(equipamentos || [])
        .filter((e) => e?.equipeResponsavel?.id === equipeUsuario?.id && !equipamentoIdsNaOficina.has(e?.id))
        .map((equipamento) => ({
          origem: "proprio",
          cardKey: `proprio-${equipamento.id}`,
          equipamento,
          modelo: modelosPorEquip.get(equipamento.id) || null,
          historico: historicoPorEquip.get(equipamento.id) || [],
        })),
      ...(equipamentosLocados || [])
        .filter((item) => item?.equipe?.id === equipeUsuario?.id)
        .map((item) => ({
          origem: "alugado",
          cardKey: `alugado-${item.id}`,
          equipamento: {
            id: item.id,
            nomeEquipamento: item?.nomeLocado || "-",
            tagPatrimonio: item?.tag || "-",
            empresa: item?.empresa,
            equipeResponsavel: item?.equipe,
          },
          modelo: null,
          historico: [],
        })),
    ],
    (item) => item?.equipamento?.nomeEquipamento,
    (item) => item?.equipamento?.tagPatrimonio,
    (item) => item?.equipamento?.empresa?.nome,
    )
  ), [equipamentos, equipamentoIdsNaOficina, equipamentosLocados, equipeUsuario, historicoPorEquip, modelosPorEquip]);
  const equipesDestinoDisponiveis = useMemo(() => sortByTextKeys(
    equipes
      .filter((item) => item?.ativo !== false)
      .filter((item) => isOperationalRole(item?.tipoCategoria?.nome))
      .filter((item) => item.id !== equipeUsuario?.id),
    (item) => item?.nome,
    (item) => item?.tipoCategoria?.nome,
  ), [equipes, equipeUsuario]);
  const equipesOperacionaisComLogin = useMemo(() => {
    const equipeIdsComLogin = new Set(
      (usuarios || [])
        .filter((usuarioItem) => usuarioItem?.ativo !== false)
        .map((usuarioItem) => usuarioItem?.equipeId)
        .filter((id) => id != null),
    );

    return sortByTextKeys(equipes.filter((equipe) => {
      const operacional = isOperationalRole(equipe?.tipoCategoria?.nome);
      return operacional && equipe?.ativo !== false && equipeIdsComLogin.has(equipe?.id);
    }), (item) => item?.nome, (item) => item?.tipoCategoria?.nome);
  }, [equipes, usuarios]);
  const cardsAdmin = useMemo(() => (
    equipesOperacionaisComLogin.map((equipe) => ({
      equipe,
      equipamentos: sortByTextKeys([
        ...(equipamentos || [])
          .filter((it) => it?.equipeResponsavel?.id === equipe.id && !equipamentoIdsNaOficina.has(it?.id))
          .map((equipamento) => ({
            origem: "proprio",
            cardKey: `proprio-${equipamento.id}`,
            equipamento,
            modelo: modelosPorEquip.get(equipamento.id) || null,
            historico: historicoPorEquip.get(equipamento.id) || [],
          })),
        ...(equipamentosLocados || [])
          .filter((item) => item?.equipe?.id === equipe.id)
          .map((item) => ({
            origem: "alugado",
            cardKey: `alugado-${item.id}`,
            equipamento: {
              id: item.id,
              nomeEquipamento: item?.nomeLocado || "-",
              tagPatrimonio: item?.tag || "-",
              empresa: item?.empresa,
              equipeResponsavel: item?.equipe,
            },
            modelo: null,
            historico: [],
          })),
      ],
      (item) => item?.equipamento?.nomeEquipamento,
      (item) => item?.equipamento?.tagPatrimonio,
      (item) => item?.equipamento?.empresa?.nome,
      ),
    }))
  ), [equipesOperacionaisComLogin, equipamentoIdsNaOficina, equipamentos, equipamentosLocados, historicoPorEquip, modelosPorEquip]);
  const definicoesFiltroAdmin = useMemo(() => ([
    {
      id: "equipe",
      label: "Equipe",
      getValue: (item) => item?.equipe?.nome,
    },
    {
      id: "equipamento",
      label: "Equipamento",
      getValue: (item) => item?.card?.equipamento?.nomeEquipamento,
    },
    {
      id: "tag",
      label: "Tag",
      getValue: (item) => item?.card?.equipamento?.tagPatrimonio,
    },
  ]), []);
  const cardsAdminFlat = useMemo(() => cardsAdmin.flatMap(({ equipe, equipamentos: cards }) => (
    cards.length
      ? cards.map((card) => ({
        equipeId: equipe.id,
        equipe,
        card,
      }))
      : [{
        equipeId: equipe.id,
        equipe,
        card: null,
      }]
  )), [cardsAdmin]);
  const cardsAdminFlatFiltrados = useMemo(() => (
    filterRowsByCascade(cardsAdminFlat, definicoesFiltroAdmin, filtrosAdminCards)
  ), [cardsAdminFlat, definicoesFiltroAdmin, filtrosAdminCards]);
  const cardsAdminFiltrados = useMemo(() => {
    const mapa = new Map();

    cardsAdminFlatFiltrados.forEach((item) => {
      if (!mapa.has(item.equipeId)) {
        mapa.set(item.equipeId, {
          equipe: item.equipe,
          equipamentos: [],
          equipamentosProprios: [],
          equipamentosAlugados: [],
        });
      }

      if (item.card) {
        mapa.get(item.equipeId).equipamentos.push(item.card);
        if (item.card?.origem === "alugado") {
          mapa.get(item.equipeId).equipamentosAlugados.push(item.card);
        } else {
          mapa.get(item.equipeId).equipamentosProprios.push(item.card);
        }
      }
    });

    return Array.from(mapa.values()).sort(compareByEquipeCarga);
  }, [cardsAdminFlatFiltrados]);
  const definicoesFiltroEquipeCards = useMemo(() => ([
    {
      id: "equipamento",
      label: "Equipamento",
      getValue: (card) => card?.equipamento?.nomeEquipamento,
    },
    {
      id: "tag",
      label: "Tag",
      getValue: (card) => card?.equipamento?.tagPatrimonio,
    },
    {
      id: "empresa",
      label: "Empresa",
      getValue: (card) => card?.equipamento?.empresa?.nome,
    },
    {
      id: "status",
      label: "Status",
      getValue: (card) => (card?.historico?.[0]?.data && sameDay(card.historico[0].data, new Date()) ? "Checklist feito hoje" : "Checklist pendente hoje"),
    },
  ]), []);
  const cardsEquipeFiltrados = useMemo(() => (
    filterRowsByCascade(cardsEquipe, definicoesFiltroEquipeCards, filtrosEquipeCards)
  ), [cardsEquipe, definicoesFiltroEquipeCards, filtrosEquipeCards]);
  const cardsEquipePropriosFiltrados = useMemo(() => cardsEquipeFiltrados.filter((card) => card?.origem === "proprio"), [cardsEquipeFiltrados]);
  const cardsEquipeAlugadosFiltrados = useMemo(() => cardsEquipeFiltrados.filter((card) => card?.origem === "alugado"), [cardsEquipeFiltrados]);
  const definicoesFiltroNotificacoes = useMemo(() => ([
    {
      id: "origem",
      label: "Equipe Origem",
      getValue: (notificacao) => notificacao?.equipeOrigem?.nome,
    },
    {
      id: "equipamento",
      label: "Equipamento",
      getValue: (notificacao) => notificacao?.estoque?.nomeEquipamento,
    },
    {
      id: "tag",
      label: "Tag",
      getValue: (notificacao) => notificacao?.estoque?.tagPatrimonio,
    },
    {
      id: "destino",
      label: "Equipe Destino",
      getValue: (notificacao) => notificacao?.equipeDestino?.nome,
    },
    {
      id: "status",
      label: "Status",
      getValue: (notificacao) => notificacao?.status,
    },
  ]), []);
  const notificacoesFiltradas = useMemo(() => (
    sortByTextKeys(
      filterRowsByCascade(notificacoesRecebidas, definicoesFiltroNotificacoes, filtrosNotificacoes),
      (item) => item?.estoque?.nomeEquipamento,
      (item) => item?.estoque?.tagPatrimonio,
      (item) => item?.equipeOrigem?.nome,
      (item) => item?.equipeDestino?.nome,
    )
  ), [notificacoesRecebidas, definicoesFiltroNotificacoes, filtrosNotificacoes]);
  const historicoTransferenciasPorEquipe = useMemo(() => {
    const mapa = new Map();

    notificacoesRecebidas.forEach((notificacao) => {
      const equipeOrigemId = notificacao?.equipeOrigem?.id;
      const equipeDestinoId = notificacao?.equipeDestino?.id;
      const equipeRelacionadas = [equipeOrigemId, equipeDestinoId].filter((id) => id != null);

      equipeRelacionadas.forEach((equipeId) => {
        if (!mapa.has(equipeId)) mapa.set(equipeId, []);
        mapa.get(equipeId).push(notificacao);
      });
    });

    for (const [, lista] of mapa) {
      lista.sort((a, b) => new Date(b?.dataCriacao || 0) - new Date(a?.dataCriacao || 0));
    }

    return mapa;
  }, [notificacoesRecebidas]);
  const historicoEquipeSelecionada = useMemo(() => {
    const equipeId = modalHistoricoEquipe?.equipe?.id;
    if (equipeId == null) return [];
    return historicoTransferenciasPorEquipe.get(equipeId) || [];
  }, [historicoTransferenciasPorEquipe, modalHistoricoEquipe]);
  const historicoEquipeFiltrado = useMemo(() => (
    sortByTextKeys(
      filterRowsByCascade(historicoEquipeSelecionada, definicoesFiltroNotificacoes, filtrosHistoricoEquipe),
      (item) => item?.estoque?.nomeEquipamento,
      (item) => item?.estoque?.tagPatrimonio,
      (item) => item?.equipeOrigem?.nome,
      (item) => item?.equipeDestino?.nome,
    )
  ), [definicoesFiltroNotificacoes, filtrosHistoricoEquipe, historicoEquipeSelecionada]);
  const cardsNcDiaAdmin = useMemo(() => {
    return cardsAdminFiltrados.map(({ equipe, equipamentos: cards }) => {
      const equipamentosNc = cards.map((card) => {
        const execucaoHoje = (card.historico || []).find((execucao) => sameDay(execucao?.data, new Date()));
        if (!execucaoHoje) return null;

        const ncCount = Number(execucaoHoje?.ncCount || 0);
        if (!ncCount) return null;

        return { ...card, execucaoHoje, ncCount };
      }).filter(Boolean);

      return {
        equipe,
        equipamentos: equipamentosNc,
        totalNc: equipamentosNc.reduce((acc, card) => acc + card.ncCount, 0),
      };
    }).filter(({ equipamentos: cards }) => cards.length > 0);
  }, [cardsAdminFiltrados]);

  const parseModel = useCallback(async (modeloId) => {
    if (cache[modeloId]) return cache[modeloId];
    const modelo = modelos.find((m) => m.id === modeloId);
    if (!modelo || !modelo.arquivoNome) {
      throw new Error("Este modelo não possui arquivo importado.");
    }
    const buffer = await api.getArrayBuffer(`/api/checklist-modelos/${modeloId}/arquivo`);
    const wb = XLSX.read(buffer, { type: "array" });
    const rows = selectChecklistSheetRows(wb);
    const parsed = parseRows(rows);
    setCache((c) => ({ ...c, [modeloId]: parsed }));
    return parsed;
  }, [cache, modelos]);

  const showSemChecklistAviso = useCallback((equipamentoId) => {
    if (avisoTimeoutRef.current) clearTimeout(avisoTimeoutRef.current);
    setErro("");
    setAvisoSemChecklistId(equipamentoId);
    avisoTimeoutRef.current = setTimeout(() => setAvisoSemChecklistId((current) => (current === equipamentoId ? null : current)), 2200);
  }, []);

  const openView = async (card, execId = null) => {
    if (!card.modelo) return showSemChecklistAviso(card.equipamento.id);

    try {
      const [parsed, historyResponse] = await Promise.all([
        parseModel(card.modelo.id),
        api.get(`/api/execucoes/estoque/${card.equipamento.id}/semana-atual`).catch(() => []),
      ]);
      const history = filterExecutionsForWeek(Array.isArray(historyResponse) ? historyResponse : []);
      const selectedExecId = execId && history.some((item) => item.id === execId) ? execId : (history[0]?.id || null);
      setViewer({ card, parsed, history, execId: selectedExecId });
      setErro("");
    } catch (error) {
      const history = filterExecutionsForWeek(Array.isArray(card.historico) ? card.historico : []);
      const selectedExecId = execId || history[0]?.id || null;
      const selectedExec = history.find((e) => e.id === selectedExecId) || history[0] || null;
      const payload = parseExecPayload(selectedExec);

      if (payload?.secoes?.length) {
        const parsed = buildParsedFromExecution(payload, card.modelo?.nome || card.equipamento?.nomeEquipamento || "Checklist");
        setViewer({ card, parsed, history, execId: selectedExecId });
        setErro("");
        return;
      }

      throw error;
    }
  };

  const openEdit = async (card) => {
    if (!card.modelo) return showSemChecklistAviso(card.equipamento.id);
    const latest = card.historico?.[0];
    if (latest?.data && sameDay(latest.data, new Date())) return openView(card, latest.id);
    const parsed = await parseModel(card.modelo.id);
    setAnswers(Object.fromEntries(parsed.questions.map((q) => [q.id, ""])));
    setOperador(""); setAssinaturas({ encarregado: "", operador: "" }); setOk(""); setErro(""); setChecklistErro("");
    setEditor({ card, parsed, currentDate: new Date() });
  };

  const saveChecklist = async () => {
    if (!editor || !equipeUsuario) return;
    if (editor.parsed.questions.some((q) => !answers[q.id])) return setChecklistErro("Marque todos os itens antes de salvar.");
    if (!operador.trim()) return setChecklistErro("Preencha o nome do operador.");
    if (!assinaturas.encarregado || !assinaturas.operador) return setChecklistErro("As duas assinaturas sao obrigatorias.");
    setChecklistErro("");
    const secoes = new Map();
    editor.parsed.questions.forEach((q) => { if (!secoes.has(q.secao)) secoes.set(q.secao, []); secoes.get(q.secao).push({ item: q.item, descricao: q.descricao, criticidade: q.criticidade, resposta: answers[q.id] }); });
    const respostasJson = JSON.stringify({
      titulo: editor.parsed.title, empresa: editor.card.equipamento?.empresa?.nome || "", modelo: editor.card.equipamento?.nomeEquipamento || "", tag: editor.card.equipamento?.tagPatrimonio || "", dataChecklist: editor.currentDate.toISOString(),
      assinaturas: { encarregado: { nome: encarregadoNome, assinatura: assinaturas.encarregado }, operador: { nome: operador.trim(), assinatura: assinaturas.operador } },
      secoes: Array.from(secoes.entries()).map(([secao, itens]) => ({ secao, itens })),
    });

    try {
      const saved = await api.post("/api/execucoes", { equipeId: equipeUsuario.id, estoqueId: editor.card.equipamento.id, checklistModeloId: editor.card.modelo.id, respostasJson });
      const savedResumo = toExecucaoResumo(saved);
      setExecucoes((current) => [savedResumo, ...current.filter((item) => item.id !== savedResumo.id)]);
      setEditor(null); setOk("Checklist salvo com sucesso. O equipamento ja aparece em verde hoje."); setErro(""); setChecklistErro("");
    } catch (error) {
      setChecklistErro(error.message || "Nao foi possivel salvar o checklist.");
    }
  };

  const abrirModalEnvio = (card) => {
    setModalEnvio({ open: true, card });
    setEquipeDestinoId("");
    setErroEnvio("");
    setErro("");
    setOk("");
  };

  const enviarEquipamento = async () => {
    if (!modalEnvio.card) return;
    if (!equipeDestinoId) {
      setErroEnvio("Selecione a equipe de destino.");
      return;
    }

    const equipeOrigemId = modalEnvio.card?.equipamento?.equipeResponsavel?.id || equipeUsuario?.id;
    if (!equipeOrigemId) {
      setErroEnvio("Nao foi possivel identificar a equipe de origem deste equipamento.");
      return;
    }

    try {
      setSalvandoEnvio(true);
      setErroEnvio("");

      await api.post("/api/notificacoes/transferencia", {
        estoqueId: modalEnvio.card.equipamento.id,
        equipeOrigemId,
        equipeDestinoId: Number(equipeDestinoId),
      });

      setModalEnvio({ open: false, card: null });
      setEquipeDestinoId("");
      setOk("Transferencia registrada. O equipamento so muda de equipe quando o destino aceitar.");
      setErro("");
      carregarPainel();
    } catch (error) {
      setErroEnvio(error.message || "Nao foi possivel enviar o equipamento.");
    } finally {
      setSalvandoEnvio(false);
    }
  };

  const aceitarEnvio = async (notificacao) => {
    if (!notificacao?.id || !equipeUsuario?.id) return;

    try {
      setAceitandoEnvioId(notificacao.id);
      setErro("");
      setOk("");

      const atualizado = await api.patch(`/api/notificacoes/transferencia/${notificacao.id}/aceitar`, {
        equipeDestinoId: equipeUsuario.id,
      });

      const estoqueAtualizado = atualizado?.estoque;
      if (estoqueAtualizado?.id != null) {
        setEquipamentos((atual) => atual.map((item) => (item.id === estoqueAtualizado.id ? estoqueAtualizado : item)));
      }

      setNotificacoesRecebidas((atual) => atual.map((item) => (item.id === atualizado.id ? atualizado : item)));
      setOk("Envio aceito. Agora esse equipamento pertence a sua equipe.");
    } catch (error) {
      setErro(error.message || "Nao foi possivel aceitar o envio.");
    } finally {
      setAceitandoEnvioId(null);
    }
  };

  const selectedExec = viewer?.history.find((e) => e.id === viewer.execId) || null;
  const selectedPayload = parseExecPayload(selectedExec);
  const answerMap = new Map(flattenExecItems(selectedPayload).map((i) => [`${i.secao}-${i.item}`, i]));
  const weeklyMap = new Map(
    (viewer?.history || []).map((execucao) => {
      const date = new Date(execucao.data);
      const dayIndex = (date.getDay() + 6) % 7;
      return [weekOrder[dayIndex], parseExecPayload(execucao)];
    }),
  );
  const selectedCounts = {
    c: Array.from(answerMap.values()).filter((item) => item?.resposta === "C").length,
    nc: Array.from(answerMap.values()).filter((item) => item?.resposta === "NC").length,
    na: Array.from(answerMap.values()).filter((item) => item?.resposta === "NA").length,
  };

  const exportPdf = async () => {
    if (!viewer?.card || !selectedExec) return;
    await saveChecklistPdf({
      parsed: viewer.parsed,
      selectedExec,
      history: viewer.history,
      equipamento: viewer.card.equipamento,
      modeloNome: viewer.card.modelo?.arquivoNome || viewer.card.modelo?.nome,
    }, `checklist-${viewer.card.equipamento.nomeEquipamento || "equipamento"}.pdf`);
  };

  const prepCanvas = () => {
    const c = canvasRef.current; if (!c) return null; const ratio = window.devicePixelRatio || 1; const rect = c.getBoundingClientRect();
    c.width = rect.width * ratio; c.height = rect.height * ratio; const ctx = c.getContext("2d"); ctx.scale(ratio, ratio); ctx.fillStyle = "#fff"; ctx.fillRect(0, 0, rect.width, rect.height); ctx.lineWidth = 2.2; ctx.lineCap = "round"; ctx.lineJoin = "round"; ctx.strokeStyle = "#0f172a"; return { c, ctx, rect };
  };
  const point = (e, r) => e.touches?.[0] ? { x: e.touches[0].clientX - r.left, y: e.touches[0].clientY - r.top } : { x: e.clientX - r.left, y: e.clientY - r.top };
  const start = (e) => { const s = prepCanvas(); if (!s) return; const p = point(e, s.rect); drawingRef.current = true; s.ctx.beginPath(); s.ctx.moveTo(p.x, p.y); };
  const draw = (e) => { if (!drawingRef.current || !canvasRef.current) return; const ctx = canvasRef.current.getContext("2d"); const p = point(e, canvasRef.current.getBoundingClientRect()); ctx.lineTo(p.x, p.y); ctx.stroke(); };
  const stop = () => { drawingRef.current = false; };
  const clearSig = () => prepCanvas();
  const openSig = (target) => { setSigModal({ open: true, target }); setTimeout(() => { const s = prepCanvas(); const imgData = assinaturas[target]; if (!s || !imgData) return; const img = new Image(); img.onload = () => s.ctx.drawImage(img, 0, 0, s.rect.width, s.rect.height); img.src = imgData; }, 30); };
  const saveSig = () => canvasRef.current && setAssinaturas((c) => ({ ...c, [sigModal.target]: canvasRef.current.toDataURL("image/png") })) || setSigModal({ open: false, target: null });

  return (
    <div className="operacoes-page">
      <section className="operacoes-header">
        <div><p className="operacoes-kicker">Painel</p><h1>{isAdminOrDev ? "Equipes com Login" : "Checklist da Equipe"}</h1><p className="operacoes-subtitle">{isAdminOrDev ? "Clique na equipe e no equipamento para ver o checklist feito da semana." : "Cada equipamento so pode ter um checklist por dia. Depois disso ele vira visualizacao."}</p></div>
        <div className="operacoes-summary"><span>{isAdminOrDev ? "Total de Equipes" : "Hoje"}</span><strong>{isAdminOrDev ? cardsAdminFiltrados.length : fmtDate(new Date())}</strong></div>
      </section>
      {loading && <div className="operacoes-feedback">Carregando painel...</div>}
      {!loading && erro && <div className="operacoes-feedback erro">{erro}</div>}
      {!loading && !erro && ok && <div className="operacoes-feedback sucesso">{ok}</div>}
      {!loading && !erro && (
        isAdminOrDev ? (

          <section className="painel-analise-wrap">

            <section className="operacoes-filters">
              <CascadeMultiSelectFilters
                rows={cardsAdminFlat}
                filters={definicoesFiltroAdmin}
                value={filtrosAdminCards}
                onChange={setFiltrosAdminCards}
                storageKey="smart-filters:painel-admin"
              />
            </section>


            <button
              type="button"
              className={`painel-analise-card ${mostrarAnaliseEquipes ? "open" : ""}`}
              onClick={() => setMostrarAnaliseEquipes((atual) => !atual)}
            >
              <div>
                <p className="operacoes-kicker">Painel</p>
                <h2>Analisar equipes</h2>
                <p>{mostrarAnaliseEquipes ? "Toque para recolher os cards das equipes." : "Toque para abrir os cards das equipes e ver os checklists da semana."}</p>
              </div>
              <div className="painel-analise-meta">
                <strong>{cardsAdminFiltrados.length}</strong>
                <span>{cardsAdminFiltrados.length === 1 ? "equipe com login" : "equipes com login"}</span>
              </div>
            </button>

            {mostrarAnaliseEquipes && (
              <div className="painel-equipes-grid">
                {cardsAdminFiltrados.map(({ equipe, equipamentos, equipamentosProprios, equipamentosAlugados }) => {
                  const historicoCount = (historicoTransferenciasPorEquipe.get(equipe.id) || []).length;

                  return (
                    <article key={equipe.id} className={"painel-equipe-card" + (equipamentos.length ? " painel-equipe-card-rosinha" : "")}>
                      <button
                        type="button"
                        className="painel-equipe-msg-btn"
                        onClick={() => {
                          setModalHistoricoEquipe({ open: true, equipe });
                          setFiltrosHistoricoEquipe({ origem: [], equipamento: [], tag: [], destino: [], status: [] });
                        }}
                        title="Abrir historico de transferencias"
                        aria-label="Abrir historico de transferencias"
                      >
                        💬<span>{historicoCount}</span>
                      </button>

                      <div className="painel-equipe-card-header">
                        <strong>{equipe.nome}</strong>
                        <span>{equipe.tipoCategoria?.nome || "-"}</span>
                      </div>

                      <div className="painel-equipe-card-count">{equipamentos.length} equipamento(s)</div>

                      <div className="painel-equipe-card-body">
                        {equipamentos.length ? (
                          <>
                            {equipamentosProprios.length > 0 && (
                              <section className="painel-equipe-topico">
                                <h4>Equipamentos Proprios</h4>
                                <div className="painel-equipe-topico-list">
                                  {equipamentosProprios.map((card) => {
                                    const hoje = card.historico?.[0]?.data && sameDay(card.historico[0].data, new Date());

                                    return (
                                      <article key={card.cardKey} className="painel-equipe-item">
                                        <button type="button" className="painel-equipe-action" onClick={() => openView(card)}>
                                          <strong>{card.equipamento.nomeEquipamento}</strong>
                                          <span>{card.equipamento.tagPatrimonio || "Sem tag"}</span>
                                          <small className={`painel-equipe-status ${hoje ? "done" : "pending"}`}>
                                            {hoje ? "Checklist feito hoje" : "Checklist nao feito hoje"}
                                          </small>
                                        </button>
                                        <button
                                          type="button"
                                          className="painel-transfer-emoji-btn"
                                          onClick={() => abrirModalEnvio(card)}
                                          title="Transferir equipamento"
                                          aria-label="Transferir equipamento"
                                        >
                                          🔄
                                        </button>
                                      </article>
                                    );
                                  })}
                                </div>
                              </section>
                            )}

                            {equipamentosAlugados.length > 0 && (
                              <section className="painel-equipe-topico">
                                <h4>Equipamentos Alugados</h4>
                                <div className="painel-equipe-topico-list">
                                  {equipamentosAlugados.map((card) => {
                                    const hoje = card.historico?.[0]?.data && sameDay(card.historico[0].data, new Date());

                                    return (
                                      <article key={card.cardKey} className="painel-equipe-item">
                                        <button type="button" className="painel-equipe-action" onClick={() => openView(card)}>
                                          <strong>{card.equipamento.nomeEquipamento}</strong>
                                          <span>{card.equipamento.tagPatrimonio || "Sem tag"}</span>
                                          <small className={`painel-equipe-status ${hoje ? "done" : "pending"}`}>
                                            {hoje ? "Checklist feito hoje" : "Checklist nao feito hoje"}
                                          </small>
                                        </button>
                                      </article>
                                    );
                                  })}
                                </div>
                              </section>
                            )}
                          </>
                        ) : (
                          <p className="painel-equipe-empty">Nenhum equipamento direcionado para esta equipe.</p>
                        )}
                      </div>
                    </article>
                  );
                })}
              </div>
            )}

            <button
              type="button"
              className={`painel-analise-card alerta ${mostrarChecklistNcDia ? "open" : ""}`}
              onClick={() => setMostrarChecklistNcDia((atual) => !atual)}
            >
              <div>
                <p className="operacoes-kicker">Painel</p>
                <h2>Checklists NC do dia</h2>
                <p>{mostrarChecklistNcDia ? "Toque para recolher os equipamentos com nao conformidade." : "Toque para abrir as equipes com equipamentos marcados como NC hoje."}</p>
              </div>
              <div className="painel-analise-meta">
                <strong>{cardsNcDiaAdmin.length}</strong>
                <span>{cardsNcDiaAdmin.length === 1 ? "equipe com NC hoje" : "equipes com NC hoje"}</span>
              </div>
            </button>

            {mostrarChecklistNcDia && (
              <div className="painel-equipes-grid">
                {cardsNcDiaAdmin.length ? cardsNcDiaAdmin.map(({ equipe, equipamentos, totalNc }) => (
                  <article key={`nc-${equipe.id}`} className="painel-equipe-card painel-equipe-card-alerta">
                    <div className="painel-equipe-card-header">
                      <strong>{equipe.nome}</strong>
                      <span>{equipe.tipoCategoria?.nome || "-"}</span>
                    </div>
                    <div className="painel-equipe-card-count">{equipamentos.length} equipamento(s) com NC</div>
                    <div className="painel-equipe-card-count painel-equipe-card-count-alerta">{totalNc} item(ns) NC hoje</div>
                    <div className="painel-equipe-card-body">
                      {equipamentos.map((card) => (
                        <button key={`nc-equip-${card.equipamento.id}`} type="button" className="painel-equipe-item painel-equipe-action" onClick={() => openView(card, card.execucaoHoje?.id)}>
                          <strong>{card.equipamento.nomeEquipamento}</strong>
                          <span>{card.equipamento.tagPatrimonio || "Sem tag"}</span>
                          <small className="painel-equipe-status nc">{card.ncCount} item(ns) com NC</small>
                        </button>
                      ))}
                    </div>
                  </article>
                )) : (
                  <article className="painel-equipe-card painel-equipe-card-alerta">
                    <div className="painel-equipe-card-body">
                      <p className="painel-equipe-empty">Nenhum checklist com NC foi encontrado para hoje.</p>
                    </div>
                  </article>
                )}
              </div>
            )}
          </section>
        ) : (
          <div className="checklist-equipe-board">
            <section className="checklist-equipe-intro">
              <div>
                <p className="operacoes-kicker">Checklist</p>
                <h2>{equipeUsuario?.nome || "Equipe"}</h2>
                <p className="operacoes-subtitle">Toque no equipamento para fazer ou visualizar o checklist do dia.</p>
              </div>
              <div className="checklist-equipe-chip">{cardsEquipeFiltrados.length} equipamento(s)</div>
            </section>

            <section className="checklist-mobile-stats">
              <article className="checklist-mobile-stat-card">
                <span>Total</span>
                <strong>{cardsEquipeFiltrados.length}</strong>
              </article>
              <article className="checklist-mobile-stat-card done">
                <span>Feitos hoje</span>
                <strong>{cardsEquipeFiltrados.filter((c) => c.historico?.[0]?.data && sameDay(c.historico[0].data, new Date())).length}</strong>
              </article>
            </section>

            <section className="operacoes-filters">
              <CascadeMultiSelectFilters
                rows={cardsEquipe}
                filters={definicoesFiltroEquipeCards}
                value={filtrosEquipeCards}
                onChange={setFiltrosEquipeCards}
                storageKey="smart-filters:painel-equipe"
              />
            </section>

            <section className="painel-notificacao-section">
              <div className="painel-notificacao-head">
                <h3>Notificacoes de transferencia</h3>
                <span>{notificacoesFiltradas.length} registro(s)</span>
              </div>
              <section className="operacoes-filters">
                <CascadeMultiSelectFilters
                  rows={notificacoesRecebidas}
                  filters={definicoesFiltroNotificacoes}
                  value={filtrosNotificacoes}
                  onChange={setFiltrosNotificacoes}
                  storageKey="smart-filters:painel-notificacoes"
                />
              </section>
              <div className="operacoes-table-wrap painel-notificacao-table-wrap">
                <table className="operacoes-table painel-notificacao-table">
                  <thead>
                    <tr>
                      <th>Data envio</th>
                      <th>Data aceite</th>
                      <th>Equipe origem</th>
                      <th>Equipe destino/aceite</th>
                      <th>Equipamento</th>
                      <th>Tag</th>
                      <th>Status</th>
                      <th>Acao</th>
                    </tr>
                  </thead>
                  <tbody>
                    {notificacoesFiltradas.length ? notificacoesFiltradas.map((notificacao) => (
                      <tr key={notificacao.id}>
                        <td>{fmtDateTime(notificacao.dataCriacao)}</td>
                        <td>{fmtDateTime(notificacao.dataResposta)}</td>
                        <td>{notificacao?.equipeOrigem?.nome || "-"}</td>
                        <td>{notificacao?.equipeDestino?.nome || "-"}</td>
                        <td>{notificacao?.estoque?.nomeEquipamento || "-"}</td>
                        <td>{notificacao?.estoque?.tagPatrimonio || "-"}</td>
                        <td>{notificacao?.status || "-"}</td>
                        <td>
                          {notificacao?.status === "PENDENTE" ? (
                            <button
                              type="button"
                              className="operacoes-row-btn solicitacao"
                              onClick={() => aceitarEnvio(notificacao)}
                              disabled={aceitandoEnvioId === notificacao.id}
                            >
                              {aceitandoEnvioId === notificacao.id ? "Aceitando..." : "Aceitar envio"}
                            </button>
                          ) : (
                            <span className="operacoes-empty-state">Concluido</span>
                          )}
                        </td>
                      </tr>
                    )) : (
                      <tr>
                        <td colSpan={8} className="operacoes-empty-state">
                          Nenhuma transferencia encontrada para sua equipe.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </section>

            {cardsEquipePropriosFiltrados.length > 0 && (
              <section className="checklist-equipment-section">
                <h3>Equipamentos Proprios</h3>
                <div className="checklist-equipment-grid">
                  {cardsEquipePropriosFiltrados.map((card) => {
                    const hoje = card.historico?.[0]?.data && sameDay(card.historico[0].data, new Date());
                    const semChecklist = !card.modelo;
                    const mostrarAviso = avisoSemChecklistId === card.cardKey;

                    return (
                      <article
                        key={card.cardKey}
                        className={`checklist-equipment-card ${hoje ? "done-today" : ""}`}
                        onMouseEnter={() => semChecklist && setAvisoSemChecklistId(card.cardKey)}
                        onMouseLeave={() => semChecklist && setAvisoSemChecklistId((current) => (current === card.cardKey ? null : current))}
                      >
                        <button type="button" className="checklist-transfer-btn" onClick={() => abrirModalEnvio(card)}>
                          Enviar
                        </button>
                        <div className="checklist-equipment-card-top">
                          <div>
                            <strong>{card.equipamento.nomeEquipamento}</strong>
                            <span>{card.equipamento.tagPatrimonio || "Sem tag"}</span>
                          </div>
                          <span className={`checklist-model-badge ${card.modelo ? "ok" : "missing"}`}>{card.modelo ? "Modelo vinculado" : "Sem checklist"}</span>
                        </div>
                        <div className="checklist-equipment-meta">
                          <span>{card.equipamento.empresa?.nome || "-"}</span>
                          <span>{card.historico?.[0] ? `Ultimo checklist: ${fmtDateTime(card.historico[0].data)}` : "Sem checklist realizado"}</span>
                        </div>
                        {semChecklist && mostrarAviso && <div className="checklist-inline-warning">Esse equipamento ainda nao possui modelo de checklist vinculado.</div>}
                        <div className="checklist-card-footer">
                          <span className={`checklist-last-status ${hoje ? "done" : "pending"}`}>
                            {semChecklist ? "Sem checklist" : hoje ? "Checklist do dia concluido" : "Checklist pendente hoje"}
                          </span>
                        </div>
                        <button type="button" className="operacoes-primary-btn checklist-open-btn" onClick={() => (hoje ? openView(card, card.historico[0]?.id) : openEdit(card))}>
                          {semChecklist ? "Sem checklist" : hoje ? "Visualizar checklist" : "Fazer checklist"}
                        </button>
                      </article>
                    );
                  })}
                </div>
              </section>
            )}

            {cardsEquipeAlugadosFiltrados.length > 0 && (
              <section className="checklist-equipment-section">
                <h3>Equipamentos Alugados</h3>
                <div className="checklist-equipment-grid">
                  {cardsEquipeAlugadosFiltrados.map((card) => {
                    const hoje = card.historico?.[0]?.data && sameDay(card.historico[0].data, new Date());
                    const semChecklist = !card.modelo;
                    const mostrarAviso = avisoSemChecklistId === card.cardKey;

                    return (
                      <article
                        key={card.cardKey}
                        className={`checklist-equipment-card ${hoje ? "done-today" : ""}`}
                        onMouseEnter={() => semChecklist && setAvisoSemChecklistId(card.cardKey)}
                        onMouseLeave={() => semChecklist && setAvisoSemChecklistId((current) => (current === card.cardKey ? null : current))}
                      >
                        <div className="checklist-equipment-card-top">
                          <div>
                            <strong>{card.equipamento.nomeEquipamento}</strong>
                            <span>{card.equipamento.tagPatrimonio || "Sem tag"}</span>
                          </div>
                          <span className={`checklist-model-badge ${card.modelo ? "ok" : "missing"}`}>{card.modelo ? "Modelo vinculado" : "Sem checklist"}</span>
                        </div>
                        <div className="checklist-equipment-meta">
                          <span>{card.equipamento.empresa?.nome || "-"}</span>
                          <span>{card.historico?.[0] ? `Ultimo checklist: ${fmtDateTime(card.historico[0].data)}` : "Sem checklist realizado"}</span>
                        </div>
                        {semChecklist && mostrarAviso && <div className="checklist-inline-warning">Esse equipamento ainda nao possui modelo de checklist vinculado.</div>}
                        <div className="checklist-card-footer">
                          <span className={`checklist-last-status ${hoje ? "done" : "pending"}`}>
                            {semChecklist ? "Sem checklist" : hoje ? "Checklist do dia concluido" : "Checklist pendente hoje"}
                          </span>
                        </div>
                        <button type="button" className="operacoes-primary-btn checklist-open-btn" onClick={() => (hoje ? openView(card, card.historico[0]?.id) : openEdit(card))}>
                          {semChecklist ? "Sem checklist" : hoje ? "Visualizar checklist" : "Fazer checklist"}
                        </button>
                      </article>
                    );
                  })}
                </div>
              </section>
            )}

            {!cardsEquipeFiltrados.length && (
              <div className="operacoes-feedback">Nenhum equipamento encontrado com os filtros atuais.</div>
            )}
          </div>
        )
      )}

      {modalEnvio.open && (
        <Modal
          onClose={() => {
            setModalEnvio({ open: false, card: null });
            setEquipeDestinoId("");
            setErroEnvio("");
          }}
          size="sm"
        >
          <div className="operacoes-modal">
            <h2>Enviar equipamento</h2>
            <p>{modalEnvio.card?.equipamento?.nomeEquipamento || "-"}</p>

            <div className="operacoes-modal-form">
              <select value={equipeDestinoId} onChange={(event) => setEquipeDestinoId(event.target.value)}>
                <option value="">Selecione a equipe de destino</option>
                {equipesDestinoDisponiveis.map((equipe) => (
                  <option key={equipe.id} value={equipe.id}>
                    {equipe.nome}
                  </option>
                ))}
              </select>
            </div>

            {erroEnvio && <p className="operacoes-modal-error">{erroEnvio}</p>}

            <div className="operacoes-modal-actions">
              <button
                type="button"
                className="operacoes-secondary-btn"
                onClick={() => {
                  setModalEnvio({ open: false, card: null });
                  setEquipeDestinoId("");
                  setErroEnvio("");
                }}
              >
                Cancelar
              </button>
              <button type="button" className="operacoes-primary-btn" onClick={enviarEquipamento} disabled={salvandoEnvio}>
                {salvandoEnvio ? "Enviando..." : "Enviar equipamento"}
              </button>
            </div>
          </div>
        </Modal>
      )}

      {modalHistoricoEquipe.open && (
        <Modal
          onClose={() => { setModalHistoricoEquipe({ open: false, equipe: null }); setFiltrosHistoricoEquipe({ origem: [], equipamento: [], tag: [], destino: [], status: [] }); }}
          size="xl"
        >
          <div className="operacoes-modal">
            <h2>Historico de transferencias</h2>
            <p>{modalHistoricoEquipe?.equipe?.nome || "Equipe"}</p>
            <section className="operacoes-filters painel-modal-filtros-topo">
              <CascadeMultiSelectFilters
                rows={historicoEquipeSelecionada}
                filters={definicoesFiltroNotificacoes}
                value={filtrosHistoricoEquipe}
                onChange={setFiltrosHistoricoEquipe}
                className="painel-modal-filtros-pequenos"
              />
            </section>
            <div className="operacoes-table-wrap painel-notificacao-table-wrap">
              <table className="operacoes-table painel-notificacao-table">
                <thead>
                  <tr>
                    <th>Data envio</th>
                    <th>Data aceite</th>
                    <th>Equipamento</th>
                    <th>Tag</th>
                    <th>Equipe que realizou</th>
                    <th>Equipe que aceitou</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {historicoEquipeFiltrado.length ? historicoEquipeFiltrado.map((notificacao) => (
                    <tr key={notificacao.id}>
                      <td>{fmtDateTime(notificacao.dataCriacao)}</td>
                      <td>{fmtDateTime(notificacao.dataResposta)}</td>
                      <td>{notificacao?.estoque?.nomeEquipamento || "-"}</td>
                      <td>{notificacao?.estoque?.tagPatrimonio || "-"}</td>
                      <td>{notificacao?.equipeOrigem?.nome || "-"}</td>
                      <td>{notificacao?.equipeDestino?.nome || "-"}</td>
                      <td>{notificacao?.status || "-"}</td>
                    </tr>
                  )) : (
                    <tr>
                      <td colSpan={7} className="operacoes-empty-state">
                        Nenhum historico de transferencia para esta equipe.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
            <div className="operacoes-modal-actions">
              <button
                type="button"
                className="operacoes-secondary-btn"
                  onClick={() => { setModalHistoricoEquipe({ open: false, equipe: null }); setFiltrosHistoricoEquipe({ origem: [], equipamento: [], tag: [], destino: [], status: [] }); }}
              >
                Fechar
              </button>
            </div>
          </div>
        </Modal>
      )}

      {editor && <Modal onClose={() => { setEditor(null); setChecklistErro(""); }} size="lg" contentStyle={{ paddingTop: 28 }}><div className="checklist-mobile-sheet"><div className="checklist-mobile-header"><div><p className="checklist-mobile-kicker">{editor.parsed.title}</p><h2>{editor.card.equipamento.nomeEquipamento}</h2></div><div className="checklist-mobile-date">{fmtDate(editor.currentDate)}</div></div><div className="checklist-mobile-summary"><div><span>Empresa</span><strong>{editor.card.equipamento.empresa?.nome || "-"}</strong></div><div><span>Modelo</span><strong>{editor.card.equipamento.nomeEquipamento || "-"}</strong></div><div><span>Tag</span><strong>{editor.card.equipamento.tagPatrimonio || "-"}</strong></div><div><span>Equipe</span><strong>{equipeUsuario?.nome || "-"}</strong></div></div>{checklistErro && <div className="operacoes-feedback erro">{checklistErro}</div>}<div className="checklist-mobile-legend"><span className="legend-option c">C</span><span className="legend-option nc">NC</span><span className="legend-option na">NA</span></div><div className="checklist-mobile-progress"><strong>{Object.values(answers).filter(Boolean).length}</strong><span>de {editor.parsed.questions.length} itens respondidos</span></div><div className="checklist-mobile-questions">{editor.parsed.questions.map((q, i, arr) => <div key={q.id}>{(i === 0 || arr[i - 1].secao !== q.secao) && <div className="checklist-section-title">{q.secao}</div>}<article className="checklist-question-card"><div className="checklist-question-top"><span className="checklist-question-number">{q.item}</span><div className="checklist-question-texts"><strong>{q.descricao}</strong>{q.criticidade && <span className={`checklist-priority ${String(q.criticidade).toLowerCase()}`}>{q.criticidade}</span>}</div></div><div className="checklist-answer-grid">{["C", "NC", "NA"].map((v) => <button key={v} type="button" className={`checklist-answer-btn ${answers[q.id] === v ? "selected" : ""}`} onClick={() => setAnswers((c) => ({ ...c, [q.id]: v }))}><span>{v}</span><small>{respLabel(v)}</small></button>)}</div></article></div>)}</div><section className="checklist-signatures-section"><div className="checklist-signature-card"><span>Assinatura do encarregado</span><strong>{encarregadoNome}</strong><button type="button" className="operacoes-secondary-btn" onClick={() => openSig("encarregado")}>{assinaturas.encarregado ? "Refazer assinatura" : "Assinar"}</button></div><div className="checklist-signature-card"><span>Assinatura do operador</span><input type="text" className="operacoes-input" placeholder="Nome completo do operador" value={operador} onChange={(e) => setOperador(e.target.value)} /><button type="button" className="operacoes-secondary-btn" onClick={() => openSig("operador")}>{assinaturas.operador ? "Refazer assinatura" : "Assinar"}</button></div></section><div className="checklist-mobile-actions"><button type="button" className="operacoes-secondary-btn" onClick={() => { setEditor(null); setChecklistErro(""); }}>Cancelar</button><button type="button" className="operacoes-primary-btn" onClick={saveChecklist}>Salvar checklist</button></div></div></Modal>}

      {viewer && <Modal onClose={() => setViewer(null)} size="xl" contentClassName="checklist-viewer-modal" contentStyle={{ paddingTop: 28 }}>
        {isAdminOrDev ? (
          <div className="checklist-admin-sheet">
            <div className="checklist-admin-head">
              <div className="checklist-admin-logo">Macro Ambiental</div>
              <div className="checklist-admin-title">{viewer.parsed.title}</div>
              <div className="checklist-admin-meta">
                <strong>{viewer.card.equipamento.nomeEquipamento}</strong>
                <span>TAG: {viewer.card.equipamento.tagPatrimonio || "-"}</span>
              </div>
            </div>

            <div className="checklist-admin-company-row">
              <div><strong>Empresa:</strong> {selectedPayload?.empresa || viewer.card.equipamento.empresa?.nome || "-"}</div>
              <div><strong>Marca/Modelo:</strong> {selectedPayload?.modelo || viewer.card.equipamento.nomeEquipamento || "-"}</div>
              <div><strong>Data selecionada:</strong> {selectedPayload?.dataChecklist ? fmtDateTime(selectedPayload.dataChecklist) : "-"}</div>
            </div>

            <div className="checklist-history-strip">
              <strong>Controle semanal</strong>
              <div className="checklist-history-list">
                {viewer.history.length ? viewer.history.map((e) => <button key={e.id} type="button" className={`checklist-history-btn ${viewer.execId === e.id ? "selected" : ""}`} onClick={() => setViewer((c) => ({ ...c, execId: e.id }))}>{fmtDateTime(e.data)}</button>) : <span className="checklist-history-empty">Nenhum checklist feito nesta semana.</span>}
              </div>
            </div>

            <div className="checklist-admin-table-wrap">
              <table className="checklist-admin-table">
                <thead>
                  <tr>
                    <th>Item</th>
                    <th>Descricao</th>
                    {weekOrder.map((day, idx) => {
                      const todayIdx = (new Date().getDay() + 6) % 7;
                      return (
                        <th
                          key={day}
                          className={idx === todayIdx ? "checklist-admin-today-col" : undefined}
                        >
                          {day}
                        </th>
                      );
                    })}
                  </tr>
                </thead>
                <tbody>
                  {viewer.parsed.questions.map((q, i, arr) => (
                    <Fragment key={q.id}>
                      {(i === 0 || arr[i - 1].secao !== q.secao) && (
                        <tr key={`${q.id}-secao`} className="checklist-admin-section-row">
                          <td colSpan={9}>{q.secao}</td>
                        </tr>
                      )}
                        <tr key={q.id}>
                          <td>{q.item}</td>
                          <td>{q.descricao}</td>
                          {weekOrder.map((day, idx) => {
                            const todayIdx = (new Date().getDay() + 6) % 7;
                            const payload = weeklyMap.get(day);
                            const sectionItem = findExecItem(payload, q);
                            return (
                              <td
                                key={`${q.id}-${day}`}
                                className={idx === todayIdx ? "checklist-admin-today-col" : undefined}
                              >
                                <span className={`checklist-admin-cell ${sectionItem?.resposta ? sectionItem.resposta.toLowerCase() : "empty"}`}>
                                  {sectionItem?.resposta || "-"}
                                </span>
                              </td>
                            );
                          })}
                      </tr>
                    </Fragment>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="checklist-admin-day-panel">
              <div className="checklist-admin-day-header">
                <strong>Dia selecionado</strong>
                <span>{selectedPayload?.dataChecklist ? fmtDateTime(selectedPayload.dataChecklist) : "Nenhum checklist selecionado"}</span>
              </div>

              <div className="checklist-admin-day-counts">
                <span className="checklist-admin-count c">C: {selectedCounts.c}</span>
                <span className="checklist-admin-count nc">NC: {selectedCounts.nc}</span>
                <span className="checklist-admin-count na">NA: {selectedCounts.na}</span>
              </div>

              <div className="checklist-admin-signatures">
                <div>
                  <strong>Encarregado:</strong> {selectedPayload?.assinaturas?.encarregado?.nome || "-"}
                  <div className="signature-preview-box admin">
                    {selectedPayload?.assinaturas?.encarregado?.assinatura ? (
                      <img src={selectedPayload.assinaturas.encarregado.assinatura} alt="Assinatura do encarregado" />
                    ) : (
                      <em>Sem assinatura</em>
                    )}
                  </div>
                </div>
                <div>
                  <strong>Operador:</strong> {selectedPayload?.assinaturas?.operador?.nome || "-"}
                  <div className="signature-preview-box admin">
                    {selectedPayload?.assinaturas?.operador?.assinatura ? (
                      <img src={selectedPayload.assinaturas.operador.assinatura} alt="Assinatura do operador" />
                    ) : (
                      <em>Sem assinatura</em>
                    )}
                  </div>
                </div>
              </div>
            </div>

            <div className="checklist-mobile-actions">
              <button type="button" className="operacoes-secondary-btn" onClick={() => setViewer(null)}>Fechar</button>
              <button type="button" className="operacoes-primary-btn" onClick={exportPdf} disabled={!selectedExec}>Visualizar em PDF</button>
            </div>
          </div>
        ) : (
          <div className="checklist-viewer-sheet"><div className="checklist-mobile-header"><div><p className="checklist-mobile-kicker">{viewer.parsed.title}</p><h2>{viewer.card.equipamento.nomeEquipamento}</h2></div><div className={`checklist-visual-status ${selectedExec ? "done" : "pending"}`}>{selectedExec ? "Checklist feito" : "Checklist nao feito"}</div></div><div className="checklist-mobile-summary"><div><span>Empresa</span><strong>{selectedPayload?.empresa || viewer.card.equipamento.empresa?.nome || "-"}</strong></div><div><span>Modelo</span><strong>{selectedPayload?.modelo || viewer.card.equipamento.nomeEquipamento || "-"}</strong></div><div><span>Tag</span><strong>{selectedPayload?.tag || viewer.card.equipamento.tagPatrimonio || "-"}</strong></div><div><span>Data</span><strong>{selectedPayload?.dataChecklist ? fmtDateTime(selectedPayload.dataChecklist) : "-"}</strong></div></div><div className="checklist-history-strip"><strong>Historico da semana</strong><div className="checklist-history-list">{viewer.history.length ? viewer.history.map((e) => <button key={e.id} type="button" className={`checklist-history-btn ${viewer.execId === e.id ? "selected" : ""}`} onClick={() => setViewer((c) => ({ ...c, execId: e.id }))}>{fmtDateTime(e.data)}</button>) : <span className="checklist-history-empty">Nenhum checklist feito nesta semana.</span>}</div></div><div className="checklist-mobile-questions viewer">{viewer.parsed.questions.map((q, i, arr) => { const item = answerMap.get(q.id); return <div key={q.id}>{(i === 0 || arr[i - 1].secao !== q.secao) && <div className="checklist-section-title">{q.secao}</div>}<article className="checklist-question-card viewer"><div className="checklist-question-top"><span className="checklist-question-number">{q.item}</span><div className="checklist-question-texts"><strong>{q.descricao}</strong>{q.criticidade && <span className={`checklist-priority ${String(q.criticidade).toLowerCase()}`}>{q.criticidade}</span>}</div></div><div className="checklist-viewer-answer-row"><span className={`checklist-viewer-answer ${item?.resposta ? item.resposta.toLowerCase() : "empty"}`}>{respLabel(item?.resposta)}</span></div></article></div>; })}</div><section className="checklist-signatures-section"><div className="checklist-signature-card"><span>Assinatura do encarregado</span><strong>{selectedPayload?.assinaturas?.encarregado?.nome || "-"}</strong><div className="signature-preview-box">{selectedPayload?.assinaturas?.encarregado?.assinatura ? <img src={selectedPayload.assinaturas.encarregado.assinatura} alt="Assinatura do encarregado" /> : <em>Sem assinatura</em>}</div></div><div className="checklist-signature-card"><span>Assinatura do operador</span><strong>{selectedPayload?.assinaturas?.operador?.nome || "-"}</strong><div className="signature-preview-box">{selectedPayload?.assinaturas?.operador?.assinatura ? <img src={selectedPayload.assinaturas.operador.assinatura} alt="Assinatura do operador" /> : <em>Sem assinatura</em>}</div></div></section><div className="checklist-mobile-actions"><button type="button" className="operacoes-secondary-btn" onClick={() => setViewer(null)}>Fechar</button><button type="button" className="operacoes-primary-btn" onClick={exportPdf} disabled={!selectedExec}>Visualizar em PDF</button></div></div>
        )}
      </Modal>}

      {sigModal.open && <Modal onClose={() => setSigModal({ open: false, target: null })} size="md"><div className="operacoes-modal"><h2>{sigModal.target === "encarregado" ? "Assinatura do encarregado" : "Assinatura do operador"}</h2><p>Assine com o dedo no celular ou com o mouse.</p><div className="signature-modal-header"><strong>{sigModal.target === "encarregado" ? encarregadoNome : operador || "Operador"}</strong></div><canvas ref={canvasRef} className="signature-canvas" onMouseDown={start} onMouseMove={draw} onMouseUp={stop} onMouseLeave={stop} onTouchStart={start} onTouchMove={draw} onTouchEnd={stop} /><div className="operacoes-modal-actions"><button type="button" className="operacoes-secondary-btn" onClick={clearSig}>Limpar</button><button type="button" className="operacoes-primary-btn" onClick={() => { saveSig(); setSigModal({ open: false, target: null }); }}>Salvar assinatura</button></div></div></Modal>}
    </div>
  );
}
