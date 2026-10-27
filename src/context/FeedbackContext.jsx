import { createContext, useCallback, useContext, useMemo, useRef, useState } from "react";

const FeedbackContext = createContext(null);

export function FeedbackProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const [confirmacao, setConfirmacao] = useState(null);
  const resolverConfirmacao = useRef(null);

  // Mostra mensagens rápidas no canto da tela sem usar alert() do navegador.
  const mostrarFeedback = useCallback((mensagem, tipo = "sucesso") => {
    const id = Date.now();
    setToasts((listaAtual) => [...listaAtual, { id, mensagem, tipo }]);

    window.setTimeout(() => {
      setToasts((listaAtual) => listaAtual.filter((toast) => toast.id !== id));
    }, 3800);
  }, []);

  // Abre uma confirmação visual própria do site e devolve true/false para quem chamou.
  const pedirConfirmacao = useCallback(({
    titulo = "Confirmar ação",
    mensagem,
    textoConfirmar = "Confirmar",
    textoCancelar = "Cancelar",
    perigo = false,
  }) => {
    setConfirmacao({ titulo, mensagem, textoConfirmar, textoCancelar, perigo });

    return new Promise((resolve) => {
      resolverConfirmacao.current = resolve;
    });
  }, []);

  const responderConfirmacao = useCallback((resposta) => {
    resolverConfirmacao.current?.(resposta);
    resolverConfirmacao.current = null;
    setConfirmacao(null);
  }, []);

  const valor = useMemo(() => ({ mostrarFeedback, pedirConfirmacao }), [mostrarFeedback, pedirConfirmacao]);

  return (
    <FeedbackContext.Provider value={valor}>
      {children}

      <div className="toast-stack" aria-live="polite">
        {toasts.map((toast) => (
          <div className={"toast toast-" + toast.tipo} key={toast.id}>
            {toast.mensagem}
          </div>
        ))}
      </div>

      {confirmacao && (
        <div className="confirm-backdrop" role="dialog" aria-modal="true">
          <div className="confirm-card">
            <span className="eyebrow">Confirmação</span>
            <h2>{confirmacao.titulo}</h2>
            <p>{confirmacao.mensagem}</p>

            <div className="confirm-actions">
              <button
                type="button"
                className="button secondary"
                onClick={() => responderConfirmacao(false)}
              >
                {confirmacao.textoCancelar}
              </button>
              <button
                type="button"
                className={confirmacao.perigo ? "button danger" : "button primary"}
                onClick={() => responderConfirmacao(true)}
              >
                {confirmacao.textoConfirmar}
              </button>
            </div>
          </div>
        </div>
      )}
    </FeedbackContext.Provider>
  );
}

export function useFeedback() {
  const contexto = useContext(FeedbackContext);

  if (!contexto) {
    throw new Error("useFeedback precisa estar dentro de FeedbackProvider.");
  }

  return contexto;
}
