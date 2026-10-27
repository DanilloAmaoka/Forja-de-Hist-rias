import { useEffect, useMemo, useRef, useState } from "react";

import EmptyBookState from "../components/EmptyBookState";
import ImageProcessingOverlay from "../components/ImageProcessingOverlay";
import { useFeedback } from "../context/FeedbackContext";
import { useStoryData } from "../context/StoryDataContext";
import { useImageProcessor } from "../hooks/useImageProcessor";

const personagemInicial = {
  nome: "",
  papel: "Protagonista",
  cor: "#8f1d43",
  fotoUrl: "",
  capaUrl: "",
  imagensAdicionais: [],
  regiaoId: "",
  historia: "",
};

const grupoInicial = {
  id: "",
  titulo: "",
  descricao: "",
  cor: "#8f1d43",
  capaUrl: "",
  personagemIds: [],
};

const papeis = ["Protagonista", "Antagonista", "Aliado", "Mentor", "Rival", "Interesse afetivo", "Figura de contraste"];

function normalizarLinkImagem(valor) {
  const texto = String(valor || "").trim();
  if (!texto) return "";

  try {
    const url = new URL(texto);
    return ["http:", "https:"].includes(url.protocol) ? url.href : "";
  } catch {
    return "";
  }
}

function obterLinkImagem(valor) {
  return normalizarLinkImagem(valor) ? String(valor || "").trim() : "";
}

