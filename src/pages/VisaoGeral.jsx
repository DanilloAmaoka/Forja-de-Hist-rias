import { NavLink } from "react-router-dom";

import EmptyBookState from "../components/EmptyBookState";
import { useStoryData } from "../context/StoryDataContext";

const secoesFixasMundo = [
  { id: "lugares", nome: "Lugares" },
  { id: "faccoes", nome: "Facções" },
  { id: "regras", nome: "Regras" },
  { id: "mapas", nome: "Mapas" },
  { id: "linhaDoTempo", nome: "Linha do Tempo" },
];

const maximosGrafico = {
  mundo: 24,
  personagens: 14,
  capitulos: 16,
  ideias: 22,
};

export default function VisaoGeral() {
  const { livroSelecionado, carregandoLivros, progressoAtual } = useStoryData();

  if (carregandoLivros) {
    return <main className="auth-loading">Carregando visão geral...</main>;
  }

  if (!livroSelecionado) {
    return (
      <div className="page overview-page">
        <header className="page-header">
          <div>
            <span className="eyebrow">Visão Geral</span>
            <h1>Seu mundo ainda espera o primeiro livro</h1>
            <p>Crie ou selecione um livro para ver o mapa vivo da história se formar.</p>
          </div>
        </header>
        <EmptyBookState titulo="Escolha um livro para abrir a visão geral" />
      </div>
    );
  }

  const resumo = criarResumo(livroSelecionado, progressoAtual);
  const completude = calcularCompletude(resumo);
  const mundoNome = livroSelecionado.nomeMundo || "Mundo de " + livroSelecionado.titulo;
  const estilosGrafico = {
    "--overview-fill": completude + "%",
    "--overview-color": livroSelecionado.cor || "#8f1d43",
  };

  return (
    <div className="page overview-page" style={estilosGrafico}>
      <header className="page-header overview-hero">
        <div>
          <span className="eyebrow">Visão Geral</span>
          <h1>{mundoNome}</h1>
          <p>
            Um mapa delicado do livro ativo. Personagens, mundo, ideias e capítulos vão acendendo o centro conforme a história ganha corpo.
          </p>
        </div>
        <div className="overview-hero-badge">
          <span>Encanto do mundo</span>
          <strong>{completude}%</strong>
          <small>{livroSelecionado.titulo}</small>
        </div>
      </header>

      <section className="overview-stage panel" aria-label="Mapa visual do livro ativo">
        <div className="overview-orbit-panel left">
          <OverviewPetal titulo="Mundo" valor={resumo.mundo.total} texto={resumo.mundo.destaque} tom="green" to="/mundo" />
          <OverviewPetal titulo="Personagens" valor={resumo.personagens.total} texto={resumo.personagens.destaque} tom="wine" to="/personagens" />
        </div>

        <div className="overview-world-graph">
          <div className="overview-ring outer" />
          <div className="overview-ring middle" />
          <div className="overview-ring inner" />

          <div className="overview-node node-world">
            <strong>{resumo.mundo.total}</strong>
            <span>Mundo</span>
          </div>
          <div className="overview-node node-characters">
            <strong>{resumo.personagens.total}</strong>
            <span>Elenco</span>
          </div>
          <div className="overview-node node-writing">
            <strong>{resumo.capitulos.total}</strong>
            <span>Capítulos</span>
          </div>
          <div className="overview-node node-ideas">
            <strong>{resumo.ideias.total}</strong>
            <span>Ideias</span>
          </div>

          <div className="overview-world-core">
            <span>✦</span>
            <h2>{mundoNome}</h2>
            <p>{resumo.fraseCentral}</p>
          </div>

          <div className="overview-spark spark-a" />
          <div className="overview-spark spark-b" />
          <div className="overview-spark spark-c" />
          <div className="overview-spark spark-d" />
        </div>

        <div className="overview-orbit-panel right">
          <OverviewPetal titulo="Capítulos" valor={resumo.capitulos.total} texto={resumo.capitulos.destaque} tom="blue" to="/escrita" />
          <OverviewPetal titulo="Ideias" valor={resumo.ideias.total} texto={resumo.ideias.destaque} tom="gold" to="/ideias" />
        </div>
      </section>

      <section className="overview-constellation">
        {resumo.constelacao.map((item) => (
          <article className={"overview-star-card " + item.tom} key={item.titulo}>
            <span>{item.rotulo}</span>
            <strong>{item.titulo}</strong>
            <p>{item.texto}</p>
          </article>
        ))}
      </section>

      <section className="panel overview-soft-actions">
        <div>
          <span className="eyebrow">Continuar sem abrir fichas</span>
          <h2>Escolha para onde levar energia agora</h2>
        </div>
        <div>
          <NavLink to="/mundo">Completar mundo</NavLink>
          <NavLink to="/personagens">Ver elenco</NavLink>
          <NavLink to="/escrita">Ir para escrita</NavLink>
          <NavLink to="/ideias">Abrir ideias</NavLink>
        </div>
      </section>
    </div>
  );
}

function OverviewPetal({ titulo, valor, texto, tom, to }) {
  return (
    <NavLink className={"overview-petal " + tom} to={to}>
      <span>{titulo}</span>
      <strong>{valor}</strong>
      <small>{texto}</small>
    </NavLink>
  );
}

