import { useEffect, useMemo, useRef, useState } from "react";

import EmptyBookState from "../components/EmptyBookState";
import ImageProcessingOverlay from "../components/ImageProcessingOverlay";
import { useFeedback } from "../context/FeedbackContext";
import { useStoryData } from "../context/StoryDataContext";
import { criarBlocoLinhaTempo, criarMapaInterno, criarRamificacaoLugar, criarSubBlocoLinhaTempo } from "../data/storyData";
import { useImageProcessor } from "../hooks/useImageProcessor";
import { useScrollIntoViewOnOpen } from "../hooks/useScrollIntoViewOnOpen";

const secoesMundoBase = [
  { id: "lugares", nome: "Lugares", categoria: "Região, cidade, sala ou reino", fixa: true },
  { id: "faccoes", nome: "Facções", categoria: "Grupo, família, culto ou instituição", fixa: true },
  { id: "regras", nome: "Regras", categoria: "Lei, costume, tecnologia ou limite", fixa: true },
  { id: "mapas", nome: "Mapas", categoria: "Cartas, rotas, territórios e fronteiras", fixa: true },
];
const secaoLinhaTempo = { id: "linhaDoTempo", nome: "Linha do Tempo", categoria: "Marco histórico, trauma ou virada", fixa: true };
const idsSecoesFixas = new Set(["lugares", "faccoes", "regras", "mapas", "linhaDoTempo"]);

const nomesTipo = {
  lugares: "Lugar",
  faccoes: "Facção",
  regras: "Regra",
  mapas: "Mapa",
  linhaDoTempo: "Linha",
};

const coresMundo = ["#8f1d43", "#315a8c", "#427066", "#b36b2c", "#604285", "#9d3d56", "#2f6f86", "#7c4b37"];
const sortearCorMundo = () => coresMundo[Math.floor(Math.random() * coresMundo.length)];

const criarItemInicial = () => ({
  nome: "",
  categoria: "",
  descricao: "",
  costumes: "",
  conflito: "",
  conexoes: "",
  cor: sortearCorMundo(),
  imagemUrl: "",
  blocos: [],
  ramificacoes: [],
  mapasInternos: [],
  personagensIds: [],
  vinculosMundoIds: [],
});

const criarSecaoInicial = () => ({
  id: "",
  nome: "",
  categoria: "",
});

function textoBotaoCriarMundo(secaoAtiva, secao) {
  if (secaoAtiva === "linhaDoTempo") return "Criar linha do tempo";
  return "Criar " + (nomesTipo[secaoAtiva] || secao?.nome || "item");
}

function agruparEmLinhas(lista, tamanho = 3) {
  const linhas = [];

  for (let indice = 0; indice < lista.length; indice += tamanho) {
    linhas.push(lista.slice(indice, indice + tamanho));
  }

  return linhas;
}

function imagemEhLink(valor = "") {
  return /^https?:\/\//i.test(String(valor || "").trim());
}

function imagemEhDataUrl(valor = "") {
  return /^data:image\//i.test(String(valor || "").trim());
}

function imagemPodeSerMostrada(valor = "") {
  return imagemEhLink(valor) || imagemEhDataUrl(valor);
}

function normalizarLinkImagemMundo(valor = "") {
  const link = String(valor || "").trim();
  if (!link) return "";

  try {
    const url = new URL(link);
    return url.protocol === "http:" || url.protocol === "https:" ? link : "";
  } catch {
    return imagemEhLink(link) ? link : "";
  }
}

