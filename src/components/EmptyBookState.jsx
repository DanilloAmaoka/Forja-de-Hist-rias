import { NavLink } from "react-router-dom";

export default function EmptyBookState({ titulo = "Nenhum livro selecionado" }) {
  return (
    <section className="empty-state" data-tour="livro-obrigatorio">
      <span className="eyebrow">Comece pela biblioteca</span>
      <h2>{titulo}</h2>
      <p>Crie um livro para liberar mundo, personagens, ideias, escrita, ajustes e comunidade.</p>
      <NavLink className="button primary" to="/livros">
        Criar livro
      </NavLink>
    </section>
  );
}
