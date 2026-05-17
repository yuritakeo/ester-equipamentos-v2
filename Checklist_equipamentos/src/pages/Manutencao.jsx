import { Fragment, useContext, useEffect, useMemo, useState } from "react";
import Modal from "../components/Modal";
import CascadeMultiSelectFilters from "../components/CascadeMultiSelectFilters";
import OutletLoading from "../components/OutletLoading";
import { AuthContext } from "../context/AuthContext";
import { api } from "../services/api";
import { filterRowsByCascade } from "../utils/cascadeFilters";
import { formatDateTimeBR, toIsoDateBrazil } from "../utils/dateTime";
import { sortByTextKeys } from "../utils/sort";
import { isAdminLikeRole, isOperationalRole, normalizeUserRole } from "../utils/userRoles";
import "../Styles/operacoes.css";

const STATUS_LABELS = {
  PENDENTE: "Pendente",
  CONCLUIDO: "Concluido",
  INUTILIZADO: "Inutilizado",
};

function formatDateTime(value) {
  return formatDateTimeBR(value);
}

function formatCurrency(value) {
  const amount = Number(value ?? 0);

  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(Number.isFinite(amount) ? amount : 0);
}

function somarValoresSubtarefas(subtarefas) {
  if (!Array.isArray(subtarefas) || !subtarefas.length) return 0;

  return subtarefas.reduce((total, item) => total + Number(item?.valorTotal ?? 0), 0);
}

function parseNumberOrNull(value) {
  if (value == null) return null;

  const normalized = String(value).trim().replace(",", ".");
  if (!normalized) return null;

  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : null;
}

function normalizarTipo(valor) {
  return normalizeUserRole(valor);
}

function normalizarTexto(valor) {
  const texto = String(valor || "").trim();
  return texto || null;
}

function formatStatus(value) {
  return STATUS_LABELS[String(value || "").toUpperCase()] || value || "-";
}

function fileToDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ""));
    reader.onerror = () => reject(new Error("Nao foi possivel ler o arquivo da nota fiscal."));
    reader.readAsDataURL(file);
  });
}

function isEquipeOperacionalAtiva(equipe) {
  if (!equipe || equipe?.ativo === false) return false;
  return isOperationalRole(equipe?.tipoCategoria?.nome);
}

function getMimeTypeFromDataUrl(dataUrl) {
  if (!dataUrl || !String(dataUrl).startsWith("data:")) return "";
  const head = String(dataUrl).split(";")[0];
  return head.replace("data:", "").toLowerCase();
}

function getFileExtensionFromMime(mimeType) {
  const mime = String(mimeType || "").toLowerCase();
  if (mime.includes("pdf")) return "pdf";
  if (mime.includes("png")) return "png";
  if (mime.includes("jpeg") || mime.includes("jpg")) return "jpg";
  if (mime.includes("webp")) return "webp";
  return "bin";
}

