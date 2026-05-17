import { useContext, useEffect, useMemo, useRef, useState } from "react";
import * as XLSX from "xlsx";
import { AuthContext } from "../context/AuthContext";
import { api } from "../services/api";
import { filterRowsByCascade } from "../utils/cascadeFilters";
import { buildParsedFromExecution, createChecklistPdf, getStartOfWeek, parseExecPayload } from "../utils/checklistPdf";
import { sortByTextKeys } from "../utils/sort";
import {
  CAMPOS_IMPORTACAO,
  contarFotosEquipamento,
  extrairFotosEquipamento,
  formatCurrency,
  mesclarEquipamentoNaLista,
  normalizarCabecalhoImportacao,
  normalizarListaFotos,
  parseNumberOrZero,
  normalizeTag,
  registrarEquipamentoLocalNaOficina,
  resumirEquipamentoLista,
  resumirListaEquipamentos,
} from "../utils/estoqueHelpers";
import { normalizarFotoArquivo } from "../utils/estoquePhoto";
import { isDeveloperEquivalentRole, normalizeUserRole } from "../utils/userRoles";

export function useEstoque(estoqueVisao) {
  const { usuario } = useContext(AuthContext);
  const tipoUsuario = normalizeUserRole(usuario?.tipoCategoria);
  const isDeveloperLike = isDeveloperEquivalentRole(tipoUsuario);
  const canManageCanteiros = isDeveloperLike || tipoUsuario === "GERENTE";
  const canManageEmpresas = isDeveloperLike || tipoUsuario === "GERENTE";
  const rotuloVisaoEstoque = "Estoque Macro";

  // ─── State ───────────────────────────────────────────────────────────────

  const [equipamentos, setEquipamentos] = useState([]);
  const [empresas, setEmpresas] = useState([]);
  const [canteiros, setCanteiros] = useState([]);
  const [oficinas, setOficinas] = useState([]);
  const [manutencoes, setManutencoes] = useState([]);
  const [resumoRelatoriosPorEquipamento, setResumoRelatoriosPorEquipamento] = useState({});
  const [carregandoResumoChecklistEquipId, setCarregandoResumoChecklistEquipId] = useState(null);

  const [filtrosCascata, setFiltrosCascata] = useState({
    equipamento: [],
    tag: [],
    empresa: [],
    canteiro: [],
    equipe: [],
  });
  const [locacaoMin, setLocacaoMin] = useState("");
  const [locacaoMax, setLocacaoMax] = useState("");
  const [valorMin, setValorMin] = useState("");
  const [valorMax, setValorMax] = useState("");
  const [filtroSituacao, setFiltroSituacao] = useState("");
  const [filtroFoto, setFiltroFoto] = useState("");

  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState("");

  // Modal flags
  const [exportModalOpen, setExportModalOpen] = useState(false);
  const [importModalOpen, setImportModalOpen] = useState(false);
  const [cadastroModalOpen, setCadastroModalOpen] = useState(false);
  const [confirmarMoverModalOpen, setConfirmarMoverModalOpen] = useState(false);
  const [confirmarExclusaoModalOpen, setConfirmarExclusaoModalOpen] = useState(false);
  const [manutencaoModalOpen, setManutencaoModalOpen] = useState(false);
  const [fotoModalOpen, setFotoModalOpen] = useState(false);
  const [fotoModalSomenteLeitura, setFotoModalSomenteLeitura] = useState(false);
  const [detalhesEquipamentoModalOpen, setDetalhesEquipamentoModalOpen] = useState(false);

  // Loading / saving flags
  const [salvando, setSalvando] = useState(false);
  const [excluindoTodos, setExcluindoTodos] = useState(false);
  const [gerandoChecklistPdf, setGerandoChecklistPdf] = useState(false);
  const [salvandoFoto, setSalvandoFoto] = useState(false);
  const [salvandoFotoEquipId, setSalvandoFotoEquipId] = useState(null);
  const [salvandoEmpresa, setSalvandoEmpresa] = useState(false);
  const [salvandoCanteiro, setSalvandoCanteiro] = useState(false);
  const [excluindoEquipamento, setExcluindoEquipamento] = useState(false);
  const [importando, setImportando] = useState(false);

  // Error messages
  const [cadastroErro, setCadastroErro] = useState("");
  const [empresaGestaoErro, setEmpresaGestaoErro] = useState("");
  const [canteiroGestaoErro, setCanteiroGestaoErro] = useState("");
  const [acaoErro, setAcaoErro] = useState("");
  const [fotoErro, setFotoErro] = useState("");
  const [importErro, setImportErro] = useState("");

  // Gestão de empresa/canteiro inputs
  const [empresaGestaoNome, setEmpresaGestaoNome] = useState("");
  const [canteiroGestaoNome, setCanteiroGestaoNome] = useState("");

  // Import state
  const [importResultado, setImportResultado] = useState(null);
  const [arquivoImportacao, setArquivoImportacao] = useState("");
  const [previewImportacao, setPreviewImportacao] = useState([]);

  // Selected items
  const [equipamentoSelecionado, setEquipamentoSelecionado] = useState(null);
  const [equipamentoDetalheSelecionado, setEquipamentoDetalheSelecionado] = useState(null);
  const [equipamentoParaExcluir, setEquipamentoParaExcluir] = useState(null);
  const [fotoPreview, setFotoPreview] = useState([]);
  const [manutencaoObservacao, setManutencaoObservacao] = useState("");
  const [moverMensagem, setMoverMensagem] = useState("");

  const [novoEquipamento, setNovoEquipamento] = useState({
    id: null,
    nomeEquipamento: "",
    tagPatrimonio: "",
    valorLocacao: "",
    valorUnitario: "",
    empresaId: "",
    canteiroId: "",
    fotosBase64: [],
  });

  const cadastroEmAndamentoRef = useRef(false);

  // ─── Computed ─────────────────────────────────────────────────────────────

  const cadastroTagDuplicada = useMemo(() => {
    const tagAtual = normalizeTag(novoEquipamento.tagPatrimonio);
    const nomeAtual = String(novoEquipamento.nomeEquipamento ?? "").trim().toLowerCase();
    const valorUnitarioAtual = parseNumberOrZero(novoEquipamento.valorUnitario);
    const valorLocacaoAtual = parseNumberOrZero(novoEquipamento.valorLocacao);
    if (!nomeAtual) return false;
    return equipamentos.some((item) => {
      if (!item?.id || item.id === novoEquipamento.id) return false;
      const tagItem = normalizeTag(item.tagPatrimonio);
      if (tagAtual) return tagItem === tagAtual;
      if (tagItem) return false;
      const nomeItem = String(item.nomeEquipamento ?? "").trim().toLowerCase();
      return (
        nomeItem === nomeAtual &&
        parseNumberOrZero(item.valorUnitario) === valorUnitarioAtual &&
        parseNumberOrZero(item.valorLocacao) === valorLocacaoAtual
      );
    });
  }, [
    equipamentos,
    novoEquipamento.id,
    novoEquipamento.nomeEquipamento,
    novoEquipamento.tagPatrimonio,
    novoEquipamento.valorLocacao,
    novoEquipamento.valorUnitario,
  ]);

  const definicoesFiltro = useMemo(() => ([
    { id: "equipamento", label: "Equipamentos", getValue: (item) => item?.nomeEquipamento },
    { id: "tag", label: "Tags", getValue: (item) => item?.tagPatrimonio },
    { id: "empresa", label: "Empresas", getValue: (item) => item?.empresa?.nome },
    { id: "canteiro", label: "Canteiros", getValue: (item) => item?.canteiro?.nome },
    { id: "equipe", label: "Equipes", getValue: (item) => item?.equipeResponsavel?.nome || item?.equipe?.nome },
  ]), []);

  const equipamentosDaVisao = useMemo(() => equipamentos, [equipamentos]);

  const equipamentosBaseFiltrados = useMemo(
    () => filterRowsByCascade(equipamentosDaVisao, definicoesFiltro, filtrosCascata),
    [equipamentosDaVisao, definicoesFiltro, filtrosCascata],
  );

  const locacoesDisponiveis = useMemo(() => [
    ...new Set(equipamentosBaseFiltrados.map((item) => Number(item.valorLocacao ?? 0))),
  ].sort((a, b) => a - b), [equipamentosBaseFiltrados]);

  const valoresDisponiveis = useMemo(() => [
    ...new Set(equipamentosBaseFiltrados.map((item) => Number(item.valorUnitario ?? 0))),
  ].sort((a, b) => a - b), [equipamentosBaseFiltrados]);

  const equipamentoIdsNaOficina = useMemo(() => {
    const idsDaOficina = oficinas.map((r) => r?.equipamento?.id).filter((id) => id != null);
    const idsConcluidosNaManutencao = manutencoes
      .filter((r) => String(r?.status || "").toUpperCase() === "CONCLUIDO")
      .filter((r) => r?.equipamento?.equipeResponsavel == null)
      .map((r) => r?.equipamento?.id)
      .filter((id) => id != null);
    return new Set([...idsDaOficina, ...idsConcluidosNaManutencao]);
  }, [oficinas, manutencoes]);

  const equipamentoIdsNaManutencao = useMemo(() => new Set(
    manutencoes
      .filter((r) => String(r?.status || "").toUpperCase() === "PENDENTE")
      .map((r) => r?.equipamento?.id)
      .filter((id) => id != null),
  ), [manutencoes]);

  const equipamentosFiltrados = useMemo(() => sortByTextKeys(
    equipamentosBaseFiltrados.filter((item) => {
      const valorLocacao = Number(item.valorLocacao ?? 0);
      const valorUnitario = Number(item.valorUnitario ?? 0);
      const quantidadeFotos = contarFotosEquipamento(item);
      const estaNaOficina = equipamentoIdsNaOficina.has(item.id);
      const estaNaManutencao = equipamentoIdsNaManutencao.has(item.id);
      const temEquipe = Boolean(item?.equipe?.id || item?.equipeResponsavel?.id);
      const estaNoCanteiro = estaNaOficina || (!estaNaManutencao && !temEquipe);

      const atendeSituacao =
        !filtroSituacao ||
        (filtroSituacao === "OFICINA" && estaNoCanteiro) ||
        (filtroSituacao === "MANUTENCAO" && estaNaManutencao) ||
        (filtroSituacao === "CAMPO" && temEquipe);

      const atendeFoto =
        !filtroFoto ||
        (filtroFoto === "COM_FOTO" && quantidadeFotos > 0) ||
        (filtroFoto === "SEM_FOTO" && quantidadeFotos === 0);

      return (
        (!locacaoMin || valorLocacao >= Number(locacaoMin)) &&
        (!locacaoMax || valorLocacao <= Number(locacaoMax)) &&
        (!valorMin || valorUnitario >= Number(valorMin)) &&
        (!valorMax || valorUnitario <= Number(valorMax)) &&
        atendeSituacao &&
        atendeFoto
      );
    }),
    (item) => item?.nomeEquipamento,
    (item) => item?.tagPatrimonio,
    (item) => item?.empresa?.nome,
    (item) => item?.canteiro?.nome,
  ), [
    equipamentosBaseFiltrados,
    locacaoMin, locacaoMax, valorMin, valorMax,
    filtroSituacao, filtroFoto,
    equipamentoIdsNaOficina, equipamentoIdsNaManutencao,
  ]);

  const empresasOrdenadas = useMemo(
    () => sortByTextKeys(empresas, (item) => item?.nome),
    [empresas],
  );
  const canteirosOrdenados = useMemo(
    () => sortByTextKeys(canteiros, (item) => item?.nome),
    [canteiros],
  );

  const filtrosAplicados = useMemo(() => {
    const filtros = [`Visao: ${rotuloVisaoEstoque}`];
    if (filtrosCascata.equipamento?.length) filtros.push(`Equipamento: ${filtrosCascata.equipamento.join(", ")}`);
    if (filtrosCascata.tag?.length) filtros.push(`Tag: ${filtrosCascata.tag.join(", ")}`);
    if (filtrosCascata.empresa?.length) filtros.push(`Empresa: ${filtrosCascata.empresa.join(", ")}`);
    if (filtrosCascata.canteiro?.length) filtros.push(`Canteiro: ${filtrosCascata.canteiro.join(", ")}`);
    if (filtrosCascata.equipe?.length) filtros.push(`Equipe: ${filtrosCascata.equipe.join(", ")}`);
    if (locacaoMin) filtros.push(`Locacao min: ${formatCurrency(locacaoMin)}`);
    if (locacaoMax) filtros.push(`Locacao max: ${formatCurrency(locacaoMax)}`);
    if (valorMin) filtros.push(`Valor min: ${formatCurrency(valorMin)}`);
    if (valorMax) filtros.push(`Valor max: ${formatCurrency(valorMax)}`);
    if (filtroSituacao === "OFICINA") filtros.push("Situacao: No canteiro");
    if (filtroSituacao === "MANUTENCAO") filtros.push("Situacao: Em manutencao");
    if (filtroSituacao === "CAMPO") filtros.push("Situacao: Com equipe");
    if (filtroFoto === "COM_FOTO") filtros.push("Foto: Com foto");
    if (filtroFoto === "SEM_FOTO") filtros.push("Foto: Sem foto");
    return filtros;
  }, [filtrosCascata, locacaoMin, locacaoMax, valorMin, valorMax, filtroSituacao, filtroFoto, rotuloVisaoEstoque]);

  const resumoEstoque = useMemo(() => {
    let emOficina = 0;
    let emManutencao = 0;
    let comEquipe = 0;
    equipamentosFiltrados.forEach((item) => {
      const estaNaOficina = equipamentoIdsNaOficina.has(item.id);
      const estaNaManutencao = equipamentoIdsNaManutencao.has(item.id);
      const temEquipe = Boolean(item?.equipe?.id || item?.equipeResponsavel?.id);
      const estaNoCanteiro = estaNaOficina || (!estaNaManutencao && !temEquipe);
      if (estaNoCanteiro) { emOficina += 1; return; }
      if (estaNaManutencao) { emManutencao += 1; return; }
      if (temEquipe) comEquipe += 1;
    });
    return { total: equipamentosFiltrados.length, manutencao: emManutencao, oficina: emOficina, campo: comEquipe };
  }, [equipamentosFiltrados, equipamentoIdsNaOficina, equipamentoIdsNaManutencao]);

  const ultimoChecklistDetalhe = useMemo(() => {
    const equipamentoId = equipamentoDetalheSelecionado?.id;
    if (!equipamentoId) return null;
    const lista = resumoRelatoriosPorEquipamento[equipamentoId];
    return Array.isArray(lista) && lista.length ? lista[0] : null;
  }, [equipamentoDetalheSelecionado, resumoRelatoriosPorEquipamento]);

  const detalhesEquipamento = useMemo(() => {
    if (!equipamentoDetalheSelecionado) return null;
    const equipamento = equipamentoDetalheSelecionado;
    const estaNaOficina = equipamentoIdsNaOficina.has(equipamento.id);
    const estaNaManutencao = equipamentoIdsNaManutencao.has(equipamento.id);
    const ultimoChecklist = ultimoChecklistDetalhe;
    const localizacao = estaNaManutencao
      ? "Manutencao"
      : estaNaOficina
      ? "Canteiro"
      : equipamento?.equipeResponsavel?.id || equipamento?.equipe?.id
      ? "Campo"
      : "Canteiro";
    const equipeAtual = equipamento?.equipeResponsavel?.nome || equipamento?.equipe?.nome || "Sem equipe";
    const equipeParaExibir =
      estaNaOficina || estaNaManutencao
        ? ultimoChecklist?.equipeNome || "Sem historico de equipe"
        : equipeAtual;
    return {
      nomeEquipamento: equipamento?.nomeEquipamento || "-",
      tagPatrimonio: equipamento?.tagPatrimonio || "-",
      localizacao,
      canteiro: equipamento?.canteiro?.nome || "-",
      equipe: equipeParaExibir,
      ultimoChecklist: ultimoChecklist?.data || null,
    };
  }, [equipamentoDetalheSelecionado, equipamentoIdsNaOficina, equipamentoIdsNaManutencao, ultimoChecklistDetalhe]);

  // ─── Effects ──────────────────────────────────────────────────────────────

  useEffect(() => {
    async function carregarDados() {
      if (estoqueVisao === "locados") {
        setLoading(false);
        setErro("");
        return;
      }
      try {
        setLoading(true);
        setErro("");
        const [estoquesResponse, empresasResponse, canteirosResponse, oficinasResponse, manutencoesResponse] =
          await Promise.all([
            api.get("/api/estoques"),
            api.get("/api/empresas"),
            api.get("/api/canteiro-locais"),
            api.get("/api/oficinas"),
            api.get("/api/manutencoes"),
          ]);
        setEquipamentos(resumirListaEquipamentos(estoquesResponse));
        setEmpresas(Array.isArray(empresasResponse) ? empresasResponse : []);
        setCanteiros(Array.isArray(canteirosResponse) ? canteirosResponse : []);
        setOficinas(Array.isArray(oficinasResponse) ? oficinasResponse : []);
        setManutencoes(Array.isArray(manutencoesResponse) ? manutencoesResponse : []);
      } catch (error) {
        setErro(error.message || "Erro ao buscar equipamentos.");
      } finally {
        setLoading(false);
      }
    }
    carregarDados();
  }, [estoqueVisao]);

  useEffect(() => {
    setFiltrosCascata({ equipamento: [], tag: [], empresa: [], canteiro: [], equipe: [] });
    limparFiltrosValores();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [estoqueVisao]);

  // ─── Helpers internos ─────────────────────────────────────────────────────

  async function carregarEquipamentoCompleto(equipamentoOuId) {
    const equipamentoId = typeof equipamentoOuId === "object" ? equipamentoOuId?.id : equipamentoOuId;
    if (!equipamentoId) throw new Error("Equipamento nao encontrado.");
    return api.get(`/api/estoques/${equipamentoId}`);
  }

  async function carregarEmpresasDisponiveis() {
    const response = await api.get("/api/empresas", { cache: false, forceRefresh: true });
    const lista = Array.isArray(response) ? response : [];
    setEmpresas(lista);
    return lista;
  }

  async function carregarCanteirosDisponiveis() {
    const response = await api.get("/api/canteiro-locais", { cache: false, forceRefresh: true });
    const lista = Array.isArray(response) ? response : [];
    setCanteiros(lista);
    return lista;
  }

  async function carregarResumoChecklistEquipamento(equipamentoId, forceRefresh = false) {
    if (!equipamentoId) return [];

    if (!forceRefresh) {
      const emMemoria = resumoRelatoriosPorEquipamento[equipamentoId];
      if (Array.isArray(emMemoria)) {
        return emMemoria;
      }
    }

    const response = await api.get(
      `/api/relatorios/estoque/${equipamentoId}/resumo?page=0&size=10`,
      { cache: false, forceRefresh },
    );
    const lista = Array.isArray(response?.content) ? response.content : [];
    setResumoRelatoriosPorEquipamento((atual) => ({
      ...atual,
      [equipamentoId]: lista,
    }));
    return lista;
  }

  function montarPayloadEstoque(equipamento, fotosBase64 = extrairFotosEquipamento(equipamento)) {
    if (!equipamento) return null;
    const fotosNormalizadas = normalizarListaFotos(fotosBase64);
    return {
      nomeEquipamento: String(equipamento.nomeEquipamento || "").trim(),
      tagPatrimonio: String(equipamento.tagPatrimonio || "").trim(),
      valorLocacao: parseNumberOrZero(equipamento.valorLocacao),
      valorUnitario: parseNumberOrZero(equipamento.valorUnitario),
      empresaId: Number(equipamento.empresa?.id),
      canteiroId: equipamento.canteiro?.id ?? equipamento.canteiroId ?? null,
      equipeId: equipamento.equipe?.id ?? equipamento.equipeId ?? null,
      equipeResponsavelId: equipamento.equipeResponsavel?.id ?? null,
      atualizarFotos: true,
      fotoBase64: fotosNormalizadas[0] || null,
      fotoBase64Secundaria: fotosNormalizadas[1] || null,
    };
  }

  // ─── Actions ──────────────────────────────────────────────────────────────

  function limparFiltrosValores() {
    setLocacaoMin("");
    setLocacaoMax("");
    setValorMin("");
    setValorMax("");
    setFiltroSituacao("");
    setFiltroFoto("");
  }

  function limparFormularioCadastro() {
    setNovoEquipamento({
      id: null,
      nomeEquipamento: "",
      tagPatrimonio: "",
      valorLocacao: "",
      valorUnitario: "",
      empresaId: "",
      canteiroId: "",
      fotosBase64: [],
    });
  }

  function limparImportacao() {
    setArquivoImportacao("");
    setPreviewImportacao([]);
    setImportErro("");
    setImportResultado(null);
  }

  async function abrirModalCadastro(equipamento = null) {
    setCadastroErro("");
    setEmpresaGestaoErro("");
    setEmpresaGestaoNome("");
    setCanteiroGestaoErro("");
    setCanteiroGestaoNome("");
    if (equipamento) {
      setNovoEquipamento({
        id: equipamento.id,
        nomeEquipamento: equipamento.nomeEquipamento || "",
        tagPatrimonio: equipamento.tagPatrimonio || "",
        valorLocacao: equipamento.valorLocacao ?? "",
        valorUnitario: equipamento.valorUnitario ?? "",
        empresaId: equipamento.empresa?.id ? String(equipamento.empresa.id) : "",
        canteiroId: equipamento.canteiro?.id ? String(equipamento.canteiro.id) : "",
        fotosBase64: [],
      });
    } else {
      limparFormularioCadastro();
    }
    setCadastroModalOpen(true);
  }

  async function criarEmpresa() {
    const nome = String(empresaGestaoNome || "").trim();
    if (!nome) { setEmpresaGestaoErro("Informe o nome da empresa para criar."); return; }
    try {
      setSalvandoEmpresa(true);
      setEmpresaGestaoErro("");
      const criada = await api.post("/api/empresas", { nome });
      await carregarEmpresasDisponiveis();
      setNovoEquipamento((atual) => ({
        ...atual,
        empresaId: criada?.id ? String(criada.id) : atual.empresaId,
      }));
      setEmpresaGestaoNome("");
    } catch (error) {
      setEmpresaGestaoErro(error.message || "Nao foi possivel criar a empresa.");
    } finally {
      setSalvandoEmpresa(false);
    }
  }

  async function editarEmpresaSelecionada() {
    const empresaId = novoEquipamento.empresaId ? Number(novoEquipamento.empresaId) : null;
    const nome = String(empresaGestaoNome || "").trim();
    if (!empresaId) { setEmpresaGestaoErro("Selecione uma empresa para editar."); return; }
    if (!nome) { setEmpresaGestaoErro("Informe o novo nome da empresa."); return; }
    try {
      setSalvandoEmpresa(true);
      setEmpresaGestaoErro("");
      await api.put(`/api/empresas/${empresaId}`, { nome });
      await carregarEmpresasDisponiveis();
      setEmpresaGestaoNome("");
    } catch (error) {
      setEmpresaGestaoErro(error.message || "Nao foi possivel editar a empresa.");
    } finally {
      setSalvandoEmpresa(false);
    }
  }

  async function excluirEmpresaSelecionada() {
    const empresaId = novoEquipamento.empresaId ? Number(novoEquipamento.empresaId) : null;
    if (!empresaId) { setEmpresaGestaoErro("Selecione uma empresa para excluir."); return; }
    const empresaAtual = empresas.find((item) => item?.id === empresaId);
    const nomeAtual = empresaAtual?.nome || "empresa selecionada";
    if (!window.confirm(`Deseja excluir a empresa "${nomeAtual}"?`)) return;
    try {
      setSalvandoEmpresa(true);
      setEmpresaGestaoErro("");
      await api.delete(`/api/empresas/${empresaId}`);
      await carregarEmpresasDisponiveis();
      setNovoEquipamento((atual) => ({ ...atual, empresaId: "" }));
      setEmpresaGestaoNome("");
    } catch (error) {
      setEmpresaGestaoErro(error.message || "Nao foi possivel excluir a empresa.");
    } finally {
      setSalvandoEmpresa(false);
    }
  }

  async function criarCanteiro() {
    const nome = String(canteiroGestaoNome || "").trim();
    if (!nome) { setCanteiroGestaoErro("Informe o nome do canteiro para criar."); return; }
    try {
      setSalvandoCanteiro(true);
      setCanteiroGestaoErro("");
      const criado = await api.post("/api/canteiro-locais", { nome });
      const listaAtualizada = await carregarCanteirosDisponiveis();
      setNovoEquipamento((atual) => ({
        ...atual,
        canteiroId: criado?.id ? String(criado.id) : atual.canteiroId,
      }));
      setCanteiroGestaoNome("");
      if (!listaAtualizada.length) {
        setCanteiroGestaoErro("Canteiro criado, mas nao foi possivel atualizar a lista.");
      }
    } catch (error) {
      setCanteiroGestaoErro(error.message || "Nao foi possivel criar o canteiro.");
    } finally {
      setSalvandoCanteiro(false);
    }
  }

  async function editarCanteiroSelecionado() {
    const canteiroId = novoEquipamento.canteiroId ? Number(novoEquipamento.canteiroId) : null;
    const nome = String(canteiroGestaoNome || "").trim();
    if (!canteiroId) { setCanteiroGestaoErro("Selecione um canteiro para editar."); return; }
    if (!nome) { setCanteiroGestaoErro("Informe o novo nome do canteiro."); return; }
    try {
      setSalvandoCanteiro(true);
      setCanteiroGestaoErro("");
      await api.put(`/api/canteiro-locais/${canteiroId}`, { nome });
      await carregarCanteirosDisponiveis();
      setCanteiroGestaoNome("");
    } catch (error) {
      setCanteiroGestaoErro(error.message || "Nao foi possivel editar o canteiro.");
    } finally {
      setSalvandoCanteiro(false);
    }
  }

  async function excluirCanteiroSelecionado() {
    const canteiroId = novoEquipamento.canteiroId ? Number(novoEquipamento.canteiroId) : null;
    if (!canteiroId) { setCanteiroGestaoErro("Selecione um canteiro para excluir."); return; }
    const canteiroAtual = canteiros.find((item) => item?.id === canteiroId);
    const nomeAtual = canteiroAtual?.nome || "canteiro selecionado";
    if (!window.confirm(`Deseja excluir o canteiro "${nomeAtual}"?`)) return;
    try {
      setSalvandoCanteiro(true);
      setCanteiroGestaoErro("");
      await api.delete(`/api/canteiro-locais/${canteiroId}`);
      await carregarCanteirosDisponiveis();
      setNovoEquipamento((atual) => ({ ...atual, canteiroId: "" }));
      setCanteiroGestaoNome("");
    } catch (error) {
      setCanteiroGestaoErro(error.message || "Nao foi possivel excluir o canteiro.");
    } finally {
      setSalvandoCanteiro(false);
    }
  }

  async function handleFotoCadastro(event) {
    const file = event.target.files?.[0];
    if (!file) return;
    try {
      const fotosAtuais = normalizarListaFotos(novoEquipamento.fotosBase64);
      if (fotosAtuais.length >= 2) { setCadastroErro("Limite de 2 fotos por equipamento."); return; }
      const fotoBase64 = await normalizarFotoArquivo(file);
      setCadastroErro("");
      setNovoEquipamento((atual) => ({
        ...atual,
        fotosBase64: [...normalizarListaFotos(atual.fotosBase64), fotoBase64].slice(0, 2),
      }));
    } catch (error) {
      setCadastroErro(error.message || "Nao foi possivel carregar a foto.");
    } finally {
      event.target.value = "";
    }
  }

  function removerFotoCadastro(index) {
    setNovoEquipamento((atual) => ({
      ...atual,
      fotosBase64: normalizarListaFotos(atual.fotosBase64).filter((_, i) => i !== index),
    }));
  }

  async function abrirModalOficina(equipamento) {
    setEquipamentoSelecionado(equipamento);
    setAcaoErro("");
    setMoverMensagem(
      "Ao mover para o canteiro, o equipamento será desvinculado da equipe. O salvamento em Relatórios segue o padrão semanal, com reinício automático dos checklists. Deseja continuar?",
    );
    setConfirmarMoverModalOpen(true);
  }

  async function moverParaOficina() {
    if (!equipamentoSelecionado) return;
    try {
      setSalvando(true);
      setAcaoErro("");
      await api.patch(`/api/estoques/${equipamentoSelecionado.id}/mover-para-oficina`);
      const [estoquesResponse, oficinasResponse] = await Promise.all([
        api.get("/api/estoques"),
        api.get("/api/oficinas"),
      ]);
      setEquipamentos(resumirListaEquipamentos(estoquesResponse));
      setOficinas(Array.isArray(oficinasResponse) ? oficinasResponse : []);
      setConfirmarMoverModalOpen(false);
      window.alert("Equipamento movido para o canteiro com sucesso.");
    } catch (error) {
      setAcaoErro(error.message || "Não foi possível mover para o canteiro.");
    } finally {
      setSalvando(false);
    }
  }

  function abrirModalManutencao(equipamento) {
    setEquipamentoSelecionado(equipamento);
    setManutencaoObservacao("");
    setAcaoErro("");
    setManutencaoModalOpen(true);
  }

  async function abrirModalFoto(equipamento, somenteLeitura = false) {
    try {
      const equipamentoCompleto = await carregarEquipamentoCompleto(equipamento);
      setEquipamentoSelecionado(equipamentoCompleto);
      setFotoPreview(extrairFotosEquipamento(equipamentoCompleto));
      setFotoErro("");
      setFotoModalSomenteLeitura(somenteLeitura);
      setFotoModalOpen(true);
    } catch (error) {
      window.alert(error.message || "Nao foi possivel carregar as fotos do equipamento.");
    }
  }

  async function abrirModalDetalhesEquipamento(equipamento) {
    const equipamentoId = equipamento?.id;
    setEquipamentoDetalheSelecionado(equipamento);
    setDetalhesEquipamentoModalOpen(true);
    if (!equipamentoId) return;

    try {
      setCarregandoResumoChecklistEquipId(equipamentoId);
      await carregarResumoChecklistEquipamento(equipamentoId);
    } catch {
      setResumoRelatoriosPorEquipamento((atual) => ({
        ...atual,
        [equipamentoId]: [],
      }));
    } finally {
      setCarregandoResumoChecklistEquipId((atual) => (atual === equipamentoId ? null : atual));
    }
  }

  async function visualizarUltimoChecklistPdf() {
    const equipamento = equipamentoDetalheSelecionado;
    if (!equipamento?.id) return;
    try {
      setGerandoChecklistPdf(true);
      const relatoriosEquipamento = await api.get(`/api/relatorios/estoque/${equipamento.id}`, {
        cache: false,
        forceRefresh: true,
      });
      const listaRelatorios = Array.isArray(relatoriosEquipamento) ? relatoriosEquipamento : [];
      const listaOrdenada = [...listaRelatorios].sort(
        (a, b) => new Date(b?.checklistExecucao?.data || b?.data || 0).getTime()
          - new Date(a?.checklistExecucao?.data || a?.data || 0).getTime(),
      );
      const ultimoChecklist = listaOrdenada.find((item) => item?.checklistExecucao);
      const execucao = ultimoChecklist?.checklistExecucao;
      if (!execucao) {
        window.alert("Este equipamento ainda nao possui checklist arquivado para visualizacao.");
        return;
      }
      const payload = parseExecPayload(execucao);
      if (!payload) {
        window.alert("Nao foi possivel montar o PDF deste checklist.");
        return;
      }
      const parsed = buildParsedFromExecution(
        payload,
        execucao?.checklistModelo?.nome || equipamento?.nomeEquipamento || "Checklist",
      );
      const historicoSemana = listaOrdenada
        .map((item) => item?.checklistExecucao)
        .filter(
          (item) =>
            item &&
            getStartOfWeek(item?.data).getTime() === getStartOfWeek(execucao?.data).getTime(),
        );
      const doc = await createChecklistPdf({
        parsed,
        selectedExec: execucao,
        history: historicoSemana,
        equipamento: ultimoChecklist?.estoque || execucao?.estoque || equipamento,
        modeloNome: execucao?.checklistModelo?.arquivoNome || execucao?.checklistModelo?.nome,
      });
      if (!doc) {
        window.alert("Nao foi possivel gerar o PDF deste checklist.");
        return;
      }
      window.open(doc.output("bloburl"), "_blank");
    } catch (error) {
      window.alert(error?.message || "Nao foi possivel abrir o PDF do checklist.");
    } finally {
      setGerandoChecklistPdf(false);
    }
  }

  function limparResumoChecklistEquipamento(equipamentoId) {
    if (!equipamentoId) return;
    setResumoRelatoriosPorEquipamento((atual) => {
      if (!(equipamentoId in atual)) return atual;
      const proximo = { ...atual };
      delete proximo[equipamentoId];
      return proximo;
    });
  }

  async function handleNovaFotoModal(event) {
    const file = event.target.files?.[0];
    if (!file) return;
    try {
      const fotosAtuais = normalizarListaFotos(fotoPreview);
      if (fotosAtuais.length >= 2) { setFotoErro("Limite de 2 fotos por equipamento."); return; }
      const fotoBase64 = await normalizarFotoArquivo(file);
      setFotoErro("");
      setFotoPreview((atual) => [...normalizarListaFotos(atual), fotoBase64].slice(0, 2));
    } catch (error) {
      setFotoErro(error.message || "Nao foi possivel carregar a foto.");
    } finally {
      event.target.value = "";
    }
  }

  function removerFotoModal(index) {
    setFotoPreview((atual) => normalizarListaFotos(atual).filter((_, i) => i !== index));
  }

  async function salvarFotoEquipamento() {
    if (!equipamentoSelecionado?.id) return;
    try {
      setSalvandoFoto(true);
      setFotoErro("");
      const payload = montarPayloadEstoque(equipamentoSelecionado, fotoPreview);
      const atualizado = await api.put(`/api/estoques/${equipamentoSelecionado.id}`, payload);
      setEquipamentos((atual) =>
        atual.map((item) => (item.id === atualizado.id ? resumirEquipamentoLista(atualizado) : item)),
      );
      setEquipamentoSelecionado(atualizado);
      setFotoModalOpen(false);
    } catch (error) {
      setFotoErro(error.message || "Nao foi possivel salvar a foto.");
    } finally {
      setSalvandoFoto(false);
    }
  }

  async function excluirFotoTabela(equipamento) {
    if (!equipamento?.id || !contarFotosEquipamento(equipamento)) return;
    if (!window.confirm(`Deseja excluir as fotos de "${equipamento.nomeEquipamento}"?`)) return;
    try {
      setSalvandoFotoEquipId(equipamento.id);
      const equipamentoCompleto = await carregarEquipamentoCompleto(equipamento);
      const payload = montarPayloadEstoque(equipamentoCompleto, []);
      const atualizado = await api.put(`/api/estoques/${equipamento.id}`, payload);
      setEquipamentos((atual) =>
        atual.map((item) => (item.id === atualizado.id ? resumirEquipamentoLista(atualizado) : item)),
      );
      if (equipamentoSelecionado?.id === equipamento.id) {
        setEquipamentoSelecionado(atualizado);
        setFotoPreview([]);
      }
    } catch (error) {
      window.alert(error.message || "Nao foi possivel excluir a foto.");
    } finally {
      setSalvandoFotoEquipId(null);
    }
  }

  function handleArquivoImportacao(event) {
    const file = event.target.files?.[0];
    if (!file) return;
    setArquivoImportacao(file.name);
    setImportErro("");
    setImportResultado(null);
    const reader = new FileReader();
    reader.onload = (loadEvent) => {
      try {
        const data = loadEvent.target?.result;
        const workbook = XLSX.read(data, { type: "binary" });
        const sheetName = workbook.SheetNames[0];
        const sheet = workbook.Sheets[sheetName];
        const rows = XLSX.utils.sheet_to_json(sheet, { header: 1, blankrows: false });
        setPreviewImportacao(Array.isArray(rows) ? rows : []);
      } catch {
        setImportErro("Nao foi possivel ler a planilha.");
      }
    };
    reader.readAsBinaryString(file);
  }

  async function importarTabela() {
    if (previewImportacao.length < 2) {
      setImportErro("Escolha uma planilha com cabecalho e pelo menos uma linha.");
      return;
    }
    const cabecalhoNormalizado = previewImportacao[0].map((item) => normalizarCabecalhoImportacao(item));
    const indices = Object.fromEntries(
      CAMPOS_IMPORTACAO.map(({ campo, aliases }) => {
        const aliasesNormalizados = aliases.map((alias) => normalizarCabecalhoImportacao(alias));
        const indice = cabecalhoNormalizado.findIndex((coluna) => aliasesNormalizados.includes(coluna));
        return [campo, indice];
      }),
    );
    const faltando = CAMPOS_IMPORTACAO.filter(({ campo }) => indices[campo] === -1).map(({ label }) => label);
    if (faltando.length > 0) {
      setImportErro(`Cabecalhos obrigatorios ausentes: ${faltando.join(", ")}`);
      return;
    }
    setImportando(true);
    setImportErro("");
    const criados = [];
    let sucesso = 0;
    let falhas = 0;
    for (let i = 1; i < previewImportacao.length; i += 1) {
      const linha = previewImportacao[i];
      if (!linha || linha.every((celula) => String(celula ?? "").trim() === "")) continue;
      try {
        const empresaBruta = String(linha[indices.empresa] ?? "").trim();
        const empresaComoNumero = Number(empresaBruta);
        let empresaId =
          Number.isFinite(empresaComoNumero) && empresaComoNumero > 0 ? empresaComoNumero : null;
        if (!empresaId) {
          const empresaNormalizada = normalizarCabecalhoImportacao(empresaBruta);
          const empresaEncontrada = empresas.find(
            (empresa) => normalizarCabecalhoImportacao(empresa?.nome) === empresaNormalizada,
          );
          empresaId = empresaEncontrada?.id ?? null;
        }
        if (!empresaId) throw new Error("Empresa nao identificada na planilha.");
        const payload = {
          nomeEquipamento: String(linha[indices.nomeEquipamento] ?? "").trim(),
          tagPatrimonio: String(linha[indices.tagPatrimonio] ?? "").trim(),
          valorLocacao: parseNumberOrZero(linha[indices.valorLocacao] ?? 0),
          valorUnitario: parseNumberOrZero(linha[indices.valorUnitario] ?? 0),
          empresaId,
        };
        const criado = await api.post("/api/estoques", payload);
        criados.push(criado);
        sucesso += 1;
      } catch {
        falhas += 1;
      }
    }
    if (criados.length > 0) {
      setEquipamentos((atual) => [...atual, ...resumirListaEquipamentos(criados)]);
    }
    setImportResultado({ sucesso, falhas });
    setImportando(false);
  }

  async function cadastrarEquipamento() {
    if (cadastroEmAndamentoRef.current) return;
    if (!novoEquipamento.nomeEquipamento || !novoEquipamento.empresaId) {
      setCadastroErro("Preencha nome e empresa.");
      return;
    }
    if (cadastroTagDuplicada) {
      setCadastroErro("Este equipamento ja está cadastrado");
      return;
    }
    try {
      cadastroEmAndamentoRef.current = true;
      setSalvando(true);
      setCadastroErro("");
      const payload = {
        nomeEquipamento: novoEquipamento.nomeEquipamento.trim(),
        tagPatrimonio: novoEquipamento.tagPatrimonio.trim(),
        valorLocacao: parseNumberOrZero(novoEquipamento.valorLocacao),
        valorUnitario: parseNumberOrZero(novoEquipamento.valorUnitario),
        empresaId: Number(novoEquipamento.empresaId),
        canteiroId: novoEquipamento.canteiroId ? Number(novoEquipamento.canteiroId) : null,
        atualizarFotos: !novoEquipamento.id,
        ...(!novoEquipamento.id
          ? {
              fotoBase64: normalizarListaFotos(novoEquipamento.fotosBase64)[0] || null,
              fotoBase64Secundaria: normalizarListaFotos(novoEquipamento.fotosBase64)[1] || null,
            }
          : {}),
      };
      let equipamentoSalvo;
      if (novoEquipamento.id) {
        equipamentoSalvo = await api.put(`/api/estoques/${novoEquipamento.id}`, payload);
        setEquipamentos((atual) => mesclarEquipamentoNaLista(atual, equipamentoSalvo));
      } else {
        equipamentoSalvo = await api.post("/api/estoques", payload);
        setEquipamentos((atual) => mesclarEquipamentoNaLista(atual, equipamentoSalvo));
        setOficinas((atual) => registrarEquipamentoLocalNaOficina(atual, equipamentoSalvo));
      }
      setCadastroModalOpen(false);
      limparFormularioCadastro();
    } catch (error) {
      setCadastroErro(error.message || "Nao foi possivel salvar o equipamento.");
    } finally {
      setSalvando(false);
      cadastroEmAndamentoRef.current = false;
    }
  }

  async function enviarParaManutencao() {
    if (!equipamentoSelecionado) return;
    try {
      setSalvando(true);
      setAcaoErro("");
      await api.post("/api/manutencoes", {
        equipamentoId: equipamentoSelecionado.id,
        status: "PENDENTE",
        observacao: manutencaoObservacao.trim(),
      });
      const [manutencoesAtualizadas, estoquesAtualizados] = await Promise.all([
        api.get("/api/manutencoes"),
        api.get("/api/estoques"),
      ]);
      setManutencoes(Array.isArray(manutencoesAtualizadas) ? manutencoesAtualizadas : []);
      setEquipamentos(resumirListaEquipamentos(estoquesAtualizados));
      setManutencaoModalOpen(false);
      window.alert("Equipamento enviado para manutencao.");
    } catch (error) {
      setAcaoErro(error.message || "Nao foi possivel enviar para manutencao.");
    } finally {
      setSalvando(false);
    }
  }

  function abrirModalExclusaoEquipamento(equipamento) {
    setEquipamentoParaExcluir(equipamento);
    setConfirmarExclusaoModalOpen(true);
  }

  function fecharModalExclusaoEquipamento() {
    if (excluindoEquipamento) return;
    setConfirmarExclusaoModalOpen(false);
    setEquipamentoParaExcluir(null);
  }

  async function excluirEquipamentoConfirmado() {
    if (!equipamentoParaExcluir?.id) return;
    const idExclusao = equipamentoParaExcluir.id;
    const equipamentosAnteriores = equipamentos;
    const equipamentoSelecionadoAnterior = equipamentoSelecionado;
    const equipamentoDetalheAnterior = equipamentoDetalheSelecionado;
    try {
      setExcluindoEquipamento(true);
      setEquipamentos((atual) => atual.filter((item) => item.id !== idExclusao));
      setEquipamentoSelecionado((atual) => (atual?.id === idExclusao ? null : atual));
      setEquipamentoDetalheSelecionado((atual) => (atual?.id === idExclusao ? null : atual));
      setConfirmarExclusaoModalOpen(false);
      setEquipamentoParaExcluir(null);
      await api.delete(`/api/estoques/${idExclusao}`);
    } catch (error) {
      setEquipamentos(equipamentosAnteriores);
      setEquipamentoSelecionado(equipamentoSelecionadoAnterior);
      setEquipamentoDetalheSelecionado(equipamentoDetalheAnterior);
      setConfirmarExclusaoModalOpen(true);
      setEquipamentoParaExcluir(
        equipamentosAnteriores.find((item) => item.id === idExclusao) || equipamentoParaExcluir,
      );
      window.alert(error.message || "Nao foi possivel excluir o equipamento.");
    } finally {
      setExcluindoEquipamento(false);
    }
  }

  async function excluirTodosEquipamentos() {
    if (!isDeveloperLike) {
      window.alert("Apenas GERENCIA pode excluir todos os equipamentos.");
      return;
    }
    const idsFiltrados = equipamentosFiltrados.map((item) => item?.id).filter((id) => id != null);
    if (!idsFiltrados.length) {
      window.alert("Nao ha equipamentos no filtro atual para excluir.");
      return;
    }
    const confirmou = window.confirm(
      `Deseja excluir TODOS os ${idsFiltrados.length} equipamentos do filtro atual? Essa acao nao pode ser desfeita.`,
    );
    if (!confirmou) return;
    try {
      setExcluindoTodos(true);
      const resultado = await api.post("/api/estoques/exclusao-lote", { ids: idsFiltrados });
      const [estoquesAtualizados, manutencoesAtualizadas] = await Promise.all([
        api.get("/api/estoques"),
        api.get("/api/manutencoes"),
      ]);
      setEquipamentos(resumirListaEquipamentos(estoquesAtualizados));
      setManutencoes(Array.isArray(manutencoesAtualizadas) ? manutencoesAtualizadas : []);
      const total = Number(resultado?.total ?? 0);
      const excluidos = Number(resultado?.excluidos ?? 0);
      const bloqueados = Number(resultado?.bloqueados ?? 0);
      const erros = Number(resultado?.erros ?? 0);
      window.alert(
        `Processo concluido. Total: ${total} | Excluidos: ${excluidos} | Bloqueados: ${bloqueados} | Erros: ${erros}`,
      );
    } catch (error) {
      window.alert(error.message || "Nao foi possivel excluir todos os equipamentos.");
    } finally {
      setExcluindoTodos(false);
    }
  }

  // ─── Return ───────────────────────────────────────────────────────────────

  return {
    // Permissions
    isDeveloperLike,
    canManageCanteiros,
    canManageEmpresas,
    rotuloVisaoEstoque,

    // Data
    equipamentosDaVisao,
    equipamentosFiltrados,
    empresasOrdenadas,
    canteirosOrdenados,
    locacoesDisponiveis,
    valoresDisponiveis,
    equipamentoIdsNaOficina,
    equipamentoIdsNaManutencao,
    resumoEstoque,
    filtrosAplicados,
    ultimoChecklistDetalhe,
    detalhesEquipamento,
    carregandoResumoChecklistEquipId,

    // Loading / error
    loading,
    erro,

    // Filter state
    definicoesFiltro,
    filtrosCascata,
    setFiltrosCascata,
    locacaoMin, setLocacaoMin,
    locacaoMax, setLocacaoMax,
    valorMin, setValorMin,
    valorMax, setValorMax,
    filtroSituacao, setFiltroSituacao,
    filtroFoto, setFiltroFoto,
    limparFiltrosValores,

    // Modal flags
    exportModalOpen, setExportModalOpen,
    importModalOpen, setImportModalOpen,
    cadastroModalOpen, setCadastroModalOpen,
    confirmarMoverModalOpen, setConfirmarMoverModalOpen,
    confirmarExclusaoModalOpen,
    manutencaoModalOpen, setManutencaoModalOpen,
    fotoModalOpen, setFotoModalOpen,
    fotoModalSomenteLeitura, setFotoModalSomenteLeitura,
    detalhesEquipamentoModalOpen, setDetalhesEquipamentoModalOpen,

    // Loading flags
    salvando,
    excluindoTodos,
    gerandoChecklistPdf,
    salvandoFoto,
    salvandoFotoEquipId,
    salvandoEmpresa,
    salvandoCanteiro,
    excluindoEquipamento,
    importando,

    // Error messages
    cadastroErro,
    empresaGestaoErro,
    canteiroGestaoErro,
    acaoErro, setAcaoErro,
    fotoErro, setFotoErro,
    importErro,
    importResultado,
    setCadastroErro,

    // Form state
    novoEquipamento, setNovoEquipamento,
    cadastroTagDuplicada,
    empresaGestaoNome, setEmpresaGestaoNome,
    canteiroGestaoNome, setCanteiroGestaoNome,
    manutencaoObservacao, setManutencaoObservacao,
    moverMensagem,

    // Import state
    arquivoImportacao,
    previewImportacao,

    // Selected items
    equipamentoSelecionado,
    equipamentoDetalheSelecionado, setEquipamentoDetalheSelecionado,
    equipamentoParaExcluir,
    fotoPreview, setFotoPreview,

    // Handlers
    abrirModalCadastro,
    cadastrarEquipamento,
    criarEmpresa,
    editarEmpresaSelecionada,
    excluirEmpresaSelecionada,
    criarCanteiro,
    editarCanteiroSelecionado,
    excluirCanteiroSelecionado,
    handleFotoCadastro,
    removerFotoCadastro,
    abrirModalOficina,
    moverParaOficina,
    abrirModalManutencao,
    enviarParaManutencao,
    abrirModalFoto,
    abrirModalDetalhesEquipamento,
    visualizarUltimoChecklistPdf,
    limparResumoChecklistEquipamento,
    handleNovaFotoModal,
    removerFotoModal,
    salvarFotoEquipamento,
    excluirFotoTabela,
    handleArquivoImportacao,
    importarTabela,
    limparImportacao,
    excluirTodosEquipamentos,
    abrirModalExclusaoEquipamento,
    fecharModalExclusaoEquipamento,
    excluirEquipamentoConfirmado,
  };
}
