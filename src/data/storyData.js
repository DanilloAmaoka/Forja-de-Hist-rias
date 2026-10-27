const hoje = () => new Date().toISOString().slice(0, 10);

export const generosHistoria = [
  {
    id: "fantasia",
    nome: "Fantasia",
    cor: "#8f1d43",
    rgb: "143, 29, 67",
    tom: "magia, mitos, reinos e conflitos de poder",
    foco: ["Sistema de magia", "Mapa político", "Raças ou povos", "Profecias e preços"],
    perguntas: [
      "Qual é o preço real da magia?",
      "Quem controla o conhecimento antigo?",
      "Que tradição do mundo limita o protagonista?",
      "Que criatura, povo ou reino mudaria tudo se desaparecesse?",
    ],
    estruturas: ["Mapa de reinos", "Regras mágicas", "Linhas de sangue", "Relíquias"],
  },
  {
    id: "ficcao-cientifica",
    nome: "Ficção científica",
    cor: "#315a8c",
    rgb: "49, 90, 140",
    tom: "tecnologia, futuro, ética e ruptura social",
    foco: ["Tecnologia central", "Consequência social", "Instituições", "Limites científicos"],
    perguntas: [
      "Qual invenção muda a vida cotidiana?",
      "Quem lucra com essa tecnologia?",
      "Que dilema moral não tem resposta simples?",
      "O que ainda é humano nesse futuro?",
    ],
    estruturas: ["Linha tecnológica", "Sociedades futuras", "Protocolos", "Falhas sistêmicas"],
  },
  {
    id: "misterio",
    nome: "Mistério",
    cor: "#604285",
    rgb: "96, 66, 133",
    tom: "segredos, pistas, suspeitos e revelações graduais",
    foco: ["Incidente inicial", "Pistas", "Suspeitos", "Viradas"],
    perguntas: [
      "O que o leitor acredita no começo que será desmontado depois?",
      "Qual pista parece detalhe, mas carrega a verdade?",
      "Quem mente por proteção e quem mente por culpa?",
      "Que revelação muda o significado do primeiro capítulo?",
    ],
    estruturas: ["Quadro de suspeitos", "Linha de pistas", "Falsas respostas", "Revelação final"],
  },
  {
    id: "terror",
    nome: "Terror",
    cor: "#4a0f1f",
    rgb: "74, 15, 31",
    tom: "ameaça, vulnerabilidade, atmosfera e perda de controle",
    foco: ["Fonte do medo", "Isolamento", "Escalada", "Regra da ameaça"],
    perguntas: [
      "Do que o protagonista não consegue fugir?",
      "Qual regra deixa a ameaça mais assustadora?",
      "O que o ambiente faz para quebrar a segurança?",
      "Que escolha piora tudo mesmo parecendo racional?",
    ],
    estruturas: ["Escalada de medo", "Regras da ameaça", "Ambientes hostis", "Ponto sem retorno"],
  },
  {
    id: "romance",
    nome: "Romance",
    cor: "#b34762",
    rgb: "179, 71, 98",
    tom: "desejo, intimidade, escolhas emocionais e transformação",
    foco: ["Dinâmica do casal", "Obstáculos", "Vulnerabilidade", "Escolha final"],
    perguntas: [
      "O que cada personagem acredita que não merece?",
      "Qual diferença entre eles vira força e conflito?",
      "Que gesto pequeno prova a mudança emocional?",
      "Qual verdade precisa ser dita antes do final?",
    ],
    estruturas: ["Arcos emocionais", "Cenas de aproximação", "Obstáculos internos", "Escolha afetiva"],
  },
  {
    id: "aventura",
    nome: "Aventura",
    cor: "#b36b2c",
    rgb: "179, 107, 44",
    tom: "movimento, descoberta, risco e objetivo claro",
    foco: ["Mapa da jornada", "Tesouro ou missão", "Riscos", "Companheiros"],
    perguntas: [
      "O que torna a missão urgente?",
      "Que lugar exige uma habilidade nova?",
      "Qual aliado complica a jornada?",
      "O que o prêmio custará ao protagonista?",
    ],
    estruturas: ["Rota de viagem", "Provas", "Rivais", "Recompensa com custo"],
  },
  {
    id: "drama",
    nome: "Drama",
    cor: "#6f514c",
    rgb: "111, 81, 76",
    tom: "relações, escolhas difíceis, memória e consequência",
    foco: ["Ferida central", "Relações", "Decisão moral", "Mudança interna"],
    perguntas: [
      "Que verdade a família, grupo ou personagem evita dizer?",
      "Qual decisão pequena tem consequência enorme?",
      "O que o protagonista precisa perder para amadurecer?",
      "Qual cena mostra a mudança sem explicar a mudança?",
    ],
    estruturas: ["Conflitos íntimos", "Segredos", "Cenas espelho", "Virada emocional"],
  },
];