export default function Mundo() {
  const {
    livroSelecionado,
    salvarLivro,
    adicionarItemMundo,
    salvarItemMundo,
    removerItemMundo,
  } = useStoryData();
  const [secaoAtiva, setSecaoAtiva] = useState("lugares");
  const [novoItem, setNovoItem] = useState(criarItemInicial);
  const [nomeMundo, setNomeMundo] = useState("");
  const [criadorItemAberto, setCriadorItemAberto] = useState(false);
  const [secoesMobileAbertas, setSecoesMobileAbertas] = useState(false);
  const [editorSecaoAberto, setEditorSecaoAberto] = useState(false);
  const [secaoEmEdicao, setSecaoEmEdicao] = useState(criarSecaoInicial);
  const [carregamentoCriacao, setCarregamentoCriacao] = useState(null);
  const [itemAbertoId, setItemAbertoId] = useState("");
  const [buscaMundo, setBuscaMundo] = useState("");
  const temporizadorCriacaoRef = useRef(null);
  const editorSecaoRef = useRef(null);
  const { processandoImagem, processarImagem } = useImageProcessor();
  const { mostrarFeedback, pedirConfirmacao } = useFeedback();

  useEffect(() => {
    if (!livroSelecionado) return;

    setNomeMundo(livroSelecionado.nomeMundo || "Mundo de " + livroSelecionado.titulo);
    setNovoItem(criarItemInicial());
  }, [livroSelecionado]);

  useEffect(() => {
    setNovoItem(criarItemInicial());
    setItemAbertoId("");
    setCriadorItemAberto(false);
    setSecoesMobileAbertas(false);
  }, [secaoAtiva]);

  useEffect(() => {
    if (!criadorItemAberto && !editorSecaoAberto) return undefined;

    const fecharComEsc = (event) => {
      if (event.key === "Escape") {
        setCriadorItemAberto(false);
        setEditorSecaoAberto(false);
      }
    };

    window.addEventListener("keydown", fecharComEsc);
    return () => window.removeEventListener("keydown", fecharComEsc);
  }, [criadorItemAberto, editorSecaoAberto]);

  const personagens = livroSelecionado?.personagens || [];
  const secoesMundo = useMemo(() => montarSecoesMundo(livroSelecionado), [livroSelecionado]);
  const totalItens = useMemo(() => {
    if (!livroSelecionado) return 0;

    return secoesMundo.reduce((total, secao) => total + (livroSelecionado.mundo[secao.id] || []).length, 0);
  }, [livroSelecionado, secoesMundo]);

  useEffect(() => {
    if (!livroSelecionado) return;
    if (secoesMundo.some((secao) => secao.id === secaoAtiva)) return;

    setSecaoAtiva(secoesMundo[0]?.id || "lugares");
  }, [livroSelecionado, secaoAtiva, secoesMundo]);

  useEffect(() => () => limparTemporizadorCriacao(temporizadorCriacaoRef), []);
  useScrollIntoViewOnOpen(editorSecaoRef, editorSecaoAberto, "center");

  const secao = secoesMundo.find((item) => item.id === secaoAtiva) || secoesMundo[0] || { id: secaoAtiva, nome: "Mundo", categoria: "Itens do mundo" };
  const secaoEhFixa = idsSecoesFixas.has(secao.id);
  const alvosMundo = montarAlvosMundo(livroSelecionado, secoesMundo);
  const novoItemTemConteudo = Boolean(livroSelecionado) && itemMundoTemConteudo(novoItem);
  const itens = (livroSelecionado?.mundo?.[secaoAtiva] || []).map((item) =>
    relacionarLugarComPersonagens(secaoAtiva, item, personagens),
  );
  const itensFiltrados = itens.filter((item) => {
    const textoBusca = [
      item.nome,
      item.categoria,
      item.descricao,
      item.costumes,
      item.conflito,
      item.conexoes,
      ...(item.ramificacoes || []).map((ramo) => ramo.nome || ramo.descricao),
    ]
      .join(" ")
      .toLowerCase();

    return !buscaMundo.trim() || textoBusca.includes(buscaMundo.trim().toLowerCase());
  });
  const linhasItens = agruparEmLinhas(itensFiltrados);

  useUnsavedChangesWarning(novoItemTemConteudo, "Você tem um item do mundo em criação sem salvar.");

  if (!livroSelecionado) {
    return (
      <div className="page">
        <EmptyBookState titulo="O mundo precisa de um livro ativo" />
      </div>
    );
  }

  const salvarNomeMundo = async () => {
    const nomeFinal = nomeMundo.trim() || "Mundo de " + livroSelecionado.titulo;
    if (nomeFinal === livroSelecionado.nomeMundo) return;

    setNomeMundo(nomeFinal);
    await salvarLivro(livroSelecionado.id, { nomeMundo: nomeFinal }, { silencioso: true });
  };

  const trocarSecaoAtiva = async (secaoId) => {
    if (secaoId === secaoAtiva) return;

    if (novoItemTemConteudo) {
      const deveTrocar = await pedirConfirmacao({
        titulo: "Trocar de seção?",
        mensagem: "Você tem um item em criação sem salvar. Deseja trocar de seção mesmo assim?",
        textoConfirmar: "Trocar",
        textoCancelar: "Continuar editando",
      });
      if (!deveTrocar) return;
    }

    setSecaoAtiva(secaoId);
  };

  const iniciarCarregamentoCriacao = (rotulo) => {
    limparTemporizadorCriacao(temporizadorCriacaoRef);
    setCarregamentoCriacao({ titulo: "Criando item", rotulo, progresso: 8 });

    temporizadorCriacaoRef.current = window.setInterval(() => {
      setCarregamentoCriacao((estadoAtual) => {
        if (!estadoAtual) return estadoAtual;

        const restante = 92 - estadoAtual.progresso;
        const incremento = Math.max(2, Math.ceil(restante * 0.18));
        return {
          ...estadoAtual,
          progresso: Math.min(92, estadoAtual.progresso + incremento),
        };
      });
    }, 130);
  };

  const finalizarCarregamentoCriacao = async (rotulo = "Item criado") => {
    limparTemporizadorCriacao(temporizadorCriacaoRef);
    setCarregamentoCriacao({ titulo: "Criando item", rotulo, progresso: 100 });
    await new Promise((resolve) => window.setTimeout(resolve, 220));
    setCarregamentoCriacao(null);
  };

  const cancelarCarregamentoCriacao = () => {
    limparTemporizadorCriacao(temporizadorCriacaoRef);
    setCarregamentoCriacao(null);
  };

  const adicionar = async (event) => {
    event.preventDefault();

    if (!novoItem.nome.trim()) return;
    if (secaoAtiva === "linhaDoTempo" && !primeiroBlocoNovo.titulo.trim()) return;

    const itemParaCriar =
      secaoAtiva === "linhaDoTempo"
        ? {
            ...novoItem,
            blocos: [
              criarBlocoLinhaTempo({
                ...primeiroBlocoNovo,
                ordem: 0,
              }),
            ],
          }
        : novoItem;

    const rotuloCriacao = secaoAtiva === "linhaDoTempo" ? "Criando linha do tempo" : "Criando item do mundo";
    iniciarCarregamentoCriacao(rotuloCriacao);

    try {
      const itemCriado = await adicionarItemMundo(livroSelecionado.id, secaoAtiva, itemParaCriar);
      setNovoItem(criarItemInicial());
      setItemAbertoId(itemCriado?.id || "");
      setCriadorItemAberto(false);
      await finalizarCarregamentoCriacao(secaoAtiva === "linhaDoTempo" ? "Linha criada" : "Item criado");
    } catch (error) {
      cancelarCarregamentoCriacao();
      mostrarFeedback(error.message || "Não foi possível criar este item.", "erro");
    }
  };

  const selecionarImagemNovo = async (event) => {
    const arquivo = event.target.files?.[0];
    if (!arquivo) return;

    try {
      const imagemUrl = await processarImagem(arquivo, { tamanhoMaximo: 760, qualidade: 0.74, bytesMaximos: 150 * 1024 }, "Imagem de fundo");
      setNovoItem((atual) => ({ ...atual, imagemUrl }));
    } catch (error) {
      mostrarFeedback(error.message || "Não foi possível carregar a imagem.", "erro");
    }
  };

  const primeiroBlocoNovo = novoItem.blocos?.[0] || { titulo: "", descricao: "" };
  const atualizarPrimeiroBlocoNovo = (alteracoes) => {
    setNovoItem((atual) => ({
      ...atual,
      blocos: [
        {
          ...(atual.blocos?.[0] || {}),
          ...alteracoes,
        },
      ],
    }));
  };

  const abrirNovaSecao = () => {
    setSecaoEmEdicao(criarSecaoInicial());
    setSecoesMobileAbertas(true);
    setEditorSecaoAberto(true);
  };

  const abrirEdicaoSecao = () => {
    if (secaoEhFixa) return;

    setSecaoEmEdicao({
      id: secao.id,
      nome: secao.nome,
      categoria: secao.categoria,
    });
    setSecoesMobileAbertas(true);
    setEditorSecaoAberto(true);
  };

  const salvarSecaoMundo = async (event) => {
    event.preventDefault();

    const nome = secaoEmEdicao.nome.trim();
    if (!nome) return;

    const idSecao = secaoEmEdicao.id || criarIdSecaoMundo(nome, secoesMundo);
    const secaoAtualizada = {
      id: idSecao,
      nome,
      categoria: secaoEmEdicao.categoria.trim() || "Ideias, objetos, grupos ou elementos do mundo",
      personalizada: !idsSecoesFixas.has(idSecao),
    };
    const proximasSecoes = secoesMundo
      .filter((item) => item.id !== "linhaDoTempo")
      .map((item) => (item.id === idSecao ? { ...item, ...secaoAtualizada } : item));

    if (!proximasSecoes.some((item) => item.id === idSecao)) {
      proximasSecoes.push(secaoAtualizada);
    }

    await salvarLivro(livroSelecionado.id, { secoesMundo: prepararSecoesParaSalvar(proximasSecoes) }, { silencioso: true });
    setSecaoAtiva(idSecao);
    setEditorSecaoAberto(false);
    setSecaoEmEdicao(criarSecaoInicial());
  };

  const alternarItemAberto = (itemId) => {
    setItemAbertoId((idAtual) => (String(idAtual) === String(itemId) ? "" : itemId));
  };

  const renderizarItemMundo = (item) => {
    const aberto = String(itemAbertoId) === String(item.id);

    return secaoAtiva === "linhaDoTempo" ? (
      <TimelineWorldItem
        key={item.id}
        item={item}
        aberto={aberto}
        classePar=""
        onToggleAberto={() => alternarItemAberto(item.id)}
        onSave={(alteracoes, opcoes) => salvarItemMundo(livroSelecionado.id, secaoAtiva, item.id, alteracoes, opcoes)}
        onRemove={() => removerItemMundo(livroSelecionado.id, secaoAtiva, item.id)}
        processarImagem={processarImagem}
      />
    ) : (
      <EditableWorldItem
        key={item.id}
        tipo={secaoAtiva}
        nomeTipo={secao.nome}
        item={item}
        aberto={aberto}
        classePar=""
        personagens={personagens}
        alvosMundo={alvosMundo}
        onToggleAberto={() => alternarItemAberto(item.id)}
        onSave={(alteracoes, opcoes) => salvarItemMundo(livroSelecionado.id, secaoAtiva, item.id, alteracoes, opcoes)}
        onRemove={() => removerItemMundo(livroSelecionado.id, secaoAtiva, item.id)}
        processarImagem={processarImagem}
      />
    );
  };

  return (
    <div className="page world-page">
      <ImageProcessingOverlay estado={processandoImagem || carregamentoCriacao} />
      <header className="page-header">
        <div>
          <span className="eyebrow">Mundo</span>
          <h1>{nomeMundo || livroSelecionado.nomeMundo}</h1>
          <p>{livroSelecionado.titulo}</p>
        </div>
      </header>

      <section className="panel world-name-panel">
        <div className="world-title-editor">
          <span className="eyebrow">Nome do mundo</span>
          <input
            value={nomeMundo}
            onChange={(event) => setNomeMundo(event.target.value)}
            onBlur={salvarNomeMundo}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.currentTarget.blur();
              }
            }}
          />
          <p>{livroSelecionado.titulo}</p>
        </div>
        <div className="world-title-glance">
          <span>{totalItens}</span>
          <strong>itens no mundo</strong>
          <small>{secao.nome} selecionado</small>
        </div>
      </section>

      <section className={"panel world-sections-card world-control-card " + (secoesMobileAbertas || editorSecaoAberto ? "sections-open" : "")}>
        <div className="world-sections-card-header">
          <div>
            <span className="eyebrow">Seções do mundo</span>
            <strong><span className="world-sections-count">{totalItens}</span> Organização</strong>
          </div>
          <div className="world-control-actions">
            <button type="button" className="button secondary" onClick={abrirNovaSecao}>
              Nova seção
            </button>
            <button type="button" className="button primary" data-tour="mundo-criar" onClick={() => setCriadorItemAberto(true)}>
              {textoBotaoCriarMundo(secaoAtiva, secao)}
            </button>
          </div>
        </div>

        <button
          type="button"
          className="world-mobile-collapse-toggle"
          onClick={() => setSecoesMobileAbertas((valor) => !valor)}
        >
          <span>Selecionado</span>
          <strong>{secao.nome}</strong>
          <small>{secao.categoria}</small>
        </button>

        <div className="world-index-strip">
          {secoesMundo.map((item) => (
            <button
              key={item.id}
              type="button"
              className={secaoAtiva === item.id ? "active" : ""}
              onClick={() => {
                trocarSecaoAtiva(item.id);
                setSecoesMobileAbertas(false);
              }}
            >
              <span>{item.nome}</span>
              <strong>{(livroSelecionado.mundo[item.id] || []).length}</strong>
            </button>
          ))}
        </div>

        <div className="world-control-bottom">
          <label className="world-search-field">
            <span>Pesquisar em {secao.nome}</span>
            <input
              value={buscaMundo}
              onChange={(event) => setBuscaMundo(event.target.value)}
              placeholder={"Buscar " + secao.nome.toLowerCase()}
            />
          </label>

          {!secaoEhFixa && (
            <div className="world-section-tools">
              <button type="button" className="button ghost visible-ghost" onClick={abrirEdicaoSecao}>
                Editar seção
              </button>
            </div>
          )}
        </div>

        {editorSecaoAberto && (
          <form className="world-section-editor" onSubmit={salvarSecaoMundo} ref={editorSecaoRef}>
            <label className="field-group compact">
              <span>Nome da seção</span>
              <input
                value={secaoEmEdicao.nome}
                onChange={(event) => setSecaoEmEdicao({ ...secaoEmEdicao, nome: event.target.value })}
                placeholder="Ex.: Objetos, Povos, Religiões"
              />
            </label>
            <label className="field-group compact">
              <span>Descrição curta</span>
              <input
                value={secaoEmEdicao.categoria}
                onChange={(event) => setSecaoEmEdicao({ ...secaoEmEdicao, categoria: event.target.value })}
                placeholder="O que será organizado aqui?"
              />
            </label>
            <div className="row-actions">
              <button type="button" className="button ghost visible-ghost" onClick={() => setEditorSecaoAberto(false)}>
                Cancelar
              </button>
              <button type="submit" className="button primary" disabled={!secaoEmEdicao.nome.trim()}>
                Salvar seção
              </button>
            </div>
          </form>
        )}
      </section>

      {criadorItemAberto && (
        <button
          type="button"
          className="world-create-backdrop"
          aria-label="Fechar criação de item do mundo"
          onClick={() => setCriadorItemAberto(false)}
        />
      )}

        <article className={"panel world-create-panel " + (criadorItemAberto ? "is-open" : "")} data-tour="mundo-criar">
          <div className="panel-header">
            <div>
              <span className="eyebrow">{secao.nome}</span>
              <h2>Novo item do mundo</h2>
              <p>{secao.categoria}</p>
            </div>
            <button type="button" className="button secondary" onClick={() => setCriadorItemAberto(false)}>
              Fechar
            </button>
          </div>

          <form className="form-stack" onSubmit={adicionar}>
            <label className="field-group">
              <span>Nome</span>
              <input
                value={novoItem.nome}
                onChange={(event) => setNovoItem({ ...novoItem, nome: event.target.value })}
                placeholder={secao.categoria}
              />
            </label>

            {secaoAtiva === "linhaDoTempo" ? (
              <>
                <label className="field-group">
                  <span>Descrição da linha</span>
                  <textarea
                    className="timeline-description-field"
                    value={novoItem.descricao}
                    onChange={(event) => setNovoItem({ ...novoItem, descricao: event.target.value })}
                    rows={6}
                    placeholder="Explique o recorte histórico, arco político, passado do mundo ou sequência de eventos."
                  />
                </label>

                <label className="field-group">
                  <span>Cor da linha</span>
                  <input
                    type="color"
                    value={novoItem.cor}
                    onChange={(event) => setNovoItem({ ...novoItem, cor: event.target.value })}
                  />
                </label>

                <WorldImageSource
                  imagemUrl={novoItem.imagemUrl}
                  onChange={(imagemUrl) => setNovoItem({ ...novoItem, imagemUrl })}
                  onSelectFile={selecionarImagemNovo}
                  onInvalid={mostrarFeedback}
                />

                <div className="timeline-first-block-card">
                  <span className="eyebrow">Primeiro bloco</span>
                  <label className="field-group">
                    <span>Título</span>
                    <input
                      value={primeiroBlocoNovo.titulo}
                      onChange={(event) => atualizarPrimeiroBlocoNovo({ titulo: event.target.value })}
                      placeholder="O primeiro evento importante"
                    />
                  </label>
                  <label className="field-group">
                    <span>Descrição</span>
                    <textarea
                      className="timeline-block-description"
                      value={primeiroBlocoNovo.descricao}
                      onChange={(event) => atualizarPrimeiroBlocoNovo({ descricao: event.target.value })}
                      rows={5}
                    />
                  </label>
                </div>
              </>
            ) : (
              <>
                <label className="field-group">
                  <span>Categoria</span>
                  <input
                    value={novoItem.categoria}
                    onChange={(event) => setNovoItem({ ...novoItem, categoria: event.target.value })}
                    placeholder={secaoAtiva === "mapas" ? "Ex.: continente, rota, reino, arquipélago" : "Ex.: capital, guilda, tabu, guerra antiga"}
                  />
                </label>

                {secaoAtiva === "mapas" ? (
                  <div className="map-collapsible-stack">
                    <details className="map-collapse-panel" open>
                      <summary>
                        <span>Descrição do mapa</span>
                        <small>Território, escala e leitura geral</small>
                      </summary>
                      <div className="map-collapse-body">
                        <label className="field-group">
                          <span>Descrição</span>
                          <textarea
                            value={novoItem.descricao}
                            onChange={(event) => setNovoItem({ ...novoItem, descricao: event.target.value })}
                            rows={5}
                            placeholder="O que este mapa mostra, quais regiões cobre e que sensação ele deve passar?"
                          />
                        </label>
                        <label className="field-group">
                          <span>Costumes e marcas culturais</span>
                          <textarea
                            value={novoItem.costumes}
                            onChange={(event) => setNovoItem({ ...novoItem, costumes: event.target.value })}
                            rows={4}
                            placeholder="Costumes, símbolos, fronteiras, nomes locais, rotas sagradas ou hábitos de viagem."
                          />
                        </label>
                      </div>
                    </details>

                    <details className="map-collapse-panel">
                      <summary>
                        <span>Uso narrativo</span>
                        <small>Conflitos, rotas e pistas</small>
                      </summary>
                      <div className="map-collapse-body">
                        <label className="field-group">
                          <span>Conflitos do mapa</span>
                          <textarea
                            value={novoItem.conflito}
                            onChange={(event) => setNovoItem({ ...novoItem, conflito: event.target.value })}
                            rows={4}
                            placeholder="Fronteiras disputadas, territórios proibidos, rotas perigosas ou mapas incompletos."
                          />
                        </label>
                        <label className="field-group">
                          <span>Conexões</span>
                          <input
                            value={novoItem.conexoes}
                            onChange={(event) => setNovoItem({ ...novoItem, conexoes: event.target.value })}
                            placeholder="Rotas, capítulos, pistas, lugares vizinhos ou ideias ligadas"
                          />
                        </label>
                      </div>
                    </details>
                  </div>
                ) : (
                  <>
                    <label className="field-group">
                      <span>Descrição</span>
                      <textarea
                        value={novoItem.descricao}
                        onChange={(event) => setNovoItem({ ...novoItem, descricao: event.target.value })}
                        rows={4}
                      />
                    </label>

                    <label className="field-group">
                      <span>Conflito narrativo</span>
                      <textarea
                        value={novoItem.conflito}
                        onChange={(event) => setNovoItem({ ...novoItem, conflito: event.target.value })}
                        rows={3}
                      />
                    </label>

                    <label className="field-group">
                      <span>Conexões</span>
                      <input
                        value={novoItem.conexoes}
                        onChange={(event) => setNovoItem({ ...novoItem, conexoes: event.target.value })}
                        placeholder="Capítulos, pistas, lugares vizinhos ou ideias ligadas"
                      />
                    </label>
                  </>
                )}

                <label className="field-group">
                  <span>Cor do card</span>
                  <input type="color" value={novoItem.cor} onChange={(event) => setNovoItem({ ...novoItem, cor: event.target.value })} />
                </label>

                <WorldImageSource
                  imagemUrl={novoItem.imagemUrl}
                  onChange={(imagemUrl) => setNovoItem({ ...novoItem, imagemUrl })}
                  onSelectFile={selecionarImagemNovo}
                  onInvalid={mostrarFeedback}
                />

                {secaoAtiva === "lugares" && (
                  <PersonagemPicker
                    personagens={personagens}
                    selecionados={novoItem.personagensIds}
                    onChange={(personagensIds) => setNovoItem({ ...novoItem, personagensIds })}
                  />
                )}

                {secaoAtiva === "mapas" && (
                  <details className="map-collapse-panel map-relations-panel">
                    <summary>
                      <span>Personagens ligados</span>
                      <small>{novoItem.personagensIds.length} selecionado(s)</small>
                    </summary>
                    <div className="map-collapse-body">
                      <PersonagemPicker
                        personagens={personagens}
                        selecionados={novoItem.personagensIds}
                        onChange={(personagensIds) => setNovoItem({ ...novoItem, personagensIds })}
                      />
                    </div>
                  </details>
                )}
              </>
            )}

            <MundoLinkPicker
              alvos={alvosMundo}
              selecionados={novoItem.vinculosMundoIds}
              onChange={(vinculosMundoIds) => setNovoItem({ ...novoItem, vinculosMundoIds })}
            />

            <button
              className="button primary"
              type="submit"
              disabled={Boolean(processandoImagem || carregamentoCriacao) || !novoItem.nome.trim() || (secaoAtiva === "linhaDoTempo" && !primeiroBlocoNovo.titulo.trim())}
            >
              {secaoAtiva === "linhaDoTempo" ? "Criar linha do tempo" : "Adicionar ao mundo"}
            </button>
          </form>
        </article>

        <article className="panel world-shelf-panel" data-tour="mundo-lista">
          <div className="panel-header">
            <div>
              <span className="eyebrow">Estante do mundo</span>
              <h2>{secao.nome}</h2>
              <p>{itensFiltrados.length} de {itens.length} registro(s) em {nomeMundo || livroSelecionado.nomeMundo}</p>
            </div>
          </div>

          <div className="world-shelf">
            {linhasItens.map((linha, indiceLinha) => {
              return (
                <div
                  className="world-shelf-row three"
                  key={linha.map((item) => item.id).join("-") || indiceLinha}
                >
                  {linha.map((item) => renderizarItemMundo(item))}
                </div>
              );
            })}

            {itensFiltrados.length === 0 && (
              <div className="inline-empty">
                <strong>{itens.length === 0 ? "Nada registrado em " + secao.nome.toLowerCase() : "Nada encontrado"}</strong>
                <span>{itens.length === 0 ? "Adicione itens com função narrativa para o mundo ganhar utilidade." : "Tente outra busca ou limpe o campo de pesquisa."}</span>
              </div>
            )}
          </div>
        </article>
    </div>
  );
}

