import { useEffect, useMemo, useRef, useState } from "react";

import ImageProcessingOverlay from "../components/ImageProcessingOverlay";
import { useFeedback } from "../context/FeedbackContext";
import { useStoryData } from "../context/StoryDataContext";
import { useImageProcessor } from "../hooks/useImageProcessor";
import { useScrollIntoViewOnOpen } from "../hooks/useScrollIntoViewOnOpen";

const livroInicial = {
  titulo: "",
  genero: "fantasia",
  cor: "#8f1d43",
  capaUrl: "",
  premissa: "",
  logline: "",
  tema: "",
  publico: "",
  metaPalavrasLivro: 70000,
};

function organizarLivrosEstante(livros = [], termoBusca = "") {
  const livrosUnicos = new Map();
  const busca = termoBusca.trim().toLowerCase();

  livros.forEach((livro) => {
    const id = String(livro.id || "");
    if (!id) return;

    const livroExistente = livrosUnicos.get(id);
    const livroMaisRecente =
      !livroExistente ||
      String(livro.atualizadoEm || "").localeCompare(String(livroExistente.atualizadoEm || "")) >= 0;

    if (livroMaisRecente) {
      livrosUnicos.set(id, livro);
    }
  });

  return Array.from(livrosUnicos.values())
    .filter((livro) => {
      if (!busca) return true;

      return [
        livro.titulo,
        livro.genero,
        livro.premissa,
        livro.logline,
        livro.tema,
        livro.nomeMundo,
      ]
        .filter(Boolean)
        .some((valor) => String(valor).toLowerCase().includes(busca));
    })
    .sort((a, b) => {
      if (Boolean(a.favorito) !== Boolean(b.favorito)) {
        return a.favorito ? -1 : 1;
      }

      if (Boolean(a.arquivado) !== Boolean(b.arquivado)) {
        return a.arquivado ? 1 : -1;
      }

      const porAtualizacao = String(b.atualizadoEm || "").localeCompare(String(a.atualizadoEm || ""));
      if (porAtualizacao !== 0) return porAtualizacao;

      return String(a.titulo || "").localeCompare(String(b.titulo || ""));
    });
}