export const CONFIG_HISTORIAS_PADRAO = {
  metaPalavrasDiaria: 800,
  metaPalavrasLivro: 70000,
  modoFoco: "equilibrado",
  mostrarDiagnosticos: true,
};

export function obterGenero(generoId) {
  return generosHistoria.find((genero) => genero.id === generoId) || generosHistoria[0];
}

export function criarId() {
  return String(Date.now()) + "-" + Math.random().toString(16).slice(2);
}

function lista(valor) {
  return Array.isArray(valor) ? valor : [];
}

function texto(valor, fallback = "") {
  return typeof valor === "string" && valor.trim() ? valor.trim() : fallback;
}

function numero(valor, fallback = 0) {
  const convertido = Number(valor);
  return Number.isFinite(convertido) ? convertido : fallback;
}

function contarPalavras(textoLivre = "") {
  const palavras = String(textoLivre)
    .trim()
    .split(/\s+/)
    .filter(Boolean);

  return palavras.length;
}

function corPorTexto(valor = "Personagem") {
  const paleta = ["#8f1d43", "#315a8c", "#427066", "#b36b2c", "#604285", "#9d3d56", "#6f514c", "#2f6f86", "#995c31"];
  const indice = String(valor)
    .split("")
    .reduce((total, caractere) => total + caractere.charCodeAt(0), 0);

  return paleta[indice % paleta.length];
}

function corAleatoriaCapitulo() {
  const paleta = ["#8f1d43", "#315a8c", "#427066", "#b36b2c", "#604285", "#9d3d56", "#6f514c", "#2f6f86", "#995c31"];
  return paleta[Math.floor(Math.random() * paleta.length)];
}

function corAleatoriaMundo() {
  const paleta = ["#8f1d43", "#315a8c", "#427066", "#b36b2c", "#604285", "#9d3d56", "#2f6f86", "#7c4b37"];
  return paleta[Math.floor(Math.random() * paleta.length)];
}

function normalizarStatusSessao(status = "rascunho") {
  if (status === "pronto" || status === "concluido") return "concluido";
  if (status === "revisao" || status === "revisando") return "revisando";
  return "rascunho";
}

export function criarLivroVazio(dados = {}) {
  const genero = obterGenero(dados.genero || "fantasia");

  return normalizarLivro({
    id: dados.id,
    titulo: texto(dados.titulo, "Livro sem título"),
    genero: genero.id,
    cor: dados.cor || genero.cor,
    status: dados.status || "planejamento",
    tom: dados.tom || genero.tom,
    premissa: dados.premissa || "",
    logline: dados.logline || "",
    tema: dados.tema || "",
    publico: dados.publico || "",
    capaUrl: dados.capaUrl || dados.capa || "",
    nomeMundo: dados.nomeMundo || "",
    metaPalavrasLivro: dados.metaPalavrasLivro || CONFIG_HISTORIAS_PADRAO.metaPalavrasLivro,
    criadoEm: dados.criadoEm || new Date().toISOString(),
    atualizadoEm: dados.atualizadoEm || new Date().toISOString(),
    arquivado: Boolean(dados.arquivado),
    favorito: Boolean(dados.favorito),
    papeisPersonagem: dados.papeisPersonagem || [],
    secoesMundo: dados.secoesMundo || [],
    mundo: dados.mundo || {},
    personagens: dados.personagens || [],
    ideias: dados.ideias || [],
    capitulos: dados.capitulos || [],
    sessoes: dados.sessoes || [],
    tarefas: dados.tarefas || [],
  });
}

