import { useEffect, useMemo, useState } from "react";
import Modal from "./Modal";
import OutletLoading from "./OutletLoading";
import { api } from "../services/api";
import { sortByTextKeys } from "../utils/sort";

const STATUS_LOCADO = "LOCADO";
const STATUS_DEVOLVIDO = "DEVOLVIDO";
const PERIODOS_LOCACAO = [
  { value: "1", label: "1 Dia", dias: 1 },
  { value: "3", label: "3 Dias", dias: 3 },
  { value: "7", label: "7 Dias", dias: 7 },
  { value: "15", label: "15 Dias", dias: 15 },
  { value: "30", label: "30 Dias", dias: 30 },
];

function formatCurrency(value) {
  const amount = Number(value ?? 0);

  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(amount);
}

function parseNumberOrZero(value) {
  if (value == null) return 0;
  const normalized = String(value).trim().replace(",", ".");
  if (!normalized) return 0;
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : 0;
}

function normalizePieces(items) {
  if (!Array.isArray(items)) return [];

  return items
    .map((item) => ({
      nome: String(item?.nome ?? "").trim(),
      quantidade: String(item?.quantidade ?? "").trim(),
    }))
    .filter((item) => item.nome || item.quantidade);
}

function normalizarListaFotos(fotos) {
  if (!Array.isArray(fotos)) return [];

  return fotos
    .map((foto) => (typeof foto === "string" ? foto.trim() : ""))
    .filter(Boolean)
    .slice(0, 2);
}

function extrairFotosLocado(item) {
  return normalizarListaFotos([
    item?.fotoUrl,
    item?.fotoUrl2,
  ]);
}

function contarFotosLocado(item) {
  return extrairFotosLocado(item).length;
}

function normalizarStatusLocado(value) {
  return String(value ?? "").trim().toUpperCase() === STATUS_DEVOLVIDO
    ? STATUS_DEVOLVIDO
    : STATUS_LOCADO;
}

function normalizarDataCampo(value) {
  const texto = String(value ?? "").trim();
  return /^\d{4}-\d{2}-\d{2}$/.test(texto) ? texto : "";
}

function calcularDataSaida(dataLocacao, periodoValue) {
  const dataBase = normalizarDataCampo(dataLocacao);
  const periodo = PERIODOS_LOCACAO.find((item) => item.value === String(periodoValue ?? ""));
  if (!dataBase || !periodo) return "";

  const [ano, mes, dia] = dataBase.split("-").map(Number);
  const data = new Date(ano, mes - 1, dia);
  if (Number.isNaN(data.getTime())) return "";
  data.setDate(data.getDate() + periodo.dias);

  const anoSaida = data.getFullYear();
  const mesSaida = String(data.getMonth() + 1).padStart(2, "0");
  const diaSaida = String(data.getDate()).padStart(2, "0");
  return `${anoSaida}-${mesSaida}-${diaSaida}`;
}

function inferirPeriodoPorDatas(dataLocacao, dataSaida) {
  const inicio = normalizarDataCampo(dataLocacao);
  const fim = normalizarDataCampo(dataSaida);
  if (!inicio || !fim) return "";

  const [anoInicio, mesInicio, diaInicio] = inicio.split("-").map(Number);
  const [anoFim, mesFim, diaFim] = fim.split("-").map(Number);
  const dataInicio = new Date(anoInicio, mesInicio - 1, diaInicio);
  const dataFim = new Date(anoFim, mesFim - 1, diaFim);
  if (Number.isNaN(dataInicio.getTime()) || Number.isNaN(dataFim.getTime())) return "";

  const diferencaEmDias = Math.round((dataFim.getTime() - dataInicio.getTime()) / 86400000);
  const periodo = PERIODOS_LOCACAO.find((item) => item.dias === diferencaEmDias);
  return periodo?.value ?? "";
}

function calcularDiasRestantes(dataSaida) {
  const valor = normalizarDataCampo(dataSaida);
  if (!valor) return null;

  const [ano, mes, dia] = valor.split("-").map(Number);
  const dataContrato = new Date(ano, mes - 1, dia);
  if (Number.isNaN(dataContrato.getTime())) return null;

  const hoje = new Date();
  const hojeInicioDia = new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate());
  const contratoInicioDia = new Date(dataContrato.getFullYear(), dataContrato.getMonth(), dataContrato.getDate());
  return Math.round((contratoInicioDia.getTime() - hojeInicioDia.getTime()) / 86400000);
}

const FOTO_MAX_DIMENSAO = 1280;
const FOTO_MAX_BYTES = 3 * 1024 * 1024;

function estimateBase64Bytes(dataUrl) {
  if (typeof dataUrl !== "string") return 0;
  const base64 = dataUrl.split(",")[1] || "";
  return Math.ceil((base64.length * 3) / 4);
}

async function lerArquivoComoDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ""));
    reader.onerror = () => reject(new Error("Nao foi possivel ler a foto."));
    reader.readAsDataURL(file);
  });
}

async function carregarImagem(url) {
  return new Promise((resolve, reject) => {
    const imagem = new Image();
    imagem.onload = () => resolve(imagem);
    imagem.onerror = () => reject(new Error("Nao foi possivel processar a foto."));
    imagem.src = url;
  });
}

async function normalizarFotoArquivo(file) {
  if (!file) return "";
  if (!String(file.type || "").startsWith("image/")) {
    throw new Error("Selecione um arquivo de imagem.");
  }

  const dataUrl = await lerArquivoComoDataUrl(file);
  const imagem = await carregarImagem(dataUrl);
  const maiorLado = Math.max(imagem.width, imagem.height) || 1;
  const escala = Math.min(1, FOTO_MAX_DIMENSAO / maiorLado);
  const largura = Math.max(1, Math.round(imagem.width * escala));
  const altura = Math.max(1, Math.round(imagem.height * escala));
  const canvas = document.createElement("canvas");
  canvas.width = largura;
  canvas.height = altura;
  const contexto = canvas.getContext("2d");

  if (!contexto) {
    throw new Error("Nao foi possivel preparar a foto.");
  }

  contexto.drawImage(imagem, 0, 0, largura, altura);
  const comprimida = canvas.toDataURL("image/jpeg", 0.82);
  if (estimateBase64Bytes(comprimida) > FOTO_MAX_BYTES) {
    throw new Error("A foto ficou grande demais. Tente uma imagem menor.");
  }

  return comprimida;
}

function createEmptyForm() {
  return {
    id: null,
    nomeLocado: "",
    contrato: "",
    tag: "",
    empresaId: "",
    quantidade: "1",
    valorLocacao: "",
    valorUnitario: "",
    status: STATUS_LOCADO,
    obra: "",
    equipeId: "",
    dataLocacao: "",
    periodoLocacao: "",
    dataSaida: "",
    fotos: [],
    pecas: [],
  };
}

