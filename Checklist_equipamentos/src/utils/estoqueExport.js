import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import * as XLSX from "xlsx";
import logoEmpresas from "../assets/logo-empresas.png";
import { formatCurrency, getSituacaoEquipamento } from "./estoqueHelpers";

async function carregarImagemBase64(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "Anonymous";

    img.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = img.width;
      canvas.height = img.height;
      const context = canvas.getContext("2d");

      if (!context) {
        reject(new Error("Nao foi possivel preparar a logo para o PDF."));
        return;
      }

      context.drawImage(img, 0, 0);
      resolve(canvas.toDataURL("image/png", 1.0));
    };

    img.onerror = () => reject(new Error("Nao foi possivel carregar a logo do relatorio."));
    img.src = src;
  });
}

/**
 * @param {{
 *   equipamentosFiltrados: any[],
 *   filtrosAplicados: string[],
 *   rotuloVisaoEstoque: string,
 *   equipamentoIdsNaOficina: Set<number>,
 *   equipamentoIdsNaManutencao: Set<number>,
 * }} params
 */
export async function exportarPdf({
  equipamentosFiltrados,
  filtrosAplicados,
  rotuloVisaoEstoque,
  equipamentoIdsNaOficina,
  equipamentoIdsNaManutencao,
}) {
  if (equipamentosFiltrados.length === 0) {
    window.alert("Nenhum dado para exportar.");
    return;
  }

  const doc = new jsPDF("p", "mm", "a4");
  const logoBase64 = await carregarImagemBase64(logoEmpresas);
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();

  const quantidadeComEquipe = equipamentosFiltrados.filter(
    (item) => item?.equipe?.id || item?.equipeResponsavel?.id,
  ).length;
  const quantidadeNoCanteiro = equipamentosFiltrados.filter((item) => {
    const estaNaOficina = equipamentoIdsNaOficina.has(item.id);
    const estaNaManutencao = equipamentoIdsNaManutencao.has(item.id);
    const temEquipe = Boolean(item?.equipe?.id || item?.equipeResponsavel?.id);
    return estaNaOficina || (!estaNaManutencao && !temEquipe);
  }).length;
  const quantidadeEmManutencao = equipamentosFiltrados.filter((item) =>
    equipamentoIdsNaManutencao.has(item.id),
  ).length;

  const resumoExportacao = `Resumo: Com equipe ${quantidadeComEquipe} | No canteiro ${quantidadeNoCanteiro} | Em manutencao ${quantidadeEmManutencao}`;
  const linhasFiltros = doc.splitTextToSize(
    filtrosAplicados.length > 0 ? filtrosAplicados.join("  |  ") : "Nenhum filtro aplicado",
    pageWidth - 28,
  );
  const inicioTabela = 40 + linhasFiltros.length * 4;

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
    doc.text(`RELATORIO DE ESTOQUE - ${rotuloVisaoEstoque.toUpperCase()}`, pageWidth / 2, 12, { align: "center" });

    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.text(`Gerado em: ${new Date().toLocaleString()}`, 14, 18);
    doc.text(resumoExportacao, 14, 24);

    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.text("Filtros Aplicados:", 14, 31);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.text(linhasFiltros, 14, 36);
  };

  const dados = equipamentosFiltrados.map((item) => [
    item.nomeEquipamento,
    item.tagPatrimonio || "-",
    item.empresa?.nome || "-",
    item.canteiro?.nome || "-",
    item?.equipeResponsavel?.nome || item?.equipe?.nome || "Sem equipe",
    getSituacaoEquipamento(item, equipamentoIdsNaOficina, equipamentoIdsNaManutencao),
    formatCurrency(item.valorLocacao),
    formatCurrency(item.valorUnitario),
  ]);

  autoTable(doc, {
    startY: inicioTabela,
    head: [["Equipamento", "Tag", "Empresa", "Canteiro", "Equipe", "Situacao", "Locacao", "Valor Unitario"]],
    body: dados,
    willDrawPage: () => { desenharFundo(); },
    headStyles: { fillColor: [158, 204, 93], textColor: [0, 0, 0], halign: "center" },
    bodyStyles: { fillColor: [233, 241, 222], textColor: [0, 0, 0], halign: "center" },
    alternateRowStyles: { fillColor: [225, 235, 212] },
    styles: { lineColor: [120, 120, 120], lineWidth: 0.15, cellPadding: 2 },
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

/**
 * @param {{
 *   equipamentosFiltrados: any[],
 *   filtrosAplicados: string[],
 *   rotuloVisaoEstoque: string,
 *   estoqueVisao: string,
 *   equipamentoIdsNaOficina: Set<number>,
 *   equipamentoIdsNaManutencao: Set<number>,
 * }} params
 */
export function exportarExcel({
  equipamentosFiltrados,
  filtrosAplicados,
  rotuloVisaoEstoque,
  estoqueVisao,
  equipamentoIdsNaOficina,
  equipamentoIdsNaManutencao,
}) {
  if (equipamentosFiltrados.length === 0) {
    window.alert("Nenhum dado para exportar.");
    return;
  }

  const quantidadeComEquipe = equipamentosFiltrados.filter(
    (item) => item?.equipe?.id || item?.equipeResponsavel?.id,
  ).length;
  const quantidadeNoCanteiro = equipamentosFiltrados.filter((item) => {
    const estaNaOficina = equipamentoIdsNaOficina.has(item.id);
    const estaNaManutencao = equipamentoIdsNaManutencao.has(item.id);
    const temEquipe = Boolean(item?.equipe?.id || item?.equipeResponsavel?.id);
    return estaNaOficina || (!estaNaManutencao && !temEquipe);
  }).length;
  const quantidadeEmManutencao = equipamentosFiltrados.filter((item) =>
    equipamentoIdsNaManutencao.has(item.id),
  ).length;

  const dados = [
    [`RELATORIO DE ESTOQUE - ${rotuloVisaoEstoque.toUpperCase()}`],
    [`Gerado em: ${new Date().toLocaleString()}`],
    [`Com equipe: ${quantidadeComEquipe}`],
    [`No canteiro: ${quantidadeNoCanteiro}`],
    [`Em manutencao: ${quantidadeEmManutencao}`],
    [],
    ["Filtros Aplicados:"],
    [filtrosAplicados.length > 0 ? filtrosAplicados.join(" | ") : "Nenhum filtro aplicado"],
    [],
    ["Equipamento", "Tag", "Empresa", "Canteiro", "Equipe", "Locacao", "Valor Unitario"],
    ...equipamentosFiltrados.map((item) => [
      item.nomeEquipamento,
      item.tagPatrimonio || "-",
      item.empresa?.nome || "-",
      item.canteiro?.nome || "-",
      item?.equipeResponsavel?.nome || item?.equipe?.nome || "Sem equipe",
      Number(item.valorLocacao),
      Number(item.valorUnitario),
    ]),
  ];

  const worksheet = XLSX.utils.aoa_to_sheet(dados);
  worksheet["!cols"] = [
    { wch: 25 },
    { wch: 15 },
    { wch: 25 },
    { wch: 22 },
    { wch: 22 },
    { wch: 15 },
    { wch: 18 },
  ];

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, rotuloVisaoEstoque);
  XLSX.writeFile(workbook, `relatorio_${estoqueVisao}.xlsx`);
}