export function normalizarLivro(livro = {}) {
  const genero = obterGenero(livro.genero || "fantasia");
  const secoesMundo = lista(livro.secoesMundo).map(normalizarSecaoMundo);
  const mundoCustomizado = secoesMundo.reduce((mundo, secao) => {
    if (["lugares", "faccoes", "regras", "mapas", "linhaDoTempo"].includes(secao.id)) return mundo;

    return {
      ...mundo,
      [secao.id]: lista(livro.mundo?.[secao.id]).map((item) => normalizarItemMundo(secao.id, item)),
    };
  }, {});

  return {
    id: livro.id || criarId(),
    titulo: texto(livro.titulo, "Livro sem título"),
    genero: genero.id,
    cor: livro.cor || genero.cor,
    status: livro.status || "planejamento",
    tom: livro.tom || genero.tom,
    premissa: livro.premissa || "",
    logline: livro.logline || "",
    tema: livro.tema || "",
    publico: livro.publico || "",
    capaUrl: livro.capaUrl || livro.capa || "",
    nomeMundo: livro.nomeMundo || "Mundo de " + texto(livro.titulo, "Livro sem título"),
    metaPalavrasLivro: numero(livro.metaPalavrasLivro, CONFIG_HISTORIAS_PADRAO.metaPalavrasLivro),
    criadoEm: livro.criadoEm || new Date().toISOString(),
    atualizadoEm: livro.atualizadoEm || new Date().toISOString(),
    arquivado: Boolean(livro.arquivado),
    favorito: Boolean(livro.favorito),
    papeisPersonagem: lista(livro.papeisPersonagem),
    gruposPersonagens: lista(livro.gruposPersonagens).map(normalizarGrupoPersonagens),
    secoesMundo,
    mundo: {
      lugares: lista(livro.mundo?.lugares).map((item) => normalizarItemMundo("lugares", item)),
      faccoes: lista(livro.mundo?.faccoes).map((item) => normalizarItemMundo("faccoes", item)),
      regras: lista(livro.mundo?.regras).map((item) => normalizarItemMundo("regras", item)),
      mapas: lista(livro.mundo?.mapas).map((item) => normalizarItemMundo("mapas", item)),
      linhaDoTempo: lista(livro.mundo?.linhaDoTempo).map((item) => normalizarItemMundo("linhaDoTempo", item)),
      ...mundoCustomizado,
    },
    personagens: lista(livro.personagens).map(normalizarPersonagem),
    ideias: lista(livro.ideias).map(criarIdeiaVazia),
    capitulos: lista(livro.capitulos)
      .map((capitulo, indice) => normalizarCapitulo(capitulo, indice))
      .sort((a, b) => a.ordem - b.ordem),
    sessoes: lista(livro.sessoes),
    tarefas: lista(livro.tarefas),
  };
}

export function normalizarSecaoMundo(secao = {}) {
  return {
    id: secao.id || "secao-" + criarId(),
    nome: texto(secao.nome || secao.titulo, "Nova seção"),
    categoria: secao.categoria || "Ideias, grupos, objetos ou elementos do mundo",
    personalizada: Boolean(secao.personalizada),
  };
}

