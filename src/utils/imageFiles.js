const QUALIDADE_MINIMA = 0.46;
const TAMANHO_MINIMO = 280;

export async function lerImagemComoDataUrl(arquivo, opcoes = {}) {
  if (!arquivo) return "";

  if (!arquivo.type?.startsWith("image/")) {
    throw new Error("Selecione um arquivo de imagem.");
  }

  const imagem = await carregarImagem(arquivo);
  const tamanhoMaximo = opcoes.tamanhoMaximo || 900;
  const bytesMaximos = opcoes.bytesMaximos || 160 * 1024;
  const qualidadeInicial = limitarNumero(opcoes.qualidade || 0.76, QUALIDADE_MINIMA, 0.9);
  let limiteAtual = tamanhoMaximo;
  let qualidadeAtual = qualidadeInicial;
  let melhorResultado = null;

  for (let tentativa = 0; tentativa < 14; tentativa += 1) {
    const canvas = desenharImagemNoCanvas(imagem, limiteAtual);
    const resultado = await canvasParaDataUrl(canvas, qualidadeAtual);
    melhorResultado = resultado;

    if (resultado.bytes <= bytesMaximos) {
      return resultado.dataUrl;
    }

    if (qualidadeAtual > QUALIDADE_MINIMA) {
      qualidadeAtual = Math.max(QUALIDADE_MINIMA, qualidadeAtual - 0.08);
    } else {
      limiteAtual = Math.max(TAMANHO_MINIMO, Math.round(limiteAtual * 0.82));
    }

    if (limiteAtual === TAMANHO_MINIMO && qualidadeAtual === QUALIDADE_MINIMA) {
      break;
    }
  }

  return melhorResultado?.dataUrl || "";
}

function carregarImagem(arquivo) {
  return new Promise((resolve, reject) => {
    const leitor = new FileReader();

    leitor.onload = () => {
      const imagem = new Image();
      imagem.onload = () => resolve(imagem);
      imagem.onerror = () => reject(new Error("Não foi possível ler a imagem."));
      imagem.src = leitor.result;
    };

    leitor.onerror = () => reject(new Error("Não foi possível abrir o arquivo."));
    leitor.readAsDataURL(arquivo);
  });
}

function desenharImagemNoCanvas(imagem, tamanhoMaximo) {
  const escala = Math.min(1, tamanhoMaximo / Math.max(imagem.width, imagem.height));
  const largura = Math.max(1, Math.round(imagem.width * escala));
  const altura = Math.max(1, Math.round(imagem.height * escala));
  const canvas = document.createElement("canvas");
  const contexto = canvas.getContext("2d");

  canvas.width = largura;
  canvas.height = altura;
  contexto.fillStyle = "#fffaf7";
  contexto.fillRect(0, 0, largura, altura);
  contexto.drawImage(imagem, 0, 0, largura, altura);

  return canvas;
}

function canvasParaDataUrl(canvas, qualidade) {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (!blob) {
          reject(new Error("Não foi possível compactar a imagem."));
          return;
        }

        const leitor = new FileReader();
        leitor.onload = () => resolve({ dataUrl: leitor.result, bytes: blob.size });
        leitor.onerror = () => reject(new Error("Não foi possível finalizar a imagem."));
        leitor.readAsDataURL(blob);
      },
      "image/jpeg",
      qualidade,
    );
  });
}

function limitarNumero(valor, minimo, maximo) {
  return Math.min(maximo, Math.max(minimo, Number(valor) || minimo));
}
