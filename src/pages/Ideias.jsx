import { useEffect, useMemo, useState } from "react";

import EmptyBookState from "../components/EmptyBookState";
import { useStoryData } from "../context/StoryDataContext";

const ideiaInicial = {
  titulo: "",
  tipo: "Cena possível",
  descricao: "",
  contexto: "",
  cenaPossivel: "",
  estado: "bruta",
  prioridade: "media",
  etiquetas: "",
  cor: "#8f1d43",
  aparencia: "pergaminho",
  vinculosMundoIds: [],
  vinculosPersonagemIds: [],
  vinculosCapituloIds: [],
};

const tiposIdeia = [
  "Cena possível",
  "Explicação do mundo",
  "Conexão",
  "Diálogo",
  "Conflito",
  "Mistério",
  "Sistema mágico",
  "Cultura",
  "Política",
  "Religião",
  "Objeto importante",
  "Pista",
  "Tema",
  "Clímax",
  "Pesquisa",
  "Regra narrativa",
  "Outro",
];

const aparenciasIdeia = [
  { id: "pergaminho", label: "Pergaminho" },
  { id: "carta", label: "Carta" },
  { id: "brilho", label: "Brilho sutil" },
  { id: "arquivo", label: "Arquivo" },
  { id: "noite", label: "Noite" },
];

const estadosIdeia = [
  { id: "bruta", label: "Bruta" },
  { id: "desenvolver", label: "Desenvolver" },
  { id: "usar", label: "Usar" },
  { id: "arquivada", label: "Arquivada" },
];

const prioridadesIdeia = [
  { id: "baixa", label: "Baixa" },
  { id: "media", label: "Média" },
  { id: "alta", label: "Alta" },
];

const secoesFixasMundo = [
  { id: "lugares", nome: "Lugares" },
  { id: "faccoes", nome: "Facções" },
  { id: "regras", nome: "Regras" },
  { id: "mapas", nome: "Mapas" },
  { id: "linhaDoTempo", nome: "Linha do Tempo" },
];

