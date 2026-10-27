import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";

import { tutoriaisPraticos } from "../data/helpContent";

const TutorialContext = createContext(null);

export function TutorialProvider({ children }) {
  const navigate = useNavigate();
  const location = useLocation();
  const [tutorialAtivo, setTutorialAtivo] = useState(null);
  const [indicePasso, setIndicePasso] = useState(0);
  const [alvo, setAlvo] = useState(null);

  const passoAtual = tutorialAtivo?.passos[indicePasso] || null;

  function iniciarTutorial(tutorialId) {
    const tutorial = tutoriaisPraticos.find((item) => item.id === tutorialId);
    if (!tutorial) return;

    setTutorialAtivo(tutorial);
    setIndicePasso(0);
  }

  function cancelarTutorial() {
    setTutorialAtivo(null);
    setIndicePasso(0);
    setAlvo(null);
  }

  function proximoPasso() {
    if (!tutorialAtivo) return;

    if (indicePasso >= tutorialAtivo.passos.length - 1) {
      cancelarTutorial();
      return;
    }

    setIndicePasso((passo) => passo + 1);
  }

  function passoAnterior() {
    setIndicePasso((passo) => Math.max(0, passo - 1));
  }

  useEffect(() => {
    if (passoAtual?.rota && location.pathname !== passoAtual.rota) {
      navigate(passoAtual.rota);
    }
  }, [location.pathname, navigate, passoAtual?.rota]);

  useEffect(() => {
    const seletores = passoAtual?.seletores || (passoAtual?.seletor ? [passoAtual.seletor] : []);

    if (seletores.length === 0) {
      setAlvo(null);
      return undefined;
    }

    if (passoAtual.rota && location.pathname !== passoAtual.rota) {
      setAlvo(null);
      return undefined;
    }

    let cancelado = false;
    let timeoutId = null;

    function encontrarElemento() {
      return seletores
        .map((seletor) => document.querySelector(seletor))
        .find(Boolean);
    }

    function medirElemento(elemento) {
      const rect = elemento.getBoundingClientRect();

      setAlvo({
        top: rect.top,
        left: rect.left,
        width: rect.width,
        height: rect.height,
      });
    }

    function procurarElemento(tentativa = 0) {
      const elemento = encontrarElemento();

      // Algumas etapas mudam de página. Esse pequeno retry evita procurar o alvo
      // antes de a rota terminar de renderizar.
      if (!elemento) {
        if (tentativa < 20 && !cancelado) {
          timeoutId = window.setTimeout(() => procurarElemento(tentativa + 1), 120);
        } else {
          setAlvo(null);
        }

        return;
      }

      elemento.scrollIntoView({ behavior: "smooth", block: "center", inline: "center" });

      timeoutId = window.setTimeout(() => {
        if (!cancelado) {
          medirElemento(elemento);
        }
      }, 260);
    }

    function atualizarAlvo() {
      const elemento = encontrarElemento();

      if (!elemento || cancelado) {
        return;
      }

      medirElemento(elemento);
    }

    timeoutId = window.setTimeout(() => procurarElemento(), 120);
    window.addEventListener("resize", atualizarAlvo);
    window.addEventListener("scroll", atualizarAlvo, true);

    return () => {
      cancelado = true;
      window.clearTimeout(timeoutId);
      window.removeEventListener("resize", atualizarAlvo);
      window.removeEventListener("scroll", atualizarAlvo, true);
    };
  }, [location.pathname, passoAtual?.rota, passoAtual?.seletor, passoAtual?.seletores]);

  const valor = useMemo(
    () => ({
      tutorialAtivo,
      passoAtual,
      indicePasso,
      iniciarTutorial,
      cancelarTutorial,
      proximoPasso,
      passoAnterior,
    }),
    [tutorialAtivo, passoAtual, indicePasso],
  );

  return (
    <TutorialContext.Provider value={valor}>
      {children}

      {tutorialAtivo && (
        <div className="tutorial-layer" aria-live="polite">
          <div className="tutorial-click-shield" />

          {alvo && (
            <div
              className="tutorial-spotlight"
              style={{
                top: alvo.top - 8,
                left: alvo.left - 8,
                width: alvo.width + 16,
                height: alvo.height + 16,
              }}
            />
          )}

          <section className="tutorial-panel">
            <div>
              <span className="eyebrow">Tutorial prático</span>
              <h2>{passoAtual?.titulo}</h2>
              <p>{passoAtual?.texto}</p>
              <small>
                Etapa {indicePasso + 1} de {tutorialAtivo.passos.length} · {tutorialAtivo.titulo}
              </small>
            </div>

            <div className="tutorial-actions">
              <button type="button" className="button secondary" onClick={cancelarTutorial}>
                Cancelar
              </button>
              <button
                type="button"
                className="button secondary"
                onClick={passoAnterior}
                disabled={indicePasso === 0}
              >
                Voltar
              </button>
              <button type="button" className="button primary" onClick={proximoPasso}>
                {indicePasso === tutorialAtivo.passos.length - 1 ? "Concluir" : "Avançar"}
              </button>
            </div>
          </section>
        </div>
      )}
    </TutorialContext.Provider>
  );
}

export function useTutorial() {
  const contexto = useContext(TutorialContext);

  if (!contexto) {
    throw new Error("useTutorial precisa estar dentro de TutorialProvider.");
  }

  return contexto;
}