function normalizarGrupoPersonagens(grupo = {}) {
  return {
    id: grupo.id || criarId(),
    titulo: texto(grupo.titulo || grupo.nome, "Grupo sem título"),
    descricao: grupo.descricao || "",
    cor: grupo.cor || "#8f1d43",
    capaUrl: grupo.capaUrl || grupo.imagemUrl || "",
    personagemIds: lista(grupo.personagemIds || grupo.personagensIds || grupo.integrantesIds).map(String),
    criadoEm: grupo.criadoEm || new Date().toISOString(),
    atualizadoEm: grupo.atualizadoEm || "",
  };
}

export function normalizarPersonagem(personagem = {}) {
  const nome = texto(personagem.nome, "Personagem sem nome");

  return {
    id: personagem.id || criarId(),
    nome,
    papel: personagem.papel || "Protagonista",
    cor: personagem.cor || corPorTexto(nome),
    fotoUrl: personagem.fotoUrl || personagem.imagemUrl || personagem.avatarUrl || "",
    capaUrl: personagem.capaUrl || personagem.coverUrl || personagem.capa || "",
    imagensAdicionais: lista(personagem.imagensAdicionais || personagem.galeriaImagens || personagem.imagens).map(normalizarImagemPersonagem),
    regiaoId: personagem.regiaoId || personagem.lugarId || "",
    historia: personagem.historia || montarHistoriaLegadaPersonagem(personagem),
    desejo: personagem.desejo || "",
    medo: personagem.medo || "",
    segredo: personagem.segredo || "",
    arco: personagem.arco || "",
    relacoes: personagem.relacoes || "",
    aparicao: personagem.aparicao || "",
  };
}

function normalizarImagemPersonagem(imagem = {}, indice = 0) {
  if (typeof imagem === "string") {
    return {
      id: criarId(),
      titulo: "Imagem " + (indice + 1),
      url: imagem,
      descricao: "",
      criadoEm: new Date().toISOString(),
    };
  }

  return {
    id: imagem.id || criarId(),
    titulo: imagem.titulo || imagem.nome || "Imagem " + (indice + 1),
    url: imagem.url || imagem.imagemUrl || imagem.src || imagem.fotoUrl || "",
    descricao: imagem.descricao || "",
    criadoEm: imagem.criadoEm || new Date().toISOString(),
    atualizadoEm: imagem.atualizadoEm || "",
  };
}

function montarHistoriaLegadaPersonagem(personagem = {}) {
  return [
    personagem.desejo ? "Desejo: " + personagem.desejo : "",
    personagem.medo ? "Medo: " + personagem.medo : "",
    personagem.segredo ? "Segredo: " + personagem.segredo : "",
    personagem.arco ? "Arco: " + personagem.arco : "",
    personagem.relacoes ? "Relações: " + personagem.relacoes : "",
    personagem.aparicao ? "Aparição: " + personagem.aparicao : "",
  ]
    .filter(Boolean)
    .join("\n\n");
}

export function criarPersonagemVazio(dados = {}) {
  return normalizarPersonagem(dados);
}

export function criarIdeiaVazia(dados = {}) {
  return {
    id: dados.id || criarId(),
    titulo: texto(dados.titulo, "Ideia sem título"),
    tipo: dados.tipo || "Cena",
    descricao: dados.descricao || "",
    contexto: dados.contexto || "",
    cenaPossivel: dados.cenaPossivel || "",
    estado: dados.estado || "bruta",
    prioridade: dados.prioridade || "media",
    etiquetas: dados.etiquetas || "",
    cor: dados.cor || "#8f1d43",
    aparencia: dados.aparencia || "pergaminho",
    vinculosMundoIds: lista(dados.vinculosMundoIds || dados.mundoIds || dados.itensMundoIds),
    vinculosPersonagemIds: lista(dados.vinculosPersonagemIds || dados.personagemIds || dados.personagensIds),
    vinculosCapituloIds: lista(dados.vinculosCapituloIds || dados.capituloIds || dados.capitulosIds),
    criadoEm: dados.criadoEm || new Date().toISOString(),
    atualizadoEm: dados.atualizadoEm || "",
  };
}

