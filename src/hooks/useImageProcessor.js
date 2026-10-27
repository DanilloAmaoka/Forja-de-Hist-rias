import { useCallback, useEffect, useRef, useState } from "react";

import { lerImagemComoDataUrl } from "../utils/imageFiles";

export function useImageProcessor() {
  const [processandoImagem, setProcessandoImagem] = useState(null);
  const temporizadorRef = useRef(null);

  const limparTemporizador = useCallback(() => {
    if (temporizadorRef.current) {
      window.clearInterval(temporizadorRef.current);
      temporizadorRef.current = null;
    }
  }, []);

  useEffect(() => limparTemporizador, [limparTemporizador]);

  const processarImagem = useCallback(
    async (arquivo, opcoes = {}, rotulo = "Preparando imagem") => {
      if (!arquivo) return "";

      limparTemporizador();
      setProcessandoImagem({ rotulo, progresso: 8 });

      temporizadorRef.current = window.setInterval(() => {
        setProcessandoImagem((estadoAtual) => {
          if (!estadoAtual) return estadoAtual;

          const restante = 92 - estadoAtual.progresso;
          const incremento = Math.max(2, Math.ceil(restante * 0.16));
          return {
            ...estadoAtual,
            progresso: Math.min(92, estadoAtual.progresso + incremento),
          };
        });
      }, 140);

      try {
        const imagemUrl = await lerImagemComoDataUrl(arquivo, opcoes);
        limparTemporizador();
        setProcessandoImagem({ rotulo, progresso: 100 });

        await new Promise((resolve) => window.setTimeout(resolve, 220));
        return imagemUrl;
      } finally {
        limparTemporizador();
        setProcessandoImagem(null);
      }
    },
    [limparTemporizador],
  );

  return { processandoImagem, processarImagem };
}
