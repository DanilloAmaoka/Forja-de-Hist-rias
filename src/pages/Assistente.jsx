import { useMemo, useState } from "react";

import EmptyBookState from "../components/EmptyBookState";
import { useStoryData } from "../context/StoryDataContext";

const modos = [
  { id: "cena", nome: "Cena" },
  { id: "mundo", nome: "Mundo" },
  { id: "personagem", nome: "Personagem" },
  { id: "revisao", nome: "Revisão" },
];

export default function Assistente() {
  const {
    livroSelecionado,
    generoAtual,
    diagnosticoAtual,
    sugestoesAtuais,
    progressoAtual,
    adicionarIdeia,
  } = useStoryData();
  const [modo, setModo] = useState("cena");
  const [objetivo, setObjetivo] = useState("");

  const prompt = useMemo(() => {
    if (!livroSelecionado) return "";
    return montarPrompt({ livro: livroSelecionado, genero: generoAtual, modo, objetivo });
  }, [generoAtual, livroSelecionado, modo, objetivo]);

  if (!livroSelecionado) {
    return (
      <div className="page">
        <EmptyBookState titulo="O assistente precisa de um livro ativo" />
      </div>
    );
  }

  const salvarComoIdeia = async () => {
    await adicionarIdeia(livroSelecionado.id, {
      titulo: "Prompt de " + modos.find((item) => item.id === modo).nome,
      tipo: "Assistente",
      descricao: prompt,
      estado: "investigar",
      prioridade: "alta",
      etiquetas: "assistente, " + modo,
    });
  };

  return (
    <div className="page">
      <header className="page-header">
        <div>
          <span className="eyebrow">Assistente</span>
          <h1>Mesa de inteligência criativa</h1>
          <p>Diagnóstico, perguntas de gênero e prompts de trabalho para continuar a história.</p>
        </div>
      </header>

      <section className="assistant-grid">
        <article className="panel" data-tour="assistente-diagnostico">
          <div className="panel-header">
            <div>
              <span className="eyebrow">Diagnóstico</span>
              <h2>Saúde do projeto</h2>
            </div>
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

        <article className="panel" data-tour="assistente-genero">
          <div className="panel-header">
            <div>
              <span className="eyebrow">{generoAtual.nome}</span>
              <h2>Kit do gênero</h2>
            </div>
          </div>

          <div className="tag-grid">
            {generoAtual.estruturas.map((estrutura) => (
              <span key={estrutura}>{estrutura}</span>
            ))}
          </div>

          <div className="prompt-list">
            {generoAtual.perguntas.map((pergunta) => (
              <p key={pergunta}>{pergunta}</p>
            ))}
          </div>
        </article>
      </section>

      <section className="panel" data-tour="assistente-prompt">
        <div className="panel-header">
          <div>
            <span className="eyebrow">Gerador de direção</span>
            <h2>Prompt de trabalho</h2>
          </div>
          <button className="button secondary" type="button" onClick={salvarComoIdeia}>
            Salvar como ideia
          </button>
        </div>

        <div className="assistant-builder">
          <div>
            <div className="segmented-control">
              {modos.map((item) => (
                <button key={item.id} type="button" className={modo === item.id ? "active" : ""} onClick={() => setModo(item.id)}>
                  {item.nome}
                </button>
              ))}
            </div>

            <label className="field-group">
              <span>Objetivo agora</span>
              <input
                value={objetivo}
                onChange={(event) => setObjetivo(event.target.value)}
                placeholder="Ex.: criar a primeira virada, resolver o vilão, melhorar o capítulo 2"
              />
            </label>
          </div>

          <textarea className="prompt-output" value={prompt} readOnly rows={16} />
        </div>
      </section>

      <section className="assistant-grid">
        <article className="panel">
          <div className="panel-header">
            <div>
              <span className="eyebrow">Próximos blocos</span>
              <h2>Sugestões acionáveis</h2>
            </div>
          </div>

          <div className="suggestion-grid compact">
            {sugestoesAtuais.map((sugestao) => (
              <article className="suggestion-card" key={sugestao.titulo}>
                <strong>{sugestao.titulo}</strong>
                <p>{sugestao.texto}</p>
              </article>
            ))}
          </div>
        </article>

        <article className="panel">
          <div className="panel-header">
            <div>
              <span className="eyebrow">Resumo numérico</span>
              <h2>Matéria-prima</h2>
            </div>
          </div>

          <div className="stat-list">
            <span>Personagens: <strong>{progressoAtual.personagens}</strong></span>
            <span>Ideias: <strong>{progressoAtual.ideias}</strong></span>
            <span>Capítulos: <strong>{progressoAtual.capitulos}</strong></span>
            <span>Palavras: <strong>{progressoAtual.palavras.toLocaleString("pt-BR")}</strong></span>
          </div>
        </article>
      </section>
    </div>
  );
}

function montarPrompt({ livro, genero, modo, objetivo }) {
  const personagens = livro.personagens?.slice(0, 5).map((personagem) => personagem.nome + " (" + personagem.papel + ")").join(", ") || "ainda sem elenco definido";
  const lugares = livro.mundo?.lugares?.slice(0, 5).map((lugar) => lugar.nome).join(", ") || "ainda sem lugares definidos";
  const objetivoAtual = objetivo || "encontrar o próximo passo mais forte para a história";

  const base = [
    "Livro: " + livro.titulo,
    "Gênero: " + genero.nome,
    "Tom: " + (livro.tom || genero.tom),
    "Logline: " + (livro.logline || "ainda não definida"),
    "Premissa: " + (livro.premissa || "ainda não definida"),
    "Personagens disponíveis: " + personagens,
    "Lugares disponíveis: " + lugares,
    "Objetivo da conversa: " + objetivoAtual,
  ].join("\n");

  const instrucoes = {
    cena: "Crie 3 possibilidades de cena com conflito claro, objetivo dramático, virada e consequência para o próximo capítulo.",
    mundo: "Aponte 5 detalhes de mundo que afetam escolhas dos personagens e explique como cada um pode aparecer em cena.",
    personagem: "Sugira conflitos internos, desejos contraditórios e relações tensas para fortalecer o elenco atual.",
    revisao: "Avalie lacunas de estrutura, ritmo, promessa de gênero e clareza emocional. Liste correções em ordem de impacto.",
  };

  return base + "\n\nPedido:\n" + instrucoes[modo] + "\n\nResponda com ações concretas, sem resumo genérico.";
}