export function criarCapituloVazio(dados = {}) {
  return normalizarCapitulo({
    id: dados.id || criarId(),
    titulo: texto(dados.titulo, "Capítulo sem título"),
    resumo: dados.resumo || "",
    objetivo: dados.objetivo || "",
    status: dados.status || "rascunho",
    ativo: dados.ativo ?? true,
    cor: dados.cor || corAleatoriaCapitulo(),
    metaPalavras: numero(dados.metaPalavras, 3000),
    cenaAtual: dados.cenaAtual || "",
    ordem: dados.ordem,
    atualizadoEm: dados.atualizadoEm || new Date().toISOString(),
    sessoes: dados.sessoes || [],
  });
}

export function criarSessaoVazia(dados = {}) {
  return normalizarSessaoCapitulo({
    id: dados.id || criarId(),
    titulo: dados.titulo || dados.foco || "Sessão sem título",
    resumo: dados.resumo || "",
    data: dados.data || hoje(),
    foco: texto(dados.foco, "Escrita"),
    ativo: dados.ativo ?? true,
    status: dados.status || "rascunho",
    metaPalavras: numero(dados.metaPalavras, 800),
    texto: dados.texto || "",
    minutos: numero(dados.minutos, 0),
    palavras: numero(dados.palavras, contarPalavras(dados.texto || "")),
    nota: dados.nota || "",
    humor: dados.humor || "fluindo",
    ordem: dados.ordem,
    personagensMencionados: dados.personagensMencionados || [],
    mundoMencionado: dados.mundoMencionado || [],
    ideiasMencionadas: dados.ideiasMencionadas || [],
    atualizadoEm: dados.atualizadoEm || new Date().toISOString(),
  });
}

export function normalizarSessaoCapitulo(sessao = {}, indice = 0) {
  const textoSessao = sessao.texto || "";

  return {
    id: sessao.id || criarId(),
    titulo: texto(sessao.titulo || sessao.foco, "Sessão sem título"),
    resumo: sessao.resumo || "",
    data: sessao.data || hoje(),
    foco: sessao.foco || sessao.titulo || "Escrita",
    ativo: sessao.ativo ?? true,
    status: normalizarStatusSessao(sessao.status),
    metaPalavras: numero(sessao.metaPalavras, 800),
    texto: textoSessao,
    minutos: numero(sessao.minutos, 0),
    palavras: numero(sessao.palavras, contarPalavras(textoSessao)),
    nota: sessao.nota || "",
    humor: sessao.humor || "fluindo",
    ordem: Number.isFinite(Number(sessao.ordem)) ? Number(sessao.ordem) : indice,
    personagensMencionados: lista(sessao.personagensMencionados),
    mundoMencionado: lista(sessao.mundoMencionado),
    ideiasMencionadas: lista(sessao.ideiasMencionadas),
    atualizadoEm: sessao.atualizadoEm || "",
  };
}

