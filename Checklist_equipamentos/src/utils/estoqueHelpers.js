// Formatação

export function formatCurrency(value) {
  const amount = Number(value ?? 0);
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(amount);
}

export function formatDateTime(value) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(date);
}

// Situação do equipamento

export function getSituacaoEquipamento(item, equipamentoIdsNaOficina, equipamentoIdsNaManutencao) {
  const estaNaOficina = equipamentoIdsNaOficina.has(item?.id);
  const estaNaManutencao = equipamentoIdsNaManutencao.has(item?.id);
  const equipeNome = item?.equipeResponsavel?.nome || item?.equipe?.nome || "";

  if (estaNaManutencao) return "Em manutencao";
  if (estaNaOficina) return "No canteiro";
  if (equipeNome) return equipeNome;
  return "No canteiro";
}

// Normalização de valores

export function parseNumberOrZero(value) {
  if (value == null) return 0;
  const normalized = String(value).trim().replace(",", ".");
  if (!normalized) return 0;
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : 0;
}

export function normalizeTag(value) {
  return String(value ?? "").trim().toLowerCase();
}

// Normalização de fotos

export function normalizarListaFotos(fotos) {
  if (!Array.isArray(fotos)) return [];
  return fotos
    .map((foto) => (typeof foto === "string" ? foto.trim() : ""))
    .filter(Boolean)
    .slice(0, 2);
}

export function extrairFotosEquipamento(equipamento) {
  return normalizarListaFotos([
    equipamento?.fotoBase64,
    equipamento?.fotoBase64Secundaria,
  ]);
}

export function contarFotosEquipamento(equipamento) {
  if (Number.isFinite(Number(equipamento?.quantidadeFotos))) {
    return Number(equipamento.quantidadeFotos);
  }
  return extrairFotosEquipamento(equipamento).length;
}

// Resumo / lista de equipamentos

export function resumirEquipamentoLista(equipamento) {
  if (!equipamento) return equipamento;
  return {
    ...equipamento,
    quantidadeFotos: contarFotosEquipamento(equipamento),
    fotoBase64: null,
    fotoBase64Secundaria: null,
  };
}

export function resumirListaEquipamentos(lista) {
  return Array.isArray(lista) ? lista.map(resumirEquipamentoLista) : [];
}

export function mesclarEquipamentoNaLista(lista, equipamento) {
  const resumido = resumirEquipamentoLista(equipamento);
  const atual = Array.isArray(lista) ? lista : [];
  const existe = atual.some((item) => item?.id === resumido?.id);
  if (!existe) return [...atual, resumido];
  return atual.map((item) => (item?.id === resumido?.id ? resumido : item));
}

export function registrarEquipamentoLocalNaOficina(lista, equipamento) {
  const equipamentoResumo = resumirEquipamentoLista(equipamento);
  const atual = Array.isArray(lista) ? lista : [];
  const semDuplicados = atual.filter(
    (registro) => registro?.equipamento?.id !== equipamentoResumo?.id,
  );
  return [
    {
      id: `local-${equipamentoResumo?.id ?? Date.now()}`,
      equipamento: equipamentoResumo,
      data: new Date().toISOString(),
      observacao: "Equipamento Cadastrado",
    },
    ...semDuplicados,
  ];
}

// Importação

export function normalizarCabecalhoImportacao(valor) {
  return String(valor ?? "")
    .trim()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");
}

export const CAMPOS_IMPORTACAO = [
  {
    campo: "nomeEquipamento",
    label: "Equipamento",
    aliases: ["equipamento", "nomeequipamento", "nome", "descricaoequipamento"],
  },
  {
    campo: "tagPatrimonio",
    label: "Tag",
    aliases: ["tag", "tagpatrimonio", "patrimonio"],
  },
  {
    campo: "valorLocacao",
    label: "Locacao",
    aliases: ["locacao", "valorlocacao", "valorlocacao"],
  },
  {
    campo: "valorUnitario",
    label: "Valor Unitario",
    aliases: ["valorunitario", "valor", "valorcompra", "valorun"],
  },
  {
    campo: "empresa",
    label: "Empresa",
    aliases: ["empresa", "empresaid", "idempresa"],
  },
];