export default function Personagens() {
  const {
    livroSelecionado,
    adicionarPersonagem,
    salvarLivro,
    salvarPersonagem,
    removerPersonagem,
  } = useStoryData();
  const [novoPersonagem, setNovoPersonagem] = useState(() => ({ ...personagemInicial }));
  const [mostrarCriacao, setMostrarCriacao] = useState(false);
  const [personagemAbertoId, setPersonagemAbertoId] = useState("");
  const [filtro, setFiltro] = useState("Todos");
  const [buscaPersonagem, setBuscaPersonagem] = useState("");
  const [criandoPersonagem, setCriandoPersonagem] = useState(false);
  const [imagemAmpliada, setImagemAmpliada] = useState(null);
  const [linkFotoNovo, setLinkFotoNovo] = useState("");
  const [linkCapaNovo, setLinkCapaNovo] = useState("");
  const [modoEstante, setModoEstante] = useState("personagens");
  const [grupoDraft, setGrupoDraft] = useState(() => ({ ...grupoInicial }));
  const [grupoModalModo, setGrupoModalModo] = useState("");
  const [grupoAbertoId, setGrupoAbertoId] = useState("");
  const { processandoImagem, processarImagem } = useImageProcessor();
  const { mostrarFeedback } = useFeedback();

  const personagens = livroSelecionado?.personagens || [];
  const gruposPersonagens = livroSelecionado?.gruposPersonagens || [];
  const mapaMencoes = useMemo(() => coletarMencoesPersonagens(livroSelecionado), [livroSelecionado]);
  const elementosMundo = useMemo(() => listarMundo(livroSelecionado?.mundo), [livroSelecionado?.mundo]);
  const papeisDisponiveis = useMemo(
    () => [...new Set([...papeis, ...(livroSelecionado?.papeisPersonagem || []), ...personagens.map((personagem) => personagem.papel).filter(Boolean)])],
    [livroSelecionado?.papeisPersonagem, personagens],
  );
  const papeisFiltro = useMemo(() => ["Todos", ...papeisDisponiveis], [papeisDisponiveis]);
  const personagensFiltrados = personagens.filter((personagem) => {
    const regiao = elementosMundo.find((item) => item.id === personagem.regiaoId);
    const textoBusca = [personagem.nome, personagem.papel, regiao?.nome, personagem.historia].join(" ").toLowerCase();
    const combinaFiltro = filtro === "Todos" || personagem.papel === filtro;
    const combinaBusca = !buscaPersonagem.trim() || textoBusca.includes(buscaPersonagem.trim().toLowerCase());

    return combinaFiltro && combinaBusca;
  });
  const personagemAberto = personagens.find((personagem) => personagem.id === personagemAbertoId) || null;
  const gruposFiltrados = gruposPersonagens.filter((grupo) => {
    const integrantes = resolverPersonagensGrupo(grupo, personagens);
    const textoBusca = [grupo.titulo, grupo.descricao, ...integrantes.map((personagem) => personagem.nome)].join(" ").toLowerCase();
    return !buscaPersonagem.trim() || textoBusca.includes(buscaPersonagem.trim().toLowerCase());
  });
  const grupoAberto = gruposPersonagens.find((grupo) => String(grupo.id) === String(grupoAbertoId)) || null;

  useEffect(() => {
    if (!personagemAberto) return undefined;

    const fecharComEsc = (event) => {
      if (event.key === "Escape") {
        setPersonagemAbertoId("");
      }
    };

    window.addEventListener("keydown", fecharComEsc);
    return () => window.removeEventListener("keydown", fecharComEsc);
  }, [personagemAberto]);

  useEffect(() => {
    if (!mostrarCriacao) return undefined;

    const fecharComEsc = (event) => {
      if (event.key === "Escape") {
        setMostrarCriacao(false);
      }
    };

    window.addEventListener("keydown", fecharComEsc);
    return () => window.removeEventListener("keydown", fecharComEsc);
  }, [mostrarCriacao]);

  useEffect(() => {
    if (!grupoModalModo && !grupoAberto) return undefined;

    const fecharComEsc = (event) => {
      if (event.key === "Escape") {
        setGrupoModalModo("");
        setGrupoAbertoId("");
      }
    };

    window.addEventListener("keydown", fecharComEsc);
    return () => window.removeEventListener("keydown", fecharComEsc);
  }, [grupoAberto, grupoModalModo]);

  const alternarCriacao = () => {
    if (mostrarCriacao) {
      setMostrarCriacao(false);
      return;
    }

    setPersonagemAbertoId("");
    setNovoPersonagem({ ...personagemInicial });
    setLinkFotoNovo("");
    setLinkCapaNovo("");
    setMostrarCriacao(true);
  };

  const selecionarPersonagem = (personagemId) => {
    setMostrarCriacao(false);
    setPersonagemAbertoId(personagemId);
  };

  const abrirCriarGrupo = () => {
    setPersonagemAbertoId("");
    setMostrarCriacao(false);
    setGrupoAbertoId("");
    setGrupoDraft({ ...grupoInicial, cor: livroSelecionado?.cor || "#8f1d43" });
    setGrupoModalModo("criar");
  };

  const abrirEditarGrupo = (grupo) => {
    setGrupoAbertoId("");
    setGrupoDraft({
      ...grupoInicial,
      ...grupo,
      personagemIds: (grupo.personagemIds || []).map(String),
    });
    setGrupoModalModo("editar");
  };

  const fecharGrupoModal = () => {
    setGrupoModalModo("");
    setGrupoDraft({ ...grupoInicial });
  };

  const salvarGrupo = async (event) => {
    event.preventDefault();

    if (!grupoDraft.titulo.trim()) return;

    const capaUrl = normalizarLinkImagem(grupoDraft.capaUrl);
    if (grupoDraft.capaUrl.trim() && !capaUrl) {
      mostrarFeedback("Cole um link de capa começando com http:// ou https://.", "erro");
      return;
    }

    const agora = new Date().toISOString();
    const grupoFinal = {
      ...grupoDraft,
      id: grupoDraft.id || "grupo-" + Date.now(),
      titulo: grupoDraft.titulo.trim(),
      descricao: grupoDraft.descricao.trim(),
      capaUrl,
      personagemIds: (grupoDraft.personagemIds || []).map(String),
      criadoEm: grupoDraft.criadoEm || agora,
      atualizadoEm: agora,
    };
    const proximosGrupos = grupoModalModo === "editar"
      ? gruposPersonagens.map((grupo) => (String(grupo.id) === String(grupoFinal.id) ? grupoFinal : grupo))
      : [grupoFinal, ...gruposPersonagens];

    await salvarLivro(livroSelecionado.id, { gruposPersonagens: proximosGrupos }, { silencioso: true });
    setModoEstante("grupos");
    fecharGrupoModal();
    setGrupoAbertoId(grupoFinal.id);
  };

  const removerGrupo = async (grupoId) => {
    const proximosGrupos = gruposPersonagens.filter((grupo) => String(grupo.id) !== String(grupoId));
    await salvarLivro(livroSelecionado.id, { gruposPersonagens: proximosGrupos }, { silencioso: true });
    setGrupoAbertoId("");
  };

  if (!livroSelecionado) {
    return (
      <div className="page">
        <EmptyBookState titulo="Crie um livro antes do elenco" />
      </div>
    );
  }

  const adicionar = async (event) => {
    event.preventDefault();

    if (!novoPersonagem.nome.trim()) return;

    const fotoPorLink = normalizarLinkImagem(linkFotoNovo);
    if (linkFotoNovo.trim() && !fotoPorLink) {
      mostrarFeedback("Cole um link de imagem começando com http:// ou https://.", "erro");
      return;
    }
    const capaPorLink = normalizarLinkImagem(linkCapaNovo);
    if (linkCapaNovo.trim() && !capaPorLink) {
      mostrarFeedback("Cole um link de capa começando com http:// ou https://.", "erro");
      return;
    }

    const personagemParaCriar = {
      ...novoPersonagem,
      nome: novoPersonagem.nome.trim(),
      fotoUrl: fotoPorLink || novoPersonagem.fotoUrl,
      capaUrl: capaPorLink || novoPersonagem.capaUrl,
    };

    setCriandoPersonagem(true);

    try {
      const livroAtualizado = await adicionarPersonagem(livroSelecionado.id, personagemParaCriar);
      const personagemCriado = livroAtualizado.personagens.at(-1);

      setNovoPersonagem({ ...personagemInicial, papel: personagemParaCriar.papel || personagemInicial.papel });
      setLinkFotoNovo("");
      setLinkCapaNovo("");
      setFiltro("Todos");
      setMostrarCriacao(false);
      setPersonagemAbertoId(personagemCriado?.id || "");
    } catch (error) {
      mostrarFeedback(error.message || "Não foi possível criar o personagem.", "erro");
    } finally {
      setCriandoPersonagem(false);
    }
  };

  const selecionarFotoNovo = async (event) => {
    const arquivo = event.target.files?.[0];
    if (!arquivo) return;

    try {
      const fotoUrl = await processarImagem(arquivo, { tamanhoMaximo: 420, qualidade: 0.72, bytesMaximos: 70 * 1024 }, "Foto do personagem");
      setNovoPersonagem((atual) => ({ ...atual, fotoUrl }));
      setLinkFotoNovo("");
    } catch (error) {
      mostrarFeedback(error.message || "Não foi possível carregar a foto.", "erro");
    }
  };

  const selecionarCapaNovo = async (event) => {
    const arquivo = event.target.files?.[0];
    if (!arquivo) return;

    try {
      const capaUrl = await processarImagem(arquivo, { tamanhoMaximo: 960, qualidade: 0.74, bytesMaximos: 120 * 1024 }, "Capa do personagem");
      setNovoPersonagem((atual) => ({ ...atual, capaUrl }));
      setLinkCapaNovo("");
    } catch (error) {
      mostrarFeedback(error.message || "Não foi possível carregar a capa.", "erro");
    }
  };

  const aplicarLinkFotoNovo = () => {
    const fotoUrl = normalizarLinkImagem(linkFotoNovo);
    if (!fotoUrl) {
      mostrarFeedback("Cole um link de imagem começando com http:// ou https://.", "erro");
      return;
    }

    setNovoPersonagem((atual) => ({ ...atual, fotoUrl }));
    setLinkFotoNovo(fotoUrl);
  };

  const aplicarLinkCapaNovo = () => {
    const capaUrl = normalizarLinkImagem(linkCapaNovo);
    if (!capaUrl) {
      mostrarFeedback("Cole um link de capa começando com http:// ou https://.", "erro");
      return;
    }

    setNovoPersonagem((atual) => ({ ...atual, capaUrl }));
    setLinkCapaNovo(capaUrl);
  };

  const adicionarPapelPersonalizado = async (papel) => {
    const nomePapel = papel.trim();
    if (!nomePapel) return "";

    if (papeisDisponiveis.includes(nomePapel)) {
      return nomePapel;
    }

    const papeisAtualizados = [...new Set([...(livroSelecionado.papeisPersonagem || []), nomePapel])];
    await salvarLivro(livroSelecionado.id, { papeisPersonagem: papeisAtualizados }, { silencioso: true });
    return nomePapel;
  };

  return (
    <div className="page characters-page">
      <ImageProcessingOverlay estado={processandoImagem} />

      <section className="panel character-shelf-panel" data-tour="personagem-lista">
        <div className="character-shelf-header">
          <div className="character-shelf-title">
            <span className="eyebrow">Elenco do livro</span>
            <h2>Personagens da história</h2>
            <p>{personagensFiltrados.length} de {personagens.length} personagem(ns) na estante.</p>
            <div className="character-shelf-stats">
              <span><strong>{personagens.length}</strong> cadastrados</span>
              <span><strong>{papeisDisponiveis.length}</strong> papéis</span>
              <span><strong>{elementosMundo.length}</strong> lugares do mundo</span>
            </div>
          </div>
          <div className="character-toolbar">
            <label className="character-search-field">
              <span>Pesquisar</span>
              <input
                value={buscaPersonagem}
                onChange={(event) => setBuscaPersonagem(event.target.value)}
                placeholder="Nome, papel ou região"
              />
            </label>
            <label className="character-filter-field">
              <span>Papel</span>
              <select className="compact-select" value={filtro} onChange={(event) => setFiltro(event.target.value)}>
                {papeisFiltro.map((papel) => (
                  <option key={papel} value={papel}>
                    {papel}
                  </option>
                ))}
              </select>
            </label>
            <button type="button" className="button primary" onClick={alternarCriacao}>
              {mostrarCriacao ? "Fechar criação" : "Adicionar personagem"}
            </button>
            <button type="button" className="button secondary character-group-create-button" onClick={abrirCriarGrupo}>
              Criar grupo
            </button>
          </div>
        </div>

        <div className="character-shelf-switcher" role="tablist" aria-label="Tipo de conteúdo da estante">
          <button type="button" className={modoEstante === "personagens" ? "active" : ""} onClick={() => setModoEstante("personagens")}>
            Mostrar Personagens
          </button>
          <button type="button" className={modoEstante === "grupos" ? "active" : ""} onClick={() => setModoEstante("grupos")}>
            Mostrar Grupos
          </button>
        </div>

        <div className="character-shelf">
          {modoEstante === "personagens" && personagensFiltrados.map((personagem) => {
            const regiao = elementosMundo.find((item) => item.id === personagem.regiaoId);
            const mencoes = mapaMencoes[personagem.id] || { sessoes: [] };
            const notaCarta = personagem.historia || "História pronta para expandir";

            return (
              <button
                type="button"
                className={"character-spine " + (personagemAbertoId === personagem.id ? "active" : "")}
                key={personagem.id}
                style={{ "--character-color": personagem.cor || "#8f1d43" }}
                onClick={() => selecionarPersonagem(personagem.id)}
              >
                <span className="character-card-ribbon">
                  <span className="character-card-role">{personagem.papel}</span>
                  <span className="character-card-mentions">{mencoes.sessoes.length} menções</span>
                </span>
                <span className="character-spine-photo character-card-portrait" aria-hidden="true">
                  {personagem.fotoUrl ? <img src={personagem.fotoUrl} alt="" loading="lazy" /> : personagem.nome.slice(0, 1)}
                </span>
                <span className="character-card-body">
                  <strong>{personagem.nome}</strong>
                  <small>{regiao?.nome || "Sem região definida"}</small>
                  <em>{notaCarta}</em>
                </span>
                <span className="character-card-footer">
                  <small>Abrir ficha</small>
                </span>
              </button>
            );
          })}

          {modoEstante === "grupos" && gruposFiltrados.map((grupo) => (
            <GroupShelfCard
              key={grupo.id}
              grupo={grupo}
              personagens={resolverPersonagensGrupo(grupo, personagens)}
              onOpen={() => setGrupoAbertoId(grupo.id)}
            />
          ))}

          {modoEstante === "personagens" && personagensFiltrados.length === 0 && (
            <div className="inline-empty">
              <strong>Nenhum personagem neste filtro</strong>
              <span>Adicione alguém com uma história, papel e lugar no mundo.</span>
            </div>
          )}

          {modoEstante === "grupos" && gruposFiltrados.length === 0 && (
            <div className="inline-empty">
              <strong>Nenhum grupo encontrado</strong>
              <span>Crie grupos para organizar famílias, ordens, equipes, cortes ou núcleos da história.</span>
            </div>
          )}
        </div>
      </section>

      <button type="button" className="character-floating-create" onClick={alternarCriacao}>
        <span>+</span>
        <strong>Personagem</strong>
      </button>

      {mostrarCriacao && (
        <div className="character-profile-modal character-create-modal" role="dialog" aria-modal="true" onClick={() => setMostrarCriacao(false)}>
        <section className="panel character-create-panel character-create-dialog" data-tour="personagem-criar" onClick={(event) => event.stopPropagation()}>
          <div className="panel-header">
            <div>
              <span className="eyebrow">Novo personagem</span>
              <h2>Ficha essencial</h2>
            </div>
            <button type="button" className="button secondary" onClick={() => setMostrarCriacao(false)}>
              Fechar
            </button>
          </div>

          <form className="form-stack" onSubmit={adicionar}>
            <div className="form-grid two">
              <label className="field-group">
                <span>Nome</span>
                <input value={novoPersonagem.nome} onChange={(event) => setNovoPersonagem({ ...novoPersonagem, nome: event.target.value })} />
              </label>
              <div className="field-group">
                <span>Papel</span>
                <RoleSelector
                  value={novoPersonagem.papel}
                  papeis={papeisDisponiveis}
                  onChange={(papel) => setNovoPersonagem({ ...novoPersonagem, papel })}
                  onAddRole={adicionarPapelPersonalizado}
                />
              </div>
            </div>

            <div className="form-grid two">
              <label className="field-group">
                <span>Cor de menção</span>
                <input type="color" value={novoPersonagem.cor} onChange={(event) => setNovoPersonagem({ ...novoPersonagem, cor: event.target.value })} />
              </label>
              <label className="field-group">
                <span>Região no mundo</span>
                <select value={novoPersonagem.regiaoId} onChange={(event) => setNovoPersonagem({ ...novoPersonagem, regiaoId: event.target.value })}>
                  <option value="">Sem região definida</option>
                  {elementosMundo.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.tipo}: {item.nome}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            <div className="image-source-card">
              <div className="character-image-card-title">
                <span className="eyebrow">Retrato</span>
                <strong>Foto principal</strong>
              </div>
              <div className="image-source-grid">
                <label className="field-group">
                  <span>Foto do computador</span>
                  <input type="file" accept="image/*" onChange={selecionarFotoNovo} />
                </label>
                <div className="field-group">
                  <span>Link da imagem</span>
                  <div className="image-link-line">
                    <input
                      type="url"
                      value={linkFotoNovo}
                      onChange={(event) => setLinkFotoNovo(event.target.value)}
                      placeholder="https://exemplo.com/imagem.jpg"
                    />
                    <button type="button" className="button secondary" onClick={aplicarLinkFotoNovo} disabled={!linkFotoNovo.trim()}>
                      Usar link
                    </button>
                  </div>
                </div>
              </div>
              {novoPersonagem.fotoUrl && (
                <div className="image-upload-preview character-preview">
                  <img src={novoPersonagem.fotoUrl} alt="" />
                  <button type="button" className="button ghost" onClick={() => {
                    setNovoPersonagem({ ...novoPersonagem, fotoUrl: "" });
                    setLinkFotoNovo("");
                  }}>
                    Remover foto
                  </button>
                </div>
              )}
            </div>

            <div className="image-source-card character-cover-source-card">
              <div className="character-image-card-title">
                <span className="eyebrow">Capa</span>
                <strong>Imagem ampla da ficha</strong>
              </div>
              <div className="image-source-grid">
                <label className="field-group">
                  <span>Capa do computador</span>
                  <input type="file" accept="image/*" onChange={selecionarCapaNovo} />
                </label>
                <div className="field-group">
                  <span>Link da capa</span>
                  <div className="image-link-line">
                    <input
                      type="url"
                      value={linkCapaNovo}
                      onChange={(event) => setLinkCapaNovo(event.target.value)}
                      placeholder="https://exemplo.com/capa.jpg"
                    />
                    <button type="button" className="button secondary" onClick={aplicarLinkCapaNovo} disabled={!linkCapaNovo.trim()}>
                      Usar link
                    </button>
                  </div>
                </div>
              </div>
              {novoPersonagem.capaUrl && (
                <div className="image-upload-preview character-cover-preview">
                  <img src={novoPersonagem.capaUrl} alt="" />
                  <button type="button" className="button ghost" onClick={() => {
                    setNovoPersonagem({ ...novoPersonagem, capaUrl: "" });
                    setLinkCapaNovo("");
                  }}>
                    Remover capa
                  </button>
                </div>
              )}
            </div>

            <label className="field-group character-history-field">
              <span>História do personagem</span>
              <textarea
                value={novoPersonagem.historia}
                onChange={(event) => setNovoPersonagem({ ...novoPersonagem, historia: event.target.value })}
                rows={8}
                placeholder="Conte a origem, conflitos, relações importantes, transformações e tudo que define a trajetória desse personagem."
              />
            </label>

            <button className="button primary" type="submit" disabled={!novoPersonagem.nome.trim() || Boolean(processandoImagem) || criandoPersonagem}>
              {criandoPersonagem ? "Criando personagem..." : "Adicionar personagem"}
            </button>
          </form>
        </section>
        </div>
      )}

      {personagemAberto && (
        <div className="character-profile-modal" role="dialog" aria-modal="true" onClick={() => setPersonagemAbertoId("")}>
          <section className="character-detail-stage character-profile-shell" onClick={(event) => event.stopPropagation()}>
            <aside className={"character-detail-cover " + (personagemAberto.capaUrl ? "has-cover-image" : "")} style={{ "--character-color": personagemAberto.cor || "#8f1d43" }}>
              {personagemAberto.capaUrl && <img className="character-cover-background" src={personagemAberto.capaUrl} alt="" />}
              {personagemAberto.fotoUrl ? (
                <button
                  type="button"
                  className="character-cover-photo-frame clickable"
                  onClick={() => setImagemAmpliada({ src: personagemAberto.fotoUrl, nome: personagemAberto.nome })}
                  aria-label={"Ampliar imagem de " + personagemAberto.nome}
                >
                  <img className="character-detail-photo" src={personagemAberto.fotoUrl} alt="" />
                  <span className="photo-zoom-hint">Ampliar imagem</span>
                </button>
              ) : (
                <div className="character-cover-photo-frame">
                  <span>{personagemAberto.nome.slice(0, 1)}</span>
                </div>
              )}
              <div className="character-cover-info">
                <span>{personagemAberto.papel}</span>
                <strong>{personagemAberto.nome}</strong>
                <small>{(mapaMencoes[personagemAberto.id]?.sessoes || []).length} menções</small>
              </div>
            </aside>

            <EditableCharacter
              personagem={personagemAberto}
              mencoes={mapaMencoes[personagemAberto.id] || { capitulos: [], sessoes: [] }}
              elementosMundo={elementosMundo}
              papeisDisponiveis={papeisDisponiveis}
              onAddRole={adicionarPapelPersonalizado}
              onSave={(alteracoes, opcoes) => salvarPersonagem(livroSelecionado.id, personagemAberto.id, alteracoes, opcoes)}
              processarImagem={processarImagem}
              onOpenImage={setImagemAmpliada}
              onRemove={() => {
                removerPersonagem(livroSelecionado.id, personagemAberto.id);
                setPersonagemAbertoId("");
              }}
              onClose={() => setPersonagemAbertoId("")}
            />
          </section>
        </div>
      )}

      {grupoModalModo && (
        <GroupFormModal
          modo={grupoModalModo}
          grupo={grupoDraft}
          personagens={personagens}
          onChange={setGrupoDraft}
          onSave={salvarGrupo}
          onClose={fecharGrupoModal}
        />
      )}

      {grupoAberto && !grupoModalModo && (
        <GroupDetailModal
          grupo={grupoAberto}
          personagens={resolverPersonagensGrupo(grupoAberto, personagens)}
          onClose={() => setGrupoAbertoId("")}
          onEdit={() => abrirEditarGrupo(grupoAberto)}
          onRemove={() => removerGrupo(grupoAberto.id)}
        />
      )}

      {imagemAmpliada && (
        <div className="character-image-lightbox" role="dialog" aria-modal="true" onClick={() => setImagemAmpliada(null)}>
          <div className="character-image-lightbox-card" onClick={(event) => event.stopPropagation()}>
            <div className="character-image-lightbox-top">
              <div>
                <span className="eyebrow">Imagem do personagem</span>
                <strong>{imagemAmpliada.nome}</strong>
              </div>
              <button type="button" className="button secondary" onClick={() => setImagemAmpliada(null)}>
                Fechar
              </button>
            </div>
            <img src={imagemAmpliada.src} alt={"Imagem de " + imagemAmpliada.nome} />
          </div>
        </div>
      )}
    </div>
  );
}