function montarPayloadEquipamentoLocado(form, fotos = form?.fotos, pecas = form?.pecas) {
  return {
    nomeLocado: String(form?.nomeLocado ?? "").trim(),
    contrato: String(form?.contrato ?? "").trim(),
    tag: String(form?.tag ?? "").trim(),
    empresaId: Number(form?.empresaId),
    quantidade: Math.max(0, Math.trunc(parseNumberOrZero(form?.quantidade))),
    valorLocacao: parseNumberOrZero(form?.valorLocacao),
    valorUnitario: parseNumberOrZero(form?.valorUnitario),
    fotoUrl: normalizarListaFotos(fotos)[0] || null,
    fotoUrl2: normalizarListaFotos(fotos)[1] || null,
    status: normalizarStatusLocado(form?.status),
    obra: String(form?.obra ?? "").trim(),
    equipeId: form?.equipeId ? Number(form.equipeId) : null,
    dataLocacao: String(form?.dataLocacao ?? "").trim(),
    dataSaida: String(form?.dataSaida ?? "").trim(),
    indenizacaoValor: form?.indenizacaoValor != null ? parseNumberOrZero(form.indenizacaoValor) : null,
    indenizacaoDescricao: form?.indenizacaoDescricao ? String(form.indenizacaoDescricao).trim() : null,
    pecas: normalizePieces(pecas).map((peca) => ({
      nome: peca.nome,
      quantidade: Math.max(0, Math.trunc(parseNumberOrZero(peca.quantidade))),
    })),
  };
}