export function normalizarCapitulo(capitulo = {}, indice = 0) {
  const sessoes = lista(capitulo.sessoes)
    .map((sessao, indiceSessao) => normalizarSessaoCapitulo(sessao, indiceSessao))
    .sort((a, b) => a.ordem - b.ordem);
  const sessoesAtivas = sessoes.filter((sessao) => sessao.ativo);
  const palavrasSessoes = sessoesAtivas.reduce((total, sessao) => total + (Number(sessao.palavras) || 0), 0);
  const minutosSessoes = sessoesAtivas.reduce((total, sessao) => total + (Number(sessao.minutos) || 0), 0);
  const temSessoes = sessoes.length > 0;
  const tituloCapitulo = texto(capitulo.titulo, "Capítulo sem título");
  const ultimaAtualizacaoSessao = sessoes
    .map((sessao) => sessao.atualizadoEm || sessao.data)
    .filter(Boolean)
    .sort()
    .at(-1);

  return {
    id: capitulo.id || criarId(),
    titulo: tituloCapitulo,
    resumo: capitulo.resumo || "",
    objetivo: capitulo.objetivo || "",
    status: normalizarStatusSessao(capitulo.status),
    ativo: capitulo.ativo ?? true,
    cor: capitulo.cor || corPorTexto("capitulo-" + tituloCapitulo + "-" + indice),
    metaPalavras: numero(capitulo.metaPalavras, 3000),
    palavras: temSessoes ? palavrasSessoes : numero(capitulo.palavras, 0),
    minutos: temSessoes ? minutosSessoes : numero(capitulo.minutos, 0),
    cenaAtual: capitulo.cenaAtual || "",
    ordem: Number.isFinite(Number(capitulo.ordem)) ? Number(capitulo.ordem) : indice,
    atualizadoEm: capitulo.atualizadoEm || ultimaAtualizacaoSessao || "",
    sessoes,
  };
}

export function criarTarefaVazia(dados = {}) {
  return {
    id: dados.id || criarId(),
    titulo: texto(dados.titulo, "Tarefa sem título"),
    area: dados.area || "Geral",
    status: dados.status || "pendente",
    prazo: dados.prazo || "",
    observacoes: dados.observacoes || "",
  };
}

export function criarItemMundo(tipo, dados = {}) {
  return normalizarItemMundo(tipo, dados);
}

export function criarBlocoLinhaTempo(dados = {}) {
  return normalizarBlocoLinhaTempo(dados);
}

export function criarSubBlocoLinhaTempo(dados = {}) {
  return normalizarSubBlocoLinhaTempo(dados);
}

export function criarRamificacaoLugar(dados = {}) {
  return normalizarRamificacaoLugar(dados);
}

export function criarMapaInterno(dados = {}) {
  return normalizarMapaInterno(dados);
}

export function normalizarSubBlocoLinhaTempo(dados = {}, indice = 0) {
  return {
    id: dados.id || criarId(),
    titulo: texto(dados.titulo || dados.nome, "Subbloco sem título"),
    descricao: dados.descricao || "",
    cor: dados.cor || corAleatoriaMundo(),
    ordem: Number.isFinite(Number(dados.ordem)) ? Number(dados.ordem) : indice,
  };
}

export function normalizarBlocoLinhaTempo(dados = {}, indice = 0) {
  const setaTexto = dados.setaTexto || dados.transicao || "";

  return {
    id: dados.id || criarId(),
    titulo: texto(dados.titulo || dados.nome, "Evento sem título"),
    descricao: dados.descricao || "",
    setaTexto,
    setaAtiva: dados.setaAtiva ?? dados.temSeta ?? Boolean(setaTexto),
    subBlocos: lista(dados.subBlocos || dados.subblocos || dados.subEventos)
      .map((subBloco, subIndice) => normalizarSubBlocoLinhaTempo(subBloco, subIndice))
      .sort((a, b) => a.ordem - b.ordem),
    cor: dados.cor || corAleatoriaMundo(),
    ordem: Number.isFinite(Number(dados.ordem)) ? Number(dados.ordem) : indice,
  };
}

export function normalizarRamificacaoLugar(dados = {}, indice = 0) {
  const nome = texto(dados.nome || dados.titulo, "Lugar ligado");

  return {
    id: dados.id || criarId(),
    nome,
    descricao: dados.descricao || "",
    imagemUrl: dados.imagemUrl || dados.capaUrl || dados.fotoUrl || "",
    personagensIds: lista(dados.personagensIds),
    vinculosMundoIds: lista(dados.vinculosMundoIds || dados.vinculosIds || dados.referenciasMundoIds || dados.parteDeIds),
    cor: dados.cor || corAleatoriaMundo(),
    ordem: Number.isFinite(Number(dados.ordem)) ? Number(dados.ordem) : indice,
  };
}