export default function Biblioteca() {
  const {
    livros,
    livroSelecionado,
    generosHistoria,
    obterGenero,
    calcularProgressoLivro,
    adicionarLivro,
    salvarLivro,
    selecionarLivro,
    arquivarLivro,
    reabrirLivro,
    deletarLivro,
  } = useStoryData();
  const { pedirConfirmacao, mostrarFeedback } = useFeedback();
  const [novoLivro, setNovoLivro] = useState(livroInicial);
  const [mostrarCriacao, setMostrarCriacao] = useState(false);
  const [livroFocadoId, setLivroFocadoId] = useState("");
  const [edicao, setEdicao] = useState(livroInicial);
  const [buscaLivro, setBuscaLivro] = useState("");
  const criacaoRef = useRef(null);
  const fichaRef = useRef(null);
  const { processandoImagem, processarImagem } = useImageProcessor();

  const livrosNaEstante = useMemo(() => organizarLivrosEstante(livros, buscaLivro), [livros, buscaLivro]);
  const livroFocado = useMemo(
    () => livros.find((livro) => String(livro.id) === String(livroFocadoId)) || null,
    [livroFocadoId, livros],
  );

  useEffect(() => {
    if (!livroFocado) return;

    setEdicao({
      titulo: livroFocado.titulo,
      genero: livroFocado.genero,
      cor: livroFocado.cor,
      capaUrl: livroFocado.capaUrl || "",
      premissa: livroFocado.premissa,
      logline: livroFocado.logline,
      tema: livroFocado.tema,
      publico: livroFocado.publico,
      metaPalavrasLivro: livroFocado.metaPalavrasLivro,
    });
  }, [livroFocado]);

  useScrollIntoViewOnOpen(criacaoRef, mostrarCriacao, "start");
  useScrollIntoViewOnOpen(fichaRef, Boolean(livroFocado), "start");

  const atualizarNovo = (campo, valor) => {
    setNovoLivro((atual) => {
      if (campo === "genero") {
        const genero = obterGenero(valor);
        return { ...atual, genero: valor, cor: genero.cor };
      }

      return { ...atual, [campo]: valor };
    });
  };

  const selecionarCapaNovo = async (event) => {
    const arquivo = event.target.files?.[0];
    if (!arquivo) return;

    try {
      const capaUrl = await processarImagem(arquivo, { tamanhoMaximo: 760, qualidade: 0.74, bytesMaximos: 150 * 1024 }, "Capa do livro");
      setNovoLivro((atual) => ({ ...atual, capaUrl }));
    } catch (error) {
      mostrarFeedback(error.message || "Não foi possível carregar a capa.", "erro");
    }
  };

  const selecionarCapaEdicao = async (event) => {
    const arquivo = event.target.files?.[0];
    if (!arquivo) return;

    try {
      const capaUrl = await processarImagem(arquivo, { tamanhoMaximo: 760, qualidade: 0.74, bytesMaximos: 150 * 1024 }, "Capa do livro");
      setEdicao((atual) => ({ ...atual, capaUrl }));
    } catch (error) {
      mostrarFeedback(error.message || "Não foi possível carregar a capa.", "erro");
    }
  };

  const criarLivro = async (event) => {
    event.preventDefault();

    if (!novoLivro.titulo.trim()) return;

    const livroCriado = await adicionarLivro(novoLivro);
    setNovoLivro(livroInicial);
    setMostrarCriacao(false);
    setLivroFocadoId(livroCriado.id);
  };

  const abrirLivro = (livro) => {
    selecionarLivro(livro.id);
    setLivroFocadoId(livro.id);
  };

  const salvarFicha = async (event) => {
    event.preventDefault();

    if (!livroFocado) return;

    await salvarLivro(livroFocado.id, edicao);
  };

  const removerLivro = async (event, livro) => {
    event.stopPropagation();

    const confirmado = await pedirConfirmacao({
      titulo: "Remover livro",
      mensagem: "Remover " + livro.titulo + " apaga este registro e suas listas do banco.",
      textoConfirmar: "Remover",
      perigo: true,
    });

    if (confirmado) {
      await deletarLivro(livro.id);
      if (livroFocadoId === livro.id) {
        setLivroFocadoId("");
      }
    }
  };

  const alternarArquivoLivro = async (event, livro) => {
    event.stopPropagation();

    if (livro.arquivado) {
      await reabrirLivro(livro.id);
      return;
    }

    await arquivarLivro(livro.id);
  };

  const alternarFavoritoLivro = async (event, livro) => {
    event.stopPropagation();
    await salvarLivro(livro.id, { favorito: !livro.favorito }, { silencioso: true });
  };

  return (
    <div className="page library-page">
      <ImageProcessingOverlay estado={processandoImagem} />
      <header className="page-header">
        <div>
          <span className="eyebrow">Biblioteca</span>
          <h1>Estante de livros</h1>
          <p>Cada obra tem cor própria, gênero, metas e um espaço completo para mundo, elenco e escrita.</p>
        </div>
      </header>

      <section className="panel library-shelf-panel">
        <div className="panel-header">
          <div>
            <span className="eyebrow">Estante</span>
            <h2>{livrosNaEstante.length} de {livros.length} livros</h2>
          </div>
          <div className="library-toolbar">
            <label className="library-search">
              <span>Pesquisar</span>
              <input
                value={buscaLivro}
                onChange={(event) => setBuscaLivro(event.target.value)}
                placeholder="Buscar por título, mundo ou ideia"
              />
            </label>
            <button type="button" className="button primary" data-tour="livro-criar" onClick={() => setMostrarCriacao((valor) => !valor)}>
              {mostrarCriacao ? "Fechar criação" : "Adicionar livro"}
            </button>
          </div>
        </div>

        <div className="book-shelf" data-tour="livro-estante">
          {livrosNaEstante.map((livro) => {
            const genero = obterGenero(livro.genero);
            const progresso = calcularProgressoLivro(livro);
            const ativo = livroSelecionado?.id === livro.id;
            const focado = livroFocadoId === livro.id;
            const temCapa = Boolean(livro.capaUrl);

            return (
              <article
                className={
                  "shelf-book " +
                  (ativo ? "active " : "") +
                  (focado ? "focused " : "") +
                  (livro.arquivado ? "archived " : "") +
                  (temCapa ? "has-cover" : "")
                }
                key={livro.id}
                style={{ "--shelf-book-color": livro.cor || genero.cor }}
              >
                <button
                  type="button"
                  className={"shelf-book-favorite " + (livro.favorito ? "active" : "")}
                  onClick={(event) => alternarFavoritoLivro(event, livro)}
                  aria-label={livro.favorito ? "Remover dos favoritos" : "Favoritar livro"}
                >
                  ★
                </button>
                <button type="button" className="shelf-book-cover" onClick={() => abrirLivro(livro)} aria-label={"Abrir " + livro.titulo}>
                  {temCapa && <img className="shelf-book-image" src={livro.capaUrl} alt="" loading="lazy" />}
                  <span className="shelf-book-content" aria-hidden="true">
                    <span className="shelf-book-genre">{genero.nome}</span>
                    <strong>{livro.titulo}</strong>
                    <small>{progresso.palavras.toLocaleString("pt-BR")} palavras</small>
                  </span>
                </button>

                <div className="shelf-book-actions">
                  <button type="button" onClick={(event) => alternarArquivoLivro(event, livro)}>
                    {livro.arquivado ? "Reabrir" : "Arquivar"}
                  </button>
                  <button type="button" onClick={(event) => removerLivro(event, livro)}>
                    Remover
                  </button>
                </div>
              </article>
            );
          })}

          {livrosNaEstante.length === 0 && (
            <button type="button" className="empty-book-slot" onClick={() => setMostrarCriacao(true)}>
              <strong>{buscaLivro.trim() ? "Nenhum livro encontrado" : "Adicionar primeiro livro"}</strong>
              <span>{buscaLivro.trim() ? "Tente outro termo de pesquisa." : "A estante ainda está vazia."}</span>
            </button>
          )}
        </div>
      </section>

      {mostrarCriacao && (
        <section className="panel book-create-panel" ref={criacaoRef}>
          <div className="panel-header">
            <div>
              <span className="eyebrow">Novo volume</span>
              <h2>Criar livro</h2>
            </div>
          </div>

          <form className="form-stack" onSubmit={criarLivro}>
            <div className="form-grid two">
              <label className="field-group">
                <span>Título</span>
                <input
                  value={novoLivro.titulo}
                  onChange={(event) => atualizarNovo("titulo", event.target.value)}
                  placeholder="Ex.: O Reino sob a Névoa"
                />
              </label>

              <label className="field-group">
                <span>Gênero</span>
                <select value={novoLivro.genero} onChange={(event) => atualizarNovo("genero", event.target.value)}>
                  {generosHistoria.map((genero) => (
                    <option key={genero.id} value={genero.id}>
                      {genero.nome}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            <div className="form-grid two">
              <label className="field-group">
                <span>Cor do livro</span>
                <input type="color" value={novoLivro.cor} onChange={(event) => atualizarNovo("cor", event.target.value)} />
              </label>

              <label className="field-group">
                <span>Meta de palavras</span>
                <input
                  type="number"
                  min="0"
                  value={novoLivro.metaPalavrasLivro}
                  onChange={(event) => atualizarNovo("metaPalavrasLivro", event.target.value)}
                />
              </label>
            </div>

            <div className="image-upload-row">
              <label className="field-group">
                <span>Capa do livro</span>
                <input type="file" accept="image/*" onChange={selecionarCapaNovo} />
              </label>
              {novoLivro.capaUrl && (
                <div className="image-upload-preview">
                  <img src={novoLivro.capaUrl} alt="" />
                  <button type="button" className="button ghost" onClick={() => setNovoLivro({ ...novoLivro, capaUrl: "" })}>
                    Remover capa
                  </button>
                </div>
              )}
            </div>

            <label className="field-group">
              <span>Logline</span>
              <textarea
                value={novoLivro.logline}
                onChange={(event) => atualizarNovo("logline", event.target.value)}
                placeholder="Uma frase com protagonista, objetivo, obstáculo e risco."
                rows={3}
              />
            </label>

            <button className="button primary large" type="submit" disabled={!novoLivro.titulo.trim() || Boolean(processandoImagem)}>
              Criar livro
            </button>
          </form>
        </section>
      )}

      {livroFocado && (
        <section className="book-detail-stage" data-tour="livro-ficha" ref={fichaRef}>
          <div className="book-detail-cover" style={{ "--shelf-book-color": livroFocado.cor }}>
            <span>{obterGenero(livroFocado.genero).nome}</span>
            <strong>{livroFocado.titulo}</strong>
            <small>{livroFocado.arquivado ? "Arquivado" : "Ativo"}</small>
          </div>

          <article className="panel book-detail-panel">
            <div className="panel-header">
              <div>
                <span className="eyebrow">Ficha aberta</span>
                <h2>{livroFocado.titulo}</h2>
              </div>
              <button type="button" className="button secondary" onClick={() => setLivroFocadoId("")}>
                Fechar ficha
              </button>
            </div>

            <form className="form-stack" onSubmit={salvarFicha}>
              <div className="form-grid two">
                <label className="field-group">
                  <span>Título</span>
                  <input value={edicao.titulo} onChange={(event) => setEdicao({ ...edicao, titulo: event.target.value })} />
                </label>

                <label className="field-group">
                  <span>Gênero</span>
                  <select
                    value={edicao.genero}
                    onChange={(event) => {
                      const genero = obterGenero(event.target.value);
                      setEdicao({ ...edicao, genero: event.target.value, cor: genero.cor });
                    }}
                  >
                    {generosHistoria.map((genero) => (
                      <option key={genero.id} value={genero.id}>
                        {genero.nome}
                      </option>
                    ))}
                  </select>
                </label>
              </div>

              <div className="form-grid three">
                <label className="field-group">
                  <span>Cor</span>
                  <input type="color" value={edicao.cor} onChange={(event) => setEdicao({ ...edicao, cor: event.target.value })} />
                </label>

                <label className="field-group">
                  <span>Meta de palavras</span>
                  <input
                    type="number"
                    min="0"
                    value={edicao.metaPalavrasLivro}
                    onChange={(event) => setEdicao({ ...edicao, metaPalavrasLivro: event.target.value })}
                  />
                </label>

                <label className="field-group">
                  <span>Público ou tom</span>
                  <input value={edicao.publico} onChange={(event) => setEdicao({ ...edicao, publico: event.target.value })} />
                </label>
              </div>

              <div className="image-upload-row">
                <label className="field-group">
                  <span>Capa do livro</span>
                  <input type="file" accept="image/*" onChange={selecionarCapaEdicao} />
                </label>
                {edicao.capaUrl && (
                  <div className="image-upload-preview">
                    <img src={edicao.capaUrl} alt="" />
                    <button type="button" className="button ghost" onClick={() => setEdicao({ ...edicao, capaUrl: "" })}>
                      Remover capa
                    </button>
                  </div>
                )}
              </div>

              <label className="field-group">
                <span>Logline</span>
                <textarea value={edicao.logline} onChange={(event) => setEdicao({ ...edicao, logline: event.target.value })} rows={3} />
              </label>

              <label className="field-group">
                <span>Premissa</span>
                <textarea value={edicao.premissa} onChange={(event) => setEdicao({ ...edicao, premissa: event.target.value })} rows={5} />
              </label>

              <label className="field-group">
                <span>Tema central</span>
                <input value={edicao.tema} onChange={(event) => setEdicao({ ...edicao, tema: event.target.value })} />
              </label>

              <button className="button primary" type="submit" disabled={Boolean(processandoImagem)}>
                Salvar ficha
              </button>
            </form>
          </article>
        </section>
      )}
    </div>
  );
}