export default function Ideias() {
  const { livroSelecionado, adicionarIdeia, salvarIdeia, removerIdeia } = useStoryData();
  const [modalCriacaoAberto, setModalCriacaoAberto] = useState(false);
  const [ideiaSelecionadaId, setIdeiaSelecionadaId] = useState("");
  const [modoEdicao, setModoEdicao] = useState(false);
  const [novaIdeia, setNovaIdeia] = useState(ideiaInicial);
  const [filtroEstado, setFiltroEstado] = useState("todas");
  const [filtroTipo, setFiltroTipo] = useState("todos");
  const [busca, setBusca] = useState("");

  const ideias = livroSelecionado?.ideias || [];
  const secoesMundo = useMemo(() => montarSecoesMundo(livroSelecionado), [livroSelecionado]);
  const todosItensMundo = useMemo(() => secoesMundo.flatMap((secao) => secao.itens), [secoesMundo]);
  const mapaMundo = useMemo(() => new Map(todosItensMundo.map((item) => [String(item.id), item])), [todosItensMundo]);
  const personagensIdeia = livroSelecionado?.personagens || [];
  const capitulosIdeia = livroSelecionado?.capitulos || [];
  const mapaPersonagensIdeia = useMemo(() => new Map(personagensIdeia.map((personagem) => [String(personagem.id), personagem])), [personagensIdeia]);
  const mapaCapitulosIdeia = useMemo(() => new Map(capitulosIdeia.map((capitulo) => [String(capitulo.id), capitulo])), [capitulosIdeia]);
  const tiposDisponiveis = useMemo(() => ["todos", ...new Set([...tiposIdeia, ...ideias.map((ideia) => ideia.tipo).filter(Boolean)])], [ideias]);
  const estadosDisponiveis = useMemo(() => {
    const estados = new Map(estadosIdeia.map((estado) => [estado.id, estado]));
    ideias.forEach((ideia) => {
      if (ideia.estado && !estados.has(ideia.estado)) {
        estados.set(ideia.estado, { id: ideia.estado, label: formatarNomeSecao(ideia.estado) });
      }
    });
    return Array.from(estados.values());
  }, [ideias]);

  const ideiasFiltradas = useMemo(
    () =>
      ideias.filter((ideia) => {
        const textoBusca = [ideia.titulo, ideia.descricao, ideia.contexto, ideia.cenaPossivel, ideia.etiquetas]
          .join(" ")
          .toLowerCase();
        const combinaBusca = !busca.trim() || textoBusca.includes(busca.trim().toLowerCase());
        const combinaEstado = filtroEstado === "todas" || ideia.estado === filtroEstado;
        const combinaTipo = filtroTipo === "todos" || ideia.tipo === filtroTipo;

        return combinaBusca && combinaEstado && combinaTipo;
      }),
    [busca, filtroEstado, filtroTipo, ideias],
  );

  const ideiaSelecionada = ideias.find((ideia) => String(ideia.id) === String(ideiaSelecionadaId)) || null;
  const estatisticas = {
    total: ideias.length,
    mundo: ideias.filter((ideia) => (ideia.vinculosMundoIds || ideia.mundoIds || ideia.itensMundoIds || []).length > 0).length,
    cenas: ideias.filter((ideia) => ideia.tipo === "Cena possível").length,
    urgentes: ideias.filter((ideia) => ideia.prioridade === "alta").length,
  };

  if (!livroSelecionado) {
    return (
      <div className="page">
        <EmptyBookState titulo="As ideias precisam de um livro ativo" />
      </div>
    );
  }

  const abrirCriacao = () => {
    setNovaIdeia({
      ...ideiaInicial,
      cor: livroSelecionado.cor || "#8f1d43",
    });
    setIdeiaSelecionadaId("");
    setModoEdicao(false);
    setModalCriacaoAberto(true);
  };

  const abrirIdeia = (ideiaId) => {
    setIdeiaSelecionadaId(ideiaId);
    setModoEdicao(false);
  };

  const fecharDetalhes = () => {
    setIdeiaSelecionadaId("");
    setModoEdicao(false);
  };

  const adicionar = async (event) => {
    event.preventDefault();

    if (!novaIdeia.titulo.trim() && !novaIdeia.descricao.trim()) return;

    await adicionarIdeia(livroSelecionado.id, {
      ...novaIdeia,
      atualizadoEm: new Date().toISOString(),
    });
    setNovaIdeia(ideiaInicial);
    setModalCriacaoAberto(false);
  };

  const salvar = async (alteracoes) => {
    if (!ideiaSelecionada) return;

    await salvarIdeia(livroSelecionado.id, ideiaSelecionada.id, {
      ...alteracoes,
      atualizadoEm: new Date().toISOString(),
    });
    setModoEdicao(false);
  };

  const remover = async () => {
    if (!ideiaSelecionada) return;

    await removerIdeia(livroSelecionado.id, ideiaSelecionada.id);
    fecharDetalhes();
  };

  return (
    <div className="page ideas-page">
      <header className="page-header">
        <div>
          <span className="eyebrow">Ideias</span>
          <h1>Estante de ideias</h1>
          <p>Guarde cenas, explicações, pistas, dúvidas e conexões do mundo sem transformar a página em uma pilha de formulários.</p>
        </div>
        <div className="page-header-actions">
          <button type="button" className="button primary" onClick={abrirCriacao}>
            Nova ideia
          </button>
        </div>
      </header>

      <section className="idea-studio-hero panel">
        <div>
          <span className="eyebrow">Livro ativo</span>
          <h2>{livroSelecionado.titulo}</h2>
          <p>Use esta área como um arquivo de bastidores: tudo fica guardado como cartões, e cada ideia pode conversar com Mundo quando precisar.</p>
        </div>
        <div className="idea-stats">
          <span><strong>{estatisticas.total}</strong> ideias</span>
          <span><strong>{estatisticas.mundo}</strong> ligadas ao mundo</span>
          <span><strong>{estatisticas.cenas}</strong> cenas</span>
          <span><strong>{estatisticas.urgentes}</strong> urgentes</span>
        </div>
      </section>

      <section className="panel ideas-shelf-panel" data-tour="ideias-lista">
        <div className="ideas-shelf-heading">
          <div>
            <span className="eyebrow">Estante</span>
            <h2>{ideiasFiltradas.length} ideia(s) encontrada(s)</h2>
          </div>
          <div className="idea-filters">
            <input value={busca} onChange={(event) => setBusca(event.target.value)} placeholder="Pesquisar ideias" />
            <select value={filtroEstado} onChange={(event) => setFiltroEstado(event.target.value)}>
              <option value="todas">Todos os estados</option>
              {estadosDisponiveis.map((estado) => (
                <option key={estado.id} value={estado.id}>{estado.label}</option>
              ))}
            </select>
            <select value={filtroTipo} onChange={(event) => setFiltroTipo(event.target.value)}>
              {tiposDisponiveis.map((tipo) => (
                <option key={tipo} value={tipo}>{tipo === "todos" ? "Todos os tipos" : tipo}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="ideas-shelf-grid">
          {ideiasFiltradas.map((ideia) => (
            <IdeaShelfCard
              key={ideia.id}
              ideia={ideia}
              vinculos={resolverVinculosIdeia(ideia, mapaMundo)}
              onOpen={() => abrirIdeia(ideia.id)}
            />
          ))}

          <button type="button" className="idea-add-card" onClick={abrirCriacao}>
            <span>+</span>
            <strong>Guardar nova ideia</strong>
          </button>
        </div>

        {ideiasFiltradas.length === 0 && (
          <div className="inline-empty">
            <strong>Nenhuma ideia encontrada</strong>
            <span>Abra uma nova ideia para guardar cenas, explicações, conexões ou dúvidas do livro.</span>
          </div>
        )}
      </section>

      <IdeasOverviewGarden livro={livroSelecionado} ideias={ideias} secoesMundo={secoesMundo} />

      {modalCriacaoAberto && (
        <IdeaModal titulo="Nova ideia" subtitulo="Capturar" onClose={() => setModalCriacaoAberto(false)}>
          <IdeaForm
            value={novaIdeia}
            onChange={setNovaIdeia}
            secoesMundo={secoesMundo}
            personagens={personagensIdeia}
            capitulos={capitulosIdeia}
            onSubmit={adicionar}
            submitLabel="Guardar ideia"
            onCancel={() => setModalCriacaoAberto(false)}
          />
        </IdeaModal>
      )}

      {ideiaSelecionada && (
        <IdeaModal titulo={ideiaSelecionada.titulo || "Ideia sem título"} subtitulo={modoEdicao ? "Editar ideia" : "Ficha da ideia"} onClose={fecharDetalhes}>
          {modoEdicao ? (
            <EditableIdeaDetail
              ideia={ideiaSelecionada}
              secoesMundo={secoesMundo}
              personagens={personagensIdeia}
              capitulos={capitulosIdeia}
              onSave={salvar}
              onCancel={() => setModoEdicao(false)}
              onRemove={remover}
            />
          ) : (
            <IdeaReadView
              ideia={ideiaSelecionada}
              vinculos={resolverVinculosIdeia(ideiaSelecionada, mapaMundo)}
              personagens={resolverVinculosPorMapa(
                ideiaSelecionada.vinculosPersonagemIds || ideiaSelecionada.personagemIds || ideiaSelecionada.personagensIds,
                mapaPersonagensIdeia,
              )}
              capitulos={resolverVinculosPorMapa(
                ideiaSelecionada.vinculosCapituloIds || ideiaSelecionada.capituloIds || ideiaSelecionada.capitulosIds,
                mapaCapitulosIdeia,
              )}
              onEdit={() => setModoEdicao(true)}
              onClose={fecharDetalhes}
            />
          )}
        </IdeaModal>
      )}
    </div>
  );
}

function IdeasOverviewGarden({ livro, ideias, secoesMundo }) {
  const resumo = criarResumoVisualIdeias(livro, ideias, secoesMundo);

  return (
    <section className="panel idea-overview-garden" style={{ "--garden-color": livro.cor || "#8f1d43", "--garden-growth": resumo.completude + "%" }}>
      <div className="idea-garden-heading">
        <div>
          <span className="eyebrow">Visão Geral</span>
          <h2>Jardim de {resumo.nomeMundo}</h2>
          <p>Cada coisa criada no livro vira um detalhe desse pequeno cenário: mundo, elenco, capítulos e ideias deixam a composição mais cheia.</p>
        </div>
        <div className="idea-garden-growth">
          <span>florescimento</span>
          <strong>{resumo.completude}%</strong>
        </div>
      </div>

      <div className="idea-garden-body">
        <div className="idea-garden-metrics">
          {resumo.metricas.map((metrica) => (
            <article className={"idea-garden-metric " + metrica.tom} key={metrica.label}>
              <span>{metrica.label}</span>
              <strong>{metrica.valor}</strong>
              <small>{metrica.texto}</small>
            </article>
          ))}
        </div>

        <div className="idea-garden-stage" aria-label="Visão visual do livro ativo">
          <div className="idea-garden-book">
            <div className="idea-garden-page left">
              <span>{resumo.nomeMundo}</span>
              <strong>{livro.titulo || "Livro sem título"}</strong>
            </div>
            <div className="idea-garden-page right">
              <span>{resumo.frase}</span>
            </div>
          </div>

          <div className="idea-garden-blooms">
            {resumo.sementes.map((semente, indice) => (
              <article
                className={"idea-garden-bloom bloom-" + (indice % 10)}
                key={semente.tipo + "-" + semente.nome + "-" + indice}
                style={{ "--bloom-color": normalizarCor(semente.cor) }}
              >
                <span>{semente.tipo}</span>
                <strong>{semente.nome}</strong>
              </article>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

function IdeaModal({ titulo, subtitulo, onClose, children }) {
  useEffect(() => {
    const fecharComEsc = (event) => {
      if (event.key === "Escape") onClose();
    };

    document.addEventListener("keydown", fecharComEsc);
    return () => document.removeEventListener("keydown", fecharComEsc);
  }, [onClose]);

  return (
    <div className="idea-modal-backdrop" role="presentation" onMouseDown={onClose}>
      <section className="idea-modal-card" role="dialog" aria-modal="true" aria-label={titulo} onMouseDown={(event) => event.stopPropagation()}>
        <div className="idea-modal-header">
          <div>
            <span className="eyebrow">{subtitulo}</span>
            <h2>{titulo}</h2>
          </div>
          <button type="button" className="button ghost visible-ghost" onClick={onClose}>
            Fechar
          </button>
        </div>
        {children}
      </section>
    </div>
  );
}

function IdeaForm({ value, onChange, secoesMundo, personagens, capitulos, onSubmit, submitLabel, onCancel }) {
  return (
    <form className="form-stack idea-form" onSubmit={onSubmit}>
      <div className="form-grid two">
        <label className="field-group">
          <span>Título</span>
          <input value={value.titulo} onChange={(event) => onChange({ ...value, titulo: event.target.value })} placeholder="Nome curto da ideia" />
        </label>
        <label className="field-group">
          <span>Tipo</span>
          <select value={value.tipo} onChange={(event) => onChange({ ...value, tipo: event.target.value })}>
            {tiposIdeia.map((tipo) => (
              <option key={tipo}>{tipo}</option>
            ))}
          </select>
        </label>
      </div>

      <div className="form-grid three">
        <label className="field-group">
          <span>Aparência</span>
          <select value={value.aparencia || "pergaminho"} onChange={(event) => onChange({ ...value, aparencia: event.target.value })}>
            {aparenciasIdeia.map((aparencia) => (
              <option key={aparencia.id} value={aparencia.id}>{aparencia.label}</option>
            ))}
          </select>
        </label>
        <label className="field-group">
          <span>Cor</span>
          <input type="color" value={normalizarCor(value.cor)} onChange={(event) => onChange({ ...value, cor: event.target.value })} />
        </label>
        <label className="field-group">
          <span>Prioridade</span>
          <select value={value.prioridade} onChange={(event) => onChange({ ...value, prioridade: event.target.value })}>
            {prioridadesIdeia.map((prioridade) => (
              <option key={prioridade.id} value={prioridade.id}>{prioridade.label}</option>
            ))}
          </select>
        </label>
      </div>

      <label className="field-group">
        <span>Explicação ou anotação</span>
        <textarea
          value={value.descricao}
          onChange={(event) => onChange({ ...value, descricao: event.target.value })}
          rows={6}
          placeholder="Explique a regra, cena, dúvida, pista ou conexão narrativa."
        />
      </label>

      <div className="form-grid two">
        <label className="field-group">
          <span>Como isso pode entrar na história?</span>
          <textarea value={value.cenaPossivel} onChange={(event) => onChange({ ...value, cenaPossivel: event.target.value })} rows={4} />
        </label>
        <label className="field-group">
          <span>Contexto ou pergunta</span>
          <textarea value={value.contexto} onChange={(event) => onChange({ ...value, contexto: event.target.value })} rows={4} />
        </label>
      </div>

      <div className="form-grid two">
        <label className="field-group">
          <span>Estado</span>
          <select value={value.estado} onChange={(event) => onChange({ ...value, estado: event.target.value })}>
            {estadosIdeia.map((estado) => (
              <option key={estado.id} value={estado.id}>{estado.label}</option>
            ))}
          </select>
        </label>
        <label className="field-group">
          <span>Etiquetas</span>
          <input value={value.etiquetas} onChange={(event) => onChange({ ...value, etiquetas: event.target.value })} placeholder="Ex.: magia, ato 2, capital" />
        </label>
      </div>

      <WorldIdeaPicker
        secoesMundo={secoesMundo}
        selecionados={value.vinculosMundoIds || []}
        onChange={(vinculosMundoIds) => onChange({ ...value, vinculosMundoIds })}
      />

      <StoryIdeaLinksPicker
        personagens={personagens}
        capitulos={capitulos}
        personagensSelecionados={value.vinculosPersonagemIds || []}
        capitulosSelecionados={value.vinculosCapituloIds || []}
        onChangePersonagens={(vinculosPersonagemIds) => onChange({ ...value, vinculosPersonagemIds })}
        onChangeCapitulos={(vinculosCapituloIds) => onChange({ ...value, vinculosCapituloIds })}
      />

      <div className="idea-modal-actions">
        <button className="button primary" type="submit" disabled={!value.titulo.trim() && !value.descricao.trim()}>
          {submitLabel}
        </button>
        <button type="button" className="button secondary visible-ghost" onClick={onCancel}>
          Cancelar
        </button>
      </div>
    </form>
  );
}

function IdeaShelfCard({ ideia, vinculos, onOpen }) {
  const cor = normalizarCor(ideia.cor);
  const estilo = { "--idea-color": cor };
  const aparencia = ideia.aparencia || "pergaminho";

  return (
    <button type="button" className={"idea-shelf-card " + aparencia} style={estilo} onClick={onOpen}>
      <div className="idea-shelf-ribbon" />
      <div className="idea-shelf-top">
        <span>{ideia.tipo || "Ideia"}</span>
        <strong className={"priority-dot " + (ideia.prioridade || "media")}>{rotuloPrioridade(ideia.prioridade)}</strong>
      </div>
      <h3>{ideia.titulo || "Ideia sem título"}</h3>
      <p>{resumirTexto(ideia.descricao || ideia.contexto || ideia.cenaPossivel || "Sem descrição.", 130)}</p>
      <div className="idea-shelf-footer">
        <span>{rotuloEstado(ideia.estado)}</span>
        <small>{vinculos.length} vínculo(s)</small>
      </div>
    </button>
  );
}

function IdeaReadView({ ideia, vinculos, personagens, capitulos, onEdit, onClose }) {
  return (
    <div className="idea-read-view" style={{ "--idea-color": normalizarCor(ideia.cor) }}>
      <div className="idea-read-cover">
        <span>{ideia.tipo || "Ideia"}</span>
        <h3>{ideia.titulo || "Ideia sem título"}</h3>
        <div>
          <small>{rotuloEstado(ideia.estado)}</small>
          <small>{rotuloPrioridade(ideia.prioridade)}</small>
        </div>
      </div>

      <div className="idea-read-body">
        <ReadBlock titulo="Explicação" texto={ideia.descricao} vazio="Sem explicação registrada." />
        <ReadBlock titulo="Pode entrar na história como" texto={ideia.cenaPossivel} vazio="Sem cena possível registrada." />
        <ReadBlock titulo="Contexto ou pergunta" texto={ideia.contexto} vazio="Sem contexto registrado." />

        {ideia.etiquetas && (
          <div className="idea-tags-line">
            {String(ideia.etiquetas)
              .split(",")
              .map((etiqueta) => etiqueta.trim())
              .filter(Boolean)
              .map((etiqueta) => <span key={etiqueta}>{etiqueta}</span>)}
          </div>
        )}

        <section className="linked-world-summary">
          <span className="eyebrow">Vínculos com Mundo</span>
          {vinculos.length > 0 ? (
            <div className="linked-world-grid">
              {vinculos.map((item) => (
                <article key={item.secaoId + "-" + item.id}>
                  <strong>{item.nome}</strong>
                  <small>{item.secaoNome}</small>
                  <p>{resumirTexto(obterDescricaoItemMundo(item), 130)}</p>
                </article>
              ))}
            </div>
          ) : (
            <p>Nenhum item do mundo ligado a esta ideia.</p>
          )}
        </section>

        <LinkedStorySummary
          titulo="Personagens ligados"
          vazio="Nenhum personagem ligado a esta ideia."
          itens={personagens}
          getTitulo={(personagem) => personagem.nome || "Personagem sem nome"}
          getSubtitulo={(personagem) => personagem.papel || personagem.funcao || "Elenco"}
          getDescricao={(personagem) => personagem.historia || personagem.descricao || personagem.arco || ""}
        />

        <LinkedStorySummary
          titulo="Capítulos ligados"
          vazio="Nenhum capítulo ligado a esta ideia."
          itens={capitulos}
          getTitulo={(capitulo) => capitulo.titulo || capitulo.nome || "Capítulo sem título"}
          getSubtitulo={(capitulo) => rotuloCapitulo(capitulo)}
          getDescricao={(capitulo) => capitulo.resumo || capitulo.descricao || ""}
        />
      </div>

      <div className="idea-modal-actions">
        <button type="button" className="button primary" onClick={onEdit}>
          Editar
        </button>
        <button type="button" className="button secondary visible-ghost" onClick={onClose}>
          Fechar
        </button>
      </div>
    </div>
  );
}

function ReadBlock({ titulo, texto, vazio }) {
  return (
    <section className="idea-read-block">
      <span className="eyebrow">{titulo}</span>
      <p>{texto || vazio}</p>
    </section>
  );
}

function EditableIdeaDetail({ ideia, secoesMundo, personagens, capitulos, onSave, onCancel, onRemove }) {
  const [edicao, setEdicao] = useState(prepararIdeiaParaEdicao(ideia));

  useEffect(() => {
    setEdicao(prepararIdeiaParaEdicao(ideia));
  }, [ideia]);

  const salvar = async (event) => {
    event.preventDefault();
    await onSave(edicao);
  };

  return (
    <div className="idea-detail-form">
      <IdeaForm
        value={edicao}
        onChange={setEdicao}
        secoesMundo={secoesMundo}
        personagens={personagens}
        capitulos={capitulos}
        onSubmit={salvar}
        submitLabel="Salvar alterações"
        onCancel={onCancel}
      />
      <button type="button" className="button ghost visible-ghost danger-text" onClick={onRemove}>
        Remover ideia
      </button>
    </div>
  );
}

function StoryIdeaLinksPicker({
  personagens,
  capitulos,
  personagensSelecionados,
  capitulosSelecionados,
  onChangePersonagens,
  onChangeCapitulos,
}) {
  return (
    <section className="idea-story-links">
      <div className="idea-story-links-header">
        <div>
          <span className="eyebrow">Ligações da história</span>
          <strong>
            {(personagensSelecionados || []).length + (capitulosSelecionados || []).length} selecionado(s)
          </strong>
        </div>
      </div>

      <IdeaEntityPicker
        titulo="Personagens"
        vazio="Crie personagens para ligá-los às ideias."
        itens={personagens}
        selecionados={personagensSelecionados}
        onChange={onChangePersonagens}
        getTitulo={(personagem) => personagem.nome || "Personagem sem nome"}
        getDescricao={(personagem) => personagem.papel || resumirTexto(personagem.historia || personagem.descricao, 72)}
      />

      <IdeaEntityPicker
        titulo="Capítulos"
        vazio="Crie capítulos em Escrita para ligá-los às ideias."
        itens={capitulos}
        selecionados={capitulosSelecionados}
        onChange={onChangeCapitulos}
        getTitulo={(capitulo) => capitulo.titulo || capitulo.nome || "Capítulo sem título"}
        getDescricao={(capitulo) => rotuloCapitulo(capitulo)}
      />
    </section>
  );
}

function IdeaEntityPicker({ titulo, vazio, itens, selecionados, onChange, getTitulo, getDescricao }) {
  const idsSelecionados = new Set((selecionados || []).map(String));

  const alternarItem = (itemId) => {
    const id = String(itemId);
    const proximosIds = idsSelecionados.has(id)
      ? (selecionados || []).filter((selecionado) => String(selecionado) !== id)
      : [...(selecionados || []), itemId];

    onChange(proximosIds);
  };

  return (
    <div className="idea-link-section">
      <div className="idea-link-section-heading">
        <strong>{titulo}</strong>
        <small>{(selecionados || []).length} selecionado(s)</small>
      </div>
      <div className="idea-link-options">
        {(itens || []).map((item) => (
          <button
            key={item.id}
            type="button"
            className={idsSelecionados.has(String(item.id)) ? "active" : ""}
            onClick={() => alternarItem(item.id)}
          >
            <strong>{getTitulo(item)}</strong>
            <small>{getDescricao(item) || "Sem detalhes."}</small>
          </button>
        ))}

        {(!itens || itens.length === 0) && (
          <div className="inline-empty compact">
            <strong>Nada disponível</strong>
            <span>{vazio}</span>
          </div>
        )}
      </div>
    </div>
  );
}

function LinkedStorySummary({ titulo, vazio, itens, getTitulo, getSubtitulo, getDescricao }) {
  return (
    <section className="linked-world-summary linked-story-summary">
      <span className="eyebrow">{titulo}</span>
      {itens.length > 0 ? (
        <div className="linked-world-grid">
          {itens.map((item) => (
            <article key={item.id}>
              <strong>{getTitulo(item)}</strong>
              <small>{getSubtitulo(item)}</small>
              <p>{resumirTexto(getDescricao(item), 130) || "Sem descrição."}</p>
            </article>
          ))}
        </div>
      ) : (
        <p>{vazio}</p>
      )}
    </section>
  );
}

function WorldIdeaPicker({ secoesMundo, selecionados, onChange }) {
  const primeiraSecao = secoesMundo.find((secao) => secao.itens.length > 0) || secoesMundo[0] || null;
  const [secaoAtivaId, setSecaoAtivaId] = useState(primeiraSecao?.id || "");
  const secaoAtiva = secoesMundo.find((secao) => String(secao.id) === String(secaoAtivaId)) || primeiraSecao;
  const idsSelecionados = new Set((selecionados || []).map(String));

  useEffect(() => {
    if (!secaoAtivaId && primeiraSecao?.id) {
      setSecaoAtivaId(primeiraSecao.id);
    }
  }, [primeiraSecao?.id, secaoAtivaId]);

  const alternarItem = (itemId) => {
    const id = String(itemId);
    const proximosIds = idsSelecionados.has(id)
      ? selecionados.filter((selecionado) => String(selecionado) !== id)
      : [...selecionados, itemId];

    onChange(proximosIds);
  };

  return (
    <section className="idea-world-picker">
      <div className="idea-world-picker-header">
        <div>
          <span className="eyebrow">Ligações com Mundo</span>
          <strong>{selecionados.length} selecionado(s)</strong>
        </div>
      </div>

      <div className="idea-world-tabs">
        {secoesMundo.map((secao) => (
          <button
            key={secao.id}
            type="button"
            className={String(secaoAtiva?.id || "") === String(secao.id) ? "active" : ""}
            onClick={() => setSecaoAtivaId(secao.id)}
          >
            <span>{secao.nome}</span>
            <strong>{secao.itens.length}</strong>
          </button>
        ))}
      </div>

      <div className="idea-world-options">
        {(secaoAtiva?.itens || []).map((item) => (
          <button
            key={item.secaoId + "-" + item.id}
            type="button"
            className={idsSelecionados.has(String(item.id)) ? "active" : ""}
            onClick={() => alternarItem(item.id)}
          >
            <strong>{item.nome}</strong>
            <small>{resumirTexto(obterDescricaoItemMundo(item), 92)}</small>
          </button>
        ))}
        {secaoAtiva && secaoAtiva.itens.length === 0 && (
          <div className="inline-empty compact">
            <strong>Sem itens nessa seção</strong>
            <span>Crie itens em Mundo para poder vinculá-los aqui.</span>
          </div>
        )}
      </div>
    </section>
  );
}

function prepararIdeiaParaEdicao(ideia) {
  return {
    ...ideiaInicial,
    ...ideia,
    cor: normalizarCor(ideia.cor),
    vinculosMundoIds: ideia.vinculosMundoIds || ideia.mundoIds || ideia.itensMundoIds || [],
    vinculosPersonagemIds: ideia.vinculosPersonagemIds || ideia.personagemIds || ideia.personagensIds || [],
    vinculosCapituloIds: ideia.vinculosCapituloIds || ideia.capituloIds || ideia.capitulosIds || [],
  };
}

function criarResumoVisualIdeias(livro, ideias, secoesMundo) {
  const personagens = livro.personagens || [];
  const capitulos = livro.capitulos || [];
  const itensMundo = secoesMundo.flatMap((secao) => listarItensMundoParaVisao(secao.itens || [], secao.nome));
  const capitulosAtivos = capitulos.filter((capitulo) => capitulo.ativo !== false);
  const capitulosConcluidos = capitulos.filter((capitulo) => capitulo.status === "concluido" || capitulo.status === "concluído" || capitulo.concluido).length;
  const ideiasLigadas = ideias.filter((ideia) => (ideia.vinculosMundoIds || ideia.mundoIds || ideia.itensMundoIds || []).length > 0).length;
  const nomeMundo = livro.nomeMundo || "Mundo de " + (livro.titulo || "Livro");
  const completude = calcularFlorescimento({
    mundo: itensMundo.length,
    personagens: personagens.length,
    capitulos: capitulosAtivos.length,
    ideias: ideias.length,
  });

  return {
    nomeMundo,
    completude,
    frase: criarFraseJardim(livro, ideias, itensMundo.length),
    metricas: [
      {
        label: "Mundo",
        valor: itensMundo.length,
        texto: itensMundo.length ? "lugares, mapas e regras nutrindo o cenário" : "o cenário ainda pode brotar",
        tom: "green",
      },
      {
        label: "Elenco",
        valor: personagens.length,
        texto: personagens.length ? "personagens prontos para puxar conflitos" : "nomes esperando rosto e desejo",
        tom: "wine",
      },
      {
        label: "Capítulos",
        valor: capitulosAtivos.length,
        texto: capitulosAtivos.length ? capitulosConcluidos + " concluído(s)" : "nenhum capítulo ativo ainda",
        tom: "blue",
      },
      {
        label: "Ideias",
        valor: ideias.length,
        texto: ideias.length ? ideiasLigadas + " conectada(s) ao mundo" : "a estante ainda está respirando espaço",
        tom: "gold",
      },
    ],
    sementes: criarSementesVisuais(livro, ideias, personagens, capitulosAtivos, itensMundo),
  };
}

function criarSementesVisuais(livro, ideias, personagens, capitulos, itensMundo) {
  const sementes = [
    ...itensMundo.slice(0, 5).map((item) => ({
      tipo: item.secaoNome || "Mundo",
      nome: item.nome || "Item do mundo",
      cor: item.cor || "#427066",
    })),
    ...personagens.slice(0, 4).map((personagem) => ({
      tipo: "Personagem",
      nome: personagem.nome || "Personagem",
      cor: personagem.cor || livro.cor || "#8f1d43",
    })),
    ...capitulos.slice(0, 4).map((capitulo) => ({
      tipo: "Capítulo",
      nome: capitulo.titulo || "Capítulo",
      cor: capitulo.cor || "#315a8c",
    })),
    ...ideias.slice(0, 6).map((ideia) => ({
      tipo: ideia.tipo || "Ideia",
      nome: ideia.titulo || "Ideia",
      cor: ideia.cor || "#b9853f",
    })),
  ];

  if (sementes.length > 0) {
    return sementes.slice(0, 14);
  }

  return [
    { tipo: "Mundo", nome: livro.nomeMundo || "Mundo novo", cor: "#427066" },
    { tipo: "Ideia", nome: "Primeira faísca", cor: "#b9853f" },
    { tipo: "Elenco", nome: "Nome por nascer", cor: livro.cor || "#8f1d43" },
  ];
}

function listarItensMundoParaVisao(itens = [], secaoNome = "Mundo") {
  return itens.flatMap((item) => [
    { ...item, secaoNome },
    ...listarItensMundoParaVisao(item.ramificacoes || [], secaoNome),
    ...listarItensMundoParaVisao(item.blocos || [], secaoNome),
    ...listarItensMundoParaVisao(item.mapasInternos || [], "Mapas"),
  ]);
}

function calcularFlorescimento(contagens) {
  const pontos =
    Math.min(contagens.mundo, 22) / 22 +
    Math.min(contagens.personagens, 12) / 12 +
    Math.min(contagens.capitulos, 12) / 12 +
    Math.min(contagens.ideias, 20) / 20;

  return Math.max(10, Math.round((pontos / 4) * 100));
}

function criarFraseJardim(livro, ideias, totalMundo) {
  if (livro.logline) return livro.logline;
  if (livro.premissa) return livro.premissa;
  if (ideias.length > 0 && totalMundo > 0) return "As ideias já encontraram solo no mundo.";
  if (ideias.length > 0) return "A história ainda está em sementes, mas já tem brilho.";
  return "Comece por uma ideia pequena e deixe o resto florescer.";
}

function montarSecoesMundo(livro) {
  if (!livro) return [];

  const mundo = livro.mundo || {};
  const personalizadas = (livro.secoesMundo || []).filter((secao) => !secoesFixasMundo.some((fixa) => fixa.id === secao.id));
  const conhecidas = [...secoesFixasMundo, ...personalizadas];
  const idsConhecidos = new Set(conhecidas.map((secao) => secao.id));
  const extras = Object.keys(mundo)
    .filter((secaoId) => !idsConhecidos.has(secaoId))
    .map((secaoId) => ({ id: secaoId, nome: formatarNomeSecao(secaoId) }));

  return [...conhecidas, ...extras].map((secao) => ({
    ...secao,
    itens: (mundo[secao.id] || []).map((item) => ({
      ...item,
      secaoId: secao.id,
      secaoNome: secao.nome,
    })),
  }));
}

function resolverVinculosIdeia(ideia, mapaMundo) {
  return (ideia.vinculosMundoIds || ideia.mundoIds || ideia.itensMundoIds || [])
    .map((id) => mapaMundo.get(String(id)))
    .filter(Boolean);
}

function resolverVinculosPorMapa(ids = [], mapa) {
  return (ids || [])
    .map((id) => mapa.get(String(id)))
    .filter(Boolean);
}

function obterDescricaoItemMundo(item = {}) {
  if (item.descricao) return item.descricao;
  if (item.resumo) return item.resumo;
  if (item.conflito) return item.conflito;
  if (item.categoria) return item.categoria;
  if (Array.isArray(item.blocos) && item.blocos.length > 0) return item.blocos[0].descricao || item.blocos[0].titulo || "";
  if (Array.isArray(item.ramificacoes) && item.ramificacoes.length > 0) return item.ramificacoes.length + " ramificação(ões)";
  return "Sem descrição.";
}

function normalizarCor(cor = "#8f1d43") {
  return /^#[0-9a-f]{6}$/i.test(String(cor)) ? cor : "#8f1d43";
}

function resumirTexto(texto, limite = 110) {
  const valor = String(texto || "").trim();
  if (valor.length <= limite) return valor;
  return valor.slice(0, limite - 3).trimEnd() + "...";
}

function rotuloEstado(estado = "bruta") {
  return estadosIdeia.find((item) => item.id === estado)?.label || formatarNomeSecao(estado);
}

function rotuloPrioridade(prioridade = "media") {
  return prioridadesIdeia.find((item) => item.id === prioridade)?.label || prioridade;
}

function rotuloCapitulo(capitulo = {}) {
  const status = capitulo.status || (capitulo.concluido ? "concluido" : "rascunho");
  const palavras = Number(capitulo.totalPalavras || capitulo.palavras || 0);
  const partes = [formatarNomeSecao(status)];

  if (palavras > 0) {
    partes.push(palavras.toLocaleString("pt-BR") + " palavra(s)");
  }

  return partes.join(" · ");
}

function formatarNomeSecao(secaoId) {
  return String(secaoId || "Seção")
    .replace(/([A-Z])/g, " $1")
    .replace(/[-_]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/^./, (letra) => letra.toUpperCase());
}