function WorldItemModal({ titulo, subtitulo, onClose, children, className = "" }) {
  useEffect(() => {
    const fecharComEsc = (event) => {
      if (event.key === "Escape") onClose();
    };

    window.addEventListener("keydown", fecharComEsc);
    return () => window.removeEventListener("keydown", fecharComEsc);
  }, [onClose]);

  return (
    <div className="world-item-modal-backdrop" role="presentation" onMouseDown={onClose}>
      <section
        className={"panel world-item-modal " + className}
        role="dialog"
        aria-modal="true"
        aria-label={titulo || subtitulo || "Item do mundo"}
        onMouseDown={(event) => event.stopPropagation()}
      >
        <div className="world-item-modal-header">
          <div>
            <span className="eyebrow">{subtitulo}</span>
            <h2>{titulo}</h2>
          </div>
          <button type="button" className="button secondary visible-ghost" onClick={onClose}>
            Fechar
          </button>
        </div>
        {children}
      </section>
    </div>
  );
}

function WorldImageSource({ imagemUrl, onChange, onSelectFile, compact = false, onInvalid }) {
  const [linkDraft, setLinkDraft] = useState("");
  const imagemPreview = imagemPodeSerMostrada(imagemUrl) ? imagemUrl : "";
  const fieldClass = "field-group " + (compact ? "compact" : "");

  useEffect(() => {
    setLinkDraft(imagemEhLink(imagemUrl) ? imagemUrl : "");
  }, [imagemUrl]);

  const aplicarLink = () => {
    const link = linkDraft.trim();

    if (!link) {
      if (imagemEhLink(imagemUrl)) onChange("");
      return;
    }

    const linkNormalizado = normalizarLinkImagemMundo(link);
    if (!linkNormalizado) {
      onInvalid?.("Cole um link de imagem começando com http:// ou https://.");
      return;
    }

    onChange(linkNormalizado);
  };

  return (
    <div className="image-upload-row world-image-source-row">
      <label className={fieldClass}>
        <span>Imagem do computador</span>
        <input type="file" accept="image/*" onChange={onSelectFile} />
      </label>

      <label className={fieldClass}>
        <span>Imagem por link</span>
        <input
          value={linkDraft}
          onChange={(event) => setLinkDraft(event.target.value)}
          onBlur={aplicarLink}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.preventDefault();
              aplicarLink();
              event.currentTarget.blur();
            }
          }}
          inputMode="url"
          placeholder="Cole o link direto da imagem"
        />
      </label>

      {imagemPreview && (
        <div className="image-upload-preview place-preview">
          <img src={imagemPreview} alt="" />
          <button type="button" className="button ghost" onClick={() => onChange("")}>
            Remover imagem
          </button>
        </div>
      )}
    </div>
  );
}

function EditableWorldItem({ tipo, nomeTipo, item, aberto, classePar, personagens, alvosMundo, onToggleAberto, onSave, onRemove, processarImagem }) {
  const [edicao, setEdicao] = useState(item);
  const assinaturaItemSalvo = item.id + "-" + (item.atualizadoEm || "");
  const [assinaturaSalvaLocal, setAssinaturaSalvaLocal] = useState(() => assinarItemMundo(item));
  const itemRef = useRef(null);
  const { mostrarFeedback, pedirConfirmacao } = useFeedback();

  useEffect(() => {
    setEdicao(item);
    setAssinaturaSalvaLocal(assinarItemMundo(item));
  }, [assinaturaItemSalvo]);

  const personagensLigados = personagens.filter((personagem) =>
    (edicao.personagensIds || []).map(String).includes(String(personagem.id)),
  );
  const ramificacoes = ordenarRamificacoes(edicao.ramificacoes || []);
  const mapasInternos = ordenarMapasInternos(edicao.mapasInternos || []);
  const alvosSelecionados = resolverAlvosMundo(alvosMundo, edicao.vinculosMundoIds);
  const alvosDisponiveis = removerAlvosSelecionaveis(alvosMundo, [
    edicao.id,
    ...ramificacoes.map((ramo) => ramo.id),
    ...mapasInternos.map((mapa) => mapa.id),
  ]);
  const imagemExibida = imagemPodeSerMostrada(edicao.imagemUrl) ? edicao.imagemUrl : "";
  const temImagem = Boolean(imagemExibida);
  const tipoEhMapa = tipo === "mapas";
  const resumoCard = criarResumoCardMundo(tipo, edicao, ramificacoes, alvosSelecionados, personagensLigados, mapasInternos);
  const temAlteracoesNaoSalvas = assinarItemMundo(edicao) !== assinaturaSalvaLocal;

  useUnsavedChangesWarning(temAlteracoesNaoSalvas, "Você tem alterações no item do mundo sem salvar.");

  const selecionarImagemEdicao = async (event) => {
    const arquivo = event.target.files?.[0];
    if (!arquivo) return;

    try {
      const imagemUrl = await processarImagem(arquivo, { tamanhoMaximo: 760, qualidade: 0.74, bytesMaximos: 150 * 1024 }, "Imagem de fundo");
      setEdicao((atual) => ({ ...atual, imagemUrl }));
    } catch (error) {
      mostrarFeedback(error.message || "Não foi possível carregar a imagem.", "erro");
    }
  };

  const salvarEdicao = async () => {
    try {
      await onSave(edicao);
      setAssinaturaSalvaLocal(assinarItemMundo(edicao));
    } catch (error) {
      mostrarFeedback(error.message || "Não foi possível salvar este item do mundo.", "erro");
    }
  };

  const fecharModal = async () => {
    if (aberto && temAlteracoesNaoSalvas) {
      const deveFechar = await pedirConfirmacao({
        titulo: "Fechar item?",
        mensagem: "Existem alterações neste item sem salvar. Fechar mesmo assim?",
        textoConfirmar: "Fechar",
        textoCancelar: "Continuar editando",
      });
      if (!deveFechar) return;

      setEdicao(item);
      setAssinaturaSalvaLocal(assinarItemMundo(item));
    }

    onToggleAberto();
  };

  return (
    <>
      <article ref={itemRef} className={"world-shelf-item " + (tipoEhMapa ? "map-world-item " : "") + classePar + " " + (aberto ? "modal-open" : "")}>
        <button
          type="button"
          className={"world-item-cover " + (tipoEhMapa ? "map-world-cover " : "") + (temImagem ? "has-image" : "")}
          style={{ "--world-item-color": edicao.cor || item.cor || "#8f1d43" }}
          onClick={onToggleAberto}
        >
          {temImagem && <img className="world-item-image" src={imagemExibida} alt="" loading="lazy" />}
          <span className="world-item-cover-content">
            <span>{nomesTipo[tipo] || nomeTipo || "Item"}</span>
            <strong>{edicao.nome}</strong>
            <small className="world-item-card-summary">{resumoCard}</small>
            <small>Atualizado: {formatarData(item.atualizadoEm)}</small>
            {(tipo === "lugares" || tipoEhMapa) && personagensLigados.length > 0 && (
              <span className="linked-character-row">
                {personagensLigados.slice(0, 2).map((personagem) => (
                  <i key={personagem.id} style={{ "--character-color": personagem.cor }}>
                    {personagem.nome}
                  </i>
                ))}
                {personagensLigados.length > 2 && (
                  <i style={{ "--character-color": edicao.cor || "#8f1d43" }}>+{personagensLigados.length - 2}</i>
                )}
              </span>
            )}
          </span>
        </button>
      </article>

      {aberto && (
        <WorldItemModal
          titulo={edicao.nome || "Item sem nome"}
          subtitulo={nomesTipo[tipo] || nomeTipo || "Item do mundo"}
          onClose={fecharModal}
        >
          <div className="world-item-detail">
          <div className="form-grid three">
            <label className="field-group compact">
              <span>Nome</span>
              <input value={edicao.nome} onChange={(event) => setEdicao({ ...edicao, nome: event.target.value })} />
            </label>
            <label className="field-group compact">
              <span>Categoria</span>
              <input value={edicao.categoria} onChange={(event) => setEdicao({ ...edicao, categoria: event.target.value })} />
            </label>
            <label className="field-group compact">
              <span>Cor do card</span>
              <input type="color" value={edicao.cor || "#8f1d43"} onChange={(event) => setEdicao({ ...edicao, cor: event.target.value })} />
            </label>
          </div>

          {tipoEhMapa ? (
            <div className="map-collapsible-stack edit">
              <details className="map-collapse-panel" open>
                <summary>
                  <span>Descrição e costumes</span>
                  <small>O mapa como documento de mundo</small>
                </summary>
                <div className="map-collapse-body">
                  <label className="field-group compact">
                    <span>Descrição</span>
                    <textarea value={edicao.descricao} onChange={(event) => setEdicao({ ...edicao, descricao: event.target.value })} rows={4} />
                  </label>

                  <label className="field-group compact">
                    <span>Costumes e marcas culturais</span>
                    <textarea value={edicao.costumes || ""} onChange={(event) => setEdicao({ ...edicao, costumes: event.target.value })} rows={4} />
                  </label>
                </div>
              </details>

              <details className="map-collapse-panel">
                <summary>
                  <span>Uso narrativo</span>
                  <small>Conflitos, rotas e pistas</small>
                </summary>
                <div className="map-collapse-body">
                  <label className="field-group compact">
                    <span>Conflitos do mapa</span>
                    <textarea value={edicao.conflito} onChange={(event) => setEdicao({ ...edicao, conflito: event.target.value })} rows={3} />
                  </label>

                  <label className="field-group compact">
                    <span>Conexões</span>
                    <input value={edicao.conexoes} onChange={(event) => setEdicao({ ...edicao, conexoes: event.target.value })} />
                  </label>
                </div>
              </details>
            </div>
          ) : (
            <>
              <label className="field-group compact">
                <span>Descrição</span>
                <textarea value={edicao.descricao} onChange={(event) => setEdicao({ ...edicao, descricao: event.target.value })} rows={3} />
              </label>

              <label className="field-group compact">
                <span>Conflito</span>
                <textarea value={edicao.conflito} onChange={(event) => setEdicao({ ...edicao, conflito: event.target.value })} rows={2} />
              </label>

              <label className="field-group compact">
                <span>Conexões</span>
                <input value={edicao.conexoes} onChange={(event) => setEdicao({ ...edicao, conexoes: event.target.value })} />
              </label>
            </>
          )}

          <WorldImageSource
            compact
            imagemUrl={edicao.imagemUrl}
            onChange={(imagemUrl) => setEdicao({ ...edicao, imagemUrl })}
            onSelectFile={selecionarImagemEdicao}
            onInvalid={mostrarFeedback}
          />

          {tipoEhMapa && (
            <MapasInternos
              mapas={mapasInternos}
              personagens={personagens}
              processarImagem={processarImagem}
              onChange={(proximosMapas) => setEdicao({ ...edicao, mapasInternos: proximosMapas })}
            />
          )}

          {tipoEhMapa ? (
            <details className="map-collapse-panel map-relations-panel">
              <summary>
                <span>Personagens e ligações</span>
                <small>{personagensLigados.length} personagem(ns), {alvosSelecionados.length} vínculo(s)</small>
              </summary>
              <div className="map-collapse-body">
                <PersonagemPicker
                  personagens={personagens}
                  selecionados={edicao.personagensIds || []}
                  onChange={(personagensIds) => setEdicao({ ...edicao, personagensIds })}
                />

                <MundoLinkPicker
                  alvos={alvosDisponiveis}
                  selecionados={edicao.vinculosMundoIds || []}
                  onChange={(vinculosMundoIds) => setEdicao({ ...edicao, vinculosMundoIds })}
                />
              </div>
            </details>
          ) : (
            <MundoLinkPicker
              alvos={alvosDisponiveis}
              selecionados={edicao.vinculosMundoIds || []}
              onChange={(vinculosMundoIds) => setEdicao({ ...edicao, vinculosMundoIds })}
            />
          )}

          {tipo === "lugares" && (
            <>
              <PersonagemPicker
                personagens={personagens}
                selecionados={edicao.personagensIds || []}
                onChange={(personagensIds) => setEdicao({ ...edicao, personagensIds })}
              />

              <LugarRamificacoes
                ramificacoes={ramificacoes}
                personagens={personagens}
                alvosMundo={alvosMundo}
                processarImagem={processarImagem}
                onChange={(proximasRamificacoes) => setEdicao({ ...edicao, ramificacoes: proximasRamificacoes })}
              />
            </>
          )}

          <div className="row-actions">
            <button type="button" className="button secondary" onClick={salvarEdicao}>
              Salvar
            </button>
            <button type="button" className="button danger" onClick={onRemove}>
              Remover
            </button>
          </div>
          </div>
        </WorldItemModal>
      )}
    </>
  );
}

