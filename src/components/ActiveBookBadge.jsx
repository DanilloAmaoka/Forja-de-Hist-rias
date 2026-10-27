import { useStoryData } from "../context/StoryDataContext";

export default function ActiveBookBadge() {
  const { livroSelecionado, generoAtual, progressoAtual } = useStoryData();

  if (!livroSelecionado) {
    return (
      <div className="active-book-badge">
        <span>Nenhum livro</span>
        <strong>Crie sua primeira história</strong>
      </div>
    );
  }

  return (
    <div className="active-book-badge">
      <span>{generoAtual.nome}</span>
      <strong>{livroSelecionado.titulo}</strong>
      <small>{progressoAtual.palavras.toLocaleString("pt-BR")} palavras</small>
    </div>
  );
}