function GroupShelfCard({ grupo, personagens, onOpen }) {
  const cor = normalizarCorPersonagem(grupo.cor);
  const titulo = grupo.titulo || grupo.nome || "Grupo sem título";

  return (
    <button type="button" className="character-group-card" style={{ "--group-color": cor }} onClick={onOpen}>
      <span className={"character-group-cover " + (grupo.capaUrl ? "has-image" : "")}>
        {grupo.capaUrl ? <img src={grupo.capaUrl} alt="" loading="lazy" /> : <span>{titulo.slice(0, 1)}</span>}
      </span>
      <span className="character-group-info">
        <small>{personagens.length} integrante(s)</small>
        <strong>{titulo}</strong>
        <em>{grupo.descricao || "Grupo pronto para receber uma descrição."}</em>
      </span>
      <span className="character-group-members">
        {personagens.slice(0, 5).map((personagem) => (
          <i key={personagem.id} style={{ "--member-color": personagem.cor || "#8f1d43" }}>
            {personagem.fotoUrl ? <img src={personagem.fotoUrl} alt="" loading="lazy" /> : (personagem.nome || "P").slice(0, 1)}
          </i>
        ))}
        {personagens.length > 5 && <b>+{personagens.length - 5}</b>}
      </span>
    </button>
  );
}