export default function Manutencao() {
  const { usuario } = useContext(AuthContext);

  const [registros, setRegistros] = useState([]);
  const [equipes, setEquipes] = useState([]);
  const [filtrosCascata, setFiltrosCascata] = useState({
    equipamento: [],
    tag: [],
    canteiro: [],
    status: [],
    equipeUltima: [],
    equipeConclusao: [],
    entrada: [],
    saida: [],
  });
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState("");
  const [salvando, setSalvando] = useState(false);
  const [acaoErro, setAcaoErro] = useState("");

  const [registroSelecionado, setRegistroSelecionado] = useState(null);
  const [subRegistroSelecionado, setSubRegistroSelecionado] = useState(null);
  const [subManutencoesExpandidas, setSubManutencoesExpandidas] = useState([]);
  const [conclusaoModalOpen, setConclusaoModalOpen] = useState(false);
  const [inutilizadoModalOpen, setInutilizadoModalOpen] = useState(false);
  const [subManutencaoModalOpen, setSubManutencaoModalOpen] = useState(false);
  const [subConclusaoModalOpen, setSubConclusaoModalOpen] = useState(false);
  const [subEdicaoModalOpen, setSubEdicaoModalOpen] = useState(false);

  const [conclusaoValorTotal, setConclusaoValorTotal] = useState("");
  const [conclusaoDescricao, setConclusaoDescricao] = useState("");
  const [conclusaoFotoNotaFiscal, setConclusaoFotoNotaFiscal] = useState("");
  const [conclusaoEquipeDestinoId, setConclusaoEquipeDestinoId] = useState("");
  const [conclusaoNomeArquivoFoto, setConclusaoNomeArquivoFoto] = useState("");
  const [subManutencaoObservacao, setSubManutencaoObservacao] = useState("");
  const [subManutencaoValorTotal, setSubManutencaoValorTotal] = useState("");
  const [subManutencaoFotoNotaFiscal, setSubManutencaoFotoNotaFiscal] = useState("");
  const [subManutencaoNomeArquivoFoto, setSubManutencaoNomeArquivoFoto] = useState("");
  const [subConclusaoValorTotal, setSubConclusaoValorTotal] = useState("");
  const [subConclusaoDescricao, setSubConclusaoDescricao] = useState("");
  const [subConclusaoFotoNotaFiscal, setSubConclusaoFotoNotaFiscal] = useState("");
  const [subConclusaoNomeArquivoFoto, setSubConclusaoNomeArquivoFoto] = useState("");
  const [subEdicaoObservacao, setSubEdicaoObservacao] = useState("");
  const [subEdicaoValorTotal, setSubEdicaoValorTotal] = useState("");
  const [subEdicaoDescricao, setSubEdicaoDescricao] = useState("");
  const [subEdicaoFotoNotaFiscal, setSubEdicaoFotoNotaFiscal] = useState("");
  const [subEdicaoNomeArquivoFoto, setSubEdicaoNomeArquivoFoto] = useState("");
  const [descricaoInutilizado, setDescricaoInutilizado] = useState("");
  const [notaFiscalModalOpen, setNotaFiscalModalOpen] = useState(false);
  const [notaFiscalModalSrc, setNotaFiscalModalSrc] = useState("");
  const [notaFiscalModalMime, setNotaFiscalModalMime] = useState("");
  const [notaFiscalModalNome, setNotaFiscalModalNome] = useState("nota-fiscal");
  const [notaFiscalZoom, setNotaFiscalZoom] = useState(1);

  const tipoUsuario = normalizarTipo(usuario?.tipoCategoria || usuario?.tipoUsuario);
  const isAdminOrDeveloper = isAdminLikeRole(tipoUsuario);
  const conclusaoValorValido = parseNumberOrNull(conclusaoValorTotal) != null;
  const subManutencaoValorValido = parseNumberOrNull(subManutencaoValorTotal) != null;
  const subConclusaoValorValido = parseNumberOrNull(subConclusaoValorTotal) != null;
  const subEdicaoValorValido = parseNumberOrNull(subEdicaoValorTotal) != null;
  const subtotalSubtarefas = somarValoresSubtarefas(registroSelecionado?.subManutencoes);
  const totalConclusaoCalculado = subtotalSubtarefas + Number(parseNumberOrNull(conclusaoValorTotal) ?? 0);

  async function carregarDados() {
    try {
      const [manutencoesResponse, equipesResponse] = await Promise.all([
        api.get("/api/manutencoes"),
        api.get("/api/equipes"),
      ]);

      setRegistros(Array.isArray(manutencoesResponse) ? manutencoesResponse : []);
      setEquipes(Array.isArray(equipesResponse) ? equipesResponse : []);
      setErro("");
    } catch (errorCarregamento) {
      setErro(errorCarregamento.message || "Erro ao buscar registros de manutencao.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    carregarDados();
  }, []);

  const equipesOperacionais = useMemo(() => {
    return sortByTextKeys(
      equipes.filter((item) => isEquipeOperacionalAtiva(item)),
      (item) => item?.nome,
      (item) => item?.tipoCategoria?.nome,
    );
  }, [equipes]);

  const definicoesFiltro = useMemo(() => ([
    {
      id: "equipamento",
      label: "Equipamentos",
      getValue: (item) => item?.equipamento?.nomeEquipamento ?? item?.nomeEquipamentoSnapshot,
    },
    {
      id: "tag",
      label: "Tags",
      getValue: (item) => item?.equipamento?.tagPatrimonio ?? item?.tagPatrimonioSnapshot,
    },
    {
      id: "status",
      label: "Status",
      getValue: (item) => formatStatus(item?.status),
    },
    {
      id: "canteiro",
      label: "Canteiros",
      getValue: (item) => item?.equipamento?.canteiro?.nome ?? item?.canteiroNomeSnapshot,
    },
    {
      id: "equipeUltima",
      label: "Ultima equipe",
      getValue: (item) => item?.equipeUltima?.nome,
    },
    {
      id: "equipeConclusao",
      label: "Equipe conclusao",
      getValue: (item) => item?.equipeConclusao?.nome,
    },
    {
      id: "entrada",
      label: "Data entrada",
      searchPlaceholder: "Buscar data de entrada (AAAA-MM-DD)",
      getValue: (item) => toIsoDateBrazil(item?.dataEntrada),
    },
    {
      id: "saida",
      label: "Data saida",
      searchPlaceholder: "Buscar data de saida (AAAA-MM-DD)",
      getValue: (item) => toIsoDateBrazil(item?.dataSaida),
    },
  ]), []);

  const registrosFiltrados = useMemo(() => {
    return sortByTextKeys(
      filterRowsByCascade(registros, definicoesFiltro, filtrosCascata),
      (item) => item?.equipamento?.nomeEquipamento ?? item?.nomeEquipamentoSnapshot,
      (item) => item?.equipamento?.tagPatrimonio ?? item?.tagPatrimonioSnapshot,
      (item) => item?.equipamento?.canteiro?.nome ?? item?.canteiroNomeSnapshot,
      (item) => item?.equipeUltima?.nome,
    );
  }, [registros, definicoesFiltro, filtrosCascata]);

  const resumo = useMemo(() => {
    const pendentes = registrosFiltrados.filter((item) => String(item?.status || "").toUpperCase() === "PENDENTE").length;
    const concluidos = registrosFiltrados.filter((item) => String(item?.status || "").toUpperCase() === "CONCLUIDO").length;
    const inutilizados = registrosFiltrados.filter((item) => String(item?.status || "").toUpperCase() === "INUTILIZADO").length;

    return {
      total: registrosFiltrados.length,
      pendentes,
      concluidos,
      inutilizados,
    };
  }, [registrosFiltrados]);

  function abrirModalConclusao(registro) {
    setRegistroSelecionado(registro);
    setConclusaoValorTotal(registro?.valorTotal != null ? String(registro.valorTotal) : "");
    setConclusaoDescricao(registro?.descricao || "");
    setConclusaoFotoNotaFiscal(registro?.fotoNotaFiscal || "");
    setConclusaoNomeArquivoFoto("");

    const equipeUltima = registro?.equipeUltima;
    const equipeInicial = isEquipeOperacionalAtiva(equipeUltima) ? String(equipeUltima.id) : "";
    setConclusaoEquipeDestinoId(equipeInicial);

    setAcaoErro("");
    setConclusaoModalOpen(true);
  }

  function abrirModalInutilizado(registro) {
    setRegistroSelecionado(registro);
    setDescricaoInutilizado(registro?.descricao || registro?.observacao || "");
    setAcaoErro("");
    setInutilizadoModalOpen(true);
  }

  function abrirModalSubManutencao(registro) {
    setRegistroSelecionado(registro);
    setSubManutencaoObservacao("");
    setSubManutencaoValorTotal("");
    setSubManutencaoFotoNotaFiscal("");
    setSubManutencaoNomeArquivoFoto("");
    setAcaoErro("");
    setSubManutencaoModalOpen(true);
  }

  function abrirModalConclusaoSubManutencao(registro) {
    setSubRegistroSelecionado(registro);
    setSubConclusaoValorTotal(registro?.valorTotal != null ? String(registro.valorTotal) : "");
    setSubConclusaoDescricao(registro?.descricao || "");
    setSubConclusaoFotoNotaFiscal(registro?.fotoNotaFiscal || "");
    setSubConclusaoNomeArquivoFoto("");
    setAcaoErro("");
    setSubConclusaoModalOpen(true);
  }

  function abrirModalEditarSubManutencao(registro) {
    setSubRegistroSelecionado(registro);
    setSubEdicaoObservacao(registro?.observacao || "");
    setSubEdicaoValorTotal(registro?.valorTotal != null ? String(registro.valorTotal) : "");
    setSubEdicaoDescricao(registro?.descricao || "");
    setSubEdicaoFotoNotaFiscal(registro?.fotoNotaFiscal || "");
    setSubEdicaoNomeArquivoFoto("");
    setAcaoErro("");
    setSubEdicaoModalOpen(true);
  }

  function alternarExpansaoSubManutencoes(registro) {
    if (!Array.isArray(registro?.subManutencoes) || !registro.subManutencoes.length) return;

    setSubManutencoesExpandidas((atual) =>
      atual.includes(registro.id)
        ? atual.filter((id) => id !== registro.id)
        : [...atual, registro.id],
    );
  }

  async function onSelecionarFotoNotaFiscal(event) {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      const dataUrl = await fileToDataUrl(file);
      setConclusaoFotoNotaFiscal(dataUrl);
      setConclusaoNomeArquivoFoto(file.name || "nota-fiscal");
      setAcaoErro("");
    } catch (errorUpload) {
      setAcaoErro(errorUpload.message || "Nao foi possivel carregar a foto da nota fiscal.");
    } finally {
      event.target.value = "";
    }
  }

  async function onSelecionarFotoNotaFiscalSub(event) {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      const dataUrl = await fileToDataUrl(file);
      setSubConclusaoFotoNotaFiscal(dataUrl);
      setSubConclusaoNomeArquivoFoto(file.name || "nota-fiscal");
      setAcaoErro("");
    } catch (errorUpload) {
      setAcaoErro(errorUpload.message || "Nao foi possivel carregar a foto da nota fiscal.");
    } finally {
      event.target.value = "";
    }
  }

  async function onSelecionarFotoNotaFiscalSubCriacao(event) {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      const dataUrl = await fileToDataUrl(file);
      setSubManutencaoFotoNotaFiscal(dataUrl);
      setSubManutencaoNomeArquivoFoto(file.name || "nota-fiscal");
      setAcaoErro("");
    } catch (errorUpload) {
      setAcaoErro(errorUpload.message || "Nao foi possivel carregar a foto da nota fiscal.");
    } finally {
      event.target.value = "";
    }
  }

  async function onSelecionarFotoNotaFiscalSubEdicao(event) {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      const dataUrl = await fileToDataUrl(file);
      setSubEdicaoFotoNotaFiscal(dataUrl);
      setSubEdicaoNomeArquivoFoto(file.name || "nota-fiscal");
      setAcaoErro("");
    } catch (errorUpload) {
      setAcaoErro(errorUpload.message || "Nao foi possivel carregar a foto da nota fiscal.");
    } finally {
      event.target.value = "";
    }
  }

  async function concluirManutencao(destinoAposConclusao) {
    if (!registroSelecionado) return;

    const destino = String(destinoAposConclusao || "").toUpperCase();

    if (!conclusaoValorValido) {
      setAcaoErro("Informe o valor gasto na manutencao. Pode ser 0.");
      return;
    }

    if (destino === "EQUIPE" && !conclusaoEquipeDestinoId) {
      setAcaoErro("Selecione uma equipe para direcionar o equipamento.");
      return;
    }

    try {
      setSalvando(true);
      setAcaoErro("");

      await api.put(`/api/manutencoes/${registroSelecionado.id}`, {
        equipamentoId: registroSelecionado.equipamento.id,
        emailId: registroSelecionado.email?.id ?? null,
        status: "CONCLUIDO",
        observacao: registroSelecionado.observacao || null,
        descricao: normalizarTexto(conclusaoDescricao),
        fotoNotaFiscal: normalizarTexto(conclusaoFotoNotaFiscal),
        valorTotal: parseNumberOrNull(conclusaoValorTotal),
        destinoAposConclusao: destino,
        equipeDestinoId: destino === "EQUIPE" ? Number(conclusaoEquipeDestinoId) : null,
      });

      await carregarDados();
      setConclusaoModalOpen(false);
    } catch (errorAcao) {
      setAcaoErro(errorAcao.message || "Nao foi possivel concluir a manutencao.");
    } finally {
      setSalvando(false);
    }
  }

  async function marcarComoInutilizado() {
    if (!registroSelecionado) return;
    if (!normalizarTexto(descricaoInutilizado)) {
      setAcaoErro("Informe uma descricao para inutilizar o equipamento.");
      return;
    }

    try {
      setSalvando(true);
      setAcaoErro("");

      await api.put(`/api/manutencoes/${registroSelecionado.id}`, {
        equipamentoId: registroSelecionado.equipamento.id,
        emailId: registroSelecionado.email?.id ?? null,
        status: "INUTILIZADO",
        observacao: registroSelecionado.observacao || null,
        descricao: normalizarTexto(descricaoInutilizado),
        fotoNotaFiscal: null,
        valorTotal: null,
        destinoAposConclusao: "OFICINA",
        equipeDestinoId: null,
      });

      await carregarDados();
      setInutilizadoModalOpen(false);
    } catch (errorAcao) {
      setAcaoErro(errorAcao.message || "Nao foi possivel marcar o equipamento como inutilizado.");
    } finally {
      setSalvando(false);
    }
  }

  async function criarSubManutencao() {
    if (!registroSelecionado?.id || !registroSelecionado?.equipamento?.id) return;

    const observacao = normalizarTexto(subManutencaoObservacao);
    if (!observacao) {
      setAcaoErro("Informe a falha ou observacao da submanutencao.");
      return;
    }

    if (!subManutencaoValorValido) {
      setAcaoErro("Informe o valor da submanutencao. Pode ser 0.");
      return;
    }

    if (!normalizarTexto(subManutencaoFotoNotaFiscal)) {
      setAcaoErro("Anexe a nota fiscal da submanutencao.");
      return;
    }

    try {
      setSalvando(true);
      setAcaoErro("");

      await api.post(`/api/manutencoes/${registroSelecionado.id}/submanutencoes`, {
        equipamentoId: registroSelecionado.equipamento.id,
        emailId: registroSelecionado.email?.id ?? null,
        status: "PENDENTE",
        observacao,
        descricao: null,
        fotoNotaFiscal: normalizarTexto(subManutencaoFotoNotaFiscal),
        valorTotal: parseNumberOrNull(subManutencaoValorTotal),
        destinoAposConclusao: null,
        equipeDestinoId: null,
      });

      await carregarDados();
      setSubManutencoesExpandidas((atual) => (
        atual.includes(registroSelecionado.id) ? atual : [...atual, registroSelecionado.id]
      ));
      setSubManutencaoModalOpen(false);
    } catch (errorAcao) {
      setAcaoErro(errorAcao.message || "Nao foi possivel criar a submanutencao.");
    } finally {
      setSalvando(false);
    }
  }

  async function concluirSubManutencao() {
    if (!subRegistroSelecionado?.id || !subRegistroSelecionado?.equipamento?.id) return;

    if (!subConclusaoValorValido) {
      setAcaoErro("Informe o valor gasto na submanutencao. Pode ser 0.");
      return;
    }

    try {
      setSalvando(true);
      setAcaoErro("");

      await api.put(`/api/manutencoes/${subRegistroSelecionado.id}`, {
        equipamentoId: subRegistroSelecionado.equipamento.id,
        emailId: subRegistroSelecionado.email?.id ?? null,
        status: "CONCLUIDO",
        observacao: subRegistroSelecionado.observacao || null,
        descricao: normalizarTexto(subConclusaoDescricao),
        fotoNotaFiscal: normalizarTexto(subConclusaoFotoNotaFiscal),
        valorTotal: parseNumberOrNull(subConclusaoValorTotal),
        destinoAposConclusao: null,
        equipeDestinoId: null,
      });

      await carregarDados();
      setSubConclusaoModalOpen(false);
    } catch (errorAcao) {
      setAcaoErro(errorAcao.message || "Nao foi possivel concluir a submanutencao.");
    } finally {
      setSalvando(false);
    }
  }

  async function marcarSubComoPendente(registro) {
    if (!registro?.id || !registro?.equipamento?.id) return;

    try {
      setSalvando(true);
      setAcaoErro("");

      await api.put(`/api/manutencoes/${registro.id}`, {
        equipamentoId: registro.equipamento.id,
        emailId: registro.email?.id ?? null,
        status: "PENDENTE",
        observacao: registro.observacao || null,
        descricao: registro.descricao || null,
        fotoNotaFiscal: registro.fotoNotaFiscal || null,
        valorTotal: registro.valorTotal ?? null,
        destinoAposConclusao: null,
        equipeDestinoId: null,
      });

      await carregarDados();
    } catch (errorAcao) {
      setAcaoErro(errorAcao.message || "Nao foi possivel voltar a submanutencao para pendente.");
    } finally {
      setSalvando(false);
    }
  }

  async function salvarEdicaoSubManutencao() {
    if (!subRegistroSelecionado?.id || !subRegistroSelecionado?.equipamento?.id) return;

    const observacao = normalizarTexto(subEdicaoObservacao);
    if (!observacao) {
      setAcaoErro("Informe a falha ou observacao da subtarefa.");
      return;
    }

    if (!subEdicaoValorValido) {
      setAcaoErro("Informe o valor da subtarefa. Pode ser 0.");
      return;
    }

    if (!normalizarTexto(subEdicaoFotoNotaFiscal)) {
      setAcaoErro("Anexe a nota fiscal da subtarefa.");
      return;
    }

    try {
      setSalvando(true);
      setAcaoErro("");

      await api.put(`/api/manutencoes/${subRegistroSelecionado.id}`, {
        equipamentoId: subRegistroSelecionado.equipamento.id,
        emailId: subRegistroSelecionado.email?.id ?? null,
        status: normalizarTipo(subRegistroSelecionado.status) === "CONCLUIDO" ? "CONCLUIDO" : "PENDENTE",
        observacao,
        descricao: normalizarTexto(subEdicaoDescricao),
        fotoNotaFiscal: normalizarTexto(subEdicaoFotoNotaFiscal),
        valorTotal: parseNumberOrNull(subEdicaoValorTotal),
        destinoAposConclusao: null,
        equipeDestinoId: null,
      });

      await carregarDados();
      setSubEdicaoModalOpen(false);
    } catch (errorAcao) {
      setAcaoErro(errorAcao.message || "Nao foi possivel editar a subtarefa.");
    } finally {
      setSalvando(false);
    }
  }

  async function excluirSubManutencao(registro) {
    if (!registro?.id) return;

    if (!window.confirm("Deseja excluir esta subtarefa?")) {
      return;
    }

    try {
      setSalvando(true);
      setAcaoErro("");
      await api.delete(`/api/manutencoes/${registro.id}`);
      await carregarDados();
    } catch (errorAcao) {
      setAcaoErro(errorAcao.message || "Nao foi possivel excluir a subtarefa.");
    } finally {
      setSalvando(false);
    }
  }

  function abrirModalNotaFiscal(registro) {
    const src = registro?.fotoNotaFiscal;
    if (!src) return;

    const mime = getMimeTypeFromDataUrl(src);
    const extensao = getFileExtensionFromMime(mime);

    setNotaFiscalModalSrc(src);
    setNotaFiscalModalMime(mime);
    setNotaFiscalModalNome(`nota-fiscal-${registro?.id || "arquivo"}.${extensao}`);
    setNotaFiscalZoom(1);
    setNotaFiscalModalOpen(true);
  }

  function baixarNotaFiscal() {
    if (!notaFiscalModalSrc) return;

    const link = document.createElement("a");
    link.href = notaFiscalModalSrc;
    link.download = notaFiscalModalNome || "nota-fiscal";
    document.body.appendChild(link);
    link.click();
    link.remove();
  }

  if (loading) return <OutletLoading message="Carregando registros de manutencao..." />;

  return (
    <div className="operacoes-page">
      <section className="operacoes-header">
        <div>
          <p className="operacoes-kicker">Historico</p>
          <h1>Manutencao</h1>
          <p className="operacoes-subtitle">
            Acompanhe o historico completo de manutencoes.
          </p>
        </div>

        <div className="operacoes-summary-grid operacoes-summary-grid-4">
          <div className="operacoes-summary">
            <span>Total</span>
            <strong>{resumo.total}</strong>
          </div>
          <div className="operacoes-summary pendente">
            <span>Pendentes</span>
            <strong>{resumo.pendentes}</strong>
          </div>
          <div className="operacoes-summary concluido">
            <span>Concluidos</span>
            <strong>{resumo.concluidos}</strong>
          </div>
          <div className="operacoes-summary inutilizado">
            <span>Inutilizados</span>
            <strong>{resumo.inutilizados}</strong>
          </div>
        </div>
      </section>

      <section className="operacoes-filters">
        <CascadeMultiSelectFilters
          rows={registros}
          filters={definicoesFiltro}
          value={filtrosCascata}
          onChange={setFiltrosCascata}
          storageKey="smart-filters:manutencao"
        />
      </section>

      {erro && <div className="operacoes-feedback erro">{erro}</div>}

      {!erro && (
        <div className="operacoes-table-wrap">
          <table className="operacoes-table operacoes-table-manutencao">
            <thead>
              <tr>
                <th>Equipamento</th>
                <th>Tag</th>
                <th>Canteiro</th>
                <th>Observacao</th>
                <th>Valor manutencao</th>
                <th>Foto nota fiscal</th>
                <th>Valor unitario</th>
                <th>Ultima equipe</th>
                <th>Entrada</th>
                <th>Saida</th>
                <th>Status</th>
                <th>Descricao</th>
                <th>Equipe conclusao</th>
                <th>Acoes</th>
              </tr>
            </thead>
            <tbody>
              {registrosFiltrados.length > 0 ? (
                registrosFiltrados.map((item) => {
                  const statusAtual = normalizarTipo(item?.status);
                  const subManutencoes = Array.isArray(item?.subManutencoes) ? item.subManutencoes : [];
                  const possuiSubManutencoes = subManutencoes.length > 0;
                  const subManutencoesExpandidasNaLinha = subManutencoesExpandidas.includes(item.id);
                  const possuiSubPendente = subManutencoes.some(
                    (subItem) => normalizarTipo(subItem?.status) === "PENDENTE",
                  );
                  const equipamentoInativo = item?.equipamento?.ativo === false;
                  const equipamentoExcluido = item?.equipamento == null;
                  const nomeEquipamento = item?.equipamento?.nomeEquipamento ?? item?.nomeEquipamentoSnapshot ?? "-";
                  const tagPatrimonio = item?.equipamento?.tagPatrimonio ?? item?.tagPatrimonioSnapshot ?? "-";
                  const canteiroNome = item?.equipamento?.canteiro?.nome ?? item?.canteiroNomeSnapshot ?? "-";
                  const podeConcluir = isAdminOrDeveloper && statusAtual === "PENDENTE" && !equipamentoInativo;
                  const mimeNota = getMimeTypeFromDataUrl(item?.fotoNotaFiscal);
                  const labelNota = mimeNota.includes("pdf") ? "Baixar nota" : "Ver foto";

                  return (
                    <Fragment key={item.id}>
                      <tr
                        onDoubleClick={possuiSubManutencoes ? () => alternarExpansaoSubManutencoes(item) : undefined}
                        className={[
                          possuiSubManutencoes ? "operacoes-row-detalhe operacoes-row-submanutencao-pai" : "",
                          statusAtual === "CONCLUIDO" && !possuiSubManutencoes ? "operacoes-row-concluida" : "",
                          equipamentoInativo || equipamentoExcluido ? "operacoes-row-inativa operacoes-row-historico-inativo" : "",
                        ].filter(Boolean).join(" ")}
                        title={possuiSubManutencoes ? "Duplo clique para abrir ou fechar as subtarefas" : undefined}
                      >
                        <td>
                          {nomeEquipamento}
                          {equipamentoInativo || equipamentoExcluido ? " (excluido do estoque)" : ""}
                          {possuiSubManutencoes ? ` (${subManutencoes.length} subtarefa(s))` : ""}
                        </td>
                        <td>{tagPatrimonio}</td>
                        <td>{canteiroNome}</td>
                        <td>
                          <span className="operacoes-cell-texto-longo" title={item?.observacao || "-"}>
                            {item?.observacao || "-"}
                          </span>
                        </td>
                        <td>{item?.valorTotal != null ? formatCurrency(item.valorTotal) : "-"}</td>
                        <td>
                          {item?.fotoNotaFiscal ? (
                            <button
                              type="button"
                              className="operacoes-row-btn solicitacao"
                              onClick={() => abrirModalNotaFiscal(item)}
                            >
                              {labelNota}
                            </button>
                          ) : (
                            "-"
                          )}
                        </td>
                        <td>{item?.valorUnitarioEquipamento != null ? formatCurrency(item.valorUnitarioEquipamento) : "-"}</td>
                        <td>{item?.equipeUltima?.nome || "-"}</td>
                        <td>{formatDateTime(item?.dataEntrada)}</td>
                        <td>{formatDateTime(item?.dataSaida)}</td>
                        <td>{formatStatus(item?.status)}</td>
                        <td>
                          <span className="operacoes-cell-texto-longo" title={item?.descricao || "-"}>
                            {item?.descricao || "-"}
                          </span>
                        </td>
                        <td>{item?.equipeConclusao?.nome || "-"}</td>
                        <td className="operacoes-actions-cell">
                          {podeConcluir ? (
                            <>
                              <button
                                type="button"
                                className="operacoes-row-btn concluido"
                                onClick={() => abrirModalConclusao(item)}
                                disabled={possuiSubPendente}
                                title={possuiSubPendente ? "Conclua as subtarefas pendentes primeiro." : undefined}
                              >
                                Concluir
                              </button>
                              <button
                                type="button"
                                className="operacoes-row-btn submanutencao"
                                onClick={() => abrirModalSubManutencao(item)}
                              >
                                + Manutenção
                              </button>
                              <button
                                type="button"
                                className="operacoes-row-btn inutilizado"
                                onClick={() => abrirModalInutilizado(item)}
                                disabled={possuiSubPendente}
                                title={possuiSubPendente ? "Conclua as subtarefas pendentes primeiro." : undefined}
                              >
                                Inutilizar
                              </button>
                            </>
                          ) : (
                            <span className="operacoes-status-final">Registro historico</span>
                          )}
                        </td>
                      </tr>

                      {possuiSubManutencoes && subManutencoesExpandidasNaLinha && (
                        <tr className="operacoes-row-submanutencao-detalhe">
                          <td colSpan="14">
                            <div className="operacoes-submanutencao-wrap">
                              <div className="operacoes-submanutencao-head">
                                <strong>Subtarefas</strong>
                                <span>{subManutencoes.length} registro(s)</span>
                              </div>

                              <div className="operacoes-submanutencao-list">
                                {subManutencoes.map((subItem) => {
                                  const subStatusAtual = normalizarTipo(subItem?.status);
                                  const subPodeEditar = isAdminOrDeveloper && !equipamentoInativo && !equipamentoExcluido;
                                  const subMimeNota = getMimeTypeFromDataUrl(subItem?.fotoNotaFiscal);
                                  const subLabelNota = subMimeNota.includes("pdf") ? "Baixar nota" : "Ver foto";

                                  return (
                                    <div key={subItem.id} className="operacoes-submanutencao-card">
                                      <div className="operacoes-submanutencao-meta">
                                        <span className={`operacoes-status-badge ${subStatusAtual.toLowerCase() || "pendente"}`}>
                                          {formatStatus(subItem?.status)}
                                        </span>
                                        <span>Entrada: {formatDateTime(subItem?.dataEntrada)}</span>
                                        <span>Saida: {formatDateTime(subItem?.dataSaida)}</span>
                                        <span>Valor: {subItem?.valorTotal != null ? formatCurrency(subItem.valorTotal) : "-"}</span>
                                      </div>

                                      <p>
                                        <strong>Falha:</strong> {subItem?.observacao || "-"}
                                      </p>
                                      <p>
                                        <strong>Descricao:</strong> {subItem?.descricao || "-"}
                                      </p>
                                      <p>
                                        <strong>Equipe conclusao:</strong> {subItem?.equipeConclusao?.nome || "-"}
                                      </p>

                                      <div className="operacoes-submanutencao-actions">
                                        <button
                                          type="button"
                                          className="operacoes-row-btn concluido"
                                          onClick={() => abrirModalConclusaoSubManutencao(subItem)}
                                          disabled={!subPodeEditar || subStatusAtual === "CONCLUIDO"}
                                        >
                                          Concluido
                                        </button>
                                        <button
                                          type="button"
                                          className="operacoes-row-btn pendente"
                                          onClick={() => marcarSubComoPendente(subItem)}
                                          disabled={!subPodeEditar || subStatusAtual === "PENDENTE" || salvando}
                                        >
                                          Pendente
                                        </button>
                                        <button
                                          type="button"
                                          className="operacoes-row-btn editar"
                                          onClick={() => abrirModalEditarSubManutencao(subItem)}
                                          disabled={!subPodeEditar || salvando}
                                        >
                                          Editar
                                        </button>
                                        <button
                                          type="button"
                                          className="operacoes-row-btn excluir"
                                          onClick={() => excluirSubManutencao(subItem)}
                                          disabled={!subPodeEditar || salvando}
                                        >
                                          Excluir
                                        </button>
                                        {subItem?.fotoNotaFiscal && (
                                          <button
                                            type="button"
                                            className="operacoes-row-btn solicitacao"
                                            onClick={() => abrirModalNotaFiscal(subItem)}
                                          >
                                            {subLabelNota}
                                          </button>
                                        )}
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </Fragment>
                  );
                })
              ) : (
                <tr>
                  <td colSpan="14" className="operacoes-empty-state">
                    Nenhum registro de manutencao encontrado.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {conclusaoModalOpen && (
        <Modal
          onClose={() => {
            setConclusaoModalOpen(false);
            setAcaoErro("");
          }}
          size="md"
        >
          <div className="operacoes-modal">
            <h2>Concluir manutencao</h2>
            <div className="operacoes-modal-summary">
              <p>
                 <strong>Equipamento:</strong> {registroSelecionado?.equipamento?.nomeEquipamento ?? registroSelecionado?.nomeEquipamentoSnapshot ?? "-"}
              </p>
              <p>
                 <strong>Tag:</strong> {registroSelecionado?.equipamento?.tagPatrimonio ?? registroSelecionado?.tagPatrimonioSnapshot ?? "-"}
              </p>
              <p>
                <strong>Ultima equipe:</strong> {registroSelecionado?.equipeUltima?.nome || "-"}
              </p>
            </div>

            <div className="operacoes-modal-form">
              <input
                className="operacoes-input"
                type="number"
                min="0"
                step="0.01"
                placeholder="Valor da manutencao principal"
                value={conclusaoValorTotal}
                onChange={(event) => setConclusaoValorTotal(event.target.value)}
              />
              {!conclusaoValorValido && (
                <p className="operacoes-modal-helper">Informe o valor gasto na manutencao. Pode ser 0.</p>
              )}

              {subtotalSubtarefas > 0 && (
                <div className="operacoes-modal-summary">
                  <p>
                    <strong>Total das subtarefas:</strong> {formatCurrency(subtotalSubtarefas)}
                  </p>
                  <p>
                    <strong>Total final ao concluir:</strong> {formatCurrency(totalConclusaoCalculado)}
                  </p>
                </div>
              )}

              <textarea
                className="operacoes-textarea"
                placeholder="Descricao da manutencao concluida"
                value={conclusaoDescricao}
                onChange={(event) => setConclusaoDescricao(event.target.value)}
              />

              <select
                className="operacoes-input"
                value={conclusaoEquipeDestinoId}
                onChange={(event) => setConclusaoEquipeDestinoId(event.target.value)}
              >
                <option value="">Selecione a equipe (para direcionar)</option>
                {equipesOperacionais.map((equipe) => (
                  <option key={equipe.id} value={equipe.id}>
                    {equipe.nome}
                  </option>
                ))}
              </select>

              <input
                className="operacoes-file-input"
                type="file"
                accept="image/*,.pdf"
                onChange={onSelecionarFotoNotaFiscal}
              />
            </div>

            {conclusaoNomeArquivoFoto && (
              <p className="operacoes-modal-helper">Arquivo selecionado: {conclusaoNomeArquivoFoto}</p>
            )}

            {acaoErro && <p className="operacoes-modal-error">{acaoErro}</p>}

            <div className="operacoes-modal-actions">
              <button
                type="button"
                className="operacoes-secondary-btn"
                onClick={() => setConclusaoModalOpen(false)}
              >
                Cancelar
              </button>
              <button
                type="button"
                className="operacoes-primary-btn"
                onClick={() => concluirManutencao("EQUIPE")}
                disabled={salvando || !conclusaoValorValido}
              >
                {salvando ? "Salvando..." : "Concluir e direcionar equipe"}
              </button>
              <button
                type="button"
                className="operacoes-primary-btn"
                onClick={() => concluirManutencao("OFICINA")}
                disabled={salvando || !conclusaoValorValido}
              >
                {salvando ? "Salvando..." : "Concluir e mandar p oficina"}
              </button>
            </div>
          </div>
        </Modal>
      )}

      {inutilizadoModalOpen && (
        <Modal
          onClose={() => {
            setInutilizadoModalOpen(false);
            setAcaoErro("");
          }}
          size="md"
        >
          <div className="operacoes-modal">
            <h2>Marcar como inutilizado</h2>
              <p>{registroSelecionado?.equipamento?.nomeEquipamento ?? registroSelecionado?.nomeEquipamentoSnapshot ?? "-"}</p>

            <div className="operacoes-modal-form">
              <textarea
                className="operacoes-textarea"
                placeholder="Descreva o motivo da inutilizacao"
                value={descricaoInutilizado}
                onChange={(event) => setDescricaoInutilizado(event.target.value)}
              />
            </div>

            {acaoErro && <p className="operacoes-modal-error">{acaoErro}</p>}

            <div className="operacoes-modal-actions">
              <button
                type="button"
                className="operacoes-secondary-btn"
                onClick={() => setInutilizadoModalOpen(false)}
              >
                Cancelar
              </button>
              <button
                type="button"
                className="operacoes-primary-btn"
                onClick={marcarComoInutilizado}
                disabled={salvando}
              >
                {salvando ? "Salvando..." : "Confirmar inutilizado"}
              </button>
            </div>
          </div>
        </Modal>
      )}

      {subManutencaoModalOpen && (
        <Modal
          onClose={() => {
            setSubManutencaoModalOpen(false);
            setAcaoErro("");
          }}
          size="md"
        >
          <div className="operacoes-modal">
            <h2>Nova subtarefa</h2>
            <div className="operacoes-modal-summary">
              <p>
                <strong>Equipamento:</strong> {registroSelecionado?.equipamento?.nomeEquipamento ?? registroSelecionado?.nomeEquipamentoSnapshot ?? "-"}
              </p>
              <p>
                <strong>Tag:</strong> {registroSelecionado?.equipamento?.tagPatrimonio ?? registroSelecionado?.tagPatrimonioSnapshot ?? "-"}
              </p>
            </div>

            <div className="operacoes-modal-form">
              <textarea
                className="operacoes-textarea"
                placeholder="Descreva a nova falha encontrada na manutencao"
                value={subManutencaoObservacao}
                onChange={(event) => setSubManutencaoObservacao(event.target.value)}
              />

              <input
                className="operacoes-input"
                type="number"
                min="0"
                step="0.01"
                placeholder="Valor da manutenção"
                value={subManutencaoValorTotal}
                onChange={(event) => setSubManutencaoValorTotal(event.target.value)}
              />
              {!subManutencaoValorValido && (
                <p className="operacoes-modal-helper">Informe o valor da manutenção. Pode ser 0.</p>
              )}

              <input
                className="operacoes-file-input"
                type="file"
                accept="image/*,.pdf"
                onChange={onSelecionarFotoNotaFiscalSubCriacao}
              />
            </div>

            {subManutencaoNomeArquivoFoto && (
              <p className="operacoes-modal-helper">Arquivo selecionado: {subManutencaoNomeArquivoFoto}</p>
            )}

            {acaoErro && <p className="operacoes-modal-error">{acaoErro}</p>}

            <div className="operacoes-modal-actions">
              <button
                type="button"
                className="operacoes-secondary-btn"
                onClick={() => setSubManutencaoModalOpen(false)}
              >
                Cancelar
              </button>
              <button
                type="button"
                className="operacoes-primary-btn"
                onClick={criarSubManutencao}
                disabled={salvando || !subManutencaoValorValido}
              >
                {salvando ? "Salvando..." : "Criar subtarefa"}
              </button>
            </div>
          </div>
        </Modal>
      )}

      {subConclusaoModalOpen && (
        <Modal
          onClose={() => {
            setSubConclusaoModalOpen(false);
            setAcaoErro("");
          }}
          size="md"
        >
          <div className="operacoes-modal">
            <h2>Concluir subtarefa</h2>
            <div className="operacoes-modal-summary">
              <p>
                <strong>Equipamento:</strong> {subRegistroSelecionado?.equipamento?.nomeEquipamento ?? subRegistroSelecionado?.nomeEquipamentoSnapshot ?? "-"}
              </p>
              <p>
                <strong>Tag:</strong> {subRegistroSelecionado?.equipamento?.tagPatrimonio ?? subRegistroSelecionado?.tagPatrimonioSnapshot ?? "-"}
              </p>
              <p>
                <strong>Falha:</strong> {subRegistroSelecionado?.observacao || "-"}
              </p>
            </div>

            <div className="operacoes-modal-form">
              <input
                className="operacoes-input"
                type="number"
                min="0"
                step="0.01"
                placeholder="Valor total das pecas"
                value={subConclusaoValorTotal}
                onChange={(event) => setSubConclusaoValorTotal(event.target.value)}
              />
              {!subConclusaoValorValido && (
                <p className="operacoes-modal-helper">Informe o valor gasto na subtarefa. Pode ser 0.</p>
              )}

              <textarea
                className="operacoes-textarea"
                placeholder="Descricao da subtarefa concluida"
                value={subConclusaoDescricao}
                onChange={(event) => setSubConclusaoDescricao(event.target.value)}
              />

              <input
                className="operacoes-file-input"
                type="file"
                accept="image/*,.pdf"
                onChange={onSelecionarFotoNotaFiscalSub}
              />
            </div>

            {subConclusaoNomeArquivoFoto && (
              <p className="operacoes-modal-helper">Arquivo selecionado: {subConclusaoNomeArquivoFoto}</p>
            )}

            {acaoErro && <p className="operacoes-modal-error">{acaoErro}</p>}

            <div className="operacoes-modal-actions">
              <button
                type="button"
                className="operacoes-secondary-btn"
                onClick={() => setSubConclusaoModalOpen(false)}
              >
                Cancelar
              </button>
              <button
                type="button"
                className="operacoes-primary-btn"
                onClick={concluirSubManutencao}
                disabled={salvando || !subConclusaoValorValido}
              >
                {salvando ? "Salvando..." : "Confirmar concluido"}
              </button>
            </div>
          </div>
        </Modal>
      )}

      {subEdicaoModalOpen && (
        <Modal
          onClose={() => {
            setSubEdicaoModalOpen(false);
            setAcaoErro("");
          }}
          size="md"
        >
          <div className="operacoes-modal">
            <h2>Editar subtarefa</h2>
            <div className="operacoes-modal-summary">
              <p>
                <strong>Equipamento:</strong> {subRegistroSelecionado?.equipamento?.nomeEquipamento ?? subRegistroSelecionado?.nomeEquipamentoSnapshot ?? "-"}
              </p>
              <p>
                <strong>Tag:</strong> {subRegistroSelecionado?.equipamento?.tagPatrimonio ?? subRegistroSelecionado?.tagPatrimonioSnapshot ?? "-"}
              </p>
              <p>
                <strong>Status:</strong> {formatStatus(subRegistroSelecionado?.status)}
              </p>
            </div>

            <div className="operacoes-modal-form">
              <textarea
                className="operacoes-textarea"
                placeholder="Falha da subtarefa"
                value={subEdicaoObservacao}
                onChange={(event) => setSubEdicaoObservacao(event.target.value)}
              />

              <input
                className="operacoes-input"
                type="number"
                min="0"
                step="0.01"
                placeholder="Valor da subtarefa"
                value={subEdicaoValorTotal}
                onChange={(event) => setSubEdicaoValorTotal(event.target.value)}
              />
              {!subEdicaoValorValido && (
                <p className="operacoes-modal-helper">Informe o valor da subtarefa. Pode ser 0.</p>
              )}

              <textarea
                className="operacoes-textarea"
                placeholder="Descricao da subtarefa"
                value={subEdicaoDescricao}
                onChange={(event) => setSubEdicaoDescricao(event.target.value)}
              />

              <input
                className="operacoes-file-input"
                type="file"
                accept="image/*,.pdf"
                onChange={onSelecionarFotoNotaFiscalSubEdicao}
              />
            </div>

            {subEdicaoNomeArquivoFoto && (
              <p className="operacoes-modal-helper">Arquivo selecionado: {subEdicaoNomeArquivoFoto}</p>
            )}

            {!subEdicaoNomeArquivoFoto && subEdicaoFotoNotaFiscal && (
              <p className="operacoes-modal-helper">A subtarefa ja possui nota fiscal cadastrada.</p>
            )}

            {acaoErro && <p className="operacoes-modal-error">{acaoErro}</p>}

            <div className="operacoes-modal-actions">
              <button
                type="button"
                className="operacoes-secondary-btn"
                onClick={() => setSubEdicaoModalOpen(false)}
              >
                Cancelar
              </button>
              <button
                type="button"
                className="operacoes-primary-btn"
                onClick={salvarEdicaoSubManutencao}
                disabled={salvando || !subEdicaoValorValido}
              >
                {salvando ? "Salvando..." : "Salvar alteracoes"}
              </button>
            </div>
          </div>
        </Modal>
      )}

      {notaFiscalModalOpen && (
        <Modal
          onClose={() => {
            setNotaFiscalModalOpen(false);
            setNotaFiscalModalSrc("");
            setNotaFiscalModalMime("");
            setNotaFiscalZoom(1);
          }}
          size="xl"
        >
          <div className="operacoes-modal operacoes-nota-visualizador">
            <h2>Nota fiscal</h2>

            <div className="operacoes-nota-preview-wrap">
              {notaFiscalModalMime.includes("pdf") ? (
                <iframe
                  title="Preview da nota fiscal"
                  src={notaFiscalModalSrc}
                  className="operacoes-nota-preview-pdf"
                />
              ) : (
                <div className="operacoes-nota-preview-imagem-scroll">
                  <img
                    src={notaFiscalModalSrc}
                    alt="Nota fiscal"
                    className="operacoes-nota-preview-imagem"
                    style={{ transform: `scale(${notaFiscalZoom})` }}
                  />
                </div>
              )}
            </div>

            <div className="operacoes-modal-actions">
              {!notaFiscalModalMime.includes("pdf") && (
                <>
                  <button
                    type="button"
                    className="operacoes-secondary-btn"
                    onClick={() => setNotaFiscalZoom((atual) => Math.max(0.5, Number((atual - 0.1).toFixed(2))))}
                  >
                    Zoom -
                  </button>
                  <button
                    type="button"
                    className="operacoes-secondary-btn"
                    onClick={() => setNotaFiscalZoom(1)}
                  >
                    {Math.round(notaFiscalZoom * 100)}%
                  </button>
                  <button
                    type="button"
                    className="operacoes-secondary-btn"
                    onClick={() => setNotaFiscalZoom((atual) => Math.min(3, Number((atual + 0.1).toFixed(2))))}
                  >
                    Zoom +
                  </button>
                </>
              )}

              <button type="button" className="operacoes-primary-btn" onClick={baixarNotaFiscal}>
                Download
              </button>
              <button type="button" className="operacoes-secondary-btn" onClick={() => setNotaFiscalModalOpen(false)}>
                Fechar
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