function criarMapaInternoInicial(ordem = 0) {
  return {
    nome: "",
    descricao: "",
    imagemUrl: "",
    cor: sortearCorMundo(),
    personagensIds: [],
    ordem,
  };
}

function MapasInternos({ mapas, personagens, onChange, processarImagem }) {
  const mapasOrdenados = ordenarMapasInternos(mapas);
  const [novoMapa, setNovoMapa] = useState(() => criarMapaInternoInicial(mapasOrdenados.length));
  const [criandoMapa, setCriandoMapa] = useState(false);
  const [mapaModalId, setMapaModalId] = useState("");
  const mapaEmFoco = mapasOrdenados.find((mapa) => String(mapa.id) === String(mapaModalId));
  const { mostrarFeedback } = useFeedback();

  useEffect(() => {
    if (!mapaModalId) return;
    if (mapasOrdenados.some((mapa) => String(mapa.id) === String(mapaModalId))) return;

    setMapaModalId("");
  }, [mapaModalId, mapasOrdenados]);

  useEffect(() => {
    if (!mapaEmFoco) return undefined;

    const fecharComEscape = (event) => {
      if (event.key === "Escape") {
        setMapaModalId("");
      }
    };

    window.addEventListener("keydown", fecharComEscape);
    return () => window.removeEventListener("keydown", fecharComEscape);
  }, [mapaEmFoco]);

  const selecionarImagem = async (event, aoCarregar) => {
    const arquivo = event.target.files?.[0];
    if (!arquivo) return;

    try {
      const imagemUrl = await processarImagem(arquivo, { tamanhoMaximo: 1280, qualidade: 0.78, bytesMaximos: 190 * 1024 }, "Mapa interno");
      aoCarregar(imagemUrl);
      event.target.value = "";
    } catch (error) {
      mostrarFeedback(error.message || "Não foi possível carregar a imagem do mapa.", "erro");
    }
  };

  const adicionarMapa = () => {
    if (!novoMapa.nome.trim()) return;

    const mapaCriado = criarMapaInterno({
      ...novoMapa,
      nome: novoMapa.nome.trim(),
      ordem: mapasOrdenados.length,
    });
    onChange(ordenarMapasInternos([...mapasOrdenados, mapaCriado]));
    setMapaModalId(mapaCriado.id);
    setCriandoMapa(false);
    setNovoMapa(criarMapaInternoInicial(mapasOrdenados.length + 1));
  };

  const atualizarMapa = (mapaId, alteracoes) => {
    onChange(
      ordenarMapasInternos(
        mapasOrdenados.map((mapa) => (String(mapa.id) === String(mapaId) ? { ...mapa, ...alteracoes } : mapa)),
      ),
    );
  };

  const removerMapa = (mapaId) => {
    onChange(ordenarMapasInternos(mapasOrdenados.filter((mapa) => String(mapa.id) !== String(mapaId))));
    setMapaModalId((idAtual) => (String(idAtual) === String(mapaId) ? "" : idAtual));
  };

  const moverMapa = (mapaId, direcao) => {
    const indiceAtual = mapasOrdenados.findIndex((mapa) => String(mapa.id) === String(mapaId));
    const proximoIndice = indiceAtual + direcao;

    if (indiceAtual < 0 || proximoIndice < 0 || proximoIndice >= mapasOrdenados.length) return;

    const proximosMapas = [...mapasOrdenados];
    const [mapaMovido] = proximosMapas.splice(indiceAtual, 1);
    proximosMapas.splice(proximoIndice, 0, mapaMovido);
    onChange(ordenarMapasInternos(proximosMapas));
  };

  const resolverPersonagensDoMapa = (mapa) => {
    const ids = new Set((mapa.personagensIds || []).map(String));
    return personagens.filter((personagem) => ids.has(String(personagem.id)));
  };

  return (
    <section className="map-gallery-panel">
      <div className="map-gallery-header">
        <div>
          <span className="eyebrow">Mapas internos</span>
          <strong>Cartas reais deste lugar</strong>
        </div>
        <small>{mapasOrdenados.length} imagem(ns)</small>
      </div>

      {mapasOrdenados.length > 0 && (
        <div className="map-gallery-list">
          {mapasOrdenados.map((mapa) => {
            const temImagem = Boolean(mapa.imagemUrl);
            const personagensDoMapa = resolverPersonagensDoMapa(mapa);

            return (
              <article
                className="map-gallery-card collapsed"
                key={mapa.id}
                style={{ "--map-inner-color": mapa.cor || "#8f1d43" }}
              >
                <button type="button" className="map-gallery-summary" onClick={() => setMapaModalId(mapa.id)}>
                  <span className={"map-gallery-thumb " + (temImagem ? "has-image" : "")}>
                    {temImagem ? <img src={mapa.imagemUrl} alt="" loading="lazy" /> : <i>{mapa.nome.slice(0, 1) || "M"}</i>}
                  </span>
                  <span>
                    <strong>{mapa.nome}</strong>
                    <small>{mapa.descricao || "Sem descrição"}</small>
                    <small>
                      {personagensDoMapa.length > 0
                        ? personagensDoMapa.slice(0, 3).map((personagem) => personagem.nome).join(", ")
                        : "Sem personagens ligados"}
                    </small>
                  </span>
                </button>
              </article>
            );
          })}
        </div>
      )}

      {mapaEmFoco && (
        <div className="map-gallery-modal-backdrop" role="presentation" onMouseDown={() => setMapaModalId("")}>
          <article
            className="map-gallery-modal"
            role="dialog"
            aria-modal="true"
            aria-label={"Mapa interno: " + mapaEmFoco.nome}
            style={{ "--map-inner-color": mapaEmFoco.cor || "#8f1d43" }}
            onMouseDown={(event) => event.stopPropagation()}
          >
            <header className="map-gallery-modal-top">
              <div>
                <span className="eyebrow">Mapa interno</span>
                <strong>{mapaEmFoco.nome}</strong>
              </div>
              <button type="button" className="button ghost visible-ghost" onClick={() => setMapaModalId("")}>
                Fechar
              </button>
            </header>

            <div className="map-gallery-modal-grid">
              <div className="map-gallery-modal-image">
                {mapaEmFoco.imagemUrl ? (
                  <img src={mapaEmFoco.imagemUrl} alt="" />
                ) : (
                  <div className="map-gallery-empty-image">
                    <strong>Sem imagem</strong>
                    <span>Imagem não adicionada.</span>
                  </div>
                )}
              </div>

              <aside className="map-gallery-modal-info">
                <div className="form-grid two">
                  <label className="field-group compact">
                    <span>Nome do mapa</span>
                    <input value={mapaEmFoco.nome} onChange={(event) => atualizarMapa(mapaEmFoco.id, { nome: event.target.value })} />
                  </label>
                  <label className="field-group compact">
                    <span>Cor</span>
                    <input
                      type="color"
                      value={mapaEmFoco.cor || "#8f1d43"}
                      onChange={(event) => atualizarMapa(mapaEmFoco.id, { cor: event.target.value })}
                    />
                  </label>
                </div>

                <label className="field-group compact">
                  <span>Descrição</span>
                  <textarea
                    value={mapaEmFoco.descricao}
                    onChange={(event) => atualizarMapa(mapaEmFoco.id, { descricao: event.target.value })}
                    rows={6}
                  />
                </label>

                <div className="image-upload-row compact-upload">
                  <label className="field-group compact">
                    <span>Imagem grande</span>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(event) => selecionarImagem(event, (imagemUrl) => atualizarMapa(mapaEmFoco.id, { imagemUrl }))}
                    />
                  </label>
                  {mapaEmFoco.imagemUrl && (
                    <button type="button" className="button ghost visible-ghost" onClick={() => atualizarMapa(mapaEmFoco.id, { imagemUrl: "" })}>
                      Remover imagem
                    </button>
                  )}
                </div>

                <details className="map-collapse-panel map-inner-characters-panel" open>
                  <summary>
                    <span>Personagens ligados</span>
                    <small>{resolverPersonagensDoMapa(mapaEmFoco).length} selecionado(s)</small>
                  </summary>
                  <div className="map-collapse-body">
                    <PersonagemPicker
                      personagens={personagens}
                      selecionados={mapaEmFoco.personagensIds || []}
                      onChange={(personagensIds) => atualizarMapa(mapaEmFoco.id, { personagensIds })}
                    />
                  </div>
                </details>

                <div className="row-actions map-gallery-actions">
                  <button
                    type="button"
                    className="button ghost visible-ghost"
                    onClick={() => moverMapa(mapaEmFoco.id, -1)}
                    disabled={mapasOrdenados.findIndex((mapa) => String(mapa.id) === String(mapaEmFoco.id)) === 0}
                  >
                    Subir
                  </button>
                  <button
                    type="button"
                    className="button ghost visible-ghost"
                    onClick={() => moverMapa(mapaEmFoco.id, 1)}
                    disabled={mapasOrdenados.findIndex((mapa) => String(mapa.id) === String(mapaEmFoco.id)) === mapasOrdenados.length - 1}
                  >
                    Descer
                  </button>
                  <button type="button" className="button danger" onClick={() => removerMapa(mapaEmFoco.id)}>
                    Remover mapa
                  </button>
                </div>
              </aside>
            </div>
          </article>
        </div>
      )}

      {!criandoMapa ? (
        <button type="button" className="button secondary map-gallery-add-button" onClick={() => setCriandoMapa(true)}>
          Adicionar mapa interno
        </button>
      ) : (
        <div className="map-gallery-composer">
          <div className="form-grid two">
            <label className="field-group compact">
              <span>Nome do mapa</span>
              <input
                value={novoMapa.nome}
                onChange={(event) => setNovoMapa({ ...novoMapa, nome: event.target.value })}
                placeholder="Ex.: mapa político, mapa antigo, rota norte"
              />
            </label>
            <label className="field-group compact">
              <span>Cor</span>
              <input type="color" value={novoMapa.cor} onChange={(event) => setNovoMapa({ ...novoMapa, cor: event.target.value })} />
            </label>
          </div>

          <label className="field-group compact">
            <span>Descrição</span>
            <textarea
              value={novoMapa.descricao}
              onChange={(event) => setNovoMapa({ ...novoMapa, descricao: event.target.value })}
              rows={4}
              placeholder="O que esta versão do mapa revela?"
            />
          </label>

          <div className="image-upload-row compact-upload">
            <label className="field-group compact">
              <span>Imagem grande</span>
              <input
                type="file"
                accept="image/*"
                onChange={(event) => selecionarImagem(event, (imagemUrl) => setNovoMapa((atual) => ({ ...atual, imagemUrl })))}
              />
            </label>
            {novoMapa.imagemUrl && (
              <div className="image-upload-preview place-preview">
                <img src={novoMapa.imagemUrl} alt="" />
                <button type="button" className="button ghost visible-ghost" onClick={() => setNovoMapa({ ...novoMapa, imagemUrl: "" })}>
                  Remover imagem
                </button>
              </div>
            )}
          </div>

          <details className="map-collapse-panel map-inner-characters-panel">
            <summary>
              <span>Personagens ligados</span>
              <small>{novoMapa.personagensIds.length} selecionado(s)</small>
            </summary>
            <div className="map-collapse-body">
              <PersonagemPicker
                personagens={personagens}
                selecionados={novoMapa.personagensIds}
                onChange={(personagensIds) => setNovoMapa({ ...novoMapa, personagensIds })}
              />
            </div>
          </details>

          <div className="row-actions">
            <button
              type="button"
              className="button ghost visible-ghost"
              onClick={() => {
                setNovoMapa(criarMapaInternoInicial(mapasOrdenados.length));
                setCriandoMapa(false);
              }}
            >
              Cancelar
            </button>
            <button type="button" className="button secondary" onClick={adicionarMapa} disabled={!novoMapa.nome.trim()}>
              Guardar mapa
            </button>
          </div>
        </div>
      )}
    </section>
  );
}

