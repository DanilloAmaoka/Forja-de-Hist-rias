import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import {
  addDoc,
  collection,
  deleteField,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  limit,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  where,
} from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";

import { auth, db } from "../firebase/config";
import {
  CONFIG_HISTORIAS_PADRAO,
  calcularProgressoLivro,
  criarCapituloVazio,
  criarIdeiaVazia,
  criarItemMundo,
  criarLivroVazio,
  criarPersonagemVazio,
  criarSessaoVazia,
  criarTarefaVazia,
  diagnosticarLivro,
  generosHistoria,
  montarSugestoesCriativas,
  normalizarLivro,
  obterGenero,
} from "../data/storyData";
import { useFeedback } from "./FeedbackContext";

const StoryDataContext = createContext(null);
const LIVRO_ATIVO_KEY = "forja-historias-livro-ativo";
const CAMPOS_COLECOES_LIVRO = ["personagens", "ideias", "capitulos", "sessoes", "tarefas", "mundo"];
const SUBCOLECOES_LIVRO = {
  personagens: "personagens",
  ideias: "ideias",
  capitulos: "capitulos",
  sessoes: "sessoes",
  tarefas: "tarefas",
  mundo: "mundoItens",
};
let usuarioAtualId = "";

function definirUsuarioAtualId(userId) {
  usuarioAtualId = userId || "";
}

function exigirUsuarioAtual() {
  if (!usuarioAtualId) {
    throw new Error("Entre na sua conta para acessar seus livros.");
  }

  return usuarioAtualId;
}

function livrosCollection() {
  return collection(db, "usuarios", exigirUsuarioAtual(), "livros");
}

function referenciaLivro(livroId) {
  return doc(db, "usuarios", exigirUsuarioAtual(), "livros", String(livroId));
}

function referenciaSubcolecao(livroId, nomeColecao) {
  return collection(referenciaLivro(livroId), nomeColecao);
}

function referenciaSubdocumento(livroId, nomeColecao, itemId) {
  return doc(db, "usuarios", exigirUsuarioAtual(), "livros", String(livroId), nomeColecao, String(itemId));
}

function referenciaSessaoCapitulo(livroId, capituloId, sessaoId) {
  return doc(
    db,
    "usuarios",
    exigirUsuarioAtual(),
    "livros",
    String(livroId),
    SUBCOLECOES_LIVRO.capitulos,
    String(capituloId),
    "sessoes",
    String(sessaoId),
  );
}

function removerIndefinidos(valor) {
  if (Array.isArray(valor)) {
    return valor.map(removerIndefinidos);
  }

  if (!valor || typeof valor !== "object" || typeof valor.toDate === "function") {
    return valor;
  }

  return Object.entries(valor).reduce((objeto, [chave, item]) => {
    if (item !== undefined) {
      objeto[chave] = removerIndefinidos(item);
    }

    return objeto;
  }, {});
}

function prepararDocumentoItem(item, extras = {}) {
  const documento = removerIndefinidos({
    ...item,
    ...extras,
  });
  delete documento.id;

  return documento;
}

function prepararMetadadosLivro(livro = {}) {
  const metadados = removerIndefinidos({ ...livro });
  delete metadados.id;

  CAMPOS_COLECOES_LIVRO.forEach((campo) => {
    delete metadados[campo];
  });

  return metadados;
}

function patchLimpezaColecoesLivro() {
  return CAMPOS_COLECOES_LIVRO.reduce((patch, campo) => {
    patch[campo] = deleteField();
    return patch;
  }, {});
}

function dadosPossuemColecoesNoDocumento(dados = {}) {
  return CAMPOS_COLECOES_LIVRO.some((campo) => Object.prototype.hasOwnProperty.call(dados, campo));
}

function documentosParaLista(resultado) {
  return resultado.docs.map((documento) => ({
    ...documento.data(),
    id: documento.id,
  }));
}

function montarMundoPorSecao(itensMundo) {
  return itensMundo.reduce((mundo, item) => {
    const tipo = item.tipo || item.secaoId || "lugares";
    const itemSemTipo = { ...item };
    delete itemSemTipo.tipo;
    delete itemSemTipo.secaoId;

    return {
      ...mundo,
      [tipo]: [...(mundo[tipo] || []), itemSemTipo],
    };
  }, {});
}

async function carregarLivroCompleto(documento) {
  const dadosLivro = documento.data();
  const livroLegado = normalizarLivro({
    ...dadosLivro,
    id: documento.id,
  });
  const livroRef = referenciaLivro(documento.id);

  const [
    personagensSnapshot,
    ideiasSnapshot,
    tarefasSnapshot,
    sessoesSnapshot,
    mundoSnapshot,
    capitulosSnapshot,
  ] = await Promise.all([
    getDocs(collection(livroRef, SUBCOLECOES_LIVRO.personagens)),
    getDocs(collection(livroRef, SUBCOLECOES_LIVRO.ideias)),
    getDocs(collection(livroRef, SUBCOLECOES_LIVRO.tarefas)),
    getDocs(collection(livroRef, SUBCOLECOES_LIVRO.sessoes)),
    getDocs(collection(livroRef, SUBCOLECOES_LIVRO.mundo)),
    getDocs(collection(livroRef, SUBCOLECOES_LIVRO.capitulos)),
  ]);

  const capitulosSubcolecao = await Promise.all(
    capitulosSnapshot.docs.map(async (capituloDocumento) => {
      const sessoesCapitulo = await getDocs(collection(capituloDocumento.ref, "sessoes"));

      return {
        ...capituloDocumento.data(),
        id: capituloDocumento.id,
        sessoes:
          sessoesCapitulo.docs.length > 0
            ? documentosParaLista(sessoesCapitulo)
            : capituloDocumento.data().sessoes || [],
      };
    }),
  );

  const personagens = personagensSnapshot.docs.length > 0 ? documentosParaLista(personagensSnapshot) : livroLegado.personagens;
  const ideias = ideiasSnapshot.docs.length > 0 ? documentosParaLista(ideiasSnapshot) : livroLegado.ideias;
  const tarefas = tarefasSnapshot.docs.length > 0 ? documentosParaLista(tarefasSnapshot) : livroLegado.tarefas;
  const sessoes = sessoesSnapshot.docs.length > 0 ? documentosParaLista(sessoesSnapshot) : livroLegado.sessoes;
  const capitulos = capitulosSnapshot.docs.length > 0 ? capitulosSubcolecao : livroLegado.capitulos;
  const mundo = mundoSnapshot.docs.length > 0 ? montarMundoPorSecao(documentosParaLista(mundoSnapshot)) : livroLegado.mundo;

  return {
    livro: normalizarLivro({
      ...dadosLivro,
      id: documento.id,
      personagens,
      ideias,
      tarefas,
      sessoes,
      capitulos,
      mundo,
    }),
    precisaMigrar: dadosPossuemColecoesNoDocumento(dadosLivro),
  };
}

async function salvarListaEmSubcolecao(livroId, nomeColecao, lista) {
  await Promise.all(
    (lista || []).map((item) =>
      setDoc(
        referenciaSubdocumento(livroId, nomeColecao, item.id),
        prepararDocumentoItem(item),
        { merge: true },
      ),
    ),
  );
}

async function salvarSessoesCapituloEmSubcolecao(livroId, capituloId, sessoes) {
  await Promise.all(
    (sessoes || []).map((sessao) =>
      setDoc(
        referenciaSessaoCapitulo(livroId, capituloId, sessao.id),
        prepararDocumentoItem(sessao),
        { merge: true },
      ),
    ),
  );
}

async function salvarCapitulosEmSubcolecao(livroId, capitulos) {
  await Promise.all(
    (capitulos || []).map(async (capitulo) => {
      await setDoc(
        referenciaSubdocumento(livroId, SUBCOLECOES_LIVRO.capitulos, capitulo.id),
        prepararDocumentoItem({ ...capitulo, sessoes: undefined }),
        { merge: true },
      );

      await salvarSessoesCapituloEmSubcolecao(livroId, capitulo.id, capitulo.sessoes || []);
    }),
  );
}

