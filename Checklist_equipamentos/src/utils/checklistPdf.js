import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import logoEmpresas from "../assets/logo-empresas.png";

export const weekOrder = ["SEG", "TER", "QUA", "QUI", "SEX", "SAB", "DOM"];

const fmtDate = (v = new Date()) => new Intl.DateTimeFormat("pt-BR", { dateStyle: "short" }).format(new Date(v));
const normalize = (v) => String(v ?? "").replace(/\s+/g, " ").trim();
const normalizeCompare = (value) => normalize(value).toLowerCase();

export function parseExecPayload(execucao) {
  try {
    return execucao?.respostasJson ? JSON.parse(execucao.respostasJson) : null;
  } catch {
    return null;
  }
}

export function getStartOfWeek(value = new Date()) {
  const date = new Date(value);
  const result = new Date(date);
  const dayIndex = (result.getDay() + 6) % 7;
  result.setHours(0, 0, 0, 0);
  result.setDate(result.getDate() - dayIndex);
  return result;
}

export function isSameWeek(a, b = new Date()) {
  return getStartOfWeek(a).getTime() === getStartOfWeek(b).getTime();
}

export function filterExecutionsForWeek(execucoes = [], referenceDate = new Date()) {
  const start = getStartOfWeek(referenceDate).getTime();
  return execucoes.filter((execucao) => getStartOfWeek(execucao?.data).getTime() === start);
}

export function buildParsedFromExecution(payload, fallbackTitle = "Checklist") {
  const questions = (payload?.secoes || []).flatMap((secao) =>
    (secao?.itens || []).map((item, index) => ({
      id: `${secao?.secao || "Itens Gerais"}-${item?.item ?? index + 1}`,
      item: String(item?.item ?? index + 1),
      descricao: item?.descricao || "-",
      secao: secao?.secao || "Itens Gerais",
      criticidade: item?.criticidade || "",
    })),
  );

  return {
    title: payload?.titulo || fallbackTitle,
    questions,
    headerCode: "",
    headerRevision: "",
    headerDate: "",
  };
}

function flattenExecItems(payload) {
  return (payload?.secoes || []).flatMap((secao) => (secao.itens || []).map((item) => ({ ...item, secao: secao.secao })));
}

function pickFirstString(...values) {
  for (const value of values) {
    if (typeof value === "string" && value.trim()) {
      return value.trim();
    }
  }

  return "";
}

function resolveSignatureByRole(payload, role) {
  const assinaturaAtual = payload?.assinaturas?.[role] || null;

  if (role === "operador") {
    return {
      nome: pickFirstString(
        assinaturaAtual?.nome,
        payload?.operador,
        payload?.nomeOperador,
        payload?.assinaturaOperadorNome,
      ),
      assinatura: pickFirstString(
        assinaturaAtual?.assinatura,
        payload?.assinaturaOperador,
        payload?.operadorAssinatura,
      ),
    };
  }

  return {
    nome: pickFirstString(
      assinaturaAtual?.nome,
      payload?.encarregado,
      payload?.nomeEncarregado,
      payload?.assinaturaEncarregadoNome,
    ),
    assinatura: pickFirstString(
      assinaturaAtual?.assinatura,
      payload?.assinaturaEncarregado,
      payload?.encarregadoAssinatura,
    ),
  };
}

function findExecItem(payload, question) {
  const items = flattenExecItems(payload);

  return (
    items.find((item) => item.secao === question.secao && String(item.item) === String(question.item)) ||
    items.find((item) => String(item.item) === String(question.item) && normalizeCompare(item.descricao) === normalizeCompare(question.descricao)) ||
    items.find((item) => normalizeCompare(item.descricao) === normalizeCompare(question.descricao)) ||
    null
  );
}

function loadImageBase64(src) {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = "Anonymous";
    img.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext("2d");
      ctx.drawImage(img, 0, 0);
      resolve({
        dataUrl: canvas.toDataURL("image/png"),
        width: img.width,
        height: img.height,
      });
    };
    img.onerror = () => resolve(null);
    img.src = src;
  });
}

