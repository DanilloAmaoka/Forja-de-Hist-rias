import { useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";

import EmptyBookState from "../components/EmptyBookState";
import { contarPalavrasTexto } from "../data/storyData";
import { useStoryData } from "../context/StoryDataContext";
import { useScrollIntoViewOnOpen } from "../hooks/useScrollIntoViewOnOpen";

const capituloInicial = {
  titulo: "",
  resumo: "",
  cor: "#8f1d43",
  metaPalavras: 3000,
};

const sessaoInicial = {
  titulo: "",
  resumo: "",
  metaPalavras: 800,
};

const statusSessao = [
  { id: "rascunho", label: "Rascunho" },
  { id: "revisando", label: "Revisando" },
  { id: "concluido", label: "Concluído" },
];

const secoesFixasMundoEscrita = [
  { id: "lugares", nome: "Lugares" },
  { id: "faccoes", nome: "Facções" },
  { id: "regras", nome: "Regras" },
  { id: "linhaDoTempo", nome: "Linha do Tempo" },
];

export default function Escrita() {
  const {
    livroSelecionado,
    progressoAtual,
    configuracoes,
    salvarLivro,
    adicionarCapitulo,
    salvarCapitulo,
    removerCapitulo,
    reordenarCapitulo,
    adicionarSessaoCapitulo,
    salvarSessaoCapitulo,
    removerSessaoCapitulo,
    reordenarSessaoCapitulo,
    selecionarLivro,
    atualizarStatusPublico,
  } = useStoryData();
  const [searchParams] = useSearchParams();
  const [metaLivro, setMetaLivro] = useState(configuracoes.metaPalavrasLivro);
  const [mostrarCriarCapitulo, setMostrarCriarCapitulo] = useState(false);
  const [novoCapitulo, setNovoCapitulo] = useState(capituloInicial);
  const [capituloAbertoId, setCapituloAbertoId] = useState("");
  const [mostrarCriarSessao, setMostrarCriarSessao] = useState(false);
  const [novaSessao, setNovaSessao] = useState(sessaoInicial);
  const [editor, setEditor] = useState(null);
  const [leitor, setLeitor] = useState(null);
  const [textoEditor, setTextoEditor] = useState("");
  const [tempoSegundos, setTempoSegundos] = useState(0);
  const [timerAtivo, setTimerAtivo] = useState(false);
  const [detalheLateral, setDetalheLateral] = useState(null);
  const [personagemConsulta, setPersonagemConsulta] = useState(null);
  const [ideiaConsulta, setIdeiaConsulta] = useState(null);
  const [salvamento, setSalvamento] = useState(null);
  const [secaoMundoAbertaId, setSecaoMundoAbertaId] = useState("");
  const capituloAbertoRef = useRef(null);
  const criarCapituloRef = useRef(null);
  const criarSessaoRef = useRef(null);
  const escritaDesdeRef = useRef("");
  const leituraExternaRef = useRef("");

  useEffect(() => {
    if (!livroSelecionado) return;
    setMetaLivro(livroSelecionado.metaPalavrasLivro || configuracoes.metaPalavrasLivro);
  }, [configuracoes.metaPalavrasLivro, livroSelecionado]);

  useEffect(() => {
    if (!editor || !timerAtivo) return undefined;

    const intervalo = window.setInterval(() => {
      setTempoSegundos((valor) => valor + 1);
    }, 1000);

    return () => window.clearInterval(intervalo);
  }, [editor, timerAtivo]);

  useEffect(() => {
    if (!editor && !leitor) {
      document.body.classList.remove("writing-focus-active");
      return;
    }

    document.body.classList.add("writing-focus-active");
    return () => document.body.classList.remove("writing-focus-active");
  }, [editor, leitor]);

  useEffect(() => {
    if (!capituloAbertoId) return;

    window.setTimeout(() => {
      capituloAbertoRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 120);
  }, [capituloAbertoId]);

  useEffect(() => {
    if (!salvamento) return undefined;

    const timeout = window.setTimeout(() => setSalvamento(null), 2600);
    return () => window.clearTimeout(timeout);
  }, [salvamento]);

  useScrollIntoViewOnOpen(criarCapituloRef, mostrarCriarCapitulo, "start");
  useScrollIntoViewOnOpen(criarSessaoRef, mostrarCriarSessao, "center");

  const capitulos = livroSelecionado?.capitulos || [];
  const capituloAberto = capitulos.find((capitulo) => String(capitulo.id) === String(capituloAbertoId)) || null;
  const sessaoAtual = editor
    ? capitulos
        .find((capitulo) => String(capitulo.id) === String(editor.capituloId))
        ?.sessoes.find((sessao) => String(sessao.id) === String(editor.sessaoId)) || null
    : null;
  const secoesMundoEscrita = useMemo(() => montarSecoesMundoEscrita(livroSelecionado), [livroSelecionado]);
  const itensMundoEscrita = useMemo(() => secoesMundoEscrita.flatMap((secao) => secao.itens), [secoesMundoEscrita]);
  const secaoMundoAtiva =
    secoesMundoEscrita.find((secao) => String(secao.id) === String(secaoMundoAbertaId)) ||
    secoesMundoEscrita.find((secao) => secao.itens.length > 0) ||
    secoesMundoEscrita[0] ||
    null;

  const personagensMencionados = useMemo(
    () => detectarMencoes(textoEditor, livroSelecionado?.personagens || [], "nome"),
    [livroSelecionado?.personagens, textoEditor],
  );
  const mundoMencionado = useMemo(
    () => detectarMencoes(textoEditor, itensMundoEscrita, "nome"),
    [itensMundoEscrita, textoEditor],
  );
  const ideiasMencionadas = useMemo(
    () => detectarMencoes(textoEditor, livroSelecionado?.ideias || [], "titulo"),
    [livroSelecionado?.ideias, textoEditor],
  );

  useEffect(() => {
    if (!editor || !sessaoAtual) {
      if (escritaDesdeRef.current) {
        escritaDesdeRef.current = "";
        atualizarStatusPublico({
          escrevendo: false,
          escrevendoDesde: "",
          escrevendoLivroTitulo: "",
          escrevendoSessaoTitulo: "",
        });
      }
      return undefined;
    }

    if (!escritaDesdeRef.current) {
      escritaDesdeRef.current = new Date().toISOString();
    }

    atualizarStatusPublico({
      online: true,
      escrevendo: true,
      escrevendoDesde: escritaDesdeRef.current,
      escrevendoLivroTitulo: livroSelecionado?.titulo || "",
      escrevendoSessaoTitulo: sessaoAtual.titulo || "",
    });

    return () => {
      atualizarStatusPublico({
        escrevendo: false,
        escrevendoDesde: "",
        escrevendoLivroTitulo: "",
        escrevendoSessaoTitulo: "",
      });
    };
  }, [atualizarStatusPublico, editor, livroSelecionado?.titulo, sessaoAtual]);

  if (!livroSelecionado) {
    return (
      <div className="page">
        <EmptyBookState titulo="A escrita precisa de um livro ativo" />
      </div>
    );
  }

  const metaPercentual = Math.min(100, Math.round((progressoAtual.palavras / Math.max(1, Number(metaLivro))) * 100));
  const palavrasEditor = contarPalavrasTexto(textoEditor);
  const capitulosAtivos = capitulos.filter((capitulo) => capitulo.ativo);
  const capitulosInativos = capitulos.length - capitulosAtivos.length;

  const salvarMetaLivro = async () => {
    const metaConvertida = Number(metaLivro) || configuracoes.metaPalavrasLivro;
    if (metaConvertida === livroSelecionado.metaPalavrasLivro) return;

    await salvarLivro(livroSelecionado.id, { metaPalavrasLivro: metaConvertida });
  };

  const criarCapitulo = async (event) => {
    event.preventDefault();

    if (!novoCapitulo.titulo.trim()) return;

    const capituloCriado = await adicionarCapitulo(livroSelecionado.id, novoCapitulo);
    setNovoCapitulo(capituloInicial);
    setMostrarCriarCapitulo(false);
    setCapituloAbertoId(capituloCriado.id);
  };

  const criarSessao = async (event) => {
    event.preventDefault();

    if (!capituloAberto || !novaSessao.titulo.trim()) return;

    await adicionarSessaoCapitulo(livroSelecionado.id, capituloAberto.id, {
      ...novaSessao,
      status: "rascunho",
      ativo: true,
    });
    setNovaSessao(sessaoInicial);
    setMostrarCriarSessao(false);
  };

  const abrirCapitulo = (capituloId) => {
    setCapituloAbertoId(capituloId);
    setMostrarCriarSessao(false);
  };

  const iniciarEscrita = (capitulo, sessao) => {
    setEditor({ capituloId: capitulo.id, sessaoId: sessao.id });
    setLeitor(null);
    setTextoEditor(sessao.texto || "");
    setTempoSegundos(0);
    setTimerAtivo(false);
    setDetalheLateral(null);
    setPersonagemConsulta(null);
    setSecaoMundoAbertaId((idAtual) => idAtual || secoesMundoEscrita.find((secao) => secao.itens.length > 0)?.id || "lugares");
  };

  const abrirLeituraSessao = (capitulo, sessao) => {
    setLeitor({
      tipo: "sessao",
      titulo: sessao.titulo,
      subtitulo: capitulo.titulo,
      texto: sessao.texto,
      meta: sessao.metaPalavras,
      palavras: sessao.palavras,
    });
    setEditor(null);
    setTimerAtivo(false);
  };

  const abrirLeituraCapitulo = (capitulo) => {
    const sessoesConcluidas = capitulo.sessoes.filter((sessao) => sessao.ativo && sessao.status === "concluido");
    const textoCapitulo = sessoesConcluidas.map((sessao) => sessao.texto).filter(Boolean).join("\n\n");

    setLeitor({
      tipo: "capitulo",
      titulo: capitulo.titulo,
      subtitulo: sessoesConcluidas.length + " sessões concluídas",
      texto: textoCapitulo || "Este capítulo ainda não tem sessões concluídas para leitura.",
      meta: capitulo.metaPalavras,
      palavras: capitulo.palavras,
    });
    setEditor(null);
    setTimerAtivo(false);
  };

  useEffect(() => {
    const capituloId = searchParams.get("lerCapitulo");
    const livroId = searchParams.get("livroId");
    if (!capituloId) return;

    if (livroId && livroSelecionado?.id && String(livroSelecionado.id) !== String(livroId)) {
      selecionarLivro(livroId);
      return;
    }

    const capitulo = capitulos.find((item) => String(item.id) === String(capituloId));
    const chave = [livroSelecionado?.id || "", capituloId].join(":");
    if (!capitulo || leituraExternaRef.current === chave) return;

    leituraExternaRef.current = chave;
    abrirLeituraCapitulo(capitulo);
  }, [capitulos, livroSelecionado?.id, searchParams, selecionarLivro]);

  const salvarTexto = async () => {
    if (!editor || !sessaoAtual) return;

    const minutosDaSessao = Math.ceil(tempoSegundos / 60);
    const minutosTotais = (Number(sessaoAtual.minutos) || 0) + minutosDaSessao;

    await salvarSessaoCapitulo(livroSelecionado.id, editor.capituloId, editor.sessaoId, {
      texto: textoEditor,
      palavras: palavrasEditor,
      minutos: minutosTotais,
      personagensMencionados: personagensMencionados.map((personagem) => personagem.id),
      mundoMencionado: mundoMencionado.map((item) => item.id),
      ideiasMencionadas: ideiasMencionadas.map((ideia) => ideia.id),
    });

    setEditor(null);
    setTextoEditor("");
    setTimerAtivo(false);
    setSalvamento({
      titulo: sessaoAtual.titulo,
      palavras: palavrasEditor,
    });
  };

  if (leitor) {
    return (
      <main className="reading-page">
        <section className="reading-book">
          <div className="reading-book-top">
            <div>
              <span className="eyebrow">{leitor.tipo === "capitulo" ? "Leitura do capítulo" : "Leitura da sessão"}</span>
              <h1>{leitor.titulo}</h1>
              <p>{leitor.subtitulo}</p>
            </div>
            <button type="button" className="button secondary" onClick={() => setLeitor(null)}>
              Voltar
            </button>
          </div>

          <article className="book-reading-surface">
            <p>{leitor.texto}</p>
          </article>

          <LimitChart atual={leitor.palavras} meta={leitor.meta} label="Progresso do texto" />
        </section>
      </main>
    );
  }

  if (editor && sessaoAtual) {
    const descricaoDetalhe = detalheLateral ? obterDescricaoItem(detalheLateral.item) : "";

    return (
      <main className="writing-focus-page">
        <section className="writing-focus-main focus-enter">
          <div className="focus-topbar">
            <div>
              <span className="eyebrow">Modo escrita</span>
              <h1>{sessaoAtual.titulo}</h1>
            </div>

            <div className="focus-counters">
              <span>{formatarTempo(tempoSegundos)}</span>
              <strong>{palavrasEditor} palavras</strong>
              <small>Meta: {sessaoAtual.metaPalavras} palavras</small>
              <button type="button" className="timer-button" onClick={() => setTimerAtivo((valor) => !valor)}>
                {timerAtivo ? "Pausar" : tempoSegundos > 0 ? "Continuar" : "Iniciar"}
              </button>
            </div>
          </div>

          <div className="writing-editor-stack focus-text-editor">
            <PlainWritingEditor
              texto={textoEditor}
              placeholder="Escreva a cena aqui. O texto fica limpo, sem destaques automáticos."
              onChange={(proximoTexto) => {
                setTextoEditor(proximoTexto);
                if (!timerAtivo) setTimerAtivo(true);
              }}
            />
          </div>
        </section>

        <aside className="writing-companion redesigned">
          <div className="companion-scroll">
            <section className="companion-card session-companion-card">
              <span className="eyebrow">Sessão aberta</span>
              <strong>{sessaoAtual.titulo}</strong>
              <p>{sessaoAtual.resumo || "Sem resumo registrado para esta sessão."}</p>
              <div className="companion-metrics">
                <span>{palavrasEditor} palavras</span>
                <span>{formatarTempo(tempoSegundos)}</span>
              </div>
            </section>

            <section className="companion-card">
              <div className="companion-card-header">
                <div>
                  <span className="eyebrow">Mencionados agora</span>
                  <h2>Personagens</h2>
                </div>
                <strong>{personagensMencionados.length}</strong>
              </div>

              <div className="companion-list clean-list">
                {personagensMencionados.map((personagem) => (
                  <button
                    key={personagem.id}
                    type="button"
                    className="companion-row-button"
                    onClick={() => {
                      setDetalheLateral(null);
                      setPersonagemConsulta(personagem);
                    }}
                  >
                    <span style={{ background: personagem.cor }} />
                    <strong>{personagem.nome}</strong>
                    <small>{personagem.papel || "Personagem"}</small>
                  </button>
                ))}
                {personagensMencionados.length === 0 && <small className="companion-empty">Nenhum personagem citado ainda.</small>}
              </div>
            </section>

            <section className="companion-card world-companion-card">
              <div className="companion-card-header">
                <div>
                  <span className="eyebrow">Mundo</span>
                  <h2>Consulta rápida</h2>
                </div>
                <strong>{itensMundoEscrita.length}</strong>
              </div>

              <div className="world-companion-tabs">
                {secoesMundoEscrita.map((secao) => (
                  <button
                    key={secao.id}
                    type="button"
                    className={String(secaoMundoAtiva?.id || "") === String(secao.id) ? "active" : ""}
                    onClick={() => setSecaoMundoAbertaId(secao.id)}
                  >
                    <span>{secao.nome}</span>
                    <strong>{secao.itens.length}</strong>
                  </button>
                ))}
              </div>

              <div className="world-companion-items">
                {(secaoMundoAtiva?.itens || []).map((item) => (
                  <button
                    key={item.secaoId + "-" + item.id}
                    type="button"
                    className="world-companion-item"
                    onClick={() => setDetalheLateral({ tipo: item.secaoNome || item.tipo || "Mundo", item })}
                  >
                    <strong>{item.nome}</strong>
                    <small>{resumirTexto(obterDescricaoItem(item), 96)}</small>
                  </button>
                ))}
                {secaoMundoAtiva && secaoMundoAtiva.itens.length === 0 && (
                  <small className="companion-empty">Nenhum item nesta seção.</small>
                )}
              </div>
            </section>

            <section className="companion-card">
              <div className="companion-card-header">
                <div>
                  <span className="eyebrow">Banco de ideias</span>
                  <h2>Ideias recentes</h2>
                </div>
                <strong>{livroSelecionado.ideias.length}</strong>
              </div>

              <div className="companion-list clean-list">
                {livroSelecionado.ideias.slice(0, 8).map((ideia) => (
                  <button
                    key={ideia.id}
                    type="button"
                    className="companion-row-button idea-row"
                    onClick={() => {
                      setDetalheLateral(null);
                      setPersonagemConsulta(null);
                      setIdeiaConsulta(ideia);
                    }}
                  >
                    <span />
                    <strong>{ideia.titulo}</strong>
                    <small>{ideia.tipo || "Ideia"}</small>
                  </button>
                ))}
                {livroSelecionado.ideias.length === 0 && <small className="companion-empty">Nenhuma ideia cadastrada.</small>}
              </div>
            </section>

            {detalheLateral && (
              <section className="companion-detail detail-card">
                <span>{detalheLateral.tipo}</span>
                <strong>{detalheLateral.item.nome || detalheLateral.item.titulo}</strong>
                <p>{descricaoDetalhe}</p>
                {detalheLateral.item.conflito && <small>Conflito: {detalheLateral.item.conflito}</small>}
                {detalheLateral.item.conexoes && <small>Conexões: {detalheLateral.item.conexoes}</small>}
              </section>
            )}
          </div>

          <div className="companion-save-actions">
            <button type="button" className="button secondary focus-exit-button" onClick={() => setEditor(null)}>
              Sair sem salvar
            </button>
            <button type="button" className="button primary focus-save-button" onClick={salvarTexto}>
              Sair e salvar
            </button>
          </div>
        </aside>

        {personagemConsulta && (
          <div className="writing-character-backdrop" role="dialog" aria-modal="true" onMouseDown={() => setPersonagemConsulta(null)}>
            <article
              className="writing-character-dialog"
              style={{ "--character-color": personagemConsulta.cor || "#8f1d43" }}
              onMouseDown={(event) => event.stopPropagation()}
            >
              <header>
                <div>
                  <span className="eyebrow">Personagem citado</span>
                  <h2>{personagemConsulta.nome}</h2>
                  <p>{personagemConsulta.papel || "Personagem"}</p>
                </div>
                <button type="button" className="button secondary" onClick={() => setPersonagemConsulta(null)}>
                  Fechar
                </button>
              </header>

              <div className="writing-character-body">
                <div className="writing-character-photo">
                  {personagemConsulta.fotoUrl ? <img src={personagemConsulta.fotoUrl} alt="" /> : <span>{personagemConsulta.nome?.slice(0, 1) || "P"}</span>}
                </div>

                <div className="writing-character-facts">
                  <InfoLine label="Desejo" value={personagemConsulta.desejo} />
                  <InfoLine label="Medo" value={personagemConsulta.medo} />
                  <InfoLine label="Segredo" value={personagemConsulta.segredo} />
                  <InfoLine label="Arco" value={personagemConsulta.arco} />
                  <InfoLine label="Relações" value={personagemConsulta.relacoes} />
                  <InfoLine label="Aparição" value={personagemConsulta.aparicao} />
                </div>
              </div>
            </article>
          </div>
        )}

        {ideiaConsulta && (
          <div className="writing-character-backdrop idea-consultation-backdrop" role="dialog" aria-modal="true" onMouseDown={() => setIdeiaConsulta(null)}>
            <article
              className="writing-character-dialog writing-idea-dialog"
              style={{ "--character-color": ideiaConsulta.cor || "#b9853f" }}
              onMouseDown={(event) => event.stopPropagation()}
            >
              <header>
                <div>
                  <span className="eyebrow">Ideia de apoio</span>
                  <h2>{ideiaConsulta.titulo || "Ideia sem título"}</h2>
                  <p>{ideiaConsulta.tipo || "Ideia"}</p>
                </div>
                <button type="button" className="button secondary" onClick={() => setIdeiaConsulta(null)}>
                  Fechar
                </button>
              </header>

              <div className="writing-idea-body">
                <InfoLine label="Anotação" value={ideiaConsulta.descricao} />
                <InfoLine label="Como pode entrar na história" value={ideiaConsulta.cenaPossivel} />
                <InfoLine label="Contexto ou pergunta" value={ideiaConsulta.contexto} />
                <InfoLine label="Estado" value={rotuloTextoIdeia(ideiaConsulta.estado)} />
                <InfoLine label="Prioridade" value={rotuloTextoIdeia(ideiaConsulta.prioridade)} />
                <InfoLine label="Etiquetas" value={ideiaConsulta.etiquetas} />
              </div>
            </article>
          </div>
        )}
      </main>
    );
  }

  return (
    <div className="page writing-page">
      <header className="page-header">
        <div>
          <span className="eyebrow">Escrita</span>
          <h1>Capítulos e sessões</h1>
          <p>Organize a linha do tempo, defina limites de palavras e escreva em modo focado.</p>
        </div>
      </header>

      {salvamento && (
        <section className="save-celebration">
          <span>✓</span>
          <div>
            <strong>Sessão salva</strong>
            <p>{salvamento.titulo} · {salvamento.palavras} palavras guardadas</p>
          </div>
        </section>
      )}

      <section className="writing-overview refined writing-stats-grid">
        <article className="writing-stat-card goal-stat-card">
          <div className="stat-card-heading">
            <span>Meta do livro</span>
            <strong>{metaPercentual}%</strong>
          </div>
          <label className="goal-inline-input">
            <input
              type="number"
              min="0"
              value={metaLivro}
              onChange={(event) => setMetaLivro(event.target.value)}
              onBlur={salvarMetaLivro}
            />
            <small>palavras</small>
          </label>
          <div className="progress-line">
            <span style={{ width: metaPercentual + "%" }} />
          </div>
          <p>{progressoAtual.palavras.toLocaleString("pt-BR")} de {Number(metaLivro).toLocaleString("pt-BR")} palavras ativas</p>
        </article>

        <article className="writing-stat-card">
          <div className="stat-card-heading">
            <span>Capítulos</span>
            <strong>{progressoAtual.capitulosProntos}/{progressoAtual.capitulos}</strong>
          </div>
          <p>{capitulosAtivos.length} ativo(s) · {capitulosInativos} pausado(s)</p>
          <div className="stat-mini-track">
            <span style={{ width: progressoAtual.percentualCapitulos + "%" }} />
          </div>
        </article>

        <article className="writing-stat-card">
          <div className="stat-card-heading">
            <span>Horas de escrita</span>
            <strong>{formatarHoras(progressoAtual.minutos)}</strong>
          </div>
          <p>{progressoAtual.sessoes} sessão(ões) ativa(s) compondo o livro</p>
          <div className="stat-soft-mark">{progressoAtual.palavras.toLocaleString("pt-BR")} palavras</div>
        </article>
      </section>

      <section className="panel chapter-shelf-panel" data-tour="escrita-lista">
        <div className="panel-header">
          <div>
            <span className="eyebrow">Estante do manuscrito</span>
            <h2>{capitulos.length} capítulos</h2>
          </div>
        </div>

        <div className="chapter-shelf">
          {capitulos.map((capitulo, indice) => {
            const percentualCapitulo = Math.min(100, Math.round((capitulo.palavras / Math.max(1, capitulo.metaPalavras)) * 100));

            return (
              <article
                className={
                  "chapter-book " +
                  (capituloAberto?.id === capitulo.id ? "active " : "") +
                  (capitulo.status === "concluido" ? "completed " : "") +
                  (!capitulo.ativo ? "inactive" : "")
                }
                key={capitulo.id}
                style={{ "--chapter-color": capitulo.cor }}
              >
                <button type="button" className="chapter-book-main" onClick={() => abrirCapitulo(capitulo.id)}>
                  <span>Cap. {indice + 1}</span>
                  <strong>{capitulo.titulo}</strong>
                  <small>{capitulo.ativo ? percentualCapitulo + "% da meta" : "Pausado"}</small>
                  {capitulo.status === "concluido" && <em>Concluído</em>}
                  <div className="chapter-book-hover">
                    {capitulo.palavras.toLocaleString("pt-BR")} palavras · {formatarHoras(capitulo.minutos)}
                    <br />
                    Atualizado: {formatarData(capitulo.atualizadoEm)}
                  </div>
                </button>
                <div className="order-controls">
                  <button type="button" onClick={() => reordenarCapitulo(livroSelecionado.id, capitulo.id, -1)} disabled={indice === 0}>
                    ↑
                  </button>
                  <button type="button" onClick={() => reordenarCapitulo(livroSelecionado.id, capitulo.id, 1)} disabled={indice === capitulos.length - 1}>
                    ↓
                  </button>
                </div>
              </article>
            );
          })}

          {capitulos.length === 0 && (
            <div className="inline-empty">
              <strong>Nenhum capítulo criado</strong>
              <span>Crie o primeiro capítulo para abrir o espaço de escrita.</span>
            </div>
          )}
        </div>

        <button
          type="button"
          className="button primary shelf-add-button"
          data-tour="escrita-capitulo"
          onClick={() => {
            setMostrarCriarCapitulo((valor) => {
              const vaiAbrir = !valor;
              if (vaiAbrir) {
                setCapituloAbertoId("");
                setMostrarCriarSessao(false);
              }
              return vaiAbrir;
            });
          }}
        >
          {mostrarCriarCapitulo ? "Fechar criação" : "Criar novo capítulo"}
        </button>
      </section>

      {mostrarCriarCapitulo && (
        <section className="panel chapter-create-panel" ref={criarCapituloRef}>
          <div className="panel-header">
            <div>
              <span className="eyebrow">Novo capítulo</span>
              <h2>Definir bloco da história</h2>
            </div>
          </div>

          <form className="form-stack" onSubmit={criarCapitulo}>
            <div className="form-grid three">
              <label className="field-group">
                <span>Nome</span>
                <input value={novoCapitulo.titulo} onChange={(event) => setNovoCapitulo({ ...novoCapitulo, titulo: event.target.value })} />
              </label>
              <label className="field-group">
                <span>Cor do capítulo</span>
                <input type="color" value={novoCapitulo.cor} onChange={(event) => setNovoCapitulo({ ...novoCapitulo, cor: event.target.value })} />
              </label>
              <label className="field-group">
                <span>Limite de palavras</span>
                <input
                  type="number"
                  min="0"
                  value={novoCapitulo.metaPalavras}
                  onChange={(event) => setNovoCapitulo({ ...novoCapitulo, metaPalavras: event.target.value })}
                />
              </label>
            </div>
            <label className="field-group">
              <span>Resumo opcional</span>
              <textarea value={novoCapitulo.resumo} onChange={(event) => setNovoCapitulo({ ...novoCapitulo, resumo: event.target.value })} rows={4} />
            </label>
            <button className="button primary" type="submit" disabled={!novoCapitulo.titulo.trim()}>
              Criar capítulo
            </button>
          </form>
        </section>
      )}

      {capituloAberto && (
        <section className="chapter-workspace" ref={capituloAbertoRef}>
          <article
            className={"panel chapter-open-panel chapter-open-animated " + (capituloAberto.status === "concluido" ? "completed " : "") + (!capituloAberto.ativo ? "inactive" : "")}
            style={{ "--chapter-color": capituloAberto.cor }}
          >
            <div className="panel-header">
              <div>
                <span className="eyebrow">Capítulo aberto</span>
                <h2>{capituloAberto.titulo}</h2>
                <p>{capituloAberto.resumo || "Sem resumo definido."}</p>
                <small className="last-update">Atualizado: {formatarData(capituloAberto.atualizadoEm)}</small>
              </div>
              <div className="chapter-open-actions">
                <button type="button" className="button secondary" onClick={() => abrirLeituraCapitulo(capituloAberto)}>
                  Ler capítulo
                </button>
                <button
                  type="button"
                  className={"button chapter-status-button " + (capituloAberto.status === "concluido" ? "done" : "")}
                  onClick={() =>
                    salvarCapitulo(livroSelecionado.id, capituloAberto.id, {
                      status: capituloAberto.status === "concluido" ? "rascunho" : "concluido",
                    })
                  }
                >
                  {capituloAberto.status === "concluido" ? "Marcar rascunho" : "Marcar concluído"}
                </button>
                <button type="button" className="button danger" onClick={() => removerCapitulo(livroSelecionado.id, capituloAberto.id)}>
                  Remover capítulo
                </button>
              </div>
            </div>

            <div className="chapter-state-strip">
              <ToggleSwitch
                checked={capituloAberto.ativo}
                label="Capítulo ativo"
                offLabel="Capítulo pausado"
                onChange={(ativo) => salvarCapitulo(livroSelecionado.id, capituloAberto.id, { ativo })}
              />
              <span>{capituloAberto.ativo ? "Conta para a meta do livro" : "Fora da meta e da contagem ativa"}</span>
            </div>

            <LimitChart atual={capituloAberto.palavras} meta={capituloAberto.metaPalavras} label="Limite do capítulo" />

            <section className="session-inside-chapter">
              <div className="panel-header compact-header">
                <div>
                  <span className="eyebrow">Sessões internas</span>
                  <h2>Linha do tempo do capítulo</h2>
                </div>
                <button type="button" className="button primary" onClick={() => setMostrarCriarSessao((valor) => !valor)}>
                  {mostrarCriarSessao ? "Fechar" : "Criar sessão"}
                </button>
              </div>

              {mostrarCriarSessao && (
                <form className="session-create-strip" onSubmit={criarSessao} ref={criarSessaoRef}>
                  <label className="field-group">
                    <span>Nome</span>
                    <input value={novaSessao.titulo} onChange={(event) => setNovaSessao({ ...novaSessao, titulo: event.target.value })} />
                  </label>
                  <label className="field-group">
                    <span>Resumo opcional</span>
                    <input value={novaSessao.resumo} onChange={(event) => setNovaSessao({ ...novaSessao, resumo: event.target.value })} />
                  </label>
                  <label className="field-group">
                    <span>Limite</span>
                    <input
                      type="number"
                      min="0"
                      value={novaSessao.metaPalavras}
                      onChange={(event) => setNovaSessao({ ...novaSessao, metaPalavras: event.target.value })}
                    />
                  </label>
                  <button className="button primary" type="submit" disabled={!novaSessao.titulo.trim()}>
                    Criar
                  </button>
                </form>
              )}

              <div className="session-timeline session-shelf">
                {capituloAberto.sessoes.map((sessao, indice) => (
                  <EditableSessionCard
                    key={sessao.id}
                    sessao={sessao}
                    indice={indice}
                    total={capituloAberto.sessoes.length}
                    capitulo={capituloAberto}
                    livroId={livroSelecionado.id}
                    onSave={(alteracoes) =>
                      salvarSessaoCapitulo(livroSelecionado.id, capituloAberto.id, sessao.id, alteracoes, { silencioso: true })
                    }
                    onMove={(direcao) => reordenarSessaoCapitulo(livroSelecionado.id, capituloAberto.id, sessao.id, direcao)}
                    onWrite={() => iniciarEscrita(capituloAberto, sessao)}
                    onRead={() => abrirLeituraSessao(capituloAberto, sessao)}
                    onRemove={() => removerSessaoCapitulo(livroSelecionado.id, capituloAberto.id, sessao.id)}
                  />
                ))}

                {capituloAberto.sessoes.length === 0 && (
                  <div className="inline-empty">
                    <strong>Nenhuma sessão neste capítulo</strong>
                    <span>Crie sessões para dividir o capítulo em cenas, blocos ou subcapítulos.</span>
                  </div>
                )}
              </div>
            </section>
          </article>
        </section>
      )}
    </div>
  );
}

function EditableSessionCard({ sessao, indice, total, onSave, onMove, onWrite, onRead, onRemove }) {
  const [aberta, setAberta] = useState(false);
  const [estadoSalvar, setEstadoSalvar] = useState("salvo");
  const cardRef = useRef(null);
  const [edicao, setEdicao] = useState({
    titulo: sessao.titulo,
    resumo: sessao.resumo,
    metaPalavras: sessao.metaPalavras,
    status: sessao.status,
    ativo: sessao.ativo,
  });
  const ultimoSnapshot = useRef("");

  useEffect(() => {
    const proximaEdicao = {
      titulo: sessao.titulo,
      resumo: sessao.resumo,
      metaPalavras: sessao.metaPalavras,
      status: sessao.status,
      ativo: sessao.ativo,
    };

    setEdicao(proximaEdicao);
    ultimoSnapshot.current = montarSnapshotSessao(proximaEdicao);
    setEstadoSalvar("salvo");
  }, [sessao]);

  useEffect(() => {
    const snapshotAtual = montarSnapshotSessao(edicao);

    if (!ultimoSnapshot.current) {
      ultimoSnapshot.current = snapshotAtual;
      return undefined;
    }

    if (snapshotAtual === ultimoSnapshot.current) {
      return undefined;
    }

    setEstadoSalvar("salvando");

    const timeout = window.setTimeout(() => {
      ultimoSnapshot.current = snapshotAtual;
      Promise.resolve(onSave(normalizarEdicaoSessao(edicao))).then(() => setEstadoSalvar("salvo"));
    }, 650);

    return () => window.clearTimeout(timeout);
  }, [edicao, onSave]);

  useEffect(() => {
    if (!aberta) return;

    window.setTimeout(() => {
      cardRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
    }, 80);
  }, [aberta]);

  const statusAtual = statusSessao.find((status) => status.id === edicao.status) || statusSessao[0];

  return (
    <article ref={cardRef} className={"session-shelf-card " + (!edicao.ativo ? "disabled " : "") + edicao.status + (aberta ? " expanded" : "")}>
      <button type="button" className="session-shelf-summary" onClick={() => setAberta((valor) => !valor)}>
        <span className="session-number">Sessão {indice + 1}</span>
        <div>
          <strong>{edicao.titulo || "Sessão sem título"}</strong>
          <small>
            {Number(sessao.palavras || 0).toLocaleString("pt-BR")} palavras · {formatarHoras(sessao.minutos)} · Atualizada:{" "}
            {formatarData(sessao.atualizadoEm)}
          </small>
        </div>
        <strong className={"status-pill " + edicao.status}>{statusAtual.label}</strong>
        <span className="session-expand">{aberta ? "Recolher" : "Abrir"}</span>
      </button>

      {aberta && (
        <div className="session-shelf-details">
          <div className="session-edit-grid">
            <label className="field-group compact">
              <span>Nome</span>
              <input value={edicao.titulo} onChange={(event) => setEdicao({ ...edicao, titulo: event.target.value })} />
            </label>
            <label className="field-group compact">
              <span>Status</span>
              <select value={edicao.status} onChange={(event) => setEdicao({ ...edicao, status: event.target.value })}>
                {statusSessao.map((status) => (
                  <option key={status.id} value={status.id}>
                    {status.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="field-group compact">
              <span>Limite</span>
              <input type="number" min="0" value={edicao.metaPalavras} onChange={(event) => setEdicao({ ...edicao, metaPalavras: event.target.value })} />
            </label>
          </div>

          <label className="field-group compact">
            <span>Resumo</span>
            <input value={edicao.resumo} onChange={(event) => setEdicao({ ...edicao, resumo: event.target.value })} />
          </label>

          <div className="session-state-row">
            <ToggleSwitch
              checked={edicao.ativo}
              label="Sessão ativa"
              offLabel="Sessão desativada"
              onChange={(ativo) => setEdicao({ ...edicao, ativo })}
            />
            <small>
              {edicao.status === "concluido" && edicao.ativo
                ? "Entra no capítulo"
                : "Fica fora da leitura final do capítulo"}
            </small>
            <small className="autosave-indicator">{estadoSalvar === "salvando" ? "Salvando..." : "Salvo automaticamente"}</small>
          </div>

          <LimitChart atual={sessao.palavras} meta={edicao.metaPalavras} label="Meta da sessão" compacto />

          <div className="session-action-board">
            <div className="session-order-panel">
              <span>Ordem</span>
              <div className="session-order-actions">
                <button type="button" onClick={() => onMove(-1)} disabled={indice === 0}>
                  ↑
                </button>
                <button type="button" onClick={() => onMove(1)} disabled={indice === total - 1}>
                  ↓
                </button>
              </div>
            </div>

            <div className="session-primary-actions">
              <button type="button" className="button secondary read-session-button" onClick={onRead}>
                Somente ler
              </button>
              <button type="button" className="button primary start-writing-button" onClick={onWrite}>
                Começar a escrever
              </button>
              <button type="button" className="button danger subtle-danger" onClick={onRemove}>
                Remover
              </button>
            </div>
          </div>
        </div>
      )}
    </article>
  );
}

function LimitChart({ atual, meta, label, compacto = false }) {
  const percentual = Math.min(100, Math.round((Number(atual) / Math.max(1, Number(meta))) * 100));

  return (
    <div className={"limit-chart " + (compacto ? "compact" : "")}>
      <div>
        <span>{label}</span>
        <strong>{percentual}%</strong>
      </div>
      <div className="progress-line">
        <span style={{ width: percentual + "%" }} />
      </div>
      <small>{Number(atual).toLocaleString("pt-BR")} de {Number(meta).toLocaleString("pt-BR")} palavras</small>
    </div>
  );
}

function ToggleSwitch({ checked, label, offLabel, onChange }) {
  return (
    <button type="button" className={"toggle-switch " + (checked ? "active" : "")} onClick={() => onChange(!checked)}>
      <span />
      <strong>{checked ? label : offLabel}</strong>
    </button>
  );
}

function InfoLine({ label, value }) {
  return (
    <section>
      <span>{label}</span>
      <p>{String(value || "Ainda não preenchido.")}</p>
    </section>
  );
}

function rotuloTextoIdeia(valor = "") {
  const mapa = {
    bruta: "Bruta",
    desenvolver: "Desenvolver",
    usar: "Usar",
    arquivada: "Arquivada",
    baixa: "Baixa",
    media: "Média",
    alta: "Alta",
  };

  return mapa[valor] || formatarNomeSecao(valor);
}

function PlainWritingEditor({ texto, placeholder, onChange }) {
  const textareaRef = useRef(null);

  useEffect(() => {
    textareaRef.current?.focus();
  }, []);

  const inserirNoCursor = (valor) => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const inicio = textarea.selectionStart;
    const fim = textarea.selectionEnd;
    const proximoTexto = texto.slice(0, inicio) + valor + texto.slice(fim);

    onChange(proximoTexto);

    window.requestAnimationFrame(() => {
      textarea.selectionStart = inicio + valor.length;
      textarea.selectionEnd = inicio + valor.length;
    });
  };

  return (
    <textarea
      ref={textareaRef}
      className="plain-writing-editor"
      value={texto}
      placeholder={placeholder}
      aria-label="Campo de escrita"
      spellCheck={true}
      onChange={(event) => onChange(event.target.value)}
      onKeyDown={(event) => {
        if (event.key === "Tab") {
          event.preventDefault();
          inserirNoCursor("    ");
        }
      }}
    />
  );
}

function detectarMencoes(texto, itens, campo) {
  return itens.filter((item) => {
    const valor = item[campo];
    return valor && contemTermoInteiro(texto, String(valor));
  });
}

function escaparRegex(valor) {
  return String(valor).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function contemTermoInteiro(texto, termo) {
  const termoLimpo = String(termo || "").trim();
  if (!termoLimpo) return false;

  const regex = new RegExp("(^|[^\\p{L}\\p{N}_])" + escaparRegex(termoLimpo) + "(?=$|[^\\p{L}\\p{N}_])", "iu");
  return regex.test(String(texto || ""));
}

function montarSnapshotSessao(edicao) {
  return JSON.stringify(normalizarEdicaoSessao(edicao));
}

function normalizarEdicaoSessao(edicao) {
  return {
    titulo: edicao.titulo,
    resumo: edicao.resumo,
    metaPalavras: Number(edicao.metaPalavras) || 0,
    status: edicao.status,
    ativo: Boolean(edicao.ativo),
  };
}

function montarSecoesMundoEscrita(livro) {
  if (!livro) return [];

  const mundo = livro.mundo || {};
  const secoesPersonalizadas = (livro.secoesMundo || []).filter((secao) => !secoesFixasMundoEscrita.some((fixa) => fixa.id === secao.id));
  const secoesConhecidas = [...secoesFixasMundoEscrita, ...secoesPersonalizadas];
  const idsConhecidos = new Set(secoesConhecidas.map((secao) => secao.id));
  const secoesExtras = Object.keys(mundo)
    .filter((secaoId) => !idsConhecidos.has(secaoId))
    .map((secaoId) => ({ id: secaoId, nome: formatarNomeSecao(secaoId) }));

  return [...secoesConhecidas, ...secoesExtras].map((secao) => ({
    ...secao,
    itens: (mundo[secao.id] || []).map((item) => ({
      ...item,
      secaoId: secao.id,
      secaoNome: secao.nome,
      tipo: secao.nome,
    })),
  }));
}

function formatarNomeSecao(secaoId) {
  return String(secaoId || "Seção")
    .replace(/([A-Z])/g, " $1")
    .replace(/[-_]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/^./, (letra) => letra.toUpperCase());
}

function obterDescricaoItem(item = {}) {
  if (item.descricao) return item.descricao;
  if (item.resumo) return item.resumo;
  if (item.conflito) return item.conflito;
  if (item.categoria) return item.categoria;
  if (item.desejo) return item.desejo;
  if (item.arco) return item.arco;
  if (Array.isArray(item.blocos) && item.blocos.length > 0) {
    return item.blocos[0].descricao || item.blocos[0].titulo || "Linha do tempo sem descrição.";
  }
  if (Array.isArray(item.ramificacoes) && item.ramificacoes.length > 0) {
    return item.ramificacoes.length + " ramificação(ões) registrada(s).";
  }

  return "Sem detalhes registrados.";
}

function resumirTexto(texto, limite = 90) {
  const valor = String(texto || "").trim();
  if (valor.length <= limite) return valor;
  return valor.slice(0, limite - 3).trimEnd() + "...";
}

function formatarTempo(segundos) {
  const horas = Math.floor(segundos / 3600);
  const minutos = Math.floor((segundos % 3600) / 60);
  const segundosRestantes = segundos % 60;

  return [horas, minutos, segundosRestantes].map((parte) => String(parte).padStart(2, "0")).join(":");
}

function formatarHoras(minutos) {
  const totalMinutos = Number(minutos || 0);
  if (totalMinutos <= 0) return "0h";
  if (totalMinutos < 60) return totalMinutos + " min";

  const horas = totalMinutos / 60;
  return horas.toFixed(horas >= 10 ? 0 : 1) + "h";
}

function formatarData(valor) {
  if (!valor) return "sem data";

  const data = typeof valor?.toDate === "function" ? valor.toDate() : new Date(valor);
  if (Number.isNaN(data.getTime())) return "sem data";

  return data.toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}