function criarResumo(livro, progressoAtual = {}) {
  const personagens = livro.personagens || [];
  const capitulos = livro.capitulos || [];
  const ideias = livro.ideias || [];
  const mundo = livro.mundo || {};
  const secoes = montarSecoesMundo(livro);
  const itensMundo = contarItensMundo(mundo);
  const capitulosConcluidos = capitulos.filter((capitulo) => capitulo.status === "concluido" || capitulo.concluido).length;
  const ideiasLigadas = ideias.filter((ideia) => (ideia.vinculosMundoIds || ideia.mundoIds || ideia.itensMundoIds || []).length > 0).length;
  const personagensComImagem = personagens.filter((personagem) => personagem.fotoUrl || personagem.imagemUrl).length;
  const lugares = mundo.lugares || [];
  const mapas = mundo.mapas || [];

  return {
    mundo: {
      total: itensMundo,
      destaque: itensMundo > 0 ? secoes.filter((secao) => secao.quantidade > 0).length + " seções acesas" : "comece por um lugar",
    },
    personagens: {
      total: personagens.length,
      destaque: personagens.length > 0 ? personagensComImagem + " com imagem" : "elenco esperando nomes",
    },
    capitulos: {
      total: capitulos.length,
      destaque: capitulos.length > 0 ? capitulosConcluidos + " concluído(s)" : "primeiro capítulo em branco",
    },
    ideias: {
      total: ideias.length,
      destaque: ideias.length > 0 ? ideiasLigadas + " ligadas ao mundo" : "sementes criativas vazias",
    },
    fraseCentral: montarFraseCentral(livro, progressoAtual, itensMundo),
    constelacao: [
      {
        rotulo: "Cenário",
        titulo: lugares[0]?.nome || livro.nomeMundo || "Primeiro lugar",
        texto: lugares[0]?.descricao || "Lugares e mapas deixam o mundo com textura própria.",
        tom: "green",
      },
      {
        rotulo: "Elenco",
        titulo: personagens[0]?.nome || "Personagem principal",
        texto: personagens[0]?.desejo || personagens[0]?.arco || "Dê desejo, medo e segredo para o elenco respirar melhor.",
        tom: "wine",
      },
      {
        rotulo: "Escrita",
        titulo: capitulos[0]?.titulo || "Capítulo inicial",
        texto: capitulos[0]?.resumo || (progressoAtual.palavras || 0).toLocaleString("pt-BR") + " palavras registradas no livro.",
        tom: "blue",
      },
      {
        rotulo: "Faísca",
        titulo: ideias[0]?.titulo || "Ideia guardada",
        texto: ideias[0]?.descricao || "Ideias conectadas ajudam a não perder soluções e cenas futuras.",
        tom: "gold",
      },
      {
        rotulo: "Mapa",
        titulo: mapas[0]?.nome || "Mapa do mundo",
        texto: mapas[0]?.descricao || "Mapas transformam o cenário em um lugar que dá vontade de visitar.",
        tom: "teal",
      },
    ],
  };
}

function calcularCompletude(resumo) {
  const pontos =
    limitar(resumo.mundo.total, maximosGrafico.mundo) / maximosGrafico.mundo +
    limitar(resumo.personagens.total, maximosGrafico.personagens) / maximosGrafico.personagens +
    limitar(resumo.capitulos.total, maximosGrafico.capitulos) / maximosGrafico.capitulos +
    limitar(resumo.ideias.total, maximosGrafico.ideias) / maximosGrafico.ideias;

  return Math.max(8, Math.round((pontos / 4) * 100));
}

function montarFraseCentral(livro, progressoAtual, itensMundo) {
  if (livro.logline) return livro.logline;
  if (livro.premissa) return livro.premissa;
  if ((progressoAtual?.palavras || 0) > 0) return "A história já tem palavras, rastros e um coração começando a bater.";
  if (itensMundo > 0) return "O mundo já tem matéria. Agora ele só precisa de movimento.";
  return "Toda história começa como um brilho pequeno no centro da página.";
}

function montarSecoesMundo(livro) {
  const mundo = livro?.mundo || {};
  const personalizadas = (livro?.secoesMundo || []).filter((secao) => !secoesFixasMundo.some((fixa) => fixa.id === secao.id));
  const secoes = [...secoesFixasMundo, ...personalizadas];
  const ids = new Set(secoes.map((secao) => secao.id));
  const extras = Object.keys(mundo)
    .filter((id) => !ids.has(id))
    .map((id) => ({ id, nome: formatarNome(id) }));

  return [...secoes, ...extras].map((secao) => ({
    ...secao,
    quantidade: Array.isArray(mundo[secao.id]) ? mundo[secao.id].length : 0,
  }));
}

function contarItensMundo(mundo = {}) {
  return Object.values(mundo).reduce((total, lista) => total + contarItensLista(lista), 0);
}

function contarItensLista(lista) {
  if (!Array.isArray(lista)) return 0;

  return lista.reduce((total, item) => {
    const ramificacoes = contarItensLista(item.ramificacoes);
    const blocos = contarItensLista(item.blocos);
    const mapasInternos = contarItensLista(item.mapasInternos);
    return total + 1 + ramificacoes + blocos + mapasInternos;
  }, 0);
}

function limitar(valor, maximo) {
  return Math.min(Number(valor) || 0, maximo);
}

function formatarNome(valor = "") {
  return String(valor || "Seção")
    .replace(/([A-Z])/g, " $1")
    .replace(/[-_]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/^./, (letra) => letra.toUpperCase());
}