function criarRamoLugarInicial(ordem = 0) {
  return {
    nome: "",
    descricao: "",
    imagemUrl: "",
    personagensIds: [],
    vinculosMundoIds: [],
    cor: sortearCorMundo(),
    ordem,
  };
}

function LugarRamificacoes({ ramificacoes, personagens, alvosMundo, onChange, processarImagem }) {
  const [novoRamo, setNovoRamo] = useState(() => criarRamoLugarInicial(ramificacoes.length));
  const [ramoAbertoId, setRamoAbertoId] = useState("");
  const [criandoRamo, setCriandoRamo] = useState(false);
  const ramosOrdenados = ordenarRamificacoes(ramificacoes);
  const { mostrarFeedback } = useFeedback();

  useEffect(() => {
    if (!ramoAbertoId) return;
    if (ramosOrdenados.some((ramo) => String(ramo.id) === String(ramoAbertoId))) return;

    setRamoAbertoId("");
  }, [ramoAbertoId, ramosOrdenados]);

  const selecionarImagem = async (event, aoCarregar) => {
    const arquivo = event.target.files?.[0];
    if (!arquivo) return;

    try {
      const imagemUrl = await processarImagem(arquivo, { tamanhoMaximo: 520, qualidade: 0.72, bytesMaximos: 85 * 1024 }, "Imagem da ramificação");
      aoCarregar(imagemUrl);
    } catch (error) {
      mostrarFeedback(error.message || "Não foi possível carregar a imagem.", "erro");
    }
  };

  const adicionarRamo = () => {
    if (!novoRamo.nome.trim()) return;

    const ramoCriado = criarRamificacaoLugar({
      ...novoRamo,
      nome: novoRamo.nome.trim(),
      ordem: ramosOrdenados.length,
    });
    onChange(ordenarRamificacoes([...ramosOrdenados, ramoCriado]));
    setRamoAbertoId(ramoCriado.id);
    setCriandoRamo(false);
    setNovoRamo(criarRamoLugarInicial(ramosOrdenados.length + 1));
  };

  const atualizarRamo = (ramoId, alteracoes) => {
    onChange(
      ordenarRamificacoes(
        ramosOrdenados.map((ramo) => (String(ramo.id) === String(ramoId) ? { ...ramo, ...alteracoes } : ramo)),
      ),
    );
  };

  const removerRamo = (ramoId) => {
    onChange(ordenarRamificacoes(ramosOrdenados.filter((ramo) => String(ramo.id) !== String(ramoId))));
  };

  const alternarRamoAberto = (ramoId) => {
    setRamoAbertoId((idAtual) => (String(idAtual) === String(ramoId) ? "" : ramoId));
  };

  const recolherRamoAoPerderFoco = (event, ramoId) => {
    const cardAtual = event.currentTarget;
    const proximoFoco = event.relatedTarget;

    if (proximoFoco && cardAtual.contains(proximoFoco)) return;

    window.setTimeout(() => {
      if (!cardAtual.contains(document.activeElement)) {
        setRamoAbertoId((idAtual) => (String(idAtual) === String(ramoId) ? "" : idAtual));
      }
    }, 0);
  };

  return (
    <section className="place-branches">
      <div className="place-branches-header">
        <div>
          <span className="eyebrow">Ramificações</span>
          <strong>Lugares dentro deste lugar</strong>
        </div>
        <small>{ramosOrdenados.length} bloco(s)</small>
      </div>

      {ramosOrdenados.length > 0 && (
        <div className="place-branch-grid">
          {ramosOrdenados.map((ramo) => {
            const aberto = String(ramoAbertoId) === String(ramo.id);
            const personagensDoRamo = personagens.filter((personagem) =>
              (ramo.personagensIds || []).map(String).includes(String(personagem.id)),
            );
            const vinculosDoRamo = resolverAlvosMundo(alvosMundo, ramo.vinculosMundoIds);
            const alvosDisponiveisDoRamo = removerAlvosSelecionaveis(alvosMundo, [ramo.id]);

            return (
              <article
                className={"place-branch-card " + (aberto ? "expanded" : "collapsed")}
                key={ramo.id}
                style={{ "--branch-color": ramo.cor || "#8f1d43" }}
                onBlurCapture={(event) => recolherRamoAoPerderFoco(event, ramo.id)}
              >
                <button type="button" className="place-branch-summary" onClick={() => alternarRamoAberto(ramo.id)}>
                  <span className={"place-branch-media " + (ramo.imagemUrl ? "has-image" : "")}>
                    {ramo.imagemUrl ? <img src={ramo.imagemUrl} alt="" loading="lazy" /> : <i>{ramo.nome.slice(0, 1) || "L"}</i>}
                  </span>
                  <span className="place-branch-summary-info">
                    <strong>{ramo.nome}</strong>
                    <small>
                      {personagensDoRamo.length > 0
                        ? personagensDoRamo.map((personagem) => personagem.nome).join(", ")
                        : "Sem personagens ligados"}
                    </small>
                    {vinculosDoRamo.length > 0 && (
                      <small>Ligado a {vinculosDoRamo.slice(0, 2).map((alvo) => alvo.nome).join(", ")}</small>
                    )}
                  </span>
                </button>

                {aberto && (
                  <div className="place-branch-body">
                    <div className="form-grid two">
                      <label className="field-group compact">
                        <span>Título</span>
                        <input value={ramo.nome} onChange={(event) => atualizarRamo(ramo.id, { nome: event.target.value })} />
                      </label>
                      <label className="field-group compact">
                        <span>Cor</span>
                        <input type="color" value={ramo.cor || "#8f1d43"} onChange={(event) => atualizarRamo(ramo.id, { cor: event.target.value })} />
                      </label>
                    </div>

                    <label className="field-group compact">
                      <span>Descrição</span>
                      <textarea
                        value={ramo.descricao}
                        onChange={(event) => atualizarRamo(ramo.id, { descricao: event.target.value })}
                        rows={4}
                      />
                    </label>

                    <div className="image-upload-row compact-upload">
                      <label className="field-group compact">
                        <span>Imagem</span>
                        <input
                          type="file"
                          accept="image/*"
                          onChange={(event) => selecionarImagem(event, (imagemUrl) => atualizarRamo(ramo.id, { imagemUrl }))}
                        />
                      </label>
                      {ramo.imagemUrl && (
                        <button type="button" className="button ghost visible-ghost" onClick={() => atualizarRamo(ramo.id, { imagemUrl: "" })}>
                          Remover imagem
                        </button>
                      )}
                    </div>

                    <PersonagemPicker
                      personagens={personagens}
                      selecionados={ramo.personagensIds || []}
                      onChange={(personagensIds) => atualizarRamo(ramo.id, { personagensIds })}
                    />

                    <MundoLinkPicker
                      alvos={alvosDisponiveisDoRamo}
                      selecionados={ramo.vinculosMundoIds || []}
                      onChange={(vinculosMundoIds) => atualizarRamo(ramo.id, { vinculosMundoIds })}
                    />

                    <div className="row-actions">
                      <button type="button" className="button danger" onClick={() => removerRamo(ramo.id)}>
                        Remover ramificação
                      </button>
                    </div>
                  </div>
                )}
              </article>
            );
          })}
        </div>
      )}

      {!criandoRamo ? (
        <button type="button" className="button secondary place-branch-add-button" onClick={() => setCriandoRamo(true)}>
          Adicionar Ramificação
        </button>
      ) : (
        <div className="place-branch-composer">
          <div className="place-branch-compose-grid">
            <label className="field-group compact">
              <span>Novo lugar interno</span>
              <input
                value={novoRamo.nome}
                onChange={(event) => setNovoRamo({ ...novoRamo, nome: event.target.value })}
                placeholder="Ex.: biblioteca subterrânea, docas, salão"
              />
            </label>
            <label className="field-group compact">
              <span>Cor</span>
              <input type="color" value={novoRamo.cor} onChange={(event) => setNovoRamo({ ...novoRamo, cor: event.target.value })} />
            </label>
          </div>

          <label className="field-group compact">
            <span>Descrição</span>
            <textarea
              value={novoRamo.descricao}
              onChange={(event) => setNovoRamo({ ...novoRamo, descricao: event.target.value })}
              rows={4}
              placeholder="Como este lugar se conecta ao espaço principal e o que pode acontecer nele?"
            />
          </label>

          <div className="image-upload-row compact-upload">
            <label className="field-group compact">
              <span>Imagem</span>
              <input
                type="file"
                accept="image/*"
                onChange={(event) => selecionarImagem(event, (imagemUrl) => setNovoRamo((atual) => ({ ...atual, imagemUrl })))}
              />
            </label>
            {novoRamo.imagemUrl && (
              <div className="image-upload-preview place-preview">
                <img src={novoRamo.imagemUrl} alt="" />
                <button type="button" className="button ghost" onClick={() => setNovoRamo({ ...novoRamo, imagemUrl: "" })}>
                  Remover imagem
                </button>
              </div>
            )}
          </div>

          <PersonagemPicker
            personagens={personagens}
            selecionados={novoRamo.personagensIds}
            onChange={(personagensIds) => setNovoRamo({ ...novoRamo, personagensIds })}
          />

          <MundoLinkPicker
            alvos={alvosMundo}
            selecionados={novoRamo.vinculosMundoIds}
            onChange={(vinculosMundoIds) => setNovoRamo({ ...novoRamo, vinculosMundoIds })}
          />

          <div className="row-actions">
            <button
              type="button"
              className="button ghost visible-ghost"
              onClick={() => {
                setNovoRamo(criarRamoLugarInicial(ramosOrdenados.length));
                setCriandoRamo(false);
              }}
            >
              Cancelar
            </button>
            <button type="button" className="button secondary" onClick={adicionarRamo} disabled={!novoRamo.nome.trim()}>
              Criar ramificação
            </button>
          </div>
        </div>
      )}
    </section>
  );
}