async function salvarMundoEmSubcolecao(livroId, mundo) {
  const itensMundo = Object.entries(mundo || {}).flatMap(([tipo, itens]) =>
    (itens || []).map((item) => ({
      ...item,
      tipo,
    })),
  );

  await salvarListaEmSubcolecao(livroId, SUBCOLECOES_LIVRO.mundo, itensMundo);
}

async function migrarLivroParaSubcolecoes(livro) {
  await Promise.all([
    salvarListaEmSubcolecao(livro.id, SUBCOLECOES_LIVRO.personagens, livro.personagens),
    salvarListaEmSubcolecao(livro.id, SUBCOLECOES_LIVRO.ideias, livro.ideias),
    salvarListaEmSubcolecao(livro.id, SUBCOLECOES_LIVRO.tarefas, livro.tarefas),
    salvarListaEmSubcolecao(livro.id, SUBCOLECOES_LIVRO.sessoes, livro.sessoes),
    salvarCapitulosEmSubcolecao(livro.id, livro.capitulos),
    salvarMundoEmSubcolecao(livro.id, livro.mundo),
  ]);

  await setDoc(
    referenciaLivro(livro.id),
    {
      ...prepararMetadadosLivro(livro),
      ...patchLimpezaColecoesLivro(),
      atualizadoEm: serverTimestamp(),
      dadosOtimizadosEm: serverTimestamp(),
    },
    { merge: true },
  );
}

async function apagarDocumentosDaColecao(referenciaColecao) {
  const resultado = await getDocs(referenciaColecao);

  await Promise.all(resultado.docs.map((documento) => deleteDoc(documento.ref)));
}

function deduplicarLivros(lista) {
  const livrosPorId = new Map();

  lista.forEach((livro) => {
    const id = String(livro.id || "");
    if (!id) return;

    const livroExistente = livrosPorId.get(id);
    const livroMaisRecente =
      !livroExistente ||
      String(livro.atualizadoEm || "").localeCompare(String(livroExistente.atualizadoEm || "")) >= 0;

    if (livroMaisRecente) {
      livrosPorId.set(id, livro);
    }
  });

  return Array.from(livrosPorId.values());
}

function ordenarLivros(lista) {
  return deduplicarLivros(lista).sort((a, b) => {
    const porAtualizacao = String(b.atualizadoEm || "").localeCompare(String(a.atualizadoEm || ""));
    if (porAtualizacao !== 0) return porAtualizacao;
    return String(a.titulo || "").localeCompare(String(b.titulo || ""));
  });
}

function comItemAtualizado(lista, itemId, alteracoes) {
  return lista.map((item) => (String(item.id) === String(itemId) ? { ...item, ...alteracoes } : item));
}

function semItem(lista, itemId) {
  return lista.filter((item) => String(item.id) !== String(itemId));
}

function reordenarLista(lista, itemId, direcao) {
  const copia = [...lista].sort((a, b) => (Number(a.ordem) || 0) - (Number(b.ordem) || 0));
  const indice = copia.findIndex((item) => String(item.id) === String(itemId));
  const novoIndice = indice + direcao;

  if (indice < 0 || novoIndice < 0 || novoIndice >= copia.length) {
    return copia.map((item, ordem) => ({ ...item, ordem }));
  }

  const [item] = copia.splice(indice, 1);
  copia.splice(novoIndice, 0, item);

  return copia.map((itemAtual, ordem) => ({ ...itemAtual, ordem }));
}

function atualizarCapituloEmLista(capitulos, capituloId, atualizar) {
  return capitulos.map((capitulo) =>
    String(capitulo.id) === String(capituloId) ? atualizar(capitulo) : capitulo,
  );
}

function perfilPadrao(usuario) {
  return {
    nome: usuario?.displayName || usuario?.email?.split("@")[0] || "Autor sem nome",
    fotoUrl: usuario?.photoURL || "",
    descricao: "",
    generos: "",
    cidadeCriativa: "",
    site: "",
    livrosConcluidos: "",
    usuarioHandle: "",
    pronomes: "",
    obraAtual: "",
    estiloCartao: "delicado",
    fundoPerfil: "lavanda",
    fonteTitulo: "serifada",
    mostrarGeneros: true,
    mostrarObraAtual: true,
    mostrarAmigos: true,
    perfilPublicoAtivo: true,
    avisoPerfilPublicoVisto: false,
    capaUrl: "",
    corPerfil: "#8f1d43",
    setoresPerfil: [],
    seguindoIds: [],
    clubesLancamento: [],
    clubesInscritos: [],
    notificacoesLidasEm: "",
    personagensDestaqueIds: [],
    livrosDestaqueIds: [],
    online: true,
    escrevendo: false,
    escrevendoDesde: "",
    escrevendoLivroTitulo: "",
    escrevendoSessaoTitulo: "",
  };
}

function normalizarPerfilPublico(dados = {}, id = "") {
  return {
    id: id || dados.id || "",
    nome: dados.nome || "Autor sem nome",
    nomeBusca: dados.nomeBusca || "",
    usuarioBusca: dados.usuarioBusca || "",
    fotoUrl: dados.fotoUrl || "",
    descricao: dados.descricao || "",
    generos: dados.generos || "",
    cidadeCriativa: dados.cidadeCriativa || "",
    site: dados.site || "",
    livrosConcluidos: dados.livrosConcluidos || "",
    usuarioHandle: dados.usuarioHandle || "",
    pronomes: dados.pronomes || "",
    obraAtual: dados.obraAtual || "",
    estiloCartao: dados.estiloCartao || "delicado",
    fundoPerfil: dados.fundoPerfil || "lavanda",
    fonteTitulo: dados.fonteTitulo || "serifada",
    mostrarGeneros: dados.mostrarGeneros !== false,
    mostrarObraAtual: dados.mostrarObraAtual !== false,
    mostrarAmigos: dados.mostrarAmigos !== false,
    perfilPublicoAtivo: dados.perfilPublicoAtivo !== false,
    avisoPerfilPublicoVisto: Boolean(dados.avisoPerfilPublicoVisto),
    capaUrl: dados.capaUrl || "",
    corPerfil: dados.corPerfil || "#8f1d43",
    setoresPerfil: Array.isArray(dados.setoresPerfil) ? dados.setoresPerfil : [],
    seguindoIds: Array.isArray(dados.seguindoIds) ? dados.seguindoIds : [],
    clubesLancamento: Array.isArray(dados.clubesLancamento) ? dados.clubesLancamento : [],
    clubesInscritos: Array.isArray(dados.clubesInscritos) ? dados.clubesInscritos : [],
    notificacoesLidasEm: dados.notificacoesLidasEm || "",
    personagensDestaqueIds: Array.isArray(dados.personagensDestaqueIds) ? dados.personagensDestaqueIds : [],
    livrosDestaqueIds: Array.isArray(dados.livrosDestaqueIds) ? dados.livrosDestaqueIds : [],
    livrosPublicos: Array.isArray(dados.livrosPublicos) ? dados.livrosPublicos : [],
    personagensPublicos: Array.isArray(dados.personagensPublicos) ? dados.personagensPublicos : [],
    online: Boolean(dados.online),
    escrevendo: Boolean(dados.escrevendo),
    escrevendoDesde: dados.escrevendoDesde || "",
    escrevendoLivroTitulo: dados.escrevendoLivroTitulo || "",
    escrevendoSessaoTitulo: dados.escrevendoSessaoTitulo || "",
    atualizadoEm: dados.atualizadoEm || "",
  };
}

