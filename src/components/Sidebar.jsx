import { NavLink, useNavigate } from "react-router-dom";
import { signOut } from "firebase/auth";

import { auth } from "../firebase/config";
import { useStoryData } from "../context/StoryDataContext";
import { useTutorial } from "../context/TutorialContext";

const menuItems = [
  { id: "livros", to: "/livros", label: "Livros", icon: "▣" },
  { id: "comunidade", to: "/comunidade", label: "Comunidade", icon: "◌" },
  { id: "mundo", to: "/mundo", label: "Mundo", icon: "◎" },
  { id: "personagens", to: "/personagens", label: "Personagens", icon: "◇" },
  { id: "escrita", to: "/escrita", label: "Escrita", icon: "✎" },
  { id: "ideias", to: "/ideias", label: "Ideias", icon: "✦" },
  { id: "configuracoes", to: "/configuracoes", label: "Ajustes", icon: "☰" },
  { id: "ajuda", to: "/ajuda", label: "Ajuda", icon: "i", featured: true },
];

export default function Sidebar({ aberta = false, onClose = () => {} }) {
  const navigate = useNavigate();
  const {
    livrosAtivos,
    livrosArquivados,
    livroSelecionado,
    progressoAtual,
    notificacoesComunidade,
    selecionarLivro,
    atualizarStatusPublico,
  } = useStoryData();
  const { iniciarTutorial } = useTutorial();

  const sair = async () => {
    onClose();
    await atualizarStatusPublico({
      online: false,
      escrevendo: false,
      escrevendoDesde: "",
      escrevendoLivroTitulo: "",
      escrevendoSessaoTitulo: "",
    });
    await signOut(auth);
    navigate("/");
  };

  return (
    <aside className={"sidebar " + (aberta ? "open" : "")}>
      <div className="sidebar-mobile-head">
        <div className="sidebar-brand">
          <div className="brand-mark">FH</div>

          <div>
            <span>Forja de</span>
            <strong>Histórias</strong>
          </div>
        </div>

        <button type="button" className="sidebar-close-button" onClick={onClose}>
          Fechar
        </button>
      </div>

      <section className="book-switcher" data-tour="livro-seletor">
        <label htmlFor="livro-ativo">Livro ativo</label>
        <select
          id="livro-ativo"
          value={livroSelecionado?.id || ""}
          onChange={(event) => {
            selecionarLivro(event.target.value);
            onClose();
          }}
          disabled={livrosAtivos.length === 0}
        >
          {livrosAtivos.length === 0 && <option value="">Nenhum livro criado</option>}
          {livrosAtivos.map((livro) => (
            <option key={livro.id} value={livro.id}>
              {livro.titulo}
            </option>
          ))}
        </select>

        <div className="book-meter">
          <span style={{ width: progressoAtual.percentualCapitulos + "%" }} />
        </div>

        <small>
          {livroSelecionado
            ? progressoAtual.capitulosProntos + " de " + progressoAtual.capitulos + " capítulos prontos"
            : "Crie um livro para ativar o estúdio"}
        </small>
      </section>

      <nav className="sidebar-nav" aria-label="Menu principal">
        <button
          type="button"
          className="nav-link nav-link-button updates-featured"
          data-tour="nav-novidades"
          onClick={() => {
            iniciarTutorial("primeiro-livro");
            onClose();
          }}
        >
          <span className="nav-icon" aria-hidden="true">
            ✦
          </span>
          <span>Primeiros passos</span>
        </button>

        {menuItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            data-tour={"nav-" + item.id}
            className={({ isActive }) =>
              "nav-link " +
              (isActive ? "active " : "") +
              (item.featured ? "help-featured " : "") +
              (item.id === "comunidade" && notificacoesComunidade > 0 ? "has-notification" : "")
            }
            onClick={onClose}
          >
            <span className="nav-icon" aria-hidden="true">
              {item.icon}
            </span>
            <span>{item.label}</span>
            {item.id === "comunidade" && notificacoesComunidade > 0 && (
              <small className="nav-notification-badge" aria-label={notificacoesComunidade + " notificações da comunidade"}>
                {notificacoesComunidade > 9 ? "9+" : notificacoesComunidade}
              </small>
            )}
          </NavLink>
        ))}
      </nav>

      <div className="sidebar-footer">
        <div>
          <span>Biblioteca</span>
          <strong>{livrosAtivos.length} ativos · {livrosArquivados.length} arquivados</strong>
        </div>

        <button type="button" className="button ghost full-width" onClick={sair}>
          Sair
        </button>
      </div>
    </aside>
  );
}