function TimelineWorldItem({ item, aberto, classePar, onToggleAberto, onSave, onRemove, processarImagem }) {
  const [edicao, setEdicao] = useState(item);
  const [blocoAbertoId, setBlocoAbertoId] = useState("");
  const [criandoDepoisDeId, setCriandoDepoisDeId] = useState("");
  const [novoBloco, setNovoBloco] = useState(criarNovoBlocoTimeline);
  const [subBlocoAbertoId, setSubBlocoAbertoId] = useState("");
  const [criandoSubBlocoDeId, setCriandoSubBlocoDeId] = useState("");
  const [novoSubBloco, setNovoSubBloco] = useState(criarNovoSubBlocoTimeline);
  const ultimaVersaoSalva = useRef(assinarLinhaTempo(item));
  const [assinaturaLinhaSalva, setAssinaturaLinhaSalva] = useState(() => assinarLinhaTempo(item));
  const { mostrarFeedback } = useFeedback();

  useEffect(() => {
    const assinaturaInicial = assinarLinhaTempo(item);
    setEdicao(item);
    ultimaVersaoSalva.current = assinaturaInicial;
    setAssinaturaLinhaSalva(assinaturaInicial);
    setBlocoAbertoId((idAtual) => {
      const blocosAtuais = item.blocos || [];
      if (blocosAtuais.some((bloco) => String(bloco.id) === String(idAtual))) return idAtual;
      return blocosAtuais.at(-1)?.id || "";
    });
  }, [item]);

  const blocos = [...(edicao.blocos || [])].sort((a, b) => a.ordem - b.ordem);
  const linhaTemAlteracoesPendentes = assinarLinhaTempo(edicao) !== assinaturaLinhaSalva;
  const imagemExibida = imagemPodeSerMostrada(edicao.imagemUrl) ? edicao.imagemUrl : "";
  const temImagem = Boolean(imagemExibida);

  useUnsavedChangesWarning(linhaTemAlteracoesPendentes, "A linha do tempo ainda está salvando alterações.");

  useEffect(() => {
    const assinatura = assinarLinhaTempo(edicao);
    if (assinatura === ultimaVersaoSalva.current) return undefined;

    const temporizador = window.setTimeout(async () => {
      try {
        const linhaAtualizada = prepararLinhaTempo(edicao);
        await onSave(linhaAtualizada, { silencioso: true });
        const assinaturaAtualizada = assinarLinhaTempo(linhaAtualizada);
        ultimaVersaoSalva.current = assinaturaAtualizada;
        setAssinaturaLinhaSalva(assinaturaAtualizada);
      } catch (error) {
        mostrarFeedback(error.message || "Não foi possível salvar a linha do tempo.", "erro");
      }
    }, 700);

    return () => window.clearTimeout(temporizador);
  }, [edicao]);

  const salvarLinhaAgora = async (alteracoes = edicao) => {
    const linhaAtualizada = prepararLinhaTempo(alteracoes);
    setEdicao(linhaAtualizada);

    try {
      await onSave(linhaAtualizada, { silencioso: true });
      const assinaturaAtualizada = assinarLinhaTempo(linhaAtualizada);
      ultimaVersaoSalva.current = assinaturaAtualizada;
      setAssinaturaLinhaSalva(assinaturaAtualizada);
    } catch (error) {
      mostrarFeedback(error.message || "Não foi possível salvar a linha do tempo.", "erro");
    }
  };

  const selecionarImagemLinha = async (event) => {
    const arquivo = event.target.files?.[0];
    if (!arquivo) return;

    try {
      const imagemUrl = await processarImagem(arquivo, { tamanhoMaximo: 760, qualidade: 0.74, bytesMaximos: 150 * 1024 }, "Imagem de fundo");
      setEdicao((atual) => ({ ...atual, imagemUrl }));
    } catch (error) {
      mostrarFeedback(error.message || "Não foi possível carregar a imagem.", "erro");
    }
  };

  const adicionarPrimeiroBloco = async (event) => {
    event.preventDefault();

    if (!novoBloco.titulo.trim()) return;

    const blocoCriado = criarBlocoLinhaTempo({ ...novoBloco, setaTexto: "", ordem: 0 });
    const blocosAtualizados = normalizarOrdemBlocos([blocoCriado]);
    const linhaAtualizada = { ...edicao, blocos: blocosAtualizados };
    setNovoBloco(criarNovoBlocoTimeline());
    setBlocoAbertoId(blocoCriado.id);
    await salvarLinhaAgora(linhaAtualizada);
  };

  const adicionarBlocoDepois = async (event, blocoAnteriorId) => {
    event.preventDefault();

    if (!novoBloco.titulo.trim()) return;

    const indiceAnterior = blocos.findIndex((bloco) => String(bloco.id) === String(blocoAnteriorId));
    if (indiceAnterior < 0) return;

    const blocoCriado = criarBlocoLinhaTempo({
      titulo: novoBloco.titulo,
      descricao: novoBloco.descricao,
      setaAtiva: novoBloco.setaAtiva,
      setaTexto: "",
      ordem: indiceAnterior + 1,
    });
    const blocosAtualizados = [...blocos];
    blocosAtualizados[indiceAnterior] = {
      ...blocosAtualizados[indiceAnterior],
      setaAtiva: novoBloco.setaAtiva,
      setaTexto: novoBloco.setaTexto,
    };
    blocosAtualizados.splice(indiceAnterior + 1, 0, blocoCriado);

    setNovoBloco(criarNovoBlocoTimeline());
    setCriandoDepoisDeId("");
    setBlocoAbertoId(blocoCriado.id);
    await salvarLinhaAgora({ ...edicao, blocos: normalizarOrdemBlocos(blocosAtualizados) });
  };

  const atualizarBloco = (blocoId, alteracoes) => {
    setEdicao((atual) => ({
      ...atual,
      blocos: (atual.blocos || []).map((bloco) => (String(bloco.id) === String(blocoId) ? { ...bloco, ...alteracoes } : bloco)),
    }));
  };

  const moverBloco = async (blocoId, direcao) => {
    const blocosAtualizados = moverBlocoNaLinha(blocos, blocoId, direcao);
    await salvarLinhaAgora({ ...edicao, blocos: blocosAtualizados });
  };

  const removerBloco = async (blocoId) => {
    const blocosAtualizados = normalizarOrdemBlocos(blocos.filter((bloco) => String(bloco.id) !== String(blocoId)));
    setBlocoAbertoId((idAtual) => (String(idAtual) === String(blocoId) ? "" : idAtual));
    await salvarLinhaAgora({ ...edicao, blocos: blocosAtualizados });
  };

  const abrirCriacaoSubBloco = (blocoId) => {
    setCriandoSubBlocoDeId(blocoId);
    setNovoSubBloco(criarNovoSubBlocoTimeline());
  };

  const cancelarCriacaoSubBloco = () => {
    setCriandoSubBlocoDeId("");
    setNovoSubBloco(criarNovoSubBlocoTimeline());
  };

  const adicionarSubBloco = async (event, blocoId) => {
    event.preventDefault();

    if (!novoSubBloco.titulo.trim()) return;

    const blocosAtualizados = blocos.map((bloco) => {
      if (String(bloco.id) !== String(blocoId)) return bloco;

      const subBlocosAtuais = ordenarSubBlocos(bloco.subBlocos || []);
      const subBlocoCriado = criarSubBlocoLinhaTempo({
        ...novoSubBloco,
        ordem: subBlocosAtuais.length,
      });
      setSubBlocoAbertoId(subBlocoCriado.id);

      return {
        ...bloco,
        subBlocos: ordenarSubBlocos([...subBlocosAtuais, subBlocoCriado]),
      };
    });

    cancelarCriacaoSubBloco();
    await salvarLinhaAgora({ ...edicao, blocos: blocosAtualizados });
  };

  const atualizarSubBloco = (blocoId, subBlocoId, alteracoes) => {
    setEdicao((atual) => ({
      ...atual,
      blocos: (atual.blocos || []).map((bloco) => {
        if (String(bloco.id) !== String(blocoId)) return bloco;

        return {
          ...bloco,
          subBlocos: ordenarSubBlocos(bloco.subBlocos || []).map((subBloco) =>
            String(subBloco.id) === String(subBlocoId) ? { ...subBloco, ...alteracoes } : subBloco,
          ),
        };
      }),
    }));
  };

  const moverSubBloco = async (blocoId, subBlocoId, direcao) => {
    const blocosAtualizados = blocos.map((bloco) =>
      String(bloco.id) === String(blocoId)
        ? { ...bloco, subBlocos: moverSubBlocoNaLista(bloco.subBlocos || [], subBlocoId, direcao) }
        : bloco,
    );

    await salvarLinhaAgora({ ...edicao, blocos: blocosAtualizados });
  };

  const removerSubBloco = async (blocoId, subBlocoId) => {
    const blocosAtualizados = blocos.map((bloco) =>
      String(bloco.id) === String(blocoId)
        ? { ...bloco, subBlocos: ordenarSubBlocos((bloco.subBlocos || []).filter((subBloco) => String(subBloco.id) !== String(subBlocoId))) }
        : bloco,
    );

    setSubBlocoAbertoId((idAtual) => (String(idAtual) === String(subBlocoId) ? "" : idAtual));
    await salvarLinhaAgora({ ...edicao, blocos: blocosAtualizados });
  };

  const iniciarNovoBloco = (blocoId) => {
    setCriandoDepoisDeId(blocoId);
    setNovoBloco(criarNovoBlocoTimeline());
    setBlocoAbertoId("");
  };

  const recolherBlocoAoPerderFoco = (event, blocoId) => {
    const blocoAtual = event.currentTarget;
    const proximoFoco = event.relatedTarget;

    if (proximoFoco && blocoAtual.contains(proximoFoco)) return;

    window.setTimeout(() => {
      if (!blocoAtual.contains(document.activeElement)) {
        setBlocoAbertoId((idAtual) => (String(idAtual) === String(blocoId) ? "" : idAtual));
      }
    }, 0);
  };

  return (
    <>
      <article className={"world-shelf-item timeline-world-item " + classePar + " " + (aberto ? "modal-open" : "")}>
        <button
          type="button"
          className={"world-item-cover timeline-cover " + (temImagem ? "has-image" : "")}
          style={{ "--world-item-color": edicao.cor || item.cor || "#8f1d43" }}
          onClick={onToggleAberto}
        >
          {temImagem && <img className="world-item-image" src={imagemExibida} alt="" loading="lazy" />}
          <span className="world-item-cover-content">
            <span>Linha do tempo</span>
            <strong>{edicao.nome}</strong>
            <small>{blocos.length} bloco(s)</small>
            <small>Atualizado: {formatarData(item.atualizadoEm)}</small>
          </span>
        </button>
      </article>

      {aberto && (
        <WorldItemModal
          titulo={edicao.nome || "Linha sem nome"}
          subtitulo="Linha do tempo"
          onClose={onToggleAberto}
          className="timeline-world-modal"
        >
          <div className="world-item-detail timeline-detail">
          <div className="form-grid two">
            <label className="field-group compact">
              <span>Nome da linha</span>
              <input value={edicao.nome} onChange={(event) => setEdicao({ ...edicao, nome: event.target.value })} />
            </label>
            <label className="field-group compact">
              <span>Resumo</span>
              <input value={edicao.categoria} onChange={(event) => setEdicao({ ...edicao, categoria: event.target.value })} />
            </label>
          </div>

          <label className="field-group compact timeline-color-field">
            <span>Cor da linha</span>
            <input type="color" value={edicao.cor || "#8f1d43"} onChange={(event) => setEdicao({ ...edicao, cor: event.target.value })} />
          </label>

          <WorldImageSource
            compact
            imagemUrl={edicao.imagemUrl}
            onChange={(imagemUrl) => setEdicao({ ...edicao, imagemUrl })}
            onSelectFile={selecionarImagemLinha}
            onInvalid={mostrarFeedback}
          />

          <label className="field-group compact">
            <span>Descrição</span>
            <textarea
              className="timeline-description-field"
              value={edicao.descricao}
              onChange={(event) => setEdicao({ ...edicao, descricao: event.target.value })}
              rows={6}
            />
          </label>

          <div className="timeline-stack">
            {blocos.length === 0 && (
              <TimelineBlockComposer
                primeiro
                bloco={novoBloco}
                onChange={setNovoBloco}
                onSubmit={adicionarPrimeiroBloco}
              />
            )}

            {blocos.map((bloco, indice) => (
              <div className="timeline-block-wrap" key={bloco.id}>
                <article
                  className={"timeline-block " + (String(blocoAbertoId) === String(bloco.id) ? "expanded" : "collapsed")}
                  style={{ "--timeline-block-color": bloco.cor }}
                  onFocusCapture={() => setBlocoAbertoId(bloco.id)}
                  onBlurCapture={(event) => recolherBlocoAoPerderFoco(event, bloco.id)}
                >
                  <button type="button" className="timeline-block-summary" onClick={() => setBlocoAbertoId(bloco.id)}>
                    <small>{String(indice + 1).padStart(2, "0")}</small>
                    <strong>{bloco.titulo}</strong>
                  </button>

                  {String(blocoAbertoId) === String(bloco.id) && (
                    <div className="timeline-block-editor">
                      <div className="timeline-block-actions">
                        <button type="button" onClick={() => setBlocoAbertoId("")}>
                          Recolher
                        </button>
                        <button type="button" onClick={() => moverBloco(bloco.id, -1)} disabled={indice === 0}>
                          Subir
                        </button>
                        <button type="button" onClick={() => moverBloco(bloco.id, 1)} disabled={indice === blocos.length - 1}>
                          Descer
                        </button>
                        <button type="button" onClick={() => removerBloco(bloco.id)}>
                          Remover
                        </button>
                      </div>

                      <label className="field-group compact">
                        <span>Título</span>
                        <input value={bloco.titulo} onChange={(event) => atualizarBloco(bloco.id, { titulo: event.target.value })} />
                      </label>

                      <label className="field-group compact">
                        <span>Descrição</span>
                        <textarea
                          className="timeline-block-description"
                          value={bloco.descricao}
                          onChange={(event) => atualizarBloco(bloco.id, { descricao: event.target.value })}
                          rows={5}
                        />
                      </label>

                      <TimelineSubBlocks
                        bloco={bloco}
                        subBlocoAbertoId={subBlocoAbertoId}
                        criandoSubBloco={criandoSubBlocoDeId === bloco.id}
                        novoSubBloco={novoSubBloco}
                        onOpenSubBlock={setSubBlocoAbertoId}
                        onChangeNewSubBlock={setNovoSubBloco}
                        onStartCreate={() => abrirCriacaoSubBloco(bloco.id)}
                        onCancelCreate={cancelarCriacaoSubBloco}
                        onSubmitCreate={(event) => adicionarSubBloco(event, bloco.id)}
                        onUpdate={(subBlocoId, alteracoes) => atualizarSubBloco(bloco.id, subBlocoId, alteracoes)}
                        onMove={(subBlocoId, direcao) => moverSubBloco(bloco.id, subBlocoId, direcao)}
                        onRemove={(subBlocoId) => removerSubBloco(bloco.id, subBlocoId)}
                      />
                    </div>
                  )}
                </article>

                {indice < blocos.length - 1 && (
                  <div className={"timeline-arrow-slot " + (bloco.setaAtiva ? "active" : "inactive")}>
                    {bloco.setaAtiva ? (
                      <>
                        <label className="timeline-arrow-label">
                          <input
                            value={bloco.setaTexto || ""}
                            onChange={(event) => atualizarBloco(bloco.id, { setaTexto: event.target.value })}
                            placeholder="Digite aqui o que liga este bloco ao próximo"
                            aria-label="Texto que liga este bloco ao próximo"
                          />
                        </label>
                        <button
                          type="button"
                          className="timeline-arrow-remove"
                          onClick={() => atualizarBloco(bloco.id, { setaAtiva: false, setaTexto: "" })}
                        >
                          Sem seta
                        </button>
                      </>
                    ) : (
                      <button type="button" className="timeline-arrow-add" onClick={() => atualizarBloco(bloco.id, { setaAtiva: true })}>
                        Adicionar seta
                      </button>
                    )}
                  </div>
                )}

                {criandoDepoisDeId === bloco.id ? (
                  <TimelineBlockComposer
                    bloco={novoBloco}
                    onChange={setNovoBloco}
                    onSubmit={(event) => adicionarBlocoDepois(event, bloco.id)}
                    onCancel={() => {
                      setCriandoDepoisDeId("");
                      setNovoBloco(criarNovoBlocoTimeline());
                    }}
                  />
                ) : !criandoDepoisDeId ? (
                  <button type="button" className="timeline-add-after" onClick={() => iniciarNovoBloco(bloco.id)}>
                    +
                  </button>
                ) : null}
              </div>
            ))}
          </div>

          <div className="timeline-footer-actions">
            <button type="button" className="button danger" onClick={onRemove}>
              Remover linha
            </button>
          </div>
          </div>
        </WorldItemModal>
      )}
    </>
  );
}