function drawImageContain(doc, image, boxX, boxY, boxWidth, boxHeight, padding = 0) {
  if (!image?.dataUrl || !image?.width || !image?.height) return;

  const availableWidth = Math.max(boxWidth - padding * 2, 1);
  const availableHeight = Math.max(boxHeight - padding * 2, 1);
  const imageRatio = image.width / image.height;
  const boxRatio = availableWidth / availableHeight;

  let drawWidth = availableWidth;
  let drawHeight = availableHeight;

  if (imageRatio > boxRatio) {
    drawHeight = drawWidth / imageRatio;
  } else {
    drawWidth = drawHeight * imageRatio;
  }

  const drawX = boxX + (boxWidth - drawWidth) / 2;
  const drawY = boxY + (boxHeight - drawHeight) / 2;

  doc.addImage(image.dataUrl, "PNG", drawX, drawY, drawWidth, drawHeight);
}

export async function createChecklistPdf({ parsed, selectedExec, history = [], equipamento, modeloNome }) {
  if (!parsed || !selectedExec || !equipamento) return null;

  const selectedPayload = parseExecPayload(selectedExec);
  const doc = new jsPDF("p", "mm", "a4");
  const pageHeight = doc.internal.pageSize.getHeight();
  const selectedDate = selectedPayload?.dataChecklist ? new Date(selectedPayload.dataChecklist) : new Date(selectedExec.data);
  const selectedDayIndex = (selectedDate.getDay() + 6) % 7;
  const logoImage = await loadImageBase64(logoEmpresas);
  const headerCode = String(parsed?.headerCode || modeloNome || "").trim();
  const headerRevision = String(parsed?.headerRevision || "").trim();
  const headerDate = String(parsed?.headerDate || "").trim();
  const selectedDateLabel = selectedPayload?.dataChecklist ? fmtDate(selectedPayload.dataChecklist) : fmtDate(selectedExec.data);
  const weeklyMap = new Map(
    history.map((execucao) => {
      const date = new Date(execucao.data);
      const dayIndex = (date.getDay() + 6) % 7;
      return [weekOrder[dayIndex], parseExecPayload(execucao)];
    }),
  );

  const drawHeaderField = (x, width, label, value) => {
    const top = 21;
    const height = 10;
    const baseline = 26.2;

    doc.rect(x, top, width, height);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8.2);
    doc.text(label, x + 2, baseline);

    doc.setFont("helvetica", "normal");
    const labelWidth = doc.getTextWidth(`${label} `);
    doc.text(String(value || "-"), x + 2 + labelWidth, baseline, { maxWidth: Math.max(width - labelWidth - 4, 6) });
  };

  doc.setDrawColor(20, 20, 20);
  doc.setLineWidth(0.25);

  doc.rect(5, 6, 32, 15);
  if (logoImage) {
    try {
      drawImageContain(doc, logoImage, 5, 6, 32, 15, 1.1);
    } catch {
    }
  }

  doc.rect(37, 6, 140, 15);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(7.3);
  doc.text((parsed.title || selectedPayload?.titulo || "CHECKLIST").slice(0, 72), 107, 13, { align: "center", maxWidth: 132 });

  doc.rect(177, 6, 28, 15);
  doc.setFontSize(6.6);
  doc.text(headerCode.slice(0, 16), 191, 9.1, { align: "center", maxWidth: 24 });
  doc.text(headerRevision || " ", 191, 12.4, { align: "center", maxWidth: 24 });
  doc.text(headerDate || " ", 191, 15.7, { align: "center", maxWidth: 24 });

  drawHeaderField(5, 80, "EMPRESA:", selectedPayload?.empresa || equipamento.empresa?.nome || "-");
  drawHeaderField(85, 75, "MARCA:", selectedPayload?.modelo || equipamento.nomeEquipamento || "-");
  drawHeaderField(160, 45, "TAG:", selectedPayload?.tag || equipamento.tagPatrimonio || "-");

  const body = [];
  let currentSection = "";
  parsed.questions.forEach((question) => {
    if (question.secao !== currentSection) {
      currentSection = question.secao;
      body.push([{ content: currentSection, colSpan: 9, styles: { halign: "center", fontStyle: "bold", fillColor: [238, 238, 238] } }]);
    }

    body.push([
      question.item,
      question.descricao,
      ...weekOrder.map((day) => {
        const payload = weeklyMap.get(day);
        const item = findExecItem(payload, question);
        return item?.resposta || "";
      }),
    ]);
  });

  autoTable(doc, {
    startY: 31,
    margin: { left: 5, right: 5 },
    tableWidth: "auto",
    head: [
      [
        "",
        "",
        { content: "SITUACAO DOS ITENS VERIFICADOS", colSpan: 7, styles: { halign: "center", fontStyle: "bold" } },
      ],
      [
        "ITEM",
        "DESCRICAO",
        "SEGUNDA",
        "TERCA",
        "QUARTA",
        "QUINTA",
        "SEXTA",
        "SABADO",
        "DOMINGO",
      ],
      [
        "",
        "",
        weekOrder[0] === weekOrder[selectedDayIndex] ? selectedDateLabel : "/      /",
        weekOrder[1] === weekOrder[selectedDayIndex] ? selectedDateLabel : "/      /",
        weekOrder[2] === weekOrder[selectedDayIndex] ? selectedDateLabel : "/      /",
        weekOrder[3] === weekOrder[selectedDayIndex] ? selectedDateLabel : "/      /",
        weekOrder[4] === weekOrder[selectedDayIndex] ? selectedDateLabel : "/      /",
        weekOrder[5] === weekOrder[selectedDayIndex] ? selectedDateLabel : "/      /",
        weekOrder[6] === weekOrder[selectedDayIndex] ? selectedDateLabel : "/      /",
      ],
    ],
    body,
    styles: {
      fontSize: 6.8,
      cellPadding: 1.2,
      textColor: [0, 0, 0],
      lineColor: [20, 20, 20],
      lineWidth: 0.2,
      valign: "middle",
      halign: "center",
    },
    headStyles: {
      fillColor: [255, 255, 255],
      textColor: [0, 0, 0],
      fontStyle: "bold",
    },
    columnStyles: {
      0: { cellWidth: 8 },
      1: { cellWidth: 73, halign: "left" },
      2: { cellWidth: 17 },
      3: { cellWidth: 17 },
      4: { cellWidth: 17 },
      5: { cellWidth: 17 },
      6: { cellWidth: 17 },
      7: { cellWidth: 17 },
      8: { cellWidth: 17 },
    },
    didParseCell: (data) => {
      if (data.section === "head" && data.row.index === 0 && data.column.index < 2) {
        data.cell.styles.fillColor = [255, 255, 255];
      }
      if (data.section === "head" && data.row.index === 0 && data.column.index === 2) {
        data.cell.styles.minCellHeight = 8;
      }
      if (data.section === "head" && data.row.index === 2 && data.column.index >= 2) {
        data.cell.styles.fontStyle = "bold";
        data.cell.styles.fontSize = String(data.cell.raw || "").includes("/") && String(data.cell.raw || "").length > 7 ? 6.6 : 6;
        data.cell.styles.minCellHeight = 6;
      }
      if (data.section === "body" && data.cell.raw && typeof data.cell.raw === "object" && data.cell.raw.colSpan === 9) {
        data.cell.styles.minCellHeight = 7;
      }
    },
    didDrawPage: () => {
      drawHeaderField(5, 80, "EMPRESA:", selectedPayload?.empresa || equipamento.empresa?.nome || "-");
      drawHeaderField(85, 75, "MARCA:", selectedPayload?.modelo || equipamento.nomeEquipamento || "-");
      drawHeaderField(160, 45, "TAG:", selectedPayload?.tag || equipamento.tagPatrimonio || "-");
    },
  });

  let finalY = doc.lastAutoTable?.finalY || 220;
  if (finalY > pageHeight - 92) {
    doc.addPage();
    finalY = 20;
  }

  const footerRows = [
    [
      {
        content: "AVALIACAO DE CADA ITEM:      C - CONFORME      NC - NAO CONFORME      NA - NAO APLICAVEL",
        colSpan: 9,
        styles: { halign: "center", fontStyle: "bold", minCellHeight: 8 },
      },
    ],
    [
      {
        content: "ASSINATURA OPERADOR>\n(PREENCHER DADOS E ASSINAR NO QUADRO AO FINAL)",
        colSpan: 2,
        styles: { halign: "right", fontStyle: "bold", minCellHeight: 12, cellPadding: { top: 1.4, right: 2, bottom: 1.2, left: 1 } },
      },
      ...weekOrder.map(() => ""),
    ],
    [
      {
        content: 'ASSINATURA DO ENCARREGADO>\nASSINAR DIARIAMENTE\nEM CASO DE "NC" ACIONAR A MANUTENCAO',
        colSpan: 2,
        styles: { halign: "right", fontStyle: "bold", minCellHeight: 12, cellPadding: { top: 1.2, right: 2, bottom: 1, left: 1 } },
      },
      ...weekOrder.map(() => ""),
    ],
    [
      {
        content: "IDENTIFICACAO DOS RESPONSAVEIS PELA EXECUCAO E APROVACAO DA INSPECAO",
        colSpan: 9,
        styles: { halign: "center", fontStyle: "bold", minCellHeight: 8 },
      },
    ],
    [
      {
        content: "ASSINATURA DO EXECUTANTE (OPERADOR):",
        colSpan: 9,
        styles: { halign: "left", fontStyle: "bold", minCellHeight: 14 },
      },
    ],
    [
      {
        content: "ASSINATURA DO APROVADOR (TECNICO(A) EM SEGURANCA):",
        colSpan: 9,
        styles: { halign: "left", fontStyle: "bold", minCellHeight: 14 },
      },
    ],
    [
      {
        content: "DESCREVER AS NAO CONFORMIDADES NO VERSO COM O NUMERO DO ITEM E INFORMAR AO SUPERIOR IMEDIATO.",
        colSpan: 9,
        styles: { halign: "center", fontStyle: "bold", fillColor: [0, 0, 0], textColor: [255, 255, 255], minCellHeight: 8 },
      },
    ],
  ];

  autoTable(doc, {
    startY: finalY + 2,
    margin: { left: 5, right: 5 },
    tableWidth: "auto",
    body: footerRows,
    styles: {
      fontSize: 7,
      cellPadding: 1.3,
      textColor: [0, 0, 0],
      lineColor: [20, 20, 20],
      lineWidth: 0.2,
      valign: "middle",
      halign: "center",
    },
    columnStyles: {
      0: { cellWidth: 8 },
      1: { cellWidth: 73 },
      2: { cellWidth: 17 },
      3: { cellWidth: 17 },
      4: { cellWidth: 17 },
      5: { cellWidth: 17 },
      6: { cellWidth: 17 },
      7: { cellWidth: 17 },
      8: { cellWidth: 17 },
    },
    didDrawCell: (data) => {
      if (data.section !== "body") return;
      const isOperatorRow = data.row.index === 1;
      const isEncarregadoRow = data.row.index === 2;
      const isSignatureColumn = data.column.index >= 2 && data.column.index <= 8;
      if ((!isOperatorRow && !isEncarregadoRow) || !isSignatureColumn) return;

      const day = weekOrder[data.column.index - 2];
      const payloadDoDia = weeklyMap.get(day);
      if (!payloadDoDia) return;

      const assinaturaData = isOperatorRow
        ? resolveSignatureByRole(payloadDoDia, "operador")
        : resolveSignatureByRole(payloadDoDia, "encarregado");
      const assinatura = assinaturaData.assinatura;
      const nome = assinaturaData.nome;
      if (!nome && !assinatura) return;
      const textLines = doc.splitTextToSize(nome || "-", data.cell.width - 2);

      doc.setFont("helvetica", "normal");
      doc.setFontSize(6);
      doc.text(textLines, data.cell.x + data.cell.width / 2, data.cell.y + 3.5, { align: "center", baseline: "top" });

      if (assinatura) {
        try {
          doc.addImage(assinatura, "PNG", data.cell.x + 1, data.cell.y + 6, data.cell.width - 2, Math.max(5, data.cell.height - 8));
        } catch {
        }
      }
    },
  });

  return doc;
}

export async function saveChecklistPdf(options, fileName) {
  const doc = await createChecklistPdf(options);
  if (!doc) return;
  doc.save(fileName);
}