export function normalizarMapaInterno(dados = {}, indice = 0) {
  return {
    id: dados.id || criarId(),
    nome: texto(dados.nome || dados.titulo, "Mapa sem nome"),
    descricao: dados.descricao || "",
    imagemUrl: dados.imagemUrl || dados.capaUrl || dados.fotoUrl || "",
    cor: dados.cor || corAleatoriaMundo(),
    personagensIds: lista(dados.personagensIds),
    ordem: Number.isFinite(Number(dados.ordem)) ? Number(dados.ordem) : indice,
  };
}

export function normalizarItemMundo(tipo, dados = {}) {
  const nomes = {
    lugares: "Lugar sem nome",
    faccoes: "Grupo sem nome",
    regras: "Regra sem nome",
    mapas: "Mapa sem nome",
    linhaDoTempo: "Linha sem nome",
  };
  const blocosLegados =
    tipo === "linhaDoTempo" && !Array.isArray(dados.blocos) && (dados.descricao || dados.conflito)
      ? [
          {
            titulo: dados.nome || dados.titulo || "Marco inicial",
            descricao: dados.descricao || dados.conflito || "",
            setaTexto: dados.conexoes || "",
            cor: dados.cor || corAleatoriaMundo(),
            ordem: 0,
          },
        ]
      : [];

  return {
    id: dados.id || criarId(),
    nome: texto(dados.nome || dados.titulo, nomes[tipo] || "Item sem nome"),
    categoria: dados.categoria || "",
    descricao: dados.descricao || "",
    costumes: dados.costumes || dados.cultura || dados.tradicoes || "",
    conflito: dados.conflito || "",
    conexoes: dados.conexoes || "",
    cor: dados.cor || corAleatoriaMundo(),
    imagemUrl: dados.imagemUrl || dados.capaUrl || dados.fotoUrl || "",
    blocos:
      tipo === "linhaDoTempo"
        ? lista(dados.blocos || blocosLegados)
            .map((bloco, indice) => normalizarBlocoLinhaTempo(bloco, indice))
            .sort((a, b) => a.ordem - b.ordem)
        : [],
    ramificacoes:
      tipo === "lugares"
        ? lista(dados.ramificacoes || dados.subLugares || dados.lugaresInternos)
            .map((ramificacao, indice) => normalizarRamificacaoLugar(ramificacao, indice))
            .sort((a, b) => a.ordem - b.ordem)
        : [],
    mapasInternos:
      tipo === "mapas"
        ? lista(dados.mapasInternos || dados.mapasDoLugar || dados.imagensMapa || dados.cartas)
            .map((mapa, indice) => normalizarMapaInterno(mapa, indice))
            .sort((a, b) => a.ordem - b.ordem)
        : [],
    personagensIds: lista(dados.personagensIds),
    vinculosMundoIds: lista(dados.vinculosMundoIds || dados.vinculosIds || dados.referenciasMundoIds || dados.parteDeIds),
    atualizadoEm: dados.atualizadoEm || "",
  };
}

export function calcularProgressoLivro(livro) {
  if (!livro) {
    return {
      palavras: 0,
      capitulos: 0,
      capitulosProntos: 0,
      percentualCapitulos: 0,
      personagens: 0,
      ideias: 0,
      sessoes: 0,
      minutos: 0,
    };
  }

  const capitulos = lista(livro.capitulos).map(normalizarCapitulo);
  const capitulosAtivos = capitulos.filter((capitulo) => capitulo.ativo);
  const capitulosProntos = capitulosAtivos.filter((capitulo) => capitulo.status === "concluido").length;
  const palavrasCapitulos = capitulosAtivos.reduce((total, capitulo) => total + (Number(capitulo.palavras) || 0), 0);
  const palavrasSessoesLegadas = lista(livro.sessoes).reduce((total, sessao) => total + (Number(sessao.palavras) || 0), 0);
  const minutosCapitulos = capitulosAtivos.reduce((total, capitulo) => total + (Number(capitulo.minutos) || 0), 0);
  const minutosLegados = lista(livro.sessoes).reduce((total, sessao) => total + (Number(sessao.minutos) || 0), 0);
  const totalSessoes = capitulosAtivos.reduce((total, capitulo) => total + lista(capitulo.sessoes).filter((sessao) => sessao.ativo).length, 0) + lista(livro.sessoes).length;

  return {
    palavras: Math.max(palavrasCapitulos, palavrasSessoesLegadas),
    minutos: minutosCapitulos + minutosLegados,
    capitulos: capitulosAtivos.length,
    capitulosProntos,
    percentualCapitulos: capitulosAtivos.length ? Math.round((capitulosProntos / capitulosAtivos.length) * 100) : 0,
    personagens: lista(livro.personagens).length,
    ideias: lista(livro.ideias).length,
    sessoes: totalSessoes,
  };
}