export default function EstoqueLocadosView() {
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState("");
  const [salvando, setSalvando] = useState(false);
  const [salvandoFoto, setSalvandoFoto] = useState(false);
  const [salvandoPecas, setSalvandoPecas] = useState(false);
  const [excluindoId, setExcluindoId] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [fotoModalOpen, setFotoModalOpen] = useState(false);
  const [pecasModalOpen, setPecasModalOpen] = useState(false);
  const [equipeModalOpen, setEquipeModalOpen] = useState(false);
  const [fotoModalSomenteLeitura, setFotoModalSomenteLeitura] = useState(false);
  const [formErro, setFormErro] = useState("");
  const [fotoErro, setFotoErro] = useState("");
  const [pecasErro, setPecasErro] = useState("");
  const [equipeErro, setEquipeErro] = useState("");
  const [indenizacaoPerguntaOpen, setIndenizacaoPerguntaOpen] = useState(false);
  const [indenizacaoFormOpen, setIndenizacaoFormOpen] = useState(false);
  const [indenizacaoVisualizarOpen, setIndenizacaoVisualizarOpen] = useState(false);
  const [indenizacaoVisualizarItem, setIndenizacaoVisualizarItem] = useState(null);
  const [indenizacaoPendente, setIndenizacaoPendente] = useState(null);
  const [indenizacaoForm, setIndenizacaoForm] = useState({ valor: "", descricao: "" });
  const [salvandoIndenizacao, setSalvandoIndenizacao] = useState(false);
  const [busca, setBusca] = useState("");
  const [statusFiltro, setStatusFiltro] = useState("");
  const [empresaFiltro, setEmpresaFiltro] = useState("");
  const [equipamentos, setEquipamentos] = useState([]);
  const [empresas, setEmpresas] = useState([]);
  const [equipes, setEquipes] = useState([]);
  const [form, setForm] = useState(createEmptyForm());
  const [equipamentoSelecionado, setEquipamentoSelecionado] = useState(null);
  const [fotoPreview, setFotoPreview] = useState([]);
  const [pecasPreview, setPecasPreview] = useState([]);
  const [equipeSelecionadaId, setEquipeSelecionadaId] = useState("");
  const fadaOverlayVisivel = false;
  const fadasDockVisivel = false;
  const fadaAnimacaoKey = 0;
  const fadasAtivas = [];
  const filtroVencimentoDias = "";
  const setFiltroVencimentoDias = () => {};
  /*
    const lista = [];

    if (temAlertaTresDias) {
      lista.push({
        id: "3-dias",
        modo: "normal",
        titulo: "Ei! Tem equipamento para vencer em 3 dias!",
        detalhe: "Verifique o contrato e se organize para renovacao.",
      });
    }

    if (temAlertaUmDia) {
      lista.push({
        id: "1-dia",
        modo: "panic",
        titulo: "Socorro! Tem equipamento que vai vencer em 1 dia!",
        detalhe: "Acione a equipe agora para evitar atraso no contrato.",
      });
    }

    if (temAlertaVencido) {
      lista.push({
        id: "vencido",
        modo: "morto",
        titulo: `${alertasVencidos.length} equipamento${alertasVencidos.length > 1 ? "s" : ""} com contrato vencido!`,
        detalhe: "Renove ou devolva o equipamento o mais rápido possível.",
      });
    }

    return lista;
  }, [temAlertaTresDias, temAlertaUmDia, temAlertaVencido, alertasVencidos]);

  */
  useEffect(() => {
    let ativo = true;

    async function carregarDados() {
      try {
        setLoading(true);
        setErro("");

        const [locadosResponse, empresasResponse, equipesResponse] = await Promise.all([
          api.get("/api/equipamentos-locados"),
          api.get("/api/empresas"),
          api.get("/api/equipes"),
        ]);

        if (!ativo) return;

        setEquipamentos(Array.isArray(locadosResponse) ? locadosResponse : []);
        setEmpresas(Array.isArray(empresasResponse) ? empresasResponse : []);
        setEquipes(Array.isArray(equipesResponse) ? equipesResponse : []);
      } catch (error) {
        if (!ativo) return;
        setErro(error.message || "Erro ao buscar equipamentos locados.");
      } finally {
        if (ativo) {
          setLoading(false);
        }
      }
    }

    carregarDados();

    return () => {
      ativo = false;
    };
  }, []);

  const empresasOrdenadas = useMemo(() => sortByTextKeys(empresas, (item) => item?.nome), [empresas]);
  const equipesOrdenadas = useMemo(() => sortByTextKeys(equipes, (item) => item?.nome), [equipes]);

  const statusDisponiveis = useMemo(() => {
    return [STATUS_LOCADO, STATUS_DEVOLVIDO];
  }, []);

  const temFiltrosAtivos = Boolean(busca || empresaFiltro || statusFiltro);

  const equipamentosFiltrados = useMemo(() => {
    const termo = busca.trim().toLowerCase();

    const filtrados = equipamentos.filter((item) => {
      const textoBusca = [
        item?.nomeLocado,
        item?.contrato,
        item?.tag,
        item?.obra,
        item?.empresa?.nome,
        item?.equipe?.nome,
      ]
        .map((valor) => String(valor ?? "").toLowerCase())
        .join(" ");

      const atendeBusca = !termo || textoBusca.includes(termo);
      const atendeStatus = !statusFiltro || normalizarStatusLocado(item?.status) === statusFiltro;
      const atendeEmpresa = !empresaFiltro || String(item?.empresa?.id ?? "") === empresaFiltro;

      return atendeBusca && atendeStatus && atendeEmpresa;
    });

    return sortByTextKeys(filtrados, (item) => item?.nomeLocado, (item) => item?.contrato, (item) => item?.tag);
  }, [busca, empresaFiltro, equipamentos, statusFiltro]);

  const resumo = useMemo(() => {
    const totalRegistros = equipamentosFiltrados.length;
    const totalComFoto = equipamentosFiltrados.filter((item) => contarFotosLocado(item) > 0).length;
    const totalPecas = equipamentosFiltrados.reduce(
      (acc, item) => acc + (Array.isArray(item?.pecas) ? item.pecas.reduce((sum, peca) => sum + Number(peca?.quantidade ?? 0), 0) : 0),
      0,
    );
    const comEquipe = equipamentosFiltrados.filter((item) => item?.equipe?.id != null).length;

    return {
      totalRegistros,
      totalComFoto,
      totalPecas,
      comEquipe,
    };
  }, [equipamentosFiltrados]);

  function upsertEquipamento(salvo) {
    setEquipamentos((atual) => {
      const existe = atual.some((item) => item?.id === salvo?.id);
      const proximaLista = existe
        ? atual.map((item) => (item?.id === salvo?.id ? salvo : item))
        : [...atual, salvo];

      return sortByTextKeys(proximaLista, (item) => item?.nomeLocado, (item) => item?.contrato, (item) => item?.tag);
    });
  }

  function abrirModalNovo() {
    setForm(createEmptyForm());
    setFormErro("");
    setModalOpen(true);
  }

  function abrirModalEditar(item) {
    setForm({
      id: item?.id ?? null,
      nomeLocado: item?.nomeLocado ?? "",
      contrato: item?.contrato ?? "",
      tag: item?.tag ?? "",
      empresaId: item?.empresa?.id != null ? String(item.empresa.id) : "",
      quantidade: item?.quantidade != null ? String(item.quantidade) : "1",
      valorLocacao: item?.valorLocacao != null ? String(item.valorLocacao) : "",
      valorUnitario: item?.valorUnitario != null ? String(item.valorUnitario) : "",
      status: normalizarStatusLocado(item?.status),
      obra: item?.obra ?? "",
      equipeId: item?.equipe?.id != null ? String(item.equipe.id) : "",
      dataLocacao: normalizarDataCampo(item?.dataLocacao),
      periodoLocacao: inferirPeriodoPorDatas(item?.dataLocacao, item?.dataSaida),
      dataSaida: normalizarDataCampo(item?.dataSaida),
      fotos: extrairFotosLocado(item),
      pecas: normalizePieces(item?.pecas),
    });
    setFormErro("");
    setModalOpen(true);
  }

  function abrirModalFoto(item, somenteLeitura = false) {
    setEquipamentoSelecionado(item);
    setFotoPreview(extrairFotosLocado(item));
    setFotoErro("");
    setFotoModalSomenteLeitura(somenteLeitura);
    setFotoModalOpen(true);
  }

  function abrirModalPecas(item) {
    setEquipamentoSelecionado(item);
    setPecasPreview(normalizePieces(item?.pecas));
    setPecasErro("");
    setPecasModalOpen(true);
  }

  function abrirModalEquipe(item) {
    setEquipamentoSelecionado(item);
    setEquipeSelecionadaId(item?.equipe?.id != null ? String(item.equipe.id) : "");
    setEquipeErro("");
    setEquipeModalOpen(true);
  }

  function atualizarCampo(campo, valor) {
    setForm((atual) => ({
      ...atual,
      [campo]: valor,
      ...(campo === "dataLocacao" || campo === "periodoLocacao"
        ? {
            dataSaida: calcularDataSaida(
              campo === "dataLocacao" ? valor : atual.dataLocacao,
              campo === "periodoLocacao" ? valor : atual.periodoLocacao,
            ),
          }
        : {}),
    }));
  }

  async function handleFotoCadastro(event) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;

    try {
      setFormErro("");
      const fotosAtuais = normalizarListaFotos(form.fotos);
      if (fotosAtuais.length >= 2) {
        setFormErro("Limite de 2 fotos por equipamento.");
        return;
      }

      const fotoBase64 = await normalizarFotoArquivo(file);
      setForm((atual) => ({
        ...atual,
        fotos: [...normalizarListaFotos(atual.fotos), fotoBase64].slice(0, 2),
      }));
    } catch (error) {
      setFormErro(error.message || "Nao foi possivel carregar a foto.");
    }
  }

  function removerFotoCadastro(index) {
    setForm((atual) => ({
      ...atual,
      fotos: normalizarListaFotos(atual.fotos).filter((_, i) => i !== index),
    }));
  }

  function adicionarPeca() {
    setPecasPreview((atual) => [...atual, { nome: "", quantidade: "1" }]);
  }

  function atualizarPeca(index, campo, valor) {
    setPecasPreview((atual) => atual.map((peca, currentIndex) => (currentIndex === index ? { ...peca, [campo]: valor } : peca)));
  }

  function removerPeca(index) {
    setPecasPreview((atual) => atual.filter((_, currentIndex) => currentIndex !== index));
  }

  async function handleNovaFotoModal(event) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;

    try {
      setFotoErro("");
      const fotosAtuais = normalizarListaFotos(fotoPreview);
      if (fotosAtuais.length >= 2) {
        setFotoErro("Limite de 2 fotos por equipamento.");
        return;
      }

      const fotoBase64 = await normalizarFotoArquivo(file);
      setFotoPreview((atual) => [...normalizarListaFotos(atual), fotoBase64].slice(0, 2));
    } catch (error) {
      setFotoErro(error.message || "Nao foi possivel carregar a foto.");
    }
  }

  function removerFotoModal(index) {
    setFotoPreview((atual) => normalizarListaFotos(atual).filter((_, i) => i !== index));
  }

  async function salvarEquipamento() {
    if (!String(form.nomeLocado ?? "").trim()) {
      setFormErro("Informe o nome do equipamento locado.");
      return;
    }

    if (!form.empresaId) {
      setFormErro("Selecione a empresa.");
      return;
    }

    setSalvando(true);
    setFormErro("");

    try {
      const payload = montarPayloadEquipamentoLocado(form);
      const salvo = form.id
        ? await api.put(`/api/equipamentos-locados/${form.id}`, payload)
        : await api.post("/api/equipamentos-locados", payload);

      upsertEquipamento(salvo);
      setModalOpen(false);
      setForm(createEmptyForm());
    } catch (error) {
      setFormErro(error.message || "Nao foi possivel salvar o equipamento locado.");
    } finally {
      setSalvando(false);
    }
  }

  async function alternarStatusEquipamento(item) {
    if (!item?.id) return;

    const proximoStatus = normalizarStatusLocado(item?.status) === STATUS_LOCADO
      ? STATUS_DEVOLVIDO
      : STATUS_LOCADO;

    if (proximoStatus === STATUS_DEVOLVIDO) {
      setIndenizacaoPendente(item);
      setIndenizacaoForm({ valor: "", descricao: "" });
      setIndenizacaoPerguntaOpen(true);
      return;
    }

    await confirmarAlteracaoStatus(item, STATUS_LOCADO, null);
  }

  async function confirmarAlteracaoStatus(item, proximoStatus, indenizacao) {
    if (!item?.id) return;

    try {
      setExcluindoId(item.id);

      const payload = montarPayloadEquipamentoLocado({
        ...item,
        empresaId: item?.empresa?.id,
        equipeId: item?.equipe?.id ?? "",
        status: proximoStatus,
        indenizacaoValor: indenizacao?.valor ?? null,
        indenizacaoDescricao: indenizacao?.descricao ?? null,
      }, extrairFotosLocado(item), item?.pecas);

      const salvo = await api.put(`/api/equipamentos-locados/${item.id}`, payload);
      upsertEquipamento(salvo);
      if (equipamentoSelecionado?.id === item.id) {
        setEquipamentoSelecionado(salvo);
      }
    } catch (error) {
      window.alert(error.message || "Nao foi possivel atualizar o status.");
    } finally {
      setExcluindoId(null);
    }
  }

  async function salvarIndenizacaoEDevolver() {
    setSalvandoIndenizacao(true);
    try {
      await confirmarAlteracaoStatus(indenizacaoPendente, STATUS_DEVOLVIDO, {
        valor: indenizacaoForm.valor,
        descricao: indenizacaoForm.descricao,
      });
    } finally {
      setSalvandoIndenizacao(false);
      setIndenizacaoFormOpen(false);
      setIndenizacaoPendente(null);
    }
  }

  async function salvarFotoEquipamentoLocado() {
    if (!equipamentoSelecionado?.id) return;

    try {
      setSalvandoFoto(true);
      setFotoErro("");

      const payload = montarPayloadEquipamentoLocado(
        {
          ...equipamentoSelecionado,
          empresaId: equipamentoSelecionado?.empresa?.id,
          equipeId: equipamentoSelecionado?.equipe?.id ?? "",
          pecas: normalizePieces(equipamentoSelecionado?.pecas),
          fotos: fotoPreview,
        },
        fotoPreview,
        equipamentoSelecionado?.pecas,
      );

      const salvo = await api.put(`/api/equipamentos-locados/${equipamentoSelecionado.id}`, payload);
      upsertEquipamento(salvo);
      setEquipamentoSelecionado(salvo);
      setFotoPreview(extrairFotosLocado(salvo));
      setFotoModalOpen(false);
      setFotoModalSomenteLeitura(false);
    } catch (error) {
      setFotoErro(error.message || "Nao foi possivel salvar as fotos.");
    } finally {
      setSalvandoFoto(false);
    }
  }

  async function excluirFotoTabela(item) {
    const fotosAtuais = extrairFotosLocado(item);
    if (!fotosAtuais.length) return;

    const confirmou = window.confirm(`Deseja excluir as fotos de ${item?.nomeLocado || "este equipamento"}?`);
    if (!confirmou) return;

    try {
      setSalvandoFoto(true);
      const payload = montarPayloadEquipamentoLocado(
        {
          ...item,
          empresaId: item?.empresa?.id,
          equipeId: item?.equipe?.id ?? "",
        },
        [],
        item?.pecas,
      );

      const salvo = await api.put(`/api/equipamentos-locados/${item.id}`, payload);
      upsertEquipamento(salvo);
      if (equipamentoSelecionado?.id === item.id) {
        setEquipamentoSelecionado(salvo);
        setFotoPreview([]);
      }
    } catch (error) {
      window.alert(error.message || "Nao foi possivel excluir as fotos.");
    } finally {
      setSalvandoFoto(false);
    }
  }

  async function salvarPecasEquipamento() {
    if (!equipamentoSelecionado?.id) return;

    try {
      setSalvandoPecas(true);
      setPecasErro("");

      const payload = montarPayloadEquipamentoLocado(
        {
          ...equipamentoSelecionado,
          empresaId: equipamentoSelecionado?.empresa?.id,
          equipeId: equipamentoSelecionado?.equipe?.id ?? "",
        },
        extrairFotosLocado(equipamentoSelecionado),
        pecasPreview,
      );

      const salvo = await api.put(`/api/equipamentos-locados/${equipamentoSelecionado.id}`, payload);
      upsertEquipamento(salvo);
      setEquipamentoSelecionado(salvo);
      setPecasPreview(normalizePieces(salvo?.pecas));
      setPecasModalOpen(false);
    } catch (error) {
      setPecasErro(error.message || "Nao foi possivel salvar as pecas.");
    } finally {
      setSalvandoPecas(false);
    }
  }

  async function salvarEquipeEquipamento() {
    if (!equipamentoSelecionado?.id) return;

    try {
      setSalvando(true);
      setEquipeErro("");

      const payload = montarPayloadEquipamentoLocado(
        {
          ...equipamentoSelecionado,
          empresaId: equipamentoSelecionado?.empresa?.id,
          equipeId: equipeSelecionadaId,
        },
        extrairFotosLocado(equipamentoSelecionado),
        equipamentoSelecionado?.pecas,
      );

      const salvo = await api.put(`/api/equipamentos-locados/${equipamentoSelecionado.id}`, payload);
      upsertEquipamento(salvo);
      setEquipamentoSelecionado(salvo);
      setEquipeModalOpen(false);
    } catch (error) {
      setEquipeErro(error.message || "Nao foi possivel atualizar a equipe.");
    } finally {
      setSalvando(false);
    }
  }

  async function excluirEquipamento(item) {
    const nome = item?.nomeLocado || "este equipamento";
    const confirmou = window.confirm(`Deseja excluir ${nome}? As pecas vinculadas serao removidas junto.`);
    if (!confirmou) return;

    try {
      setExcluindoId(item.id);
      await api.delete(`/api/equipamentos-locados/${item.id}`);
      setEquipamentos((atual) => atual.filter((registro) => registro?.id !== item.id));
    } catch (error) {
      window.alert(error.message || "Nao foi possivel excluir o equipamento locado.");
    } finally {
      setExcluindoId(null);
    }
  }

  if (loading) return <OutletLoading message="Carregando equipamentos locados..." />;

  function limparFiltros() {
    setBusca("");
    setEmpresaFiltro("");
    setStatusFiltro("");
  }

  return (
    <div className="estoque-page">
      {fadaOverlayVisivel && (
        <div key={`fada-overlay-${fadaAnimacaoKey}`} className="estoque-locados-fada-overlay" aria-live="polite">
          <div className={`estoque-locados-fada-scene ${fadasAtivas.length === 3 ? "tres" : fadasAtivas.length === 2 ? "duas" : ""}`} aria-hidden="true">
            {fadasAtivas.map((fada) => (
              <div key={fada.id} className="estoque-locados-fada-card">
                <div className={`estoque-locados-fada-personagem ${fada.modo === "panic" ? "panic" : fada.modo === "morto" ? "morto" : ""}`}>
                  <svg className="estoque-locados-fada-svg" viewBox="0 0 420 420" role="img" aria-label="Fada de aviso">
                <ellipse cx="135" cy="215" rx="74" ry="146" fill="#f7ea00" stroke="#0f172a" strokeWidth="6" />
                <ellipse cx="286" cy="218" rx="74" ry="146" fill="#f7ea00" stroke="#0f172a" strokeWidth="6" />

                <ellipse className="fada-pele" cx="206" cy="200" rx="102" ry="104" fill="#9be15a" stroke="#0f172a" strokeWidth="6" />
                <ellipse cx="208" cy="129" rx="86" ry="66" fill="#2f3136" stroke="#0f172a" strokeWidth="6" />
                <ellipse className="fada-pele" cx="138" cy="143" rx="24" ry="22" fill="#9be15a" stroke="#0f172a" strokeWidth="6" />
                <ellipse className="fada-pele" cx="286" cy="143" rx="24" ry="22" fill="#9be15a" stroke="#0f172a" strokeWidth="6" />

                <path className="fada-pele" d="M170 114 Q206 176 254 114" fill="#9be15a" stroke="#0f172a" strokeWidth="6" />
                {fada.modo === "morto" ? (
                  <>
                    <line x1="176" y1="132" x2="200" y2="156" stroke="#0f172a" strokeWidth="7" strokeLinecap="round" />
                    <line x1="200" y1="132" x2="176" y2="156" stroke="#0f172a" strokeWidth="7" strokeLinecap="round" />
                    <line x1="220" y1="132" x2="244" y2="156" stroke="#0f172a" strokeWidth="7" strokeLinecap="round" />
                    <line x1="244" y1="132" x2="220" y2="156" stroke="#0f172a" strokeWidth="7" strokeLinecap="round" />
                    <path d="M185 170 q25 -10 46 0" fill="none" stroke="#0f172a" strokeWidth="5" strokeLinecap="round" />
                  </>
                ) : fada.modo === "panic" ? (
                  <>
                    <circle cx="188" cy="140" r="8" fill="#0f172a" />
                    <circle cx="230" cy="140" r="8" fill="#0f172a" />
                    <ellipse cx="210" cy="173" rx="20" ry="16" fill="#7f1d1d" stroke="#0f172a" strokeWidth="4" />
                    <ellipse cx="210" cy="178" rx="10" ry="7" fill="#fecdd3" />
                  </>
                ) : (
                  <>
                    <path d="M178 140 q12 16 24 0" fill="none" stroke="#0f172a" strokeWidth="5" strokeLinecap="round" />
                    <path d="M218 140 q12 16 24 0" fill="none" stroke="#0f172a" strokeWidth="5" strokeLinecap="round" />
                    <ellipse cx="210" cy="164" rx="15" ry="9" fill="#f6b8cc" stroke="#0f172a" strokeWidth="4" />
                  </>
                )}

                <ellipse className="fada-pele" cx="230" cy="318" rx="22" ry="52" fill="#9be15a" stroke="#0f172a" strokeWidth="6" />
                <ellipse className="fada-pele" cx="176" cy="318" rx="22" ry="52" fill="#9be15a" stroke="#0f172a" strokeWidth="6" />
                <path d="M138 276 q72 54 148 0" fill="#0f8f0f" stroke="#0f172a" strokeWidth="6" />

                <rect x="88" y="242" width="142" height="24" rx="10" transform="rotate(-52 88 242)" fill="#f59e0b" stroke="#0f172a" strokeWidth="5" />
                <circle cx="83" cy="259" r="5" fill="#0f172a" />
                <circle cx="99" cy="237" r="5" fill="#0f172a" />
                <circle cx="114" cy="216" r="5" fill="#0f172a" />

                <ellipse className="fada-pele" cx="136" cy="223" rx="15" ry="10" fill="#9be15a" stroke="#0f172a" strokeWidth="5" transform="rotate(40 136 223)" />
                <ellipse className="fada-pele" cx="154" cy="236" rx="15" ry="10" fill="#9be15a" stroke="#0f172a" strokeWidth="5" transform="rotate(40 154 236)" />
                <ellipse className="fada-pele" cx="170" cy="251" rx="15" ry="10" fill="#9be15a" stroke="#0f172a" strokeWidth="5" transform="rotate(40 170 251)" />
                  </svg>
                </div>

                {fada.modo === "morto" && (
                <svg className="estoque-locados-fada-caixao" viewBox="0 0 260 180" role="img" aria-label="Caixão">
                  <path d="M 70 15 L 190 15 L 245 70 L 245 165 L 15 165 L 15 70 Z" fill="#1e293b" stroke="#475569" strokeWidth="5" strokeLinejoin="round" />
                  <path d="M 72 17 L 188 17 L 242 70 L 242 95 L 18 95 L 18 70 Z" fill="#334155" stroke="#475569" strokeWidth="3" strokeLinejoin="round" />
                  <rect x="122" y="28" width="16" height="52" rx="4" fill="#64748b" />
                  <rect x="98" y="46" width="64" height="16" rx="4" fill="#64748b" />
                </svg>
              )}
              <div className={`estoque-locados-fada-folha ${fada.modo === "panic" ? "panic" : fada.modo === "morto" ? "morto" : ""}`}>
                  <strong>{fada.titulo}</strong>
                  <span>{fada.detalhe}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <section className="estoque-header">
        <div>
          <p className="estoque-kicker">Controle</p>
          <h1>Estoque de Equipamentos</h1>
          <p className="estoque-view-badge">Estoque Locados</p>
          <p className="estoque-subtitle">Gerencie a base separada de equipamentos locados com fotos, pecas vinculadas e as mesmas acoes principais da tabela de equipamentos.</p>
        </div>

        <div className="estoque-summary-grid">
          <div className="estoque-summary">
            <span>Registros</span>
            <strong>{resumo.totalRegistros}</strong>
          </div>

          <div className="estoque-summary oficina">
            <span>Com foto</span>
            <strong>{resumo.totalComFoto}</strong>
          </div>

          <div className="estoque-summary manutencao">
            <span>Pecas</span>
            <strong>{resumo.totalPecas}</strong>
          </div>

          <div className="estoque-summary campo">
            <span>Com equipe</span>
            <strong>{resumo.comEquipe}</strong>
          </div>
        </div>
      </section>

      <div className="estoque-actions estoque-locados-actions">
        <button type="button" className="estoque-primary-btn" onClick={abrirModalNovo}>
          Novo locado
        </button>

        {fadasDockVisivel && fadasAtivas.length > 0 && (
          <div className="estoque-locados-fada-dock" aria-label="Filtros por vencimento de contrato">
            {fadasAtivas.map((fada) => {
              const dias = fada.modo === "morto" ? "vencido" : fada.modo === "panic" ? "1" : "3";
              const ativo = filtroVencimentoDias === dias;

              return (
                <button
                  key={`dock-${fada.id}`}
                  type="button"
                  className={`estoque-locados-fada-dock-btn ${fada.modo === "panic" ? "panic" : fada.modo === "morto" ? "morto" : ""} ${ativo ? "ativo" : ""}`}
                  onClick={() => setFiltroVencimentoDias((atual) => (atual === dias ? "" : dias))}
                  title={fada.modo === "morto" ? "Filtrar contratos vencidos" : fada.modo === "panic" ? "Filtrar vencimento em 1 dia" : "Filtrar vencimento em 3 dias"}
                >
                  {fada.modo === "morto" ? (
                    <svg className="estoque-locados-fada-dock-svg" viewBox="0 0 260 180" role="img" aria-label="Caixão filtro">
                      <path d="M 70 15 L 190 15 L 245 70 L 245 165 L 15 165 L 15 70 Z" fill="#1e293b" stroke="#475569" strokeWidth="5" strokeLinejoin="round" />
                      <path d="M 72 17 L 188 17 L 242 70 L 242 95 L 18 95 L 18 70 Z" fill="#334155" stroke="#475569" strokeWidth="3" strokeLinejoin="round" />
                      <rect x="122" y="28" width="16" height="52" rx="4" fill="#64748b" />
                      <rect x="98" y="46" width="64" height="16" rx="4" fill="#64748b" />
                    </svg>
                  ) : (
                    <svg className="estoque-locados-fada-dock-svg" viewBox="0 0 420 420" role="img" aria-label="Fada filtro">
                      <ellipse cx="135" cy="215" rx="74" ry="146" fill="#f7ea00" stroke="#0f172a" strokeWidth="6" />
                      <ellipse cx="286" cy="218" rx="74" ry="146" fill="#f7ea00" stroke="#0f172a" strokeWidth="6" />
                      <ellipse className="fada-pele" cx="206" cy="200" rx="102" ry="104" fill="#9be15a" stroke="#0f172a" strokeWidth="6" />
                      <ellipse cx="208" cy="129" rx="86" ry="66" fill="#2f3136" stroke="#0f172a" strokeWidth="6" />
                      <ellipse className="fada-pele" cx="138" cy="143" rx="24" ry="22" fill="#9be15a" stroke="#0f172a" strokeWidth="6" />
                      <ellipse className="fada-pele" cx="286" cy="143" rx="24" ry="22" fill="#9be15a" stroke="#0f172a" strokeWidth="6" />
                      <path className="fada-pele" d="M170 114 Q206 176 254 114" fill="#9be15a" stroke="#0f172a" strokeWidth="6" />
                      {fada.modo === "panic" ? (
                        <>
                          <circle cx="188" cy="140" r="8" fill="#0f172a" />
                          <circle cx="230" cy="140" r="8" fill="#0f172a" />
                          <ellipse cx="210" cy="173" rx="20" ry="16" fill="#7f1d1d" stroke="#0f172a" strokeWidth="4" />
                        </>
                      ) : (
                        <>
                          <path d="M178 140 q12 16 24 0" fill="none" stroke="#0f172a" strokeWidth="5" strokeLinecap="round" />
                          <path d="M218 140 q12 16 24 0" fill="none" stroke="#0f172a" strokeWidth="5" strokeLinecap="round" />
                        </>
                      )}
                    </svg>
                  )}
                  <span>{fada.modo === "morto" ? "vencido" : fada.modo === "panic" ? "1 dia" : "3 dias"}</span>
                </button>
              );
            })}
          </div>
        )}
      </div>

      <section className="estoque-filters estoque-locados-filters">
        <div className="estoque-filters-extra">
          <input
            type="text"
            placeholder="Buscar por nome, contrato, tag, obra..."
            value={busca}
            onChange={(event) => setBusca(event.target.value)}
          />

          <select value={empresaFiltro} onChange={(event) => setEmpresaFiltro(event.target.value)}>
            <option value="">Empresa: todas</option>
            {empresasOrdenadas.map((empresa) => (
              <option key={`loc-empresa-${empresa.id}`} value={empresa.id}>
                {empresa.nome}
              </option>
            ))}
          </select>

          <select value={statusFiltro} onChange={(event) => setStatusFiltro(event.target.value)}>
            <option value="">Status: todos</option>
            {statusDisponiveis.map((status) => (
              <option key={`loc-status-${status}`} value={status}>
                {status}
              </option>
            ))}
          </select>

          <button
            type="button"
            className="estoque-filter-clear-btn"
            onClick={limparFiltros}
            disabled={!temFiltrosAtivos}
          >
            Limpar filtros
          </button>
        </div>
      </section>

      {erro && <div className="estoque-feedback erro">{erro}</div>}

      {!erro && (
        <div className="estoque-table-wrap">
          <table className="estoque-table">
            <thead>
              <tr>
                <th>Equipamento</th>
                <th>Foto</th>
                <th>Tag</th>
                <th>Empresa</th>
                <th>Contrato</th>
                <th>Obra</th>
                <th>Equipe</th>
                <th>Locacao</th>
                <th>Indenização</th>
                <th>Status</th>
                <th>Data Locacao</th>
                <th>Data Saida</th>
                <th>Pecas</th>
                <th>Acoes</th>
              </tr>
            </thead>

            <tbody>
              {equipamentosFiltrados.length > 0 ? (
                equipamentosFiltrados.map((item) => {
                  const fotosEquipamento = extrairFotosLocado(item);
                  const quantidadeFotos = contarFotosLocado(item);
                  const pecasEquipamento = Array.isArray(item?.pecas) ? item.pecas : [];
                  const quantidadePecas = pecasEquipamento.length;
                  const temEquipe = Boolean(item?.equipe?.id);

                  return (
                    <tr
                      key={item.id}
                      className={temEquipe ? "estoque-row-campo" : ""}
                      onDoubleClick={() => {
                        setIndenizacaoVisualizarItem(item);
                        setIndenizacaoVisualizarOpen(true);
                      }}
                      style={{ cursor: "pointer" }}
                    >
                      <td>{item.nomeLocado || "-"}</td>
                      <td>
                        <button type="button" className="estoque-foto-cell-btn" onClick={() => abrirModalFoto(item, true)} title="Ver fotos">
                          <div className="estoque-foto-thumb-list">
                            {fotosEquipamento.length ? (
                              fotosEquipamento.map((foto, index) => (
                                <span key={`foto-locado-${item.id}-${index}`} className="estoque-foto-thumb com-foto">
                                  <img src={foto} alt={`Foto ${index + 1} do equipamento ${item.nomeLocado || ""}`} />
                                </span>
                              ))
                            ) : (
                              <span className="estoque-foto-thumb sem-foto">
                                Sem foto
                              </span>
                            )}
                          </div>
                          <small>{quantidadeFotos}/2</small>
                        </button>
                      </td>
                      <td>{item.tag || "-"}</td>
                      <td>{item.empresa?.nome || "-"}</td>
                      <td>{item.contrato || "-"}</td>
                      <td>{item.obra || "-"}</td>
                      <td>{item.equipe?.nome || "-"}</td>
                      <td>{formatCurrency(item.valorLocacao)}</td>
                      <td>{formatCurrency(item.valorUnitario)}</td>
                      <td>
                        <button
                          type="button"
                          className={`estoque-status-chip ${normalizarStatusLocado(item?.status).toLowerCase()}`}
                          onClick={() => alternarStatusEquipamento(item)}
                          disabled={excluindoId === item.id}
                          title="Clique para alternar o status"
                        >
                          {normalizarStatusLocado(item?.status)}
                        </button>
                      </td>
                      <td>{item.dataLocacao || "-"}</td>
                      <td>{item.dataSaida || "-"}</td>
                      <td>
                        <div className="estoque-locados-pecas-cell">
                          <strong>{quantidadePecas ? `${quantidadePecas} peca(s)` : "Sem pecas"}</strong>
                          <span>
                            {quantidadePecas
                              ? pecasEquipamento.map((peca) => `${peca.nome} (${peca.quantidade})`).join(", ")
                              : "Nenhuma peca vinculada"}
                          </span>
                        </div>
                      </td>
                      <td className="estoque-table-actions">
                        <button type="button" className="estoque-row-btn equipe" onClick={() => abrirModalEquipe(item)}>
                          Equipe
                        </button>
                        <button type="button" className="estoque-row-btn editar" onClick={() => abrirModalEditar(item)}>
                          Editar
                        </button>
                        <button type="button" className="estoque-row-btn foto" onClick={() => abrirModalFoto(item, false)}>
                          {fotosEquipamento.length ? "Gerenciar fotos" : "Foto"}
                        </button>
                        <button
                          type="button"
                          className="estoque-row-btn foto-excluir"
                          onClick={() => excluirFotoTabela(item)}
                          disabled={!fotosEquipamento.length || salvandoFoto}
                        >
                          Excluir fotos
                        </button>
                        <button type="button" className="estoque-row-btn pecas" onClick={() => abrirModalPecas(item)}>
                          Pecas
                        </button>
                        <button
                          type="button"
                          className="estoque-row-btn excluir"
                          onClick={() => excluirEquipamento(item)}
                          disabled={excluindoId === item.id}
                        >
                          {excluindoId === item.id ? "Excluindo..." : "Excluir"}
                        </button>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan="14" className="empty-state">
                    Nenhum equipamento encontrado em Estoque Locados com os filtros atuais.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {modalOpen && (
        <Modal
          onClose={() => {
            setModalOpen(false);
            setFormErro("");
          }}
          size="lg"
        >
          <div className="estoque-modal">
            <h2>{form.id ? "Editar locado" : "Novo locado"}</h2>
            <p>{form.id ? "Atualize os dados do equipamento locado selecionado." : "Cadastre um novo item locado para aparecer na tabela e nas acoes de foto e pecas."}</p>

            <div className="estoque-modal-form estoque-locados-form">
              <input
                type="text"
                placeholder="Nome do locado"
                value={form.nomeLocado}
                onChange={(event) => atualizarCampo("nomeLocado", event.target.value)}
              />

              <input
                type="text"
                placeholder="Contrato"
                value={form.contrato}
                onChange={(event) => atualizarCampo("contrato", event.target.value)}
              />

              <input
                type="text"
                placeholder="Tag"
                value={form.tag}
                onChange={(event) => atualizarCampo("tag", event.target.value)}
              />

              <select value={form.empresaId} onChange={(event) => atualizarCampo("empresaId", event.target.value)}>
                <option value="">Selecione a empresa</option>
                {empresasOrdenadas.map((empresa) => (
                  <option key={`form-empresa-${empresa.id}`} value={empresa.id}>
                    {empresa.nome}
                  </option>
                ))}
              </select>

              <input
                type="number"
                min="0"
                step="0.01"
                placeholder="Valor de locacao"
                value={form.valorLocacao}
                onChange={(event) => atualizarCampo("valorLocacao", event.target.value)}
              />

              <input
                type="number"
                min="0"
                step="0.01"
                placeholder="Valor unitario"
                value={form.valorUnitario}
                onChange={(event) => atualizarCampo("valorUnitario", event.target.value)}
              />

              <select value={form.status} onChange={(event) => atualizarCampo("status", normalizarStatusLocado(event.target.value))}>
                <option value={STATUS_LOCADO}>{STATUS_LOCADO}</option>
                <option value={STATUS_DEVOLVIDO}>{STATUS_DEVOLVIDO}</option>
              </select>

              <input
                type="text"
                placeholder="Obra"
                value={form.obra}
                onChange={(event) => atualizarCampo("obra", event.target.value)}
              />

              <select value={form.equipeId} onChange={(event) => atualizarCampo("equipeId", event.target.value)}>
                <option value="">Selecione a equipe</option>
                {equipesOrdenadas.map((equipe) => (
                  <option key={`form-equipe-${equipe.id}`} value={equipe.id}>
                    {equipe.nome}
                  </option>
                ))}
              </select>

              <input
                type="date"
                placeholder="Data de locacao"
                value={form.dataLocacao}
                onChange={(event) => atualizarCampo("dataLocacao", event.target.value)}
              />

              <select value={form.periodoLocacao} onChange={(event) => atualizarCampo("periodoLocacao", event.target.value)}>
                <option value="">Selecione o periodo</option>
                {PERIODOS_LOCACAO.map((periodo) => (
                  <option key={periodo.value} value={periodo.value}>
                    {periodo.label}
                  </option>
                ))}
              </select>

              <input
                type="date"
                placeholder="Data de saida"
                value={form.dataSaida}
                readOnly
              />

              {!form.id && (
                <div className="estoque-foto-editor estoque-locados-foto-editor">
                  <p className="estoque-foto-editor-title">Foto do equipamento</p>
                  <div className="estoque-foto-editor-preview">
                    {normalizarListaFotos(form.fotos).length ? (
                      <div className="estoque-foto-grid">
                        {normalizarListaFotos(form.fotos).map((foto, index) => (
                          <div key={`cad-foto-locado-${index}`} className="estoque-foto-item">
                            <img src={foto} alt={`Preview da foto ${index + 1} do equipamento locado`} />
                            <button
                              type="button"
                              className="estoque-foto-remove-btn"
                              onClick={() => removerFotoCadastro(index)}
                            >
                              Excluir
                            </button>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <span>Nenhuma foto cadastrada.</span>
                    )}
                  </div>

                  <div className="estoque-foto-editor-actions">
                    <input
                      type="file"
                      accept="image/*"
                      capture="environment"
                      onChange={handleFotoCadastro}
                      disabled={normalizarListaFotos(form.fotos).length >= 2}
                    />
                    <button
                      type="button"
                      className="estoque-secondary-btn"
                      onClick={() => setForm((atual) => ({ ...atual, fotos: [] }))}
                      disabled={!normalizarListaFotos(form.fotos).length}
                    >
                      Excluir todas
                    </button>
                    <span className="estoque-foto-count">{normalizarListaFotos(form.fotos).length}/2 fotos</span>
                  </div>
                </div>
              )}
            </div>

            {formErro && <p className="estoque-modal-error">{formErro}</p>}

            <div className="estoque-modal-actions">
              <button type="button" className="estoque-secondary-btn" onClick={() => setModalOpen(false)}>
                Cancelar
              </button>
              <button type="button" className="estoque-primary-btn" onClick={salvarEquipamento} disabled={salvando}>
                {salvando ? "Salvando..." : form.id ? "Salvar" : "Cadastrar"}
              </button>
            </div>
          </div>
        </Modal>
      )}

      {fotoModalOpen && (
        <Modal
          onClose={() => {
            setFotoModalOpen(false);
            setFotoErro("");
            setFotoModalSomenteLeitura(false);
          }}
          size="md"
        >
          <div className="estoque-modal">
            <h2>Foto do equipamento</h2>
            <p>{equipamentoSelecionado?.nomeLocado || "-"}</p>

            <div className="estoque-foto-modal-preview">
              {normalizarListaFotos(fotoPreview).length ? (
                <div className="estoque-foto-grid">
                  {normalizarListaFotos(fotoPreview).map((foto, index) => (
                    <div key={`modal-foto-locado-${index}`} className="estoque-foto-item">
                      <img src={foto} alt={`Foto ${index + 1} do equipamento ${equipamentoSelecionado?.nomeLocado || ""}`} />
                      {!fotoModalSomenteLeitura && (
                        <button
                          type="button"
                          className="estoque-foto-remove-btn"
                          onClick={() => removerFotoModal(index)}
                          disabled={salvandoFoto}
                        >
                          Excluir
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <span>Nenhuma foto cadastrada para este equipamento.</span>
              )}
            </div>

            {!fotoModalSomenteLeitura && (
              <div className="estoque-modal-form">
                <input
                  type="file"
                  accept="image/*"
                  capture="environment"
                  onChange={handleNovaFotoModal}
                  disabled={normalizarListaFotos(fotoPreview).length >= 2 || salvandoFoto}
                />
              </div>
            )}

            {!fotoModalSomenteLeitura && fotoErro && <p className="estoque-modal-error">{fotoErro}</p>}

            <div className="estoque-modal-actions">
              <button type="button" className="estoque-secondary-btn" onClick={() => { setFotoModalOpen(false); setFotoModalSomenteLeitura(false); }}>
                Fechar
              </button>
              {!fotoModalSomenteLeitura && (
                <button
                  type="button"
                  className="estoque-secondary-btn"
                  onClick={() => setFotoPreview([])}
                  disabled={!normalizarListaFotos(fotoPreview).length || salvandoFoto}
                >
                  Excluir todas
                </button>
              )}
              {!fotoModalSomenteLeitura && (
                <button type="button" className="estoque-primary-btn" onClick={salvarFotoEquipamentoLocado} disabled={salvandoFoto}>
                  {salvandoFoto ? "Salvando..." : "Salvar foto"}
                </button>
              )}
            </div>
          </div>
        </Modal>
      )}

      {equipeModalOpen && (
        <Modal
          onClose={() => {
            setEquipeModalOpen(false);
            setEquipeErro("");
          }}
          size="sm"
        >
          <div className="estoque-modal">
            <h2>Vincular equipe</h2>
            <p>{equipamentoSelecionado?.nomeLocado || "-"}</p>

            <div className="estoque-modal-form">
              <select value={equipeSelecionadaId} onChange={(event) => setEquipeSelecionadaId(event.target.value)}>
                <option value="">Sem equipe</option>
                {equipesOrdenadas.map((equipe) => (
                  <option key={`locado-equipe-${equipe.id}`} value={equipe.id}>
                    {equipe.nome}
                  </option>
                ))}
              </select>
            </div>

            {equipeErro && <p className="estoque-modal-error">{equipeErro}</p>}

            <div className="estoque-modal-actions">
              <button type="button" className="estoque-secondary-btn" onClick={() => setEquipeModalOpen(false)}>
                Cancelar
              </button>
              <button type="button" className="estoque-primary-btn" onClick={salvarEquipeEquipamento} disabled={salvando}>
                {salvando ? "Salvando..." : "Salvar equipe"}
              </button>
            </div>
          </div>
        </Modal>
      )}

      {pecasModalOpen && (
        <Modal
          onClose={() => {
            setPecasModalOpen(false);
            setPecasErro("");
          }}
          size="lg"
        >
          <div className="estoque-modal">
            <h2>Pecas vinculadas</h2>
            <p>{equipamentoSelecionado?.nomeLocado || "-"}</p>

            <div className="estoque-locados-pecas-editor">
              <div className="estoque-locados-pecas-header">
                <strong>Cadastro de pecas</strong>
                <button type="button" className="estoque-secondary-btn" onClick={adicionarPeca}>
                  Adicionar peca
                </button>
              </div>

              {pecasPreview.length > 0 ? (
                <div className="estoque-locados-pecas-list">
                  {pecasPreview.map((peca, index) => (
                    <div key={`peca-form-${index}`} className="estoque-locados-peca-row">
                      <input
                        type="text"
                        placeholder="Nome da peca"
                        value={peca.nome}
                        onChange={(event) => atualizarPeca(index, "nome", event.target.value)}
                      />
                      <input
                        type="number"
                        min="0"
                        step="1"
                        placeholder="Quantidade"
                        value={peca.quantidade}
                        onChange={(event) => atualizarPeca(index, "quantidade", event.target.value)}
                      />
                      <button type="button" className="estoque-danger-btn" onClick={() => removerPeca(index)}>
                        Remover
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="estoque-locados-pecas-empty">Nenhuma peca vinculada.</p>
              )}
            </div>

            {pecasErro && <p className="estoque-modal-error">{pecasErro}</p>}

            <div className="estoque-modal-actions">
              <button type="button" className="estoque-secondary-btn" onClick={() => setPecasModalOpen(false)}>
                Cancelar
              </button>
              <button type="button" className="estoque-primary-btn" onClick={salvarPecasEquipamento} disabled={salvandoPecas}>
                {salvandoPecas ? "Salvando..." : "Salvar pecas"}
              </button>
            </div>
          </div>
        </Modal>
      )}

      {indenizacaoPerguntaOpen && (
        <Modal onClose={() => { setIndenizacaoPerguntaOpen(false); setIndenizacaoPendente(null); }} size="sm">
          <div className="estoque-modal estoque-indenizacao-modal">
            <h2>Houve indenização?</h2>
            <p>
              O equipamento <strong>{indenizacaoPendente?.nomeLocado || "selecionado"}</strong> será marcado como devolvido.
              Houve alguma indenização nesta devolução?
            </p>
            <div className="estoque-modal-actions estoque-indenizacao-actions-center">
              <button
                type="button"
                className="estoque-secondary-btn"
                onClick={async () => {
                  setIndenizacaoPerguntaOpen(false);
                  await confirmarAlteracaoStatus(indenizacaoPendente, STATUS_DEVOLVIDO, null);
                  setIndenizacaoPendente(null);
                }}
              >
                Não
              </button>
              <button
                type="button"
                className="estoque-primary-btn"
                onClick={() => {
                  setIndenizacaoPerguntaOpen(false);
                  setIndenizacaoFormOpen(true);
                }}
              >
                Sim
              </button>
            </div>
          </div>
        </Modal>
      )}

      {indenizacaoFormOpen && (
        <Modal onClose={() => { setIndenizacaoFormOpen(false); setIndenizacaoPendente(null); }} size="sm">
          <div className="estoque-modal estoque-indenizacao-modal">
            <h2>Registrar indenização</h2>
            <p className="estoque-indenizacao-contrato">{indenizacaoPendente?.nomeLocado || "Equipamento"}</p>
            <div className="estoque-modal-form">
              <input
                type="number"
                min="0"
                step="0.01"
                placeholder="Valor da indenização (R$)"
                value={indenizacaoForm.valor}
                onChange={(e) => setIndenizacaoForm((f) => ({ ...f, valor: e.target.value }))}
              />
              <textarea
                placeholder="Descrição da indenização"
                rows={4}
                value={indenizacaoForm.descricao}
                onChange={(e) => setIndenizacaoForm((f) => ({ ...f, descricao: e.target.value }))}
                className="estoque-indenizacao-textarea"
              />
            </div>
            <div className="estoque-modal-actions">
              <button type="button" className="estoque-secondary-btn" onClick={() => { setIndenizacaoFormOpen(false); setIndenizacaoPendente(null); }}>
                Cancelar
              </button>
              <button type="button" className="estoque-primary-btn" onClick={salvarIndenizacaoEDevolver} disabled={salvandoIndenizacao}>
                {salvandoIndenizacao ? "Salvando..." : "Confirmar devolução"}
              </button>
            </div>
          </div>
        </Modal>
      )}

      {indenizacaoVisualizarOpen && indenizacaoVisualizarItem && (
        <Modal onClose={() => { setIndenizacaoVisualizarOpen(false); setIndenizacaoVisualizarItem(null); }} size="sm">
          <div className="estoque-modal estoque-indenizacao-modal">
            <h2>{indenizacaoVisualizarItem.nomeLocado || "Equipamento"}</h2>
            <p className="estoque-indenizacao-contrato">Contrato: {indenizacaoVisualizarItem.contrato || "-"}</p>
            <div className="estoque-indenizacao-view">
              <div className="estoque-indenizacao-row">
                <span>Valor da indenização</span>
                <strong className={indenizacaoVisualizarItem.indenizacaoValor != null ? "" : "sem-indenizacao"}>
                  {indenizacaoVisualizarItem.indenizacaoValor != null
                    ? formatCurrency(indenizacaoVisualizarItem.indenizacaoValor)
                    : "Sem indenização"}
                </strong>
              </div>
              <div className="estoque-indenizacao-row">
                <span>Descrição</span>
                <p>{indenizacaoVisualizarItem.indenizacaoDescricao || "Nenhuma descrição registrada."}</p>
              </div>
            </div>
            <div className="estoque-modal-actions">
              <button type="button" className="estoque-primary-btn" onClick={() => { setIndenizacaoVisualizarOpen(false); setIndenizacaoVisualizarItem(null); }}>
                Fechar
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