function TimelineBlockComposer({ bloco, onChange, onSubmit, onCancel, primeiro = false }) {
  return (
    <form className={"timeline-block-form " + (primeiro ? "first" : "")} onSubmit={onSubmit}>
      {!primeiro && (
        <div className="timeline-composer-arrow">
          <label>
            <input
              type="checkbox"
              checked={Boolean(bloco.setaAtiva)}
              onChange={(event) => onChange({ ...bloco, setaAtiva: event.target.checked, setaTexto: event.target.checked ? bloco.setaTexto : "" })}
            />
            <span>Adicionar seta de ligação</span>
          </label>

          {bloco.setaAtiva && (
            <input
              className="timeline-arrow-input"
              value={bloco.setaTexto || ""}
              onChange={(event) => onChange({ ...bloco, setaTexto: event.target.value })}
              placeholder="Digite aqui o que liga o bloco anterior ao próximo"
              aria-label="Texto que liga o bloco anterior ao próximo"
            />
          )}
        </div>
      )}

      <label className="field-group compact">
        <span>{primeiro ? "Primeiro bloco" : "Próximo bloco"}</span>
        <input
          value={bloco.titulo}
          onChange={(event) => onChange({ ...bloco, titulo: event.target.value })}
          placeholder="Título do evento"
        />
      </label>

      <label className="field-group compact">
        <span>Descrição do bloco</span>
        <textarea
          className="timeline-block-description"
          value={bloco.descricao}
          onChange={(event) => onChange({ ...bloco, descricao: event.target.value })}
          rows={5}
        />
      </label>

      <div className="timeline-composer-actions">
        {onCancel && (
          <button type="button" className="button secondary timeline-cancel-button" onClick={onCancel}>
            Cancelar
          </button>
        )}
        <button type="submit" className="button primary" disabled={!bloco.titulo.trim()}>
          {primeiro ? "Criar primeiro bloco" : "Criar bloco"}
        </button>
      </div>
    </form>
  );
}

function TimelineSubBlocks({
  bloco,
  subBlocoAbertoId,
  criandoSubBloco,
  novoSubBloco,
  onOpenSubBlock,
  onChangeNewSubBlock,
  onStartCreate,
  onCancelCreate,
  onSubmitCreate,
  onUpdate,
  onMove,
  onRemove,
}) {
  const subBlocos = ordenarSubBlocos(bloco.subBlocos || []);

  return (
    <section className="timeline-subblocks">
      <div className="timeline-subblocks-header">
        <div>
          <span className="eyebrow">Subblocos</span>
          <strong>{subBlocos.length} detalhe(s) dentro deste bloco</strong>
        </div>
        {!criandoSubBloco && (
          <button type="button" onClick={onStartCreate}>
            Adicionar subbloco
          </button>
        )}
      </div>

      {subBlocos.length > 0 && (
        <div className="timeline-subblock-list">
          {subBlocos.map((subBloco, indice) => {
            const aberto = String(subBlocoAbertoId) === String(subBloco.id);

            return (
              <article className={"timeline-subblock " + (aberto ? "expanded" : "collapsed")} key={subBloco.id} style={{ "--subblock-color": subBloco.cor || "#8f1d43" }}>
                <button type="button" className="timeline-subblock-summary" onClick={() => onOpenSubBlock(aberto ? "" : subBloco.id)}>
                  <small>{String(indice + 1).padStart(2, "0")}</small>
                  <strong>{subBloco.titulo}</strong>
                </button>

                {aberto && (
                  <div className="timeline-subblock-editor">
                    <div className="timeline-subblock-actions">
                      <button type="button" onClick={() => onOpenSubBlock("")}>
                        Recolher
                      </button>
                      <button type="button" onClick={() => onMove(subBloco.id, -1)} disabled={indice === 0}>
                        Subir
                      </button>
                      <button type="button" onClick={() => onMove(subBloco.id, 1)} disabled={indice === subBlocos.length - 1}>
                        Descer
                      </button>
                      <button type="button" onClick={() => onRemove(subBloco.id)}>
                        Remover
                      </button>
                    </div>

                    <label className="field-group compact">
                      <span>Título</span>
                      <input value={subBloco.titulo} onChange={(event) => onUpdate(subBloco.id, { titulo: event.target.value })} />
                    </label>

                    <label className="field-group compact">
                      <span>Descrição</span>
                      <textarea value={subBloco.descricao} onChange={(event) => onUpdate(subBloco.id, { descricao: event.target.value })} rows={3} />
                    </label>
                  </div>
                )}
              </article>
            );
          })}
        </div>
      )}

      {criandoSubBloco && (
        <form className="timeline-subblock-form" onSubmit={onSubmitCreate}>
          <label className="field-group compact">
            <span>Novo subbloco</span>
            <input
              value={novoSubBloco.titulo}
              onChange={(event) => onChangeNewSubBlock({ ...novoSubBloco, titulo: event.target.value })}
              placeholder="Um detalhe, consequência ou microevento"
            />
          </label>
          <label className="field-group compact">
            <span>Descrição</span>
            <textarea
              value={novoSubBloco.descricao}
              onChange={(event) => onChangeNewSubBlock({ ...novoSubBloco, descricao: event.target.value })}
              rows={3}
            />
          </label>
          <div className="timeline-composer-actions">
            <button type="button" className="button secondary timeline-cancel-button" onClick={onCancelCreate}>
              Cancelar
            </button>
            <button type="submit" className="button primary" disabled={!novoSubBloco.titulo.trim()}>
              Criar subbloco
            </button>
          </div>
        </form>
      )}
    </section>
  );
}