function GroupFormModal({ modo, grupo, personagens, onChange, onSave, onClose }) {
  const idsSelecionados = new Set((grupo.personagemIds || []).map(String));

  const alternarPersonagem = (personagemId) => {
    const id = String(personagemId);
    const personagemIds = idsSelecionados.has(id)
      ? (grupo.personagemIds || []).filter((item) => String(item) !== id)
      : [...(grupo.personagemIds || []), id];

    onChange({ ...grupo, personagemIds });
  };

  return (
    <div className="character-profile-modal character-group-modal" role="dialog" aria-modal="true" onClick={onClose}>
      <section className="panel character-group-dialog" onClick={(event) => event.stopPropagation()}>
        <button type="button" className="modal-x-button" onClick={onClose} aria-label="Fechar grupo">
          ×
        </button>
        <div className="panel-header">
          <div>
            <span className="eyebrow">{modo === "editar" ? "Editar grupo" : "Novo grupo"}</span>
            <h2>{modo === "editar" ? grupo.titulo || "Grupo" : "Criar grupo"}</h2>
          </div>
        </div>

        <form className="form-stack" onSubmit={onSave}>
          <div className="form-grid two">
            <label className="field-group">
              <span>Título</span>
              <input value={grupo.titulo} onChange={(event) => onChange({ ...grupo, titulo: event.target.value })} />
            </label>
            <label className="field-group">
              <span>Cor do grupo</span>
              <input type="color" value={normalizarCorPersonagem(grupo.cor)} onChange={(event) => onChange({ ...grupo, cor: event.target.value })} />
            </label>
          </div>

          <label className="field-group">
            <span>Capa por link</span>
            <input
              type="url"
              value={grupo.capaUrl}
              onChange={(event) => onChange({ ...grupo, capaUrl: event.target.value })}
              placeholder="https://exemplo.com/capa.jpg"
            />
          </label>

          <label className="field-group">
            <span>Descrição</span>
            <textarea value={grupo.descricao} onChange={(event) => onChange({ ...grupo, descricao: event.target.value })} rows={5} />
          </label>

          <section className="group-character-picker">
            <div>
              <span className="eyebrow">Integrantes</span>
              <strong>{idsSelecionados.size} selecionado(s)</strong>
            </div>
            <div>
              {personagens.map((personagem) => (
                <button
                  key={personagem.id}
                  type="button"
                  className={idsSelecionados.has(String(personagem.id)) ? "active" : ""}
                  style={{ "--character-color": personagem.cor || "#8f1d43" }}
                  onClick={() => alternarPersonagem(personagem.id)}
                >
                  <span>{personagem.fotoUrl ? <img src={personagem.fotoUrl} alt="" loading="lazy" /> : (personagem.nome || "P").slice(0, 1)}</span>
                  <strong>{personagem.nome}</strong>
                  <small>{personagem.papel || "Personagem"}</small>
                </button>
              ))}
            </div>
          </section>

          <div className="group-modal-actions">
            <button type="button" className="button secondary" onClick={onClose}>
              Cancelar
            </button>
            <button type="submit" className="button primary" disabled={!grupo.titulo.trim()}>
              {modo === "editar" ? "Salvar grupo" : "Criar grupo"}
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}

function GroupDetailModal({ grupo, personagens, onClose, onEdit, onRemove }) {
  const titulo = grupo.titulo || grupo.nome || "Grupo sem título";

  return (
    <div className="character-profile-modal character-group-modal" role="dialog" aria-modal="true" onClick={onClose}>
      <section className="panel character-group-dialog group-view-dialog" style={{ "--group-color": normalizarCorPersonagem(grupo.cor) }} onClick={(event) => event.stopPropagation()}>
        <button type="button" className="modal-x-button" onClick={onClose} aria-label="Fechar grupo">
          ×
        </button>

        <header className={"group-view-hero " + (grupo.capaUrl ? "has-image" : "")} style={grupo.capaUrl ? { backgroundImage: "linear-gradient(135deg, rgba(31, 8, 18, 0.72), rgba(31, 8, 18, 0.32)), url(" + grupo.capaUrl + ")" } : undefined}>
          <span>{personagens.length} integrante(s)</span>
          <h2>{titulo}</h2>
          <p>{grupo.descricao || "Sem descrição para este grupo."}</p>
        </header>

        <section className="group-members-showcase">
          <span className="eyebrow">Personagens pertencentes</span>
          <div>
            {personagens.map((personagem) => (
              <article key={personagem.id} style={{ "--character-color": personagem.cor || "#8f1d43" }}>
                <span>{personagem.fotoUrl ? <img src={personagem.fotoUrl} alt="" loading="lazy" /> : (personagem.nome || "P").slice(0, 1)}</span>
                <strong>{personagem.nome}</strong>
                <small>{personagem.papel || "Personagem"}</small>
              </article>
            ))}
            {personagens.length === 0 && (
              <div className="inline-empty compact">
                <strong>Nenhum personagem selecionado</strong>
                <span>Edite o grupo para adicionar integrantes.</span>
              </div>
            )}
          </div>
        </section>

        <div className="group-modal-actions">
          <button type="button" className="button secondary" onClick={onEdit}>
            Editar
          </button>
          <button type="button" className="button danger" onClick={onRemove}>
            Excluir grupo
          </button>
        </div>
      </section>
    </div>
  );
}

function EditableCharacter({ personagem, mencoes, elementosMundo, papeisDisponiveis, onAddRole, onSave, processarImagem, onOpenImage, onRemove, onClose }) {
  const [edicao, setEdicao] = useState(personagem);
  const [linkFotoEdicao, setLinkFotoEdicao] = useState(() => obterLinkImagem(personagem.fotoUrl));
  const [linkCapaEdicao, setLinkCapaEdicao] = useState(() => obterLinkImagem(personagem.capaUrl));
  const [linkImagemExtra, setLinkImagemExtra] = useState("");
  const [tituloImagemExtra, setTituloImagemExtra] = useState("");
  const ultimaVersaoSalva = useRef(JSON.stringify(personagem));
  const regiao = elementosMundo.find((item) => item.id === edicao.regiaoId);
  const { mostrarFeedback } = useFeedback();

  useEffect(() => {
    setEdicao(personagem);
    setLinkFotoEdicao(obterLinkImagem(personagem.fotoUrl));
    setLinkCapaEdicao(obterLinkImagem(personagem.capaUrl));
    setLinkImagemExtra("");
    setTituloImagemExtra("");
    ultimaVersaoSalva.current = JSON.stringify(personagem);
  }, [personagem]);

  useEffect(() => {
    const versaoAtual = JSON.stringify(edicao);
    if (versaoAtual === ultimaVersaoSalva.current) return undefined;

    const temporizador = window.setTimeout(async () => {
      try {
        await onSave(edicao, { silencioso: true });
        ultimaVersaoSalva.current = versaoAtual;
      } catch (error) {
        mostrarFeedback(error.message || "Não foi possível salvar a ficha do personagem.", "erro");
      }
    }, 650);

    return () => window.clearTimeout(temporizador);
  }, [edicao]);

  const selecionarFotoEdicao = async (event) => {
    const arquivo = event.target.files?.[0];
    if (!arquivo) return;

    try {
      const fotoUrl = await processarImagem(arquivo, { tamanhoMaximo: 420, qualidade: 0.72, bytesMaximos: 70 * 1024 }, "Foto do personagem");
      setEdicao((atual) => ({ ...atual, fotoUrl }));
      setLinkFotoEdicao("");
    } catch (error) {
      mostrarFeedback(error.message || "Não foi possível carregar a foto.", "erro");
    }
  };

  const selecionarCapaEdicao = async (event) => {
    const arquivo = event.target.files?.[0];
    if (!arquivo) return;

    try {
      const capaUrl = await processarImagem(arquivo, { tamanhoMaximo: 960, qualidade: 0.74, bytesMaximos: 120 * 1024 }, "Capa do personagem");
      setEdicao((atual) => ({ ...atual, capaUrl }));
      setLinkCapaEdicao("");
    } catch (error) {
      mostrarFeedback(error.message || "Não foi possível carregar a capa.", "erro");
    }
  };

  const selecionarImagemExtra = async (event) => {
    const arquivo = event.target.files?.[0];
    if (!arquivo) return;

    try {
      const url = await processarImagem(arquivo, { tamanhoMaximo: 820, qualidade: 0.74, bytesMaximos: 115 * 1024 }, "Imagem adicional");
      adicionarImagemExtra(url);
      event.target.value = "";
    } catch (error) {
      mostrarFeedback(error.message || "Não foi possível carregar a imagem.", "erro");
    }
  };

  const aplicarLinkFotoEdicao = () => {
    const fotoUrl = normalizarLinkImagem(linkFotoEdicao);
    if (!fotoUrl) {
      mostrarFeedback("Cole um link de imagem começando com http:// ou https://.", "erro");
      return;
    }

    setEdicao((atual) => ({ ...atual, fotoUrl }));
    setLinkFotoEdicao(fotoUrl);
  };

  const aplicarLinkCapaEdicao = () => {
    const capaUrl = normalizarLinkImagem(linkCapaEdicao);
    if (!capaUrl) {
      mostrarFeedback("Cole um link de capa começando com http:// ou https://.", "erro");
      return;
    }

    setEdicao((atual) => ({ ...atual, capaUrl }));
    setLinkCapaEdicao(capaUrl);
  };

  const adicionarImagemExtraPorLink = () => {
    const url = normalizarLinkImagem(linkImagemExtra);
    if (!url) {
      mostrarFeedback("Cole um link de imagem começando com http:// ou https://.", "erro");
      return;
    }

    adicionarImagemExtra(url);
    setLinkImagemExtra("");
  };

  const adicionarImagemExtra = (url) => {
    const imagem = {
      id: "imagem-personagem-" + Date.now() + "-" + Math.random().toString(16).slice(2),
      titulo: tituloImagemExtra.trim() || "Imagem " + ((edicao.imagensAdicionais || []).length + 1),
      url,
      descricao: "",
      criadoEm: new Date().toISOString(),
    };

    setEdicao((atual) => ({
      ...atual,
      imagensAdicionais: [...(atual.imagensAdicionais || []), imagem],
    }));
    setTituloImagemExtra("");
  };

  const atualizarImagemExtra = (imagemId, alteracoes) => {
    setEdicao((atual) => ({
      ...atual,
      imagensAdicionais: (atual.imagensAdicionais || []).map((imagem) =>
        String(imagem.id) === String(imagemId) ? { ...imagem, ...alteracoes, atualizadoEm: new Date().toISOString() } : imagem,
      ),
    }));
  };

  const removerImagemExtra = (imagemId) => {
    setEdicao((atual) => ({
      ...atual,
      imagensAdicionais: (atual.imagensAdicionais || []).filter((imagem) => String(imagem.id) !== String(imagemId)),
    }));
  };

  return (
    <article className="panel character-detail-card" style={{ "--character-color": edicao.cor || "#8f1d43" }}>
      <div className="panel-header">
        <div>
          <span className="eyebrow">Ficha aberta</span>
          <h2>{edicao.nome}</h2>
          <p>{regiao ? regiao.tipo + ": " + regiao.nome : "Sem região vinculada no mundo."}</p>
        </div>
        <button type="button" className="button secondary" onClick={onClose}>
          Fechar ficha
        </button>
      </div>

      <div className="character-identity-grid">
        <label className="field-group compact">
          <span>Nome</span>
          <input value={edicao.nome} onChange={(event) => setEdicao({ ...edicao, nome: event.target.value })} />
        </label>
        <div className="field-group compact">
          <span>Papel</span>
          <RoleSelector
            value={edicao.papel}
            papeis={papeisDisponiveis}
            compact
            onChange={(papel) => setEdicao({ ...edicao, papel })}
            onAddRole={onAddRole}
          />
        </div>
      </div>

      <div className="form-grid two">
        <label className="field-group compact">
          <span>Cor no texto</span>
          <input type="color" value={edicao.cor || "#8f1d43"} onChange={(event) => setEdicao({ ...edicao, cor: event.target.value })} />
        </label>
        <label className="field-group compact">
          <span>Região no mundo</span>
          <select value={edicao.regiaoId || ""} onChange={(event) => setEdicao({ ...edicao, regiaoId: event.target.value })}>
            <option value="">Sem região definida</option>
            {elementosMundo.map((item) => (
              <option key={item.id} value={item.id}>
                {item.tipo}: {item.nome}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="image-source-card">
        <div className="character-image-card-title">
          <span className="eyebrow">Retrato</span>
          <strong>Foto principal</strong>
        </div>
        <div className="image-source-grid">
          <label className="field-group compact">
            <span>Foto do computador</span>
            <input type="file" accept="image/*" onChange={selecionarFotoEdicao} />
          </label>
          <div className="field-group compact">
            <span>Link da imagem</span>
            <div className="image-link-line">
              <input
                type="url"
                value={linkFotoEdicao}
                onChange={(event) => setLinkFotoEdicao(event.target.value)}
                placeholder="https://exemplo.com/imagem.jpg"
              />
              <button type="button" className="button secondary" onClick={aplicarLinkFotoEdicao} disabled={!linkFotoEdicao.trim()}>
                Usar link
              </button>
            </div>
          </div>
        </div>
        {edicao.fotoUrl && (
          <div className="image-upload-preview character-preview">
            <img src={edicao.fotoUrl} alt="" />
            <button type="button" className="button ghost" onClick={() => {
              setEdicao({ ...edicao, fotoUrl: "" });
              setLinkFotoEdicao("");
            }}>
              Remover foto
            </button>
          </div>
        )}
      </div>

      <div className="image-source-card character-cover-source-card">
        <div className="character-image-card-title">
          <span className="eyebrow">Capa</span>
          <strong>Imagem ampla da ficha</strong>
        </div>
        <div className="image-source-grid">
          <label className="field-group compact">
            <span>Capa do computador</span>
            <input type="file" accept="image/*" onChange={selecionarCapaEdicao} />
          </label>
          <div className="field-group compact">
            <span>Link da capa</span>
            <div className="image-link-line">
              <input
                type="url"
                value={linkCapaEdicao}
                onChange={(event) => setLinkCapaEdicao(event.target.value)}
                placeholder="https://exemplo.com/capa.jpg"
              />
              <button type="button" className="button secondary" onClick={aplicarLinkCapaEdicao} disabled={!linkCapaEdicao.trim()}>
                Usar link
              </button>
            </div>
          </div>
        </div>
        {edicao.capaUrl && (
          <div className="image-upload-preview character-cover-preview">
            <img src={edicao.capaUrl} alt="" />
            <button type="button" className="button ghost" onClick={() => {
              setEdicao({ ...edicao, capaUrl: "" });
              setLinkCapaEdicao("");
            }}>
              Remover capa
            </button>
          </div>
        )}
      </div>

      <label className="field-group compact character-history-field">
        <span>História do personagem</span>
        <textarea
          value={edicao.historia || ""}
          onChange={(event) => setEdicao({ ...edicao, historia: event.target.value })}
          rows={12}
          placeholder="Conte a origem, conflitos, relações importantes, transformações e tudo que define a trajetória desse personagem."
        />
      </label>

      <CharacterImageGallery
        imagens={edicao.imagensAdicionais || []}
        tituloDraft={tituloImagemExtra}
        linkDraft={linkImagemExtra}
        onChangeTitulo={setTituloImagemExtra}
        onChangeLink={setLinkImagemExtra}
        onSelectFile={selecionarImagemExtra}
        onAddLink={adicionarImagemExtraPorLink}
        onUpdate={atualizarImagemExtra}
        onRemove={removerImagemExtra}
        onOpenImage={(imagem) => onOpenImage({ src: imagem.url, nome: imagem.titulo || edicao.nome })}
      />

      <div className="mention-map">
        <span>Menções encontradas</span>
        {mencoes.sessoes.length > 0 ? (
          <div>
            {mencoes.sessoes.map((mencao) => (
              <small key={mencao.capitulo + mencao.sessao}>
                {mencao.capitulo} · {mencao.sessao}
              </small>
            ))}
          </div>
        ) : (
          <p>Ainda não foi mencionado em sessões escritas.</p>
        )}
      </div>

      <div className="character-detail-footer">
        <button type="button" className="button danger" onClick={onRemove}>
          Remover personagem
        </button>
      </div>
    </article>
  );
}

function CharacterImageGallery({
  imagens,
  tituloDraft,
  linkDraft,
  onChangeTitulo,
  onChangeLink,
  onSelectFile,
  onAddLink,
  onUpdate,
  onRemove,
  onOpenImage,
}) {
  return (
    <section className="character-extra-gallery">
      <div className="character-extra-gallery-header">
        <div>
          <span className="eyebrow">Imagens adicionais</span>
          <strong>Estante visual do personagem</strong>
        </div>
        <small>{imagens.length} imagem(ns)</small>
      </div>

      <div className="character-extra-add-card">
        <label className="field-group compact">
          <span>Título opcional</span>
          <input
            value={tituloDraft}
            onChange={(event) => onChangeTitulo(event.target.value)}
            placeholder="Ex.: expressão, roupa, cena, referência"
          />
        </label>
        <label className="field-group compact">
          <span>Imagem do computador</span>
          <input type="file" accept="image/*" onChange={onSelectFile} />
        </label>
        <div className="field-group compact">
          <span>Imagem por link</span>
          <div className="image-link-line">
            <input
              type="url"
              value={linkDraft}
              onChange={(event) => onChangeLink(event.target.value)}
              placeholder="https://exemplo.com/referencia.jpg"
            />
            <button type="button" className="button secondary" onClick={onAddLink} disabled={!linkDraft.trim()}>
              Adicionar
            </button>
          </div>
        </div>
      </div>

      {imagens.length > 0 ? (
        <div className="character-extra-gallery-grid">
          {imagens.map((imagem, indice) => {
            const url = imagem.url || imagem.imagemUrl || imagem.src || "";
            const titulo = imagem.titulo || imagem.nome || "Imagem " + (indice + 1);

            return (
              <article className="character-extra-image-card" key={imagem.id || url || indice}>
                <button type="button" className="character-extra-image-preview" onClick={() => onOpenImage({ ...imagem, url, titulo })}>
                  {url ? <img src={url} alt="" loading="lazy" /> : <span>{String(titulo).slice(0, 1)}</span>}
                </button>
                <label className="field-group compact">
                  <span>Título</span>
                  <input value={titulo} onChange={(event) => onUpdate(imagem.id, { titulo: event.target.value })} />
                </label>
                <button type="button" className="button ghost visible-ghost danger-text" onClick={() => onRemove(imagem.id)}>
                  Remover imagem
                </button>
              </article>
            );
          })}
        </div>
      ) : (
        <div className="inline-empty compact">
          <strong>Nenhuma imagem extra</strong>
          <span>Adicione expressões, roupas, referências ou cenas visuais do personagem.</span>
        </div>
      )}
    </section>
  );
}

function RoleSelector({ value, papeis, onChange, onAddRole, compact = false }) {
  const [criando, setCriando] = useState(false);
  const [novoPapel, setNovoPapel] = useState("");

  const adicionar = async () => {
    const papelCriado = await onAddRole(novoPapel);
    if (!papelCriado) return;

    onChange(papelCriado);
    setNovoPapel("");
    setCriando(false);
  };

  return (
    <div className={"role-selector " + (compact ? "compact" : "")}>
      <select value={value || "Protagonista"} onChange={(event) => onChange(event.target.value)}>
        {papeis.map((papel) => (
          <option key={papel} value={papel}>
            {papel}
          </option>
        ))}
      </select>

      {!criando ? (
        <button type="button" className="button ghost" onClick={() => setCriando(true)}>
          Novo papel
        </button>
      ) : (
        <div className="role-selector-new">
          <input
            value={novoPapel}
            onChange={(event) => setNovoPapel(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.preventDefault();
                adicionar();
              }
            }}
            placeholder="Ex.: Guardião, Informante"
          />
          <button type="button" className="button secondary" onClick={adicionar}>
            Adicionar
          </button>
        </div>
      )}
    </div>
  );
}

function resolverPersonagensGrupo(grupo = {}, personagens = []) {
  const ids = new Set((grupo.personagemIds || []).map(String));
  return personagens.filter((personagem) => ids.has(String(personagem.id)));
}

function normalizarCorPersonagem(cor = "#8f1d43") {
  return /^#[0-9a-f]{6}$/i.test(String(cor)) ? cor : "#8f1d43";
}

function coletarMencoesPersonagens(livro) {
  const mapa = {};
  const personagens = livro?.personagens || [];
  const capitulos = livro?.capitulos || [];

  personagens.forEach((personagem) => {
    mapa[personagem.id] = {
      capitulos: [],
      sessoes: [],
    };
  });

  capitulos.forEach((capitulo) => {
    (capitulo.sessoes || []).forEach((sessao) => {
      personagens.forEach((personagem) => {
        const mencionadoPorId = (sessao.personagensMencionados || []).includes(personagem.id);
        const mencionadoNoTexto = sessao.texto?.toLowerCase().includes(personagem.nome.toLowerCase());

        if (!mencionadoPorId && !mencionadoNoTexto) return;

        if (!mapa[personagem.id].capitulos.includes(capitulo.titulo)) {
          mapa[personagem.id].capitulos.push(capitulo.titulo);
        }

        mapa[personagem.id].sessoes.push({
          capitulo: capitulo.titulo,
          sessao: sessao.titulo,
        });
      });
    });
  });

  return mapa;
}

function listarMundo(mundo = {}) {
  return [
    ...(mundo.lugares || []).map((item) => ({ ...item, tipo: "Lugar" })),
    ...(mundo.faccoes || []).map((item) => ({ ...item, tipo: "Facção" })),
    ...(mundo.regras || []).map((item) => ({ ...item, tipo: "Regra" })),
    ...(mundo.linhaDoTempo || []).map((item) => ({ ...item, tipo: "Linha do tempo" })),
  ];
}
