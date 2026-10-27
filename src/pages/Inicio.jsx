import { useState } from "react";
import { NavLink } from "react-router-dom";

import EmptyBookState from "../components/EmptyBookState";
import { useStoryData } from "../context/StoryDataContext";

export default function Inicio() {
  const {
    livroSelecionado,
    livrosAtivos,
    carregandoLivros,
    generoAtual,
    progressoAtual,
    diagnosticoAtual,
    sugestoesAtuais,
    adicionarIdeia,
  } = useStoryData();
  const [ideiaRapida, setIdeiaRapida] = useState("");

  const guardarIdeia = async (event) => {
    event.preventDefault();

    if (!livroSelecionado || !ideiaRapida.trim()) return;

    await adicionarIdeia(livroSelecionado.id, {
      titulo: ideiaRapida.trim().slice(0, 70),
      descricao: ideiaRapida.trim(),
      tipo: "Ideia rápida",
      prioridade: "media",
    });
    setIdeiaRapida("");
  };

  if (carregandoLivros) {
    return <main className="auth-loading">Carregando biblioteca...</main>;
  }

  if (!livroSelecionado) {
    return (
      <div className="page">
        <header className="page-header">
          <div>
            <span className="eyebrow">Estúdio</span>
            <h1>Forja de Histórias</h1>
            <p>Um painel para organizar livros, mundos, personagens e escrita.</p>
          </div>
        </header>
        <EmptyBookState titulo="Sua biblioteca ainda está vazia" />
      </div>
    );
  }

  const metricas = [
    { label: "Livros ativos", value: livrosAtivos.length },
    { label: "Personagens", value: progressoAtual.personagens },
    { label: "Ideias", value: progressoAtual.ideias },
    { label: "Sessões", value: progressoAtual.sessoes },
  ];

  return (
    <div className="page">
      <header className="page-header story-hero" data-tour="inicio-resumo">
        <div>
          <span className="eyebrow">Estúdio ativo</span>
          <h1>{livroSelecionado.titulo}</h1>
          <p>{livroSelecionado.logline || livroSelecionado.premissa || "Defina uma logline para dar direção ao projeto."}</p>
        </div>

        <div className="hero-status">
          <span>{generoAtual.nome}</span>
          <strong>{progressoAtual.palavras.toLocaleString("pt-BR")}</strong>
          <small>palavras registradas</small>
        </div>
      </header>

      <section className="metric-grid" data-tour="inicio-metricas">
        {metricas.map((metrica) => (
          <article className="metric-card" key={metrica.label}>
            <span>{metrica.label}</span>
            <strong>{metrica.value}</strong>
          </article>
        ))}
      </section>

      <section className="dashboard-grid">
        <article className="panel">
          <div className="panel-header">
            <div>
              <span className="eyebrow">Radar criativo</span>
              <h2>Próximas melhorias</h2>
            </div>
            <NavLink className="button secondary" to="/ajuda">
              Ver tutoriais
            </NavLink>
          </div>

          <div className="diagnostic-list">
            {diagnosticoAtual.map((item) => (
              <div className="diagnostic-item" key={item.tipo + item.titulo}>
                <span>{item.tipo}</span>
                <div>
                  <strong>{item.titulo}</strong>
                  <p>{item.texto}</p>
                </div>
              </div>
            ))}
          </div>
        </article>

        <article className="panel">
          <div className="panel-header">
            <div>
              <span className="eyebrow">Captura</span>
              <h2>Ideia rápida</h2>
            </div>
          </div>

          <form className="quick-idea-form" onSubmit={guardarIdeia}>
            <textarea
              value={ideiaRapida}
              onChange={(event) => setIdeiaRapida(event.target.value)}
              placeholder="Uma cena, frase, conflito, regra do mundo ou detalhe de personagem..."
              rows={6}
            />
            <button className="button primary" type="submit" disabled={!ideiaRapida.trim()}>
              Guardar ideia
            </button>
          </form>
        </article>
      </section>

      <section className="panel" data-tour="inicio-atalhos">
        <div className="panel-header">
          <div>
            <span className="eyebrow">Atalhos</span>
            <h2>Continuar criando</h2>
          </div>
        </div>

        <div className="shortcut-grid">
          <NavLink to="/mundo">Construir mundo</NavLink>
          <NavLink to="/personagens">Refinar personagens</NavLink>
          <NavLink to="/escrita">Escrever capítulos</NavLink>
          <NavLink to="/ideias">Organizar ideias</NavLink>
        </div>
      </section>

      <section className="panel">
        <div className="panel-header">
          <div>
            <span className="eyebrow">Sugestões</span>
            <h2>Faíscas para o próximo bloco</h2>
          </div>
        </div>

        <div className="suggestion-grid">
          {sugestoesAtuais.map((sugestao) => (
            <article className="suggestion-card" key={sugestao.titulo}>
              <strong>{sugestao.titulo}</strong>
              <p>{sugestao.texto}</p>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}
