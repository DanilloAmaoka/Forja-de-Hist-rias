import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  browserLocalPersistence,
  browserSessionPersistence,
  GoogleAuthProvider,
  onAuthStateChanged,
  setPersistence,
  signInWithPopup,
} from "firebase/auth";

import { auth } from "../firebase/config";
import fundoLogin from "../assets/fundo.jpg";

export default function Login() {
  const navigate = useNavigate();
  const [continuarSessao, setContinuarSessao] = useState(true);
  const [usuarioAtual, setUsuarioAtual] = useState(null);
  const [carregandoSessao, setCarregandoSessao] = useState(true);
  const [entrando, setEntrando] = useState(false);
  const [feedback, setFeedback] = useState(null);

  useEffect(() => {
    setPersistence(
      auth,
      continuarSessao ? browserLocalPersistence : browserSessionPersistence,
    ).catch(() => {});
  }, [continuarSessao]);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (usuario) => {
      setUsuarioAtual(usuario);
      setCarregandoSessao(false);
    });

    return () => unsubscribe();
  }, []);

  const tratarErroLogin = (erro) => {
    const codigo = erro?.code || "";

    if (codigo.includes("popup-closed-by-user") || codigo.includes("cancelled-popup-request")) {
      return "A janela do Google foi fechada antes de concluir o acesso.";
    }

    if (codigo.includes("account-exists-with-different-credential")) {
      return "Esta conta já existe com outro método de acesso. Use o mesmo e-mail do Google configurado.";
    }

    if (codigo.includes("too-many-requests")) {
      return "Muitas tentativas em sequência. Aguarde um pouco antes de tentar novamente.";
    }

    if (codigo.includes("network-request-failed")) {
      return "Não foi possível conectar agora. Verifique a internet e tente novamente.";
    }

    return "Não foi possível entrar com Google agora. Tente novamente.";
  };

  const entrarComGoogle = async () => {
    setFeedback(null);

    try {
      setEntrando(true);
      await setPersistence(
        auth,
        continuarSessao ? browserLocalPersistence : browserSessionPersistence,
      );
      await signInWithPopup(auth, new GoogleAuthProvider());
      navigate("/livros");
    } catch (erro) {
      setFeedback(tratarErroLogin(erro));
    } finally {
      setEntrando(false);
    }
  };

  return (
    <main
      className="login-page"
      style={{
        "--login-image": `url(${fundoLogin})`,
      }}
    >
      <section className="login-stage">
        <div className="login-showcase">
          <div className="login-brand">
            <div className="login-emblem">FH</div>

            <div>
              <span>Forja de Histórias</span>
              <h1>Ateliê narrativo</h1>
            </div>
          </div>

          <div className="login-copy">
            <span className="pill light">Biblioteca viva</span>
            <h2>Construa mundos que lembram, reagem e crescem com cada livro.</h2>
            <p>
              Organize ideias, personagens, cenários, capítulos e sessões de escrita em um painel
              que muda de cor conforme a obra selecionada.
            </p>
          </div>

          <div className="login-runes" aria-hidden="true">
            <span>Mundo</span>
            <span>Elenco</span>
            <span>Cenas</span>
            <span>Ideias</span>
          </div>
        </div>

        <div className="login-panel">
          <div className="login-header">
            <span className="pill">Acesso do autor</span>
            <h2>Entrar no estúdio</h2>
            <p>Use sua conta Google para acessar seus livros, mundos e conversas com segurança.</p>
          </div>

          {usuarioAtual && !carregandoSessao && (
            <div className="session-card">
              <div>
                <strong>Sessão ativa</strong>
                <span>{usuarioAtual.email}</span>
              </div>

              <button type="button" className="button primary" onClick={() => navigate("/livros")}>
                Continuar
              </button>
            </div>
          )}

          <div className="form-stack">
            <button type="button" className="button primary large google-login-button" onClick={entrarComGoogle} disabled={entrando}>
              {entrando ? "Abrindo Google..." : "Entrar com Google"}
            </button>

            <label className="session-option">
              <input
                type="checkbox"
                checked={continuarSessao}
                onChange={(event) => setContinuarSessao(event.target.checked)}
                disabled={entrando}
              />

              <div>
                <strong>Continuar sessão neste navegador</strong>
                <span>O ateliê abre mais rápido neste aparelho.</span>
              </div>
            </label>

            {feedback && (
              <div className="feedback-error">
                <strong>Acesso não realizado</strong>
                <span>{feedback}</span>
              </div>
            )}
          </div>

          <footer className="login-footer">
            Forja privada para organizar mundos, livros e escrita em andamento.
          </footer>
        </div>
      </section>
    </main>
  );
}
