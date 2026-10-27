import { useEffect, useMemo, useState } from "react";

import { useFeedback } from "../context/FeedbackContext";
import { useStoryData } from "../context/StoryDataContext";

const FIRESTORE_LIMITE_BYTES = 1048576;
const CAMPOS_SUBCOLECOES = ["personagens", "ideias", "capitulos", "sessoes", "tarefas", "mundo"];
const PAPEL_SUBSTITUTO = "Aliado";

export default function Configuracoes() {
  const {
    configuracoes,
    livroSelecionado,
    salvarConfiguracoes,
    removerPapelPersonagem,
  } = useStoryData();
  const { pedirConfirmacao } = useFeedback();
  const [preferencias, setPreferencias] = useState(configuracoes);
  const [papelRemovendo, setPapelRemovendo] = useState("");

  useEffect(() => {
    setPreferencias(configuracoes);
  }, [configuracoes]);

  const diagnosticoFirebase = useMemo(() => analisarPesoLivro(livroSelecionado), [livroSelecionado]);
  const resumoLivro = useMemo(() => montarResumoLivro(livroSelecionado), [livroSelecionado]);
  const papeisCriados = useMemo(
    () => [...new Set((livroSelecionado?.papeisPersonagem || []).filter(Boolean))],
    [livroSelecionado?.papeisPersonagem],
  );
  const usosPorPapel = useMemo(() => contarUsosDePapeis(livroSelecionado), [livroSelecionado]);

  const salvar = (event) => {
    event.preventDefault();
    salvarConfiguracoes(preferencias);
  };

  const removerPapel = async (papel) => {
    if (!livroSelecionado) return;

    const totalUsos = usosPorPapel.get(papel) || 0;
    const mensagem =
      totalUsos > 0
        ? `Remover o papel "${papel}"? ${totalUsos} personagem(ns) serão movidos para "${PAPEL_SUBSTITUTO}".`
        : `Remover o papel "${papel}" da lista do livro atual?`;

    const confirmarRemocao = await pedirConfirmacao({
      titulo: "Remover papel?",
      mensagem,
      textoConfirmar: "Remover",
      textoCancelar: "Cancelar",
      perigo: true,
    });

    if (!confirmarRemocao) return;

    setPapelRemovendo(papel);

    try {
      await removerPapelPersonagem(livroSelecionado.id, papel, PAPEL_SUBSTITUTO);
    } finally {
      setPapelRemovendo("");
    }
  };

  return (
    <div className="page settings-page">
      <header className="page-header settings-hero">
        <div>
          <span className="eyebrow">Ajustes</span>
          <h1>Controle do estúdio</h1>
          <p>Preferências do escritor, manutenção do livro ativo e sinais de peso dos dados salvos.</p>
        </div>
      </header>

      <section className="settings-layout settings-main-layout">
        <article className="panel" data-tour="config-metas">
          <div className="panel-header">
            <div>
              <span className="eyebrow">Escrita</span>
              <h2>Preferências do estúdio</h2>
            </div>
          </div>

          <form className="form-stack" onSubmit={salvar}>
            <div className="form-grid two">
              <label className="field-group">
                <span>Meta diária de palavras</span>
                <input
                  type="number"
                  min="0"
                  value={preferencias.metaPalavrasDiaria}
                  onChange={(event) => setPreferencias({ ...preferencias, metaPalavrasDiaria: event.target.value })}
                />
              </label>
              <label className="field-group">
                <span>Meta do livro</span>
                <input
                  type="number"
                  min="0"
                  value={preferencias.metaPalavrasLivro}
                  onChange={(event) => setPreferencias({ ...preferencias, metaPalavrasLivro: event.target.value })}
                />
              </label>
            </div>

            <label className="field-group">
              <span>Modo de foco</span>
              <select value={preferencias.modoFoco} onChange={(event) => setPreferencias({ ...preferencias, modoFoco: event.target.value })}>
                <option value="equilibrado">Equilibrado</option>
                <option value="planejamento">Planejamento</option>
                <option value="rascunho">Rascunho</option>
                <option value="revisao">Revisão</option>
              </select>
            </label>

            <label className="session-option">
              <input
                type="checkbox"
                checked={preferencias.mostrarDiagnosticos}
                onChange={(event) => setPreferencias({ ...preferencias, mostrarDiagnosticos: event.target.checked })}
              />
              <div>
                <strong>Mostrar diagnósticos criativos</strong>
                <span>Ativa avisos de organização nas páginas do livro ativo.</span>
              </div>
            </label>

            <button className="button primary" type="submit" data-tour="config-salvar">
              Salvar preferências
            </button>
          </form>
        </article>

        <article className={"panel settings-weight-card " + diagnosticoFirebase.nivel} data-tour="config-peso">
          <div className="panel-header">
            <div>
              <span className="eyebrow">Firebase</span>
              <h2>Peso do livro ativo</h2>
              <p>{livroSelecionado ? livroSelecionado.titulo : "Nenhum livro selecionado."}</p>
            </div>
          </div>

          <div className="settings-weight-readout">
            <div>
              <strong>{diagnosticoFirebase.status}</strong>
              <span>{diagnosticoFirebase.percentual}% do limite do documento principal</span>
            </div>
            <strong>{diagnosticoFirebase.bytesDocumentoFormatado}</strong>
          </div>

          <div className={"storage-meter " + diagnosticoFirebase.nivel} aria-hidden="true">
            <span style={{ width: diagnosticoFirebase.percentualVisual + "%" }} />
          </div>

          <div className="settings-image-advice">
            <strong>Recomendação sobre imagens</strong>
            <p>
              Sempre que possível, guarde capas, fotos de personagens, mapas e imagens do mundo por link. Imagens enviadas do computador
              ficam dentro dos dados do livro, deixam tudo mais pesado e podem fazer o Firestore bloquear novos salvamentos quando o limite
              for atingido.
            </p>
          </div>

          <div className="settings-weight-grid">
            <div className="settings-mini-card">
              <span>Documento principal</span>
              <strong>{diagnosticoFirebase.bytesDocumentoFormatado}</strong>
              <small>Limite: 1 MB</small>
            </div>
            <div className="settings-mini-card">
              <span>Conteúdo carregado</span>
              <strong>{diagnosticoFirebase.bytesTotalFormatado}</strong>
              <small>Distribuído no app</small>
            </div>
            <div className="settings-mini-card">
              <span>Imagens locais</span>
              <strong>{diagnosticoFirebase.imagensEmbutidas}</strong>
              <small>Pesam mais no banco</small>
            </div>
            <div className="settings-mini-card">
              <span>Imagens por link</span>
              <strong>{diagnosticoFirebase.imagensPorLink}</strong>
              <small>Mais leves</small>
            </div>
          </div>

          <ul className="settings-alert-list">
            {diagnosticoFirebase.avisos.map((aviso) => (
              <li key={aviso}>{aviso}</li>
            ))}
          </ul>
        </article>
      </section>

      <section className="settings-layout settings-main-layout">
        <article className="panel role-manager-card" data-tour="config-papeis">
          <div className="panel-header">
            <div>
              <span className="eyebrow">Personagens</span>
              <h2>Papéis criados pelo usuário</h2>
              <p>{papeisCriados.length} papel(is) personalizados neste livro.</p>
            </div>
          </div>

          {papeisCriados.length > 0 ? (
            <div className="role-manager-list">
              {papeisCriados.map((papel) => {
                const totalUsos = usosPorPapel.get(papel) || 0;

                return (
                  <div className="role-manager-row" key={papel}>
                    <div>
                      <strong>{papel}</strong>
                      <span>
                        {totalUsos > 0
                          ? `${totalUsos} personagem(ns) usando. Ao remover, passam para "${PAPEL_SUBSTITUTO}".`
                          : "Não está em uso no elenco atual."}
                      </span>
                    </div>
                    <button
                      type="button"
                      className="button danger"
                      onClick={() => removerPapel(papel)}
                      disabled={papelRemovendo === papel}
                    >
                      {papelRemovendo === papel ? "Removendo..." : "Remover"}
                    </button>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="inline-empty compact-empty">
              <strong>Nenhum papel personalizado</strong>
              <span>Os papéis extras criados na página Personagens aparecerão aqui.</span>
            </div>
          )}
        </article>

        <article className="panel settings-summary-panel" data-tour="config-resumo">
          <div className="panel-header">
            <div>
              <span className="eyebrow">Livro ativo</span>
              <h2>Resumo de organização</h2>
              <p>Última atualização: {formatarData(livroSelecionado?.atualizadoEm)}</p>
            </div>
          </div>

          <div className="settings-summary-grid">
            {resumoLivro.map((item) => (
              <div className="settings-summary-item" key={item.rotulo}>
                <span>{item.rotulo}</span>
                <strong>{item.valor}</strong>
              </div>
            ))}
          </div>

          <div className="config-note settings-note">
            <strong>{diagnosticoFirebase.notaTitulo}</strong>
            <p>{diagnosticoFirebase.notaTexto}</p>
          </div>
        </article>
      </section>
    </div>
  );
}

function analisarPesoLivro(livro) {
  if (!livro) {
    return {
      nivel: "safe",
      status: "Sem livro ativo",
      percentual: 0,
      percentualVisual: 0,
      bytesDocumentoFormatado: "0 KB",
      bytesTotalFormatado: "0 KB",
      imagensEmbutidas: 0,
      imagensPorLink: 0,
      avisos: ["Selecione um livro para acompanhar o peso dos dados."],
      notaTitulo: "Nenhum livro selecionado",
      notaTexto: "Quando um livro estiver ativo, esta área mostra o peso estimado do documento principal e dos dados carregados.",
    };
  }

  const documentoPrincipal = extrairDocumentoPrincipal(livro);
  const bytesDocumento = medirBytes(documentoPrincipal);
  const bytesTotal = medirBytes(livro);
  const percentual = Math.round((bytesDocumento / FIRESTORE_LIMITE_BYTES) * 100);
  const imagens = contarImagens(livro);
  const nivel = percentual >= 90 ? "danger" : percentual >= 70 ? "warning" : "safe";
  const status = nivel === "danger" ? "Pesado" : nivel === "warning" ? "Atenção" : "Seguro";
  const avisos = montarAvisos({ nivel, percentual, imagens });

  return {
    nivel,
    status,
    percentual,
    percentualVisual: Math.min(100, Math.max(percentual, bytesDocumento > 0 ? 2 : 0)),
    bytesDocumentoFormatado: formatarBytes(bytesDocumento),
    bytesTotalFormatado: formatarBytes(bytesTotal),
    imagensEmbutidas: imagens.embutidas,
    imagensPorLink: imagens.links,
    avisos,
    notaTitulo: "Dados separados por segurança",
    notaTexto: "Personagens, capítulos, sessões, ideias e mundo ficam em subcoleções. O medidor principal indica o risco de estourar o limite do documento do livro.",
  };
}

function extrairDocumentoPrincipal(livro) {
  const documento = { ...(livro || {}) };
  delete documento.id;

  CAMPOS_SUBCOLECOES.forEach((campo) => {
    delete documento[campo];
  });

  return documento;
}

function medirBytes(valor) {
  const texto = JSON.stringify(valor || {});
  if (typeof TextEncoder !== "undefined") {
    return new TextEncoder().encode(texto).length;
  }

  return texto.length;
}

function contarImagens(valor, vistos = new Set()) {
  if (!valor) return { embutidas: 0, links: 0 };

  if (typeof valor === "string") {
    const texto = valor.trim();
    if (texto.startsWith("data:image")) return { embutidas: 1, links: 0 };
    if (/^https?:\/\//i.test(texto) && (/\.(png|jpe?g|webp|gif|avif|svg)([?#].*)?$/i.test(texto) || /postimg|imgur|cloudinary/i.test(texto))) {
      return { embutidas: 0, links: 1 };
    }

    return { embutidas: 0, links: 0 };
  }

  if (typeof valor !== "object" || typeof valor.toDate === "function") {
    return { embutidas: 0, links: 0 };
  }

  if (vistos.has(valor)) return { embutidas: 0, links: 0 };
  vistos.add(valor);

  return Object.values(valor).reduce(
    (total, item) => {
      const contagem = contarImagens(item, vistos);
      return {
        embutidas: total.embutidas + contagem.embutidas,
        links: total.links + contagem.links,
      };
    },
    { embutidas: 0, links: 0 },
  );
}

function montarAvisos({ nivel, percentual, imagens }) {
  const avisos = [];

  if (nivel === "danger") {
    avisos.push("O documento principal está perto demais do limite do Firestore.");
  } else if (nivel === "warning") {
    avisos.push("O documento principal ainda salva, mas já merece atenção.");
  } else {
    avisos.push("O documento principal está leve para o limite do Firestore.");
  }

  if (imagens.embutidas > 0) {
    avisos.push("Imagens vindas do computador ocupam mais espaço que imagens por link.");
  }

  if (imagens.links > 0) {
    avisos.push("Imagens por link ajudam a manter o livro mais leve.");
  }

  if (percentual < 70 && imagens.embutidas === 0) {
    avisos.push("Não há sinal de peso crítico nos dados principais.");
  }

  return avisos;
}

function montarResumoLivro(livro) {
  if (!livro) {
    return [
      { rotulo: "Personagens", valor: 0 },
      { rotulo: "Capítulos", valor: 0 },
      { rotulo: "Sessões", valor: 0 },
      { rotulo: "Itens do mundo", valor: 0 },
      { rotulo: "Ideias", valor: 0 },
      { rotulo: "Tarefas", valor: 0 },
    ];
  }

  return [
    { rotulo: "Personagens", valor: livro.personagens?.length || 0 },
    { rotulo: "Capítulos", valor: livro.capitulos?.length || 0 },
    { rotulo: "Sessões", valor: contarSessoes(livro) },
    { rotulo: "Itens do mundo", valor: contarItensMundo(livro.mundo) },
    { rotulo: "Ideias", valor: livro.ideias?.length || 0 },
    { rotulo: "Tarefas", valor: livro.tarefas?.length || 0 },
  ];
}

function contarSessoes(livro) {
  const sessoesAvulsas = livro?.sessoes?.length || 0;
  const sessoesCapitulos = (livro?.capitulos || []).reduce((total, capitulo) => total + (capitulo.sessoes?.length || 0), 0);

  return sessoesAvulsas + sessoesCapitulos;
}

function contarItensMundo(mundo) {
  return Object.values(mundo || {}).reduce((total, lista) => total + (Array.isArray(lista) ? lista.length : 0), 0);
}

function contarUsosDePapeis(livro) {
  return (livro?.personagens || []).reduce((mapa, personagem) => {
    const papel = personagem.papel || "";
    if (!papel) return mapa;

    mapa.set(papel, (mapa.get(papel) || 0) + 1);
    return mapa;
  }, new Map());
}

function formatarBytes(bytes) {
  if (!bytes) return "0 KB";

  const valor = bytes >= 1024 * 1024 ? bytes / (1024 * 1024) : bytes / 1024;
  const unidade = bytes >= 1024 * 1024 ? "MB" : "KB";

  return valor.toLocaleString("pt-BR", { maximumFractionDigits: 1 }) + " " + unidade;
}

function formatarData(valor) {
  if (!valor) return "sem registro";

  const data = typeof valor?.toDate === "function" ? valor.toDate() : new Date(valor);
  if (Number.isNaN(data.getTime())) return "sem registro";

  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(data);
}