export function contarPalavrasTexto(textoLivre = "") {
  return contarPalavras(textoLivre);
}

export function diagnosticarLivro(livro) {
  if (!livro) {
    return [
      {
        tipo: "inicio",
        titulo: "Crie o primeiro livro",
        texto: "Cadastre um livro para liberar o painel de mundo, personagens, ideias e escrita.",
      },
    ];
  }

  const avisos = [];
  const genero = obterGenero(livro.genero);

  if (!livro.logline) {
    avisos.push({
      tipo: "estrutura",
      titulo: "Logline ausente",
      texto: "Resuma protagonista, objetivo, obstáculo e consequência em uma frase.",
    });
  }

  if (!livro.premissa) {
    avisos.push({
      tipo: "estrutura",
      titulo: "Premissa ainda vaga",
      texto: "Defina o motor da história para orientar cenas, personagens e viradas.",
    });
  }

  if (lista(livro.personagens).length < 3) {
    avisos.push({
      tipo: "personagens",
      titulo: "Elenco pequeno",
      texto: "Crie ao menos protagonista, força opositora e personagem de contraste.",
    });
  }

  if (lista(livro.mundo?.lugares).length === 0) {
    avisos.push({
      tipo: "mundo",
      titulo: "Mundo sem lugares",
      texto: "Adicione cenários com função narrativa, não apenas nomes bonitos.",
    });
  }

  if (lista(livro.capitulos).length === 0) {
    avisos.push({
      tipo: "escrita",
      titulo: "Estrutura sem capítulos",
      texto: "Crie capítulos ou blocos de cena para transformar ideias em texto.",
    });
  }

  if (avisos.length < 5) {
    avisos.push({
      tipo: "genero",
      titulo: "Pergunta de " + genero.nome,
      texto: genero.perguntas[0],
    });
  }

  return avisos.slice(0, 5);
}

export function montarSugestoesCriativas(livro) {
  const genero = obterGenero(livro?.genero);
  const progresso = calcularProgressoLivro(livro);
  const sugestoes = [
    {
      titulo: "Cena de pressão",
      texto: "Coloque o personagem principal diante de uma escolha onde qualquer opção cobra um preço.",
    },
    {
      titulo: "Contradição útil",
      texto: "Escolha uma regra do mundo e crie uma exceção rara que apenas um personagem entende.",
    },
    {
      titulo: "Promessa de gênero",
      texto: genero.perguntas[1] || genero.perguntas[0],
    },
  ];

  if (progresso.personagens === 0) {
    sugestoes.unshift({
      titulo: "Comece pelo conflito humano",
      texto: "Crie um personagem que queira algo simples, mas precise atravessar o impossível para conseguir.",
    });
  }

  if (progresso.capitulos === 0) {
    sugestoes.unshift({
      titulo: "Primeiro capítulo",
      texto: "Abra com uma decisão concreta, uma perda pequena ou um sinal de que o mundo não é estável.",
    });
  }

  return sugestoes.slice(0, 4);
}