function normalizarTextoBusca(valor = "") {
  return String(valor || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function normalizarPublicacao(documento) {
  const dados = documento.data();

  return {
    id: documento.id,
    autorId: dados.autorId || "",
    autorNome: dados.autorNome || "Autor",
    autorFoto: dados.autorFoto || "",
    tipo: dados.tipo || "trecho",
    titulo: dados.titulo || "",
    texto: dados.texto || "",
    livroId: dados.livroId || "",
    livroTitulo: dados.livroTitulo || "",
    personagemId: dados.personagemId || "",
    personagemNome: dados.personagemNome || "",
    personagemFoto: dados.personagemFoto || "",
    personagemCor: dados.personagemCor || "",
    personagemResumo: dados.personagemResumo || "",
    capituloId: dados.capituloId || "",
    capituloTitulo: dados.capituloTitulo || "",
    capituloResumo: dados.capituloResumo || "",
    capituloCor: dados.capituloCor || "",
    capituloMinutos: Number(dados.capituloMinutos) || 0,
    capituloPalavras: Number(dados.capituloPalavras) || 0,
    capituloTextoCompleto: dados.capituloTextoCompleto || "",
    itemMundoId: dados.itemMundoId || "",
    itemMundoTipo: dados.itemMundoTipo || "",
    itemMundoSecao: dados.itemMundoSecao || "",
    itemMundoNome: dados.itemMundoNome || "",
    itemMundoImagem: dados.itemMundoImagem || "",
    itemMundoCor: dados.itemMundoCor || "",
    itemMundoDescricao: dados.itemMundoDescricao || "",
    imagemUrl: dados.imagemUrl || "",
    tags: Array.isArray(dados.tags) ? dados.tags : [],
    spoiler: dados.spoiler || "sem",
    comentariosModo: dados.comentariosModo || "todos",
    editadoEm: dados.editadoEm || "",
    clubeId: dados.clubeId || "",
    clubeNome: dados.clubeNome || "",
    notificarClube: Boolean(dados.notificarClube),
    criadoEm: dados.criadoEm || dados.criadoEmLocal || dados.atualizadoEm || "",
  };
}

function normalizarConvite(documento) {
  const dados = documento.data();

  return {
    id: documento.id,
    deUserId: dados.deUserId || "",
    deNome: dados.deNome || "Autor",
    deFoto: dados.deFoto || "",
    paraUserId: dados.paraUserId || "",
    paraNome: dados.paraNome || "",
    livroId: dados.livroId || "",
    livroTitulo: dados.livroTitulo || "",
    tipo: dados.tipo || "colaboracao",
    papel: dados.papel || "Leitor beta",
    mensagem: dados.mensagem || "",
    status: dados.status || "pendente",
    criadoEm: dados.criadoEm || "",
  };
}

function prepararLivroPublico(livro) {
  return {
    id: livro.id,
    titulo: livro.titulo,
    genero: livro.genero,
    cor: livro.cor,
    status: livro.status,
    premissa: livro.premissa || "",
    capaUrl: limitarMidiaPublica(livro.capaUrl),
    palavras: calcularProgressoLivro(livro).palavras,
  };
}

function prepararPersonagemPublico(personagem, livro) {
  return {
    id: personagem.id,
    nome: personagem.nome,
    papel: personagem.papel,
    cor: personagem.cor,
    fotoUrl: limitarMidiaPublica(personagem.fotoUrl),
    livroId: livro.id,
    livroTitulo: livro.titulo,
    chamada: personagem.historia || personagem.desejo || personagem.arco || personagem.aparicao || "",
  };
}

function limitarMidiaPublica(valor = "") {
  const midia = String(valor || "");
  if (!midia) return "";
  if (/^https?:\/\//i.test(midia)) return midia;
  return midia.length <= 120000 ? midia : "";
}

function minutosDesde(valor) {
  if (!valor) return 0;
  const data = typeof valor?.toDate === "function" ? valor.toDate() : new Date(valor);
  if (Number.isNaN(data.getTime())) return 0;
  return Math.max(0, Math.floor((Date.now() - data.getTime()) / 60000));
}

function dataParaMillis(valor) {
  if (!valor) return 0;
  const data = typeof valor?.toDate === "function" ? valor.toDate() : new Date(valor);
  return Number.isNaN(data.getTime()) ? 0 : data.getTime();
}

export function StoryDataProvider({ children }) {
  const [usuario, setUsuario] = useState(auth.currentUser);
  const [livros, setLivros] = useState([]);
  const [carregandoLivros, setCarregandoLivros] = useState(true);
  const [carregandoComunidade, setCarregandoComunidade] = useState(true);
  const [perfilPublico, setPerfilPublico] = useState(null);
  const [perfisPublicos, setPerfisPublicos] = useState([]);
  const [publicacoes, setPublicacoes] = useState([]);
  const [convites, setConvites] = useState([]);
  const [configuracoes, setConfiguracoes] = useState(CONFIG_HISTORIAS_PADRAO);
  const [livroSelecionadoId, setLivroSelecionadoId] = useState(() => {
    try {
      return window.localStorage.getItem(LIVRO_ATIVO_KEY) || "";
    } catch {
      return "";
    }
  });
  const { mostrarFeedback } = useFeedback();
  const usuarioId = usuario?.uid || "";

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (usuarioAutenticado) => {
      definirUsuarioAtualId(usuarioAutenticado?.uid || "");
      setUsuario(usuarioAutenticado);

      if (!usuarioAutenticado) {
        setLivros([]);
        setPerfilPublico(null);
        setPerfisPublicos([]);
        setPublicacoes([]);
        setConvites([]);
        setCarregandoLivros(false);
        setCarregandoComunidade(false);
      }
    });

    return () => unsubscribe();
  }, []);

  const carregarLivros = useCallback(async () => {
    if (!usuarioId) {
      setLivros([]);
      setCarregandoLivros(false);
      return;
    }

    definirUsuarioAtualId(usuarioId);
    setCarregandoLivros(true);

    try {
      const resultado = await getDocs(livrosCollection());
      const livrosCarregados = await Promise.all(resultado.docs.map(carregarLivroCompleto));
      const livrosOrdenados = ordenarLivros(livrosCarregados.map(({ livro }) => livro));

      setLivros(livrosOrdenados);

      const livrosParaMigrar = livrosCarregados.filter(({ precisaMigrar }) => precisaMigrar).map(({ livro }) => livro);
      if (livrosParaMigrar.length > 0) {
        await Promise.all(livrosParaMigrar.map(migrarLivroParaSubcolecoes));
        mostrarFeedback("Biblioteca otimizada para salvar livros grandes.", "sucesso");
      }
    } catch (error) {
      mostrarFeedback("Não foi possível carregar os livros salvos.", "erro");
    } finally {
      setCarregandoLivros(false);
    }
  }, [mostrarFeedback, usuarioId]);

  const carregarComunidade = useCallback(async () => {
    if (!usuarioId) {
      setCarregandoComunidade(false);
      return;
    }

    setCarregandoComunidade(true);

    try {
      const [perfilSnapshot, perfisSnapshot, publicacoesSnapshot, convitesRecebidosSnapshot, convitesEnviadosSnapshot] = await Promise.all([
        getDoc(doc(db, "perfisPublicos", usuarioId)),
        getDocs(collection(db, "perfisPublicos")),
        getDocs(query(collection(db, "publicacoes"), orderBy("criadoEm", "desc"), limit(60))),
        getDocs(query(collection(db, "convites"), where("paraUserId", "==", usuarioId))),
        getDocs(query(collection(db, "convites"), where("deUserId", "==", usuarioId))),
      ]);

      const perfilAtual = perfilSnapshot.exists()
        ? normalizarPerfilPublico(perfilSnapshot.data(), perfilSnapshot.id)
        : normalizarPerfilPublico(perfilPadrao(usuario), usuarioId);
      const perfis = perfisSnapshot.docs.map((documento) => normalizarPerfilPublico(documento.data(), documento.id));
      const convitesDoUsuario = [...convitesRecebidosSnapshot.docs, ...convitesEnviadosSnapshot.docs]
        .map(normalizarConvite)
        .filter((convite, indice, lista) => lista.findIndex((item) => item.id === convite.id) === indice);

      setPerfilPublico(perfilAtual);
      setPerfisPublicos(perfis);
      setPublicacoes(publicacoesSnapshot.docs.map(normalizarPublicacao));
      setConvites(convitesDoUsuario);
    } catch (error) {
      mostrarFeedback("Não foi possível carregar a comunidade.", "erro");
    } finally {
      setCarregandoComunidade(false);
    }
  }, [mostrarFeedback, usuario, usuarioId]);

  const sincronizarPerfilPublico = useCallback(
    async (alteracoes = {}, opcoes = {}) => {
      if (!usuarioId) return null;

      const perfilAnterior = perfilPublico || perfilPadrao(usuario);
      const possuiLivrosDestaque = Object.prototype.hasOwnProperty.call(alteracoes, "livrosDestaqueIds");
      const possuiPersonagensDestaque = Object.prototype.hasOwnProperty.call(alteracoes, "personagensDestaqueIds");
      const livrosDestaqueIds = possuiLivrosDestaque ? alteracoes.livrosDestaqueIds || [] : perfilAnterior.livrosDestaqueIds || [];
      const personagensDestaqueIds = possuiPersonagensDestaque
        ? alteracoes.personagensDestaqueIds || []
        : perfilAnterior.personagensDestaqueIds || [];
      const livrosPublicos = livros
        .filter((livro) => livrosDestaqueIds.includes(livro.id))
        .map(prepararLivroPublico);
      const personagensPublicos = livros.flatMap((livro) =>
        (livro.personagens || [])
          .filter((personagem) => personagensDestaqueIds.includes(personagem.id))
          .map((personagem) => prepararPersonagemPublico(personagem, livro)),
      );
      const perfilBase = normalizarPerfilPublico({
        ...perfilPadrao(usuario),
        ...perfilAnterior,
        livrosPublicos,
        personagensPublicos,
        ...alteracoes,
      }, usuarioId);
      const documentoPerfil = removerIndefinidos({
        ...(!perfilPublico ? perfilPadrao(usuario) : {}),
        ...alteracoes,
        livrosDestaqueIds,
        personagensDestaqueIds,
        livrosPublicos,
        personagensPublicos,
        nomeBusca: normalizarTextoBusca([perfilBase.nome, perfilBase.usuarioHandle, perfilBase.generos, perfilBase.descricao, perfilBase.obraAtual].join(" ")),
        usuarioBusca: normalizarTextoBusca(perfilBase.usuarioHandle || perfilBase.nome),
        atualizadoEm: serverTimestamp(),
      });
      delete documentoPerfil.id;

      await setDoc(doc(db, "perfisPublicos", usuarioId), documentoPerfil, { merge: true });
      setPerfilPublico(perfilBase);
      setPerfisPublicos((listaAtual) => {
        const semAtual = listaAtual.filter((perfil) => perfil.id !== usuarioId);
        return [perfilBase, ...semAtual].sort((a, b) => String(a.nome).localeCompare(String(b.nome)));
      });

      if (!opcoes.silencioso) {
        mostrarFeedback("Perfil público atualizado.");
      }

      return perfilBase;
    },
    [livros, mostrarFeedback, perfilPublico, usuario, usuarioId],
  );

  const atualizarStatusPublico = useCallback(
    async (alteracoes = {}) => {
      if (!usuarioId) return;

      try {
        await setDoc(doc(db, "perfisPublicos", usuarioId), removerIndefinidos({
          ...alteracoes,
          atualizadoEm: serverTimestamp(),
        }), { merge: true });
        setPerfilPublico((perfilAtual) =>
          perfilAtual ? normalizarPerfilPublico({ ...perfilAtual, ...alteracoes }, usuarioId) : perfilAtual,
        );
        setPerfisPublicos((listaAtual) =>
          listaAtual.map((perfil) =>
            perfil.id === usuarioId ? normalizarPerfilPublico({ ...perfil, ...alteracoes }, usuarioId) : perfil,
          ),
        );
      } catch {
        // Status público não deve interromper a escrita.
      }
    },
    [usuarioId],
  );

  const criarPublicacao = useCallback(
    async (dados = {}) => {
      if (!usuarioId) throw new Error("Entre na sua conta para publicar.");

      const perfil = perfilPublico || perfilPadrao(usuario);
      const publicacao = removerIndefinidos({
        autorId: usuarioId,
        autorNome: perfil.nome || usuario?.displayName || "Autor",
        autorFoto: perfil.fotoUrl || usuario?.photoURL || "",
        tipo: dados.tipo || "trecho",
        titulo: dados.titulo || "",
        texto: dados.texto || "",
        livroId: dados.livroId || "",
        livroTitulo: dados.livroTitulo || "",
        personagemId: dados.personagemId || "",
        personagemNome: dados.personagemNome || "",
        personagemFoto: dados.personagemFoto || "",
        personagemCor: dados.personagemCor || "",
        personagemResumo: dados.personagemResumo || "",
        capituloId: dados.capituloId || "",
        capituloTitulo: dados.capituloTitulo || "",
        capituloResumo: dados.capituloResumo || "",
        capituloCor: dados.capituloCor || "",
        capituloMinutos: Number(dados.capituloMinutos) || 0,
        capituloPalavras: Number(dados.capituloPalavras) || 0,
        capituloTextoCompleto: dados.capituloTextoCompleto || "",
        itemMundoId: dados.itemMundoId || "",
        itemMundoTipo: dados.itemMundoTipo || "",
        itemMundoSecao: dados.itemMundoSecao || "",
        itemMundoNome: dados.itemMundoNome || "",
        itemMundoImagem: dados.itemMundoImagem || "",
        itemMundoCor: dados.itemMundoCor || "",
        itemMundoDescricao: dados.itemMundoDescricao || "",
        imagemUrl: dados.imagemUrl || "",
        tags: Array.isArray(dados.tags) ? dados.tags : [],
        spoiler: dados.spoiler || "sem",
        comentariosModo: dados.comentariosModo || "todos",
        clubeId: dados.clubeId || "",
        clubeNome: dados.clubeNome || "",
        notificarClube: Boolean(dados.notificarClube),
        criadoEmLocal: new Date().toISOString(),
        criadoEm: serverTimestamp(),
        atualizadoEm: serverTimestamp(),
      });

      await addDoc(collection(db, "publicacoes"), publicacao);
      mostrarFeedback("Publicação enviada para o feed.");
      await carregarComunidade();
    },
    [carregarComunidade, mostrarFeedback, perfilPublico, usuario, usuarioId],
  );

  const removerPublicacao = useCallback(
    async (publicacaoId) => {
      await deleteDoc(doc(db, "publicacoes", String(publicacaoId)));
      setPublicacoes((listaAtual) => listaAtual.filter((publicacao) => String(publicacao.id) !== String(publicacaoId)));
      mostrarFeedback("Publicação removida.");
    },
    [mostrarFeedback],
  );

  const enviarConviteColaboracao = useCallback(
    async (dados = {}) => {
      if (!usuarioId || !dados.paraUserId) return;

      const perfil = perfilPublico || perfilPadrao(usuario);
      const perfilDestino = perfisPublicos.find((item) => item.id === dados.paraUserId);

      await addDoc(collection(db, "convites"), removerIndefinidos({
        deUserId: usuarioId,
        deNome: perfil.nome || "Autor",
        deFoto: perfil.fotoUrl || "",
        paraUserId: dados.paraUserId,
        paraNome: perfilDestino?.nome || "",
        livroId: dados.livroId || "",
        livroTitulo: dados.livroTitulo || "",
        tipo: "colaboracao",
        papel: dados.papel || "Colaborador",
        mensagem: dados.mensagem || "",
        status: "pendente",
        criadoEm: serverTimestamp(),
      }));

      mostrarFeedback("Convite enviado.");
      await carregarComunidade();
    },
    [carregarComunidade, mostrarFeedback, perfilPublico, perfisPublicos, usuario, usuarioId],
  );

  const responderConvite = useCallback(
    async (conviteId, status) => {
      await setDoc(doc(db, "convites", String(conviteId)), { status, respondidoEm: serverTimestamp() }, { merge: true });
      setConvites((listaAtual) =>
        listaAtual.map((convite) => (String(convite.id) === String(conviteId) ? { ...convite, status } : convite)),
      );
      mostrarFeedback(status === "aceito" ? "Colaboração aceita." : "Convite atualizado.");
    },
    [mostrarFeedback],
  );

  useEffect(() => {
    carregarLivros();
  }, [carregarLivros]);

  useEffect(() => {
    if (!usuarioId) return;

    carregarComunidade();
  }, [carregarComunidade, usuarioId]);

  useEffect(() => {
    if (!usuarioId) return undefined;

    definirUsuarioAtualId(usuarioId);

    try {
      const livroAtivoSalvo = window.localStorage.getItem(LIVRO_ATIVO_KEY + ":" + usuarioId) || "";
      setLivroSelecionadoId(livroAtivoSalvo);
    } catch {
      setLivroSelecionadoId("");
    }

    const perfilRef = doc(db, "perfisPublicos", usuarioId);
    const usuarioRef = doc(db, "usuarios", usuarioId);
    const prepararPresenca = async () => {
      const perfilSnapshot = await getDoc(perfilRef);

      await setDoc(usuarioRef, removerIndefinidos({
        email: usuario?.email || "",
        nome: usuario?.displayName || "",
        fotoUrl: usuario?.photoURL || "",
        ultimoAcessoEm: serverTimestamp(),
      }), { merge: true });

      if (perfilSnapshot.exists()) {
        await setDoc(perfilRef, { online: true, atualizadoEm: serverTimestamp() }, { merge: true });
      } else {
        await setDoc(perfilRef, removerIndefinidos({
          ...perfilPadrao(usuario),
          criadoEm: serverTimestamp(),
          atualizadoEm: serverTimestamp(),
        }), { merge: true });
      }
    };

    prepararPresenca().catch(() => {});

    return () => {
      setDoc(perfilRef, {
        online: false,
        escrevendo: false,
        escrevendoLivroTitulo: "",
        escrevendoSessaoTitulo: "",
        atualizadoEm: serverTimestamp(),
      }, { merge: true }).catch(() => {});
    };
  }, [usuario, usuarioId]);

  const livrosAtivos = useMemo(() => livros.filter((livro) => !livro.arquivado), [livros]);
  const livrosArquivados = useMemo(() => livros.filter((livro) => livro.arquivado), [livros]);

  const livroSelecionado = useMemo(() => {
    return (
      livros.find((livro) => String(livro.id) === String(livroSelecionadoId)) ||
      livrosAtivos[0] ||
      livros[0] ||
      null
    );
  }, [livroSelecionadoId, livros, livrosAtivos]);

  useEffect(() => {
    if (!livroSelecionado?.id) return;

    setLivroSelecionadoId(livroSelecionado.id);

    try {
      window.localStorage.setItem(LIVRO_ATIVO_KEY + ":" + usuarioId, livroSelecionado.id);
    } catch {
      // O app continua funcionando mesmo se o navegador bloquear localStorage.
    }
  }, [livroSelecionado?.id, usuarioId]);

  const generoAtual = useMemo(() => obterGenero(livroSelecionado?.genero), [livroSelecionado?.genero]);
  const progressoAtual = useMemo(() => calcularProgressoLivro(livroSelecionado), [livroSelecionado]);
  const diagnosticoAtual = useMemo(() => diagnosticarLivro(livroSelecionado), [livroSelecionado]);
  const sugestoesAtuais = useMemo(() => montarSugestoesCriativas(livroSelecionado), [livroSelecionado]);
  const temaAtual = useMemo(() => {
    const genero = generoAtual || generosHistoria[0];
    const cor = livroSelecionado?.cor || genero.cor;

    return {
      cor,
      rgb: genero.rgb,
      genero: genero.nome,
    };
  }, [generoAtual, livroSelecionado?.cor]);

  function selecionarLivro(livroId) {
    const idNormalizado = livroId ? String(livroId) : "";
    setLivroSelecionadoId(idNormalizado);

    try {
      if (idNormalizado) {
        window.localStorage.setItem(LIVRO_ATIVO_KEY + ":" + usuarioId, idNormalizado);
      } else {
        window.localStorage.removeItem(LIVRO_ATIVO_KEY + ":" + usuarioId);
      }
    } catch {
      // Preferência apenas visual.
    }
  }

  async function adicionarLivro(dadosLivro) {
    const novoLivro = {
      ...criarLivroVazio(dadosLivro),
      criadoEm: new Date().toISOString(),
      atualizadoEm: new Date().toISOString(),
    };
    const livroParaSalvar = prepararMetadadosLivro(novoLivro);

    const referencia = await addDoc(livrosCollection(), {
      ...livroParaSalvar,
      criadoEm: serverTimestamp(),
      atualizadoEm: serverTimestamp(),
    });

    const livroCriado = normalizarLivro({
      ...novoLivro,
      id: referencia.id,
    });

    setLivros((listaAtual) => ordenarLivros([livroCriado, ...listaAtual]));
    selecionarLivro(livroCriado.id);
    mostrarFeedback("Livro criado e selecionado.");

    return livroCriado;
  }

  async function salvarLivro(livroId, alteracoes, opcoes = {}) {
    const alteracoesSeguras = prepararMetadadosLivro(alteracoes);
    delete alteracoesSeguras.id;

    const patch = {
      ...alteracoesSeguras,
      atualizadoEm: serverTimestamp(),
    };

    await setDoc(referenciaLivro(livroId), patch, { merge: true });

    setLivros((listaAtual) =>
      ordenarLivros(
        listaAtual.map((livro) =>
          String(livro.id) === String(livroId)
            ? normalizarLivro({ ...livro, ...alteracoesSeguras, atualizadoEm: new Date().toISOString() })
            : livro,
        ),
      ),
    );

    if (!opcoes.silencioso) {
      mostrarFeedback("Livro atualizado.");
    }
  }

  async function tocarLivro(livroId) {
    await setDoc(referenciaLivro(livroId), { atualizadoEm: serverTimestamp() }, { merge: true });
  }

  async function atualizarLivroPorFuncao(livroId, montarAlteracoes, mensagem, persistirAlteracoes) {
    const livroAtual = livros.find((livro) => String(livro.id) === String(livroId));
    if (!livroAtual) throw new Error("Livro não encontrado.");

    const alteracoes = montarAlteracoes(livroAtual);
    const livroAtualizado = normalizarLivro({
      ...livroAtual,
      ...alteracoes,
      atualizadoEm: new Date().toISOString(),
    });

    if (persistirAlteracoes) {
      await persistirAlteracoes(livroAtual, alteracoes, livroAtualizado);
    } else {
      await tocarLivro(livroId);
    }

    setLivros((listaAtual) =>
      ordenarLivros(
        listaAtual.map((livro) =>
          String(livro.id) === String(livroId) ? livroAtualizado : livro,
        ),
      ),
    );

    if (mensagem) {
      mostrarFeedback(mensagem);
    }

    return livroAtualizado;
  }

  async function arquivarLivro(livroId) {
    await salvarLivro(livroId, { arquivado: true, status: "arquivado" });
  }

  async function reabrirLivro(livroId) {
    await salvarLivro(livroId, { arquivado: false, status: "planejamento" });
  }

  async function deletarLivro(livroId) {
    const livroRef = referenciaLivro(livroId);
    const capitulosSnapshot = await getDocs(collection(livroRef, SUBCOLECOES_LIVRO.capitulos));

    await Promise.all(
      capitulosSnapshot.docs.map(async (capituloDocumento) => {
        await apagarDocumentosDaColecao(collection(capituloDocumento.ref, "sessoes"));
        await deleteDoc(capituloDocumento.ref);
      }),
    );

    await Promise.all([
      apagarDocumentosDaColecao(collection(livroRef, SUBCOLECOES_LIVRO.personagens)),
      apagarDocumentosDaColecao(collection(livroRef, SUBCOLECOES_LIVRO.ideias)),
      apagarDocumentosDaColecao(collection(livroRef, SUBCOLECOES_LIVRO.tarefas)),
      apagarDocumentosDaColecao(collection(livroRef, SUBCOLECOES_LIVRO.sessoes)),
      apagarDocumentosDaColecao(collection(livroRef, SUBCOLECOES_LIVRO.mundo)),
    ]);

    await deleteDoc(livroRef);

    const listaSemLivro = ordenarLivros(livros.filter((livro) => String(livro.id) !== String(livroId)));
    setLivros(listaSemLivro);

    if (String(livroSelecionadoId) === String(livroId) || String(livroSelecionado?.id) === String(livroId)) {
      const proximoLivro = listaSemLivro.find((livro) => !livro.arquivado) || listaSemLivro[0] || null;
      selecionarLivro(proximoLivro?.id || "");
    }

    mostrarFeedback("Livro removido.");
  }

  async function adicionarPersonagem(livroId, dados) {
    const personagemCriado = criarPersonagemVazio(dados);

    return atualizarLivroPorFuncao(
      livroId,
      (livro) => ({ personagens: [...livro.personagens, personagemCriado] }),
      "Personagem adicionado.",
      async () => {
        await setDoc(
          referenciaSubdocumento(livroId, SUBCOLECOES_LIVRO.personagens, personagemCriado.id),
          prepararDocumentoItem(personagemCriado),
          { merge: true },
        );
        await tocarLivro(livroId);
      },
    );
  }

  async function salvarPersonagem(livroId, personagemId, alteracoes, opcoes = {}) {
    return atualizarLivroPorFuncao(
      livroId,
      (livro) => ({ personagens: comItemAtualizado(livro.personagens, personagemId, alteracoes) }),
      opcoes.silencioso ? "" : "Personagem atualizado.",
      async () => {
        await setDoc(
          referenciaSubdocumento(livroId, SUBCOLECOES_LIVRO.personagens, personagemId),
          prepararDocumentoItem(alteracoes),
          { merge: true },
        );
        await tocarLivro(livroId);
      },
    );
  }

  async function removerPersonagem(livroId, personagemId) {
    return atualizarLivroPorFuncao(
      livroId,
      (livro) => ({ personagens: semItem(livro.personagens, personagemId) }),
      "Personagem removido.",
      async () => {
        await deleteDoc(referenciaSubdocumento(livroId, SUBCOLECOES_LIVRO.personagens, personagemId));
        await tocarLivro(livroId);
      },
    );
  }

  async function removerPapelPersonagem(livroId, papel, papelSubstituto = "Aliado") {
    const papelNormalizado = String(papel || "").trim();
    if (!papelNormalizado) return null;

    return atualizarLivroPorFuncao(
      livroId,
      (livro) => ({
        papeisPersonagem: (livro.papeisPersonagem || []).filter((papelAtual) => papelAtual !== papelNormalizado),
        personagens: (livro.personagens || []).map((personagem) =>
          personagem.papel === papelNormalizado ? { ...personagem, papel: papelSubstituto } : personagem,
        ),
      }),
      "Papel removido.",
      async (livroAtual, _alteracoes, livroAtualizado) => {
        const personagensAfetados = (livroAtual.personagens || []).filter((personagem) => personagem.papel === papelNormalizado);

        await setDoc(
          referenciaLivro(livroId),
          {
            papeisPersonagem: livroAtualizado.papeisPersonagem || [],
            atualizadoEm: serverTimestamp(),
          },
          { merge: true },
        );

        await Promise.all(
          personagensAfetados.map((personagem) =>
            setDoc(
              referenciaSubdocumento(livroId, SUBCOLECOES_LIVRO.personagens, personagem.id),
              { papel: papelSubstituto },
              { merge: true },
            ),
          ),
        );
      },
    );
  }

  async function adicionarIdeia(livroId, dados) {
    const ideiaCriada = criarIdeiaVazia(dados);

    return atualizarLivroPorFuncao(
      livroId,
      (livro) => ({ ideias: [ideiaCriada, ...livro.ideias] }),
      "Ideia guardada.",
      async () => {
        await setDoc(
          referenciaSubdocumento(livroId, SUBCOLECOES_LIVRO.ideias, ideiaCriada.id),
          prepararDocumentoItem(ideiaCriada),
          { merge: true },
        );
        await tocarLivro(livroId);
      },
    );
  }

  async function salvarIdeia(livroId, ideiaId, alteracoes) {
    return atualizarLivroPorFuncao(
      livroId,
      (livro) => ({ ideias: comItemAtualizado(livro.ideias, ideiaId, alteracoes) }),
      "Ideia atualizada.",
      async () => {
        await setDoc(
          referenciaSubdocumento(livroId, SUBCOLECOES_LIVRO.ideias, ideiaId),
          prepararDocumentoItem(alteracoes),
          { merge: true },
        );
        await tocarLivro(livroId);
      },
    );
  }

  async function removerIdeia(livroId, ideiaId) {
    return atualizarLivroPorFuncao(
      livroId,
      (livro) => ({ ideias: semItem(livro.ideias, ideiaId) }),
      "Ideia removida.",
      async () => {
        await deleteDoc(referenciaSubdocumento(livroId, SUBCOLECOES_LIVRO.ideias, ideiaId));
        await tocarLivro(livroId);
      },
    );
  }

  async function adicionarCapitulo(livroId, dados) {
    const capituloCriado = criarCapituloVazio(dados);

    return atualizarLivroPorFuncao(
      livroId,
      (livro) => ({
        capitulos: [
          ...livro.capitulos,
          {
            ...capituloCriado,
            ordem: livro.capitulos.length,
          },
        ],
      }),
      "Capítulo adicionado.",
      async (livroAtual) => {
        await setDoc(
          referenciaSubdocumento(livroId, SUBCOLECOES_LIVRO.capitulos, capituloCriado.id),
          prepararDocumentoItem({
            ...capituloCriado,
            ordem: livroAtual.capitulos.length,
            sessoes: undefined,
          }),
          { merge: true },
        );
        await tocarLivro(livroId);
      },
    ).then(() => capituloCriado);
  }

  async function salvarCapitulo(livroId, capituloId, alteracoes) {
    return atualizarLivroPorFuncao(
      livroId,
      (livro) => ({
        capitulos: comItemAtualizado(livro.capitulos, capituloId, {
          ...alteracoes,
          atualizadoEm: new Date().toISOString(),
        }),
      }),
      "Capítulo atualizado.",
      async () => {
        await setDoc(
          referenciaSubdocumento(livroId, SUBCOLECOES_LIVRO.capitulos, capituloId),
          prepararDocumentoItem({
            ...alteracoes,
            sessoes: undefined,
            atualizadoEm: new Date().toISOString(),
          }),
          { merge: true },
        );
        await tocarLivro(livroId);
      },
    );
  }

  async function removerCapitulo(livroId, capituloId) {
    return atualizarLivroPorFuncao(
      livroId,
      (livro) => ({ capitulos: semItem(livro.capitulos, capituloId).map((capitulo, ordem) => ({ ...capitulo, ordem })) }),
      "Capítulo removido.",
      async (_livroAtual, _alteracoes, livroAtualizado) => {
        await apagarDocumentosDaColecao(collection(referenciaSubdocumento(livroId, SUBCOLECOES_LIVRO.capitulos, capituloId), "sessoes"));
        await deleteDoc(referenciaSubdocumento(livroId, SUBCOLECOES_LIVRO.capitulos, capituloId));
        await Promise.all(
          livroAtualizado.capitulos.map((capitulo) =>
            setDoc(
              referenciaSubdocumento(livroId, SUBCOLECOES_LIVRO.capitulos, capitulo.id),
              { ordem: capitulo.ordem },
              { merge: true },
            ),
          ),
        );
        await tocarLivro(livroId);
      },
    );
  }

  async function reordenarCapitulo(livroId, capituloId, direcao) {
    return atualizarLivroPorFuncao(
      livroId,
      (livro) => ({ capitulos: reordenarLista(livro.capitulos, capituloId, direcao) }),
      "Linha do tempo atualizada.",
      async (_livroAtual, _alteracoes, livroAtualizado) => {
        await Promise.all(
          livroAtualizado.capitulos.map((capitulo) =>
            setDoc(
              referenciaSubdocumento(livroId, SUBCOLECOES_LIVRO.capitulos, capitulo.id),
              { ordem: capitulo.ordem },
              { merge: true },
            ),
          ),
        );
        await tocarLivro(livroId);
      },
    );
  }

  async function adicionarSessaoCapitulo(livroId, capituloId, dados) {
    const sessaoCriada = criarSessaoVazia(dados);

    return atualizarLivroPorFuncao(
      livroId,
      (livro) => ({
        capitulos: atualizarCapituloEmLista(livro.capitulos, capituloId, (capitulo) => ({
          ...capitulo,
          atualizadoEm: new Date().toISOString(),
          sessoes: [
            ...(capitulo.sessoes || []),
            {
              ...sessaoCriada,
              ordem: (capitulo.sessoes || []).length,
            },
          ],
        })),
      }),
      "Sessão criada.",
      async (_livroAtual, _alteracoes, livroAtualizado) => {
        const capituloAtualizado = livroAtualizado.capitulos.find((capitulo) => String(capitulo.id) === String(capituloId));
        const sessaoAtualizada = capituloAtualizado?.sessoes.find((sessao) => String(sessao.id) === String(sessaoCriada.id)) || sessaoCriada;

        await setDoc(
          referenciaSessaoCapitulo(livroId, capituloId, sessaoCriada.id),
          prepararDocumentoItem(sessaoAtualizada),
          { merge: true },
        );
        await setDoc(
          referenciaSubdocumento(livroId, SUBCOLECOES_LIVRO.capitulos, capituloId),
          { atualizadoEm: serverTimestamp() },
          { merge: true },
        );
        await tocarLivro(livroId);
      },
    ).then(() => sessaoCriada);
  }

  async function salvarSessaoCapitulo(livroId, capituloId, sessaoId, alteracoes, opcoes = {}) {
    return atualizarLivroPorFuncao(
      livroId,
      (livro) => ({
        capitulos: atualizarCapituloEmLista(livro.capitulos, capituloId, (capitulo) => ({
          ...capitulo,
          atualizadoEm: new Date().toISOString(),
          sessoes: (capitulo.sessoes || []).map((sessao) =>
            String(sessao.id) === String(sessaoId)
              ? { ...sessao, ...alteracoes, atualizadoEm: new Date().toISOString() }
              : sessao,
          ),
        })),
      }),
      opcoes.silencioso ? null : "Sessão salva.",
      async () => {
        await setDoc(
          referenciaSessaoCapitulo(livroId, capituloId, sessaoId),
          prepararDocumentoItem({
            ...alteracoes,
            atualizadoEm: new Date().toISOString(),
          }),
          { merge: true },
        );
        await setDoc(
          referenciaSubdocumento(livroId, SUBCOLECOES_LIVRO.capitulos, capituloId),
          { atualizadoEm: serverTimestamp() },
          { merge: true },
        );
        await tocarLivro(livroId);
      },
    );
  }

  async function removerSessaoCapitulo(livroId, capituloId, sessaoId) {
    return atualizarLivroPorFuncao(
      livroId,
      (livro) => ({
        capitulos: atualizarCapituloEmLista(livro.capitulos, capituloId, (capitulo) => ({
          ...capitulo,
          atualizadoEm: new Date().toISOString(),
          sessoes: semItem(capitulo.sessoes || [], sessaoId).map((sessao, ordem) => ({ ...sessao, ordem })),
        })),
      }),
      "Sessão removida.",
      async (_livroAtual, _alteracoes, livroAtualizado) => {
        const capituloAtualizado = livroAtualizado.capitulos.find((capitulo) => String(capitulo.id) === String(capituloId));

        await deleteDoc(referenciaSessaoCapitulo(livroId, capituloId, sessaoId));
        await Promise.all(
          (capituloAtualizado?.sessoes || []).map((sessao) =>
            setDoc(
              referenciaSessaoCapitulo(livroId, capituloId, sessao.id),
              { ordem: sessao.ordem },
              { merge: true },
            ),
          ),
        );
        await setDoc(
          referenciaSubdocumento(livroId, SUBCOLECOES_LIVRO.capitulos, capituloId),
          { atualizadoEm: serverTimestamp() },
          { merge: true },
        );
        await tocarLivro(livroId);
      },
    );
  }

  async function reordenarSessaoCapitulo(livroId, capituloId, sessaoId, direcao) {
    return atualizarLivroPorFuncao(
      livroId,
      (livro) => ({
        capitulos: atualizarCapituloEmLista(livro.capitulos, capituloId, (capitulo) => ({
          ...capitulo,
          atualizadoEm: new Date().toISOString(),
          sessoes: reordenarLista(capitulo.sessoes || [], sessaoId, direcao),
        })),
      }),
      "Sessões reorganizadas.",
      async (_livroAtual, _alteracoes, livroAtualizado) => {
        const capituloAtualizado = livroAtualizado.capitulos.find((capitulo) => String(capitulo.id) === String(capituloId));

        await Promise.all(
          (capituloAtualizado?.sessoes || []).map((sessao) =>
            setDoc(
              referenciaSessaoCapitulo(livroId, capituloId, sessao.id),
              { ordem: sessao.ordem },
              { merge: true },
            ),
          ),
        );
        await setDoc(
          referenciaSubdocumento(livroId, SUBCOLECOES_LIVRO.capitulos, capituloId),
          { atualizadoEm: serverTimestamp() },
          { merge: true },
        );
        await tocarLivro(livroId);
      },
    );
  }

  async function registrarSessao(livroId, dados) {
    const sessaoCriada = criarSessaoVazia(dados);

    return atualizarLivroPorFuncao(
      livroId,
      (livro) => ({ sessoes: [sessaoCriada, ...livro.sessoes] }),
      "Sessão registrada.",
      async () => {
        await setDoc(
          referenciaSubdocumento(livroId, SUBCOLECOES_LIVRO.sessoes, sessaoCriada.id),
          prepararDocumentoItem(sessaoCriada),
          { merge: true },
        );
        await tocarLivro(livroId);
      },
    );
  }

  async function adicionarTarefa(livroId, dados) {
    const tarefaCriada = criarTarefaVazia(dados);

    return atualizarLivroPorFuncao(
      livroId,
      (livro) => ({ tarefas: [tarefaCriada, ...livro.tarefas] }),
      "Tarefa criada.",
      async () => {
        await setDoc(
          referenciaSubdocumento(livroId, SUBCOLECOES_LIVRO.tarefas, tarefaCriada.id),
          prepararDocumentoItem(tarefaCriada),
          { merge: true },
        );
        await tocarLivro(livroId);
      },
    );
  }

  async function salvarTarefa(livroId, tarefaId, alteracoes) {
    return atualizarLivroPorFuncao(
      livroId,
      (livro) => ({ tarefas: comItemAtualizado(livro.tarefas, tarefaId, alteracoes) }),
      "Tarefa atualizada.",
      async () => {
        await setDoc(
          referenciaSubdocumento(livroId, SUBCOLECOES_LIVRO.tarefas, tarefaId),
          prepararDocumentoItem(alteracoes),
          { merge: true },
        );
        await tocarLivro(livroId);
      },
    );
  }

  async function removerTarefa(livroId, tarefaId) {
    return atualizarLivroPorFuncao(
      livroId,
      (livro) => ({ tarefas: semItem(livro.tarefas, tarefaId) }),
      "Tarefa removida.",
      async () => {
        await deleteDoc(referenciaSubdocumento(livroId, SUBCOLECOES_LIVRO.tarefas, tarefaId));
        await tocarLivro(livroId);
      },
    );
  }

  async function adicionarItemMundo(livroId, tipo, dados) {
    const itemCriado = criarItemMundo(tipo, {
      ...dados,
      atualizadoEm: new Date().toISOString(),
    });
    const personagensDoLugar = new Set((itemCriado.personagensIds || []).map(String));

    return atualizarLivroPorFuncao(
      livroId,
      (livro) => ({
        mundo: {
          ...livro.mundo,
          [tipo]: [
            itemCriado,
            ...(livro.mundo[tipo] || []),
          ],
        },
        personagens:
          tipo === "lugares" && personagensDoLugar.size > 0
            ? livro.personagens.map((personagem) =>
                personagensDoLugar.has(String(personagem.id)) ? { ...personagem, regiaoId: itemCriado.id } : personagem,
              )
            : livro.personagens,
      }),
      "Item do mundo adicionado.",
      async (_livroAtual, _alteracoes, livroAtualizado) => {
        await setDoc(
          referenciaSubdocumento(livroId, SUBCOLECOES_LIVRO.mundo, itemCriado.id),
          prepararDocumentoItem({ ...itemCriado, tipo }),
          { merge: true },
        );

        if (tipo === "lugares" && personagensDoLugar.size > 0) {
          await Promise.all(
            livroAtualizado.personagens
              .filter((personagem) => personagensDoLugar.has(String(personagem.id)))
              .map((personagem) =>
                setDoc(
                  referenciaSubdocumento(livroId, SUBCOLECOES_LIVRO.personagens, personagem.id),
                  { regiaoId: itemCriado.id },
                  { merge: true },
                ),
              ),
          );
        }

        await tocarLivro(livroId);
      },
    ).then(() => itemCriado);
  }

  async function salvarItemMundo(livroId, tipo, itemId, alteracoes, opcoes = {}) {
    const personagensDoLugar = Array.isArray(alteracoes.personagensIds)
      ? new Set(alteracoes.personagensIds.map(String))
      : null;

    return atualizarLivroPorFuncao(
      livroId,
      (livro) => ({
        mundo: {
          ...livro.mundo,
          [tipo]: comItemAtualizado(livro.mundo[tipo] || [], itemId, {
            ...alteracoes,
            atualizadoEm: new Date().toISOString(),
          }),
        },
        personagens:
          tipo === "lugares" && personagensDoLugar
            ? livro.personagens.map((personagem) => {
                if (personagensDoLugar.has(String(personagem.id))) {
                  return { ...personagem, regiaoId: itemId };
                }

                return String(personagem.regiaoId || "") === String(itemId) ? { ...personagem, regiaoId: "" } : personagem;
              })
            : livro.personagens,
      }),
      opcoes.silencioso ? "" : "Item do mundo atualizado.",
      async (_livroAtual, _alteracoes, livroAtualizado) => {
        await setDoc(
          referenciaSubdocumento(livroId, SUBCOLECOES_LIVRO.mundo, itemId),
          prepararDocumentoItem({
            ...alteracoes,
            tipo,
            atualizadoEm: new Date().toISOString(),
          }),
          { merge: true },
        );

        if (tipo === "lugares" && personagensDoLugar) {
          await Promise.all(
            livroAtualizado.personagens.map((personagem) =>
              setDoc(
                referenciaSubdocumento(livroId, SUBCOLECOES_LIVRO.personagens, personagem.id),
                { regiaoId: personagem.regiaoId || "" },
                { merge: true },
              ),
            ),
          );
        }

        await tocarLivro(livroId);
      },
    );
  }

  async function removerItemMundo(livroId, tipo, itemId) {
    return atualizarLivroPorFuncao(
      livroId,
      (livro) => ({
        mundo: {
          ...livro.mundo,
          [tipo]: semItem(livro.mundo[tipo] || [], itemId),
        },
        personagens:
          tipo === "lugares"
            ? livro.personagens.map((personagem) =>
                String(personagem.regiaoId || "") === String(itemId) ? { ...personagem, regiaoId: "" } : personagem,
              )
            : livro.personagens,
      }),
      "Item do mundo removido.",
      async (_livroAtual, _alteracoes, livroAtualizado) => {
        await deleteDoc(referenciaSubdocumento(livroId, SUBCOLECOES_LIVRO.mundo, itemId));

        if (tipo === "lugares") {
          await Promise.all(
            livroAtualizado.personagens.map((personagem) =>
              setDoc(
                referenciaSubdocumento(livroId, SUBCOLECOES_LIVRO.personagens, personagem.id),
                { regiaoId: personagem.regiaoId || "" },
                { merge: true },
              ),
            ),
          );
        }

        await tocarLivro(livroId);
      },
    );
  }

  function salvarConfiguracoes(novasConfiguracoes) {
    setConfiguracoes({
      ...CONFIG_HISTORIAS_PADRAO,
      ...novasConfiguracoes,
      metaPalavrasDiaria: Number(novasConfiguracoes.metaPalavrasDiaria) || CONFIG_HISTORIAS_PADRAO.metaPalavrasDiaria,
      metaPalavrasLivro: Number(novasConfiguracoes.metaPalavrasLivro) || CONFIG_HISTORIAS_PADRAO.metaPalavrasLivro,
    });
    mostrarFeedback("Preferências atualizadas nesta sessão.");
  }

  const notificacoesComunidade = useMemo(() => {
    if (!perfilPublico || !usuarioId) return 0;

    const inscricoes = perfilPublico.clubesInscritos || [];
    if (inscricoes.length === 0) return 0;

    const lidasEm = dataParaMillis(perfilPublico.notificacoesLidasEm);

    return publicacoes.filter((publicacao) => {
      if (!publicacao.notificarClube || !publicacao.clubeId || publicacao.autorId === usuarioId) return false;

      const inscritoNoClube = inscricoes.some(
        (inscricao) =>
          String(inscricao.autorId) === String(publicacao.autorId) &&
          String(inscricao.clubeId) === String(publicacao.clubeId),
      );

      return inscritoNoClube && dataParaMillis(publicacao.criadoEm) > lidasEm;
    }).length;
  }, [perfilPublico, publicacoes, usuarioId]);

  const valor = useMemo(
    () => ({
      livros,
      livrosAtivos,
      livrosArquivados,
      carregandoLivros,
      carregandoComunidade,
      usuario,
      usuarioId,
      perfilPublico,
      perfisPublicos,
      publicacoes,
      convites,
      notificacoesComunidade,
      livroSelecionado,
      livroSelecionadoId,
      generoAtual,
      progressoAtual,
      diagnosticoAtual,
      sugestoesAtuais,
      temaAtual,
      configuracoes,
      generosHistoria,
      obterGenero,
      calcularProgressoLivro,
      diagnosticarLivro,
      montarSugestoesCriativas,
      carregarLivros,
      carregarComunidade,
      sincronizarPerfilPublico,
      atualizarStatusPublico,
      criarPublicacao,
      removerPublicacao,
      enviarConviteColaboracao,
      responderConvite,
      selecionarLivro,
      adicionarLivro,
      salvarLivro,
      arquivarLivro,
      reabrirLivro,
      deletarLivro,
      adicionarPersonagem,
      salvarPersonagem,
      removerPersonagem,
      removerPapelPersonagem,
      adicionarIdeia,
      salvarIdeia,
      removerIdeia,
      adicionarCapitulo,
      salvarCapitulo,
      removerCapitulo,
      reordenarCapitulo,
      adicionarSessaoCapitulo,
      salvarSessaoCapitulo,
      removerSessaoCapitulo,
      reordenarSessaoCapitulo,
      registrarSessao,
      adicionarTarefa,
      salvarTarefa,
      removerTarefa,
      adicionarItemMundo,
      salvarItemMundo,
      removerItemMundo,
      salvarConfiguracoes,
    }),
    [
      livros,
      livrosAtivos,
      livrosArquivados,
      carregandoLivros,
      carregandoComunidade,
      usuario,
      usuarioId,
      perfilPublico,
      perfisPublicos,
      publicacoes,
      convites,
      notificacoesComunidade,
      livroSelecionado,
      livroSelecionadoId,
      generoAtual,
      progressoAtual,
      diagnosticoAtual,
      sugestoesAtuais,
      temaAtual,
      configuracoes,
      carregarLivros,
      carregarComunidade,
      sincronizarPerfilPublico,
      atualizarStatusPublico,
      criarPublicacao,
      removerPublicacao,
      enviarConviteColaboracao,
      responderConvite,
    ],
  );

  return <StoryDataContext.Provider value={valor}>{children}</StoryDataContext.Provider>;
}

export function useStoryData() {
  const contexto = useContext(StoryDataContext);

  if (!contexto) {
    throw new Error("useStoryData precisa estar dentro de StoryDataProvider.");
  }

  return contexto;
}
