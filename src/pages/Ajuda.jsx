import { useMemo, useRef, useState } from "react";

import { perguntasAjuda, tutoriaisPraticos } from "../data/helpContent";
import { useTutorial } from "../context/TutorialContext";

const roteiroRapido = [
  {
    titulo: "1. Crie uma obra",
    texto: "Comece em Livros, defina cor, capa e meta. Depois deixe esse livro ativo.",
  },
  {
    titulo: "2. Organize a base",
    texto: "Monte Mundo, elenco e ideias antes ou durante a escrita, sem precisar preencher tudo de uma vez.",
  },
  {
    titulo: "3. Escreva por partes",
    texto: "Divida capítulos em sessões, acompanhe palavras e use status para separar rascunho, revisão e concluído.",
  },
  {
    titulo: "4. Compartilhe com contexto",
    texto: "Na Comunidade, envie personagens, capítulos e itens do Mundo como cartões dentro das conversas.",
  },
];

export default function Ajuda() {
  const [busca, setBusca] = useState("");
  const [categoriaAtiva, setCategoriaAtiva] = useState("Todas");
  const { iniciarTutorial } = useTutorial();
  const tutoriaisRef = useRef(null);

  const tutorialAjuda = tutoriaisPraticos.find((tutorial) => tutorial.id === "usar-ajuda");
  const demaisTutoriais = tutoriaisPraticos.filter((tutorial) => tutorial.id !== "usar-ajuda");

  const categorias = useMemo(
    () => ["Todas", ...new Set(perguntasAjuda.map((item) => item.categoria))],
    [],
  );

  const perguntasFiltradas = useMemo(() => {
    const termo = busca.trim().toLowerCase();

    return perguntasAjuda.filter((item) => {
      const categoriaValida = categoriaAtiva === "Todas" || item.categoria === categoriaAtiva;
      const texto = (item.categoria + " " + item.pergunta + " " + item.resposta).toLowerCase();
      const buscaValida = !termo || texto.includes(termo);

      return categoriaValida && buscaValida;
    });
  }, [busca, categoriaAtiva]);

  return (
    <div className="page help-page">
      <header className="page-header">
        <div>
          <span className="eyebrow">Ajuda</span>
          <h1>Central do estúdio</h1>
          <p>Encontre respostas rápidas e tutoriais guiados para organizar sua história.</p>
        </div>
      </header>

      <section className="help-hero">
        <div>
          <span className="pill light">Orientação rápida</span>
          <h2>Do primeiro livro ao capítulo escrito</h2>
          <p>Use a busca quando quiser lembrar onde criar mundos, personagens, ideias, capítulos, ajustes e conversas.</p>
        </div>

        <button
          type="button"
          className="button secondary help-jump-button"
          onClick={() => tutoriaisRef.current?.scrollIntoView({ behavior: "smooth", block: "start" })}
        >
          Ver tutoriais
        </button>
      </section>

      <section className="help-roadmap-panel" data-tour="ajuda-roteiro">
        <div className="panel-header">
          <div>
            <span className="eyebrow">Roteiro rápido</span>
            <h2>Como o estúdio se encaixa</h2>
          </div>
        </div>

        <div className="help-roadmap-grid">
          {roteiroRapido.map((etapa) => (
            <article key={etapa.titulo}>
              <strong>{etapa.titulo}</strong>
              <p>{etapa.texto}</p>
            </article>
          ))}
        </div>
      </section>

      {tutorialAjuda && (
        <section className="featured-tutorial-panel" data-tour="ajuda-tutorial-destaque">
          <div>
            <span className="eyebrow">Tutorial em destaque</span>
            <h2>{tutorialAjuda.titulo}</h2>
            <p>{tutorialAjuda.descricao}</p>
          </div>

          <button type="button" className="button primary" onClick={() => iniciarTutorial(tutorialAjuda.id)}>
            Iniciar tutorial
          </button>
        </section>
      )}

      <section className="panel help-search-panel" data-tour="ajuda-busca">
        <label className="field-group">
          <span>Pesquisar pergunta</span>
          <input
            type="search"
            value={busca}
            onChange={(event) => setBusca(event.target.value)}
            placeholder="Ex.: livro, mundo, personagem, escrita, comunidade..."
          />
        </label>

        <div className="help-category-row">
          {categorias.map((categoria) => (
            <button
              key={categoria}
              type="button"
              className={categoriaAtiva === categoria ? "active" : ""}
              onClick={() => setCategoriaAtiva(categoria)}
            >
              {categoria}
            </button>
          ))}
        </div>
      </section>

      <section className="panel" data-tour="ajuda-faq">
        <div className="panel-header">
          <div>
            <span className="eyebrow">Perguntas frequentes</span>
            <h2>{perguntasFiltradas.length} respostas</h2>
          </div>
        </div>

        <div className="faq-list">
          {perguntasFiltradas.map((item) => (
            <details className="faq-item" key={item.categoria + "-" + item.pergunta}>
              <summary>
                <span>{item.categoria}</span>
                <strong>{item.pergunta}</strong>
              </summary>
              <p>{item.resposta}</p>
            </details>
          ))}
        </div>
      </section>

      <section className="panel" data-tour="ajuda-tutoriais" ref={tutoriaisRef}>
        <div className="panel-header">
          <div>
            <span className="eyebrow">Passo a passo</span>
            <h2>Tutoriais práticos</h2>
          </div>
        </div>

        <div className="tutorial-card-grid">
          {demaisTutoriais.map((tutorial) => (
            <article className="tutorial-card" key={tutorial.id}>
              <div>
                <h3>{tutorial.titulo}</h3>
                <p>{tutorial.descricao}</p>
                <span>{tutorial.passos.length} etapas</span>
              </div>

              <button type="button" className="button primary" onClick={() => iniciarTutorial(tutorial.id)}>
                Iniciar
              </button>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}
