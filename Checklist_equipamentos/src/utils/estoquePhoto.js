const FOTO_MAX_DIMENSAO = 1280;
const FOTO_MAX_BYTES = 3 * 1024 * 1024;

function estimateBase64Bytes(dataUrl) {
  if (typeof dataUrl !== "string") return 0;
  const base64 = dataUrl.split(",")[1] || "";
  return Math.ceil((base64.length * 3) / 4);
}

function lerArquivoComoDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ""));
    reader.onerror = () => reject(new Error("Nao foi possivel ler a foto."));
    reader.readAsDataURL(file);
  });
}

function carregarImagem(url) {
  return new Promise((resolve, reject) => {
    const imagem = new Image();
    imagem.onload = () => resolve(imagem);
    imagem.onerror = () => reject(new Error("Nao foi possivel processar a foto."));
    imagem.src = url;
  });
}

export async function normalizarFotoArquivo(file) {
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