function MundoLinkPicker({ alvos, selecionados, onChange }) {
  const idsSelecionados = new Set((selecionados || []).map(String));
  const [aberto, setAberto] = useState(false);
  const secoesDisponiveis = montarSecoesAlvosMundo(alvos);
  const [secaoSelecionadaId, setSecaoSelecionadaId] = useState(secoesDisponiveis[0]?.id || "");
  const secaoAtivaId = secoesDisponiveis.some((secao) => secao.id === secaoSelecionadaId)
    ? secaoSelecionadaId
    : secoesDisponiveis[0]?.id || "";
  const alvosDaSecao = alvos.filter((alvo) => String(alvo.secaoId || "") === String(secaoAtivaId));
  const alvosSelecionados = resolverAlvosMundo(alvos, selecionados);

  useEffect(() => {
    if (!secoesDisponiveis.length) return;
    if (secoesDisponiveis.some((secao) => secao.id === secaoSelecionadaId)) return;

    setSecaoSelecionadaId(secoesDisponiveis[0].id);
  }, [secaoSelecionadaId, secoesDisponiveis]);

  if (alvos.length === 0) {
    return (
      <div className="world-link-empty">
        <strong>Sem alvos no mundo</strong>
        <span>Crie lugares, facções, regras ou outras seções para ligar este item.</span>
      </div>
    );
  }

  return (
    <section className={"world-link-picker " + (aberto ? "expanded" : "collapsed")}>
      <button type="button" className="world-link-toggle" onClick={() => setAberto((valor) => !valor)}>
        <span>Citações e vínculos</span>
        <strong>{alvosSelecionados.length > 0 ? alvosSelecionados.length + " ligado(s)" : "Nenhum vínculo"}</strong>
      </button>

      {aberto && (
        <div className="world-link-body">
          {alvosSelecionados.length > 0 && (
            <div className="world-link-chips">
              <span>Selecionados</span>
              <div>
                {alvosSelecionados.map((alvo) => (
                  <small key={alvo.id} style={{ "--world-link-color": alvo.cor || "#8f1d43" }}>
                    {alvo.nome} · {alvo.caminho}
                  </small>
                ))}
              </div>
            </div>
          )}

          <div className="world-link-sections">
            {secoesDisponiveis.map((secao) => (
              <button
                key={secao.id}
                type="button"
                className={String(secao.id) === String(secaoAtivaId) ? "active" : ""}
                onClick={() => setSecaoSelecionadaId(secao.id)}
              >
                <span>{secao.nome}</span>
                <strong>{secao.total}</strong>
              </button>
            ))}
          </div>

          <div className="world-link-options">
            {alvosDaSecao.map((alvo) => {
              const ativo = idsSelecionados.has(String(alvo.id));

              return (
                <button
                  key={alvo.id}
                  type="button"
                  className={ativo ? "active" : ""}
                  style={{ "--world-link-color": alvo.cor || "#8f1d43" }}
                  onClick={() => onChange(alternarId(selecionados, alvo.id))}
                >
                  <i />
                  <strong>{alvo.nome}</strong>
                  <small>{alvo.caminho}</small>
                </button>
              );
            })}

            {alvosDaSecao.length === 0 && (
              <div className="world-link-empty compact">
                <strong>Nada nesta seção</strong>
                <span>Escolha outra seção para ver itens disponíveis.</span>
              </div>
            )}
          </div>
        </div>
      )}
    </section>
  );
}

function PersonagemPicker({ personagens, selecionados, onChange }) {
  const idsSelecionados = new Set((selecionados || []).map(String));

  if (personagens.length === 0) {
    return (
      <div className="character-picker-empty">
        <strong>Sem personagens criados</strong>
        <span>Crie personagens para ligá-los aos itens do mundo.</span>
      </div>
    );
  }

  return (
    <div className="character-picker">
      <span>Personagens ligados</span>
      <div>
        {personagens.map((personagem) => {
          const ativo = idsSelecionados.has(String(personagem.id));

          return (
            <button
              key={personagem.id}
              type="button"
              className={ativo ? "active" : ""}
              style={{ "--character-color": personagem.cor }}
              onClick={() => onChange(alternarId(selecionados, personagem.id))}
            >
              <i />
              <strong>{personagem.nome}</strong>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function relacionarLugarComPersonagens(tipo, item, personagens) {
  if (tipo !== "lugares") return item;

  const ids = new Set((item.personagensIds || []).map(String));
  personagens.forEach((personagem) => {
    if (String(personagem.regiaoId || "") === String(item.id)) {
      ids.add(String(personagem.id));
    }
  });

  return {
    ...item,
    personagensIds: [...ids],
  };
}

function alternarId(lista = [], id) {
  const ids = new Set((lista || []).map(String));
  const idTexto = String(id);

  if (ids.has(idTexto)) {
    ids.delete(idTexto);
  } else {
    ids.add(idTexto);
  }

  return [...ids];
}

function montarAlvosMundo(livro, secoes = []) {
  if (!livro) return [];

  return secoes.flatMap((secao) => {
    const itens = livro.mundo?.[secao.id] || [];

    return itens.flatMap((item) => {
      const alvoItem = {
        id: String(item.id),
        nome: item.nome,
        caminho: secao.nome,
        secaoId: secao.id,
        cor: item.cor || "#8f1d43",
        tipo: "item",
      };
      const ramificacoes =
        secao.id === "lugares"
          ? ordenarRamificacoes(item.ramificacoes || []).map((ramo) => ({
              id: String(ramo.id),
              nome: ramo.nome,
              caminho: secao.nome + " / " + item.nome,
              secaoId: secao.id,
              itemPaiId: item.id,
              cor: ramo.cor || item.cor || "#8f1d43",
              tipo: "ramificacao",
            }))
          : [];
      const mapasInternos =
        secao.id === "mapas"
          ? ordenarMapasInternos(item.mapasInternos || []).map((mapa) => ({
              id: String(mapa.id),
              nome: mapa.nome,
              caminho: secao.nome + " / " + item.nome,
              secaoId: secao.id,
              itemPaiId: item.id,
              cor: mapa.cor || item.cor || "#8f1d43",
              tipo: "mapaInterno",
            }))
          : [];

      return [alvoItem, ...ramificacoes, ...mapasInternos];
    });
  });
}

function montarSecoesAlvosMundo(alvos = []) {
  const secoes = new Map();

  alvos.forEach((alvo) => {
    const id = String(alvo.secaoId || "geral");
    const nome = alvo.caminho?.split(" / ")[0] || "Geral";
    const secaoAtual = secoes.get(id) || { id, nome, total: 0 };

    secoes.set(id, {
      ...secaoAtual,
      total: secaoAtual.total + 1,
    });
  });

  return Array.from(secoes.values());
}

function resolverAlvosMundo(alvos = [], ids = []) {
  const idsSelecionados = new Set((ids || []).map(String));
  return alvos.filter((alvo) => idsSelecionados.has(String(alvo.id)));
}

function criarResumoCardMundo(tipo, item, ramificacoes = [], alvos = [], personagens = [], mapasInternos = []) {
  const partes = [item.categoria || "Sem categoria"];

  if (tipo === "mapas" && item.costumes?.trim()) {
    partes.push("costumes");
  }

  if (tipo === "mapas" && mapasInternos.length > 0) {
    partes.push(mapasInternos.length + " mapa(s)");
  }

  if (tipo === "lugares" && ramificacoes.length > 0) {
    partes.push(ramificacoes.length + " ramif.");
  }

  if (alvos.length > 0) {
    partes.push("ligado a " + alvos.length);
  }

  if ((tipo === "lugares" || tipo === "mapas") && personagens.length > 0) {
    partes.push(personagens.length + " pers.");
  }

  return partes.join(" · ");
}

function removerAlvosSelecionaveis(alvos = [], idsBloqueados = []) {
  const bloqueados = new Set((idsBloqueados || []).map(String));
  return alvos.filter((alvo) => !bloqueados.has(String(alvo.id)));
}

function ordenarRamificacoes(ramificacoes = []) {
  return [...(ramificacoes || [])]
    .sort((a, b) => Number(a.ordem || 0) - Number(b.ordem || 0))
    .map((ramo, indice) => ({
      ...ramo,
      ordem: indice,
    }));
}

function ordenarMapasInternos(mapas = []) {
  return [...(mapas || [])]
    .sort((a, b) => Number(a.ordem || 0) - Number(b.ordem || 0))
    .map((mapa, indice) => ({
      ...mapa,
      ordem: indice,
    }));
}

function montarSecoesMundo(livro) {
  const secoesSalvas = livro?.secoesMundo || [];
  const secoesBase = secoesMundoBase.map((secao) => ({
    ...secao,
    base: true,
    fixa: true,
  }));
  const secoesCustomizadas = secoesSalvas
    .filter((secao) => !idsSecoesFixas.has(secao.id))
    .map((secao) => ({
      ...secao,
      personalizada: true,
      fixa: false,
    }));

  return [...secoesBase, ...secoesCustomizadas, secaoLinhaTempo];
}

function prepararSecoesParaSalvar(secoes = []) {
  return secoes
    .filter((secao) => secao.personalizada && !idsSecoesFixas.has(secao.id))
    .map((secao) => ({
      id: secao.id,
      nome: secao.nome,
      categoria: secao.categoria,
      personalizada: Boolean(secao.personalizada),
    }));
}

function criarIdSecaoMundo(nome, secoes = []) {
  const base = slugMundo(nome) || "secao";
  const ids = new Set(secoes.map((secao) => secao.id));
  let tentativa = "secao-" + base;
  let contador = 2;

  while (ids.has(tentativa) || tentativa === "secao-linhaDoTempo") {
    tentativa = "secao-" + base + "-" + contador;
    contador += 1;
  }

  return tentativa;
}

function slugMundo(texto = "") {
  return texto
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function prepararLinhaTempo(linha = {}) {
  return {
    ...linha,
    blocos: normalizarOrdemBlocos(linha.blocos || []),
  };
}

function useUnsavedChangesWarning(ativo, mensagem) {
  useEffect(() => {
    return undefined;
  }, [ativo, mensagem]);
}

function itemMundoTemConteudo(item = {}) {
  return Boolean(
    item.nome?.trim() ||
      item.categoria?.trim() ||
      item.descricao?.trim() ||
      item.costumes?.trim() ||
      item.conflito?.trim() ||
      item.conexoes?.trim() ||
      item.imagemUrl ||
      (item.personagensIds || []).length ||
      (item.vinculosMundoIds || []).length ||
      (item.blocos || []).some((bloco) => bloco?.titulo?.trim() || bloco?.descricao?.trim()) ||
      (item.mapasInternos || []).some((mapa) => mapa?.nome?.trim() || mapa?.descricao?.trim() || mapa?.imagemUrl),
  );
}

function assinarItemMundo(item = {}) {
  const { atualizadoEm, ...itemComparavel } = item;
  return JSON.stringify({
    ...itemComparavel,
    ramificacoes: ordenarRamificacoes(itemComparavel.ramificacoes || []),
    mapasInternos: ordenarMapasInternos(itemComparavel.mapasInternos || []),
    blocos: normalizarOrdemBlocos(itemComparavel.blocos || []),
    personagensIds: [...(itemComparavel.personagensIds || [])].map(String).sort(),
    vinculosMundoIds: [...(itemComparavel.vinculosMundoIds || [])].map(String).sort(),
  });
}

function assinarLinhaTempo(linha = {}) {
  const linhaPreparada = prepararLinhaTempo(linha);
  const { atualizadoEm, ...linhaComparavel } = linhaPreparada;

  return JSON.stringify(linhaComparavel);
}

function criarNovoBlocoTimeline() {
  return {
    titulo: "",
    descricao: "",
    setaTexto: "",
    setaAtiva: false,
  };
}

function criarNovoSubBlocoTimeline() {
  return {
    titulo: "",
    descricao: "",
    cor: sortearCorMundo(),
  };
}

function normalizarOrdemBlocos(blocos = []) {
  return [...blocos].map((bloco, ordem) => ({
    ...bloco,
    setaAtiva: bloco.setaAtiva ?? Boolean(bloco.setaTexto),
    subBlocos: ordenarSubBlocos(bloco.subBlocos || []),
    ordem,
  }));
}

function moverBlocoNaLinha(blocos = [], blocoId, direcao) {
  const lista = normalizarOrdemBlocos(blocos);
  const indice = lista.findIndex((bloco) => String(bloco.id) === String(blocoId));
  const novoIndice = indice + direcao;

  if (indice < 0 || novoIndice < 0 || novoIndice >= lista.length) {
    return lista;
  }

  const [bloco] = lista.splice(indice, 1);
  lista.splice(novoIndice, 0, bloco);

  return normalizarOrdemBlocos(lista);
}

function ordenarSubBlocos(subBlocos = []) {
  return [...(subBlocos || [])]
    .sort((a, b) => Number(a.ordem || 0) - Number(b.ordem || 0))
    .map((subBloco, ordem) => ({ ...subBloco, ordem }));
}

function moverSubBlocoNaLista(subBlocos = [], subBlocoId, direcao) {
  const lista = ordenarSubBlocos(subBlocos);
  const indice = lista.findIndex((subBloco) => String(subBloco.id) === String(subBlocoId));
  const novoIndice = indice + direcao;

  if (indice < 0 || novoIndice < 0 || novoIndice >= lista.length) {
    return lista;
  }

  const [subBloco] = lista.splice(indice, 1);
  lista.splice(novoIndice, 0, subBloco);

  return ordenarSubBlocos(lista);
}

function limparTemporizadorCriacao(referencia) {
  if (referencia.current) {
    window.clearInterval(referencia.current);
    referencia.current = null;
  }
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
