import { useEffect, useMemo, useRef, useState } from "react";
import { addDoc, collection, deleteDoc, doc, onSnapshot, query, serverTimestamp, setDoc, where } from "firebase/firestore";

import ImageProcessingOverlay from "../components/ImageProcessingOverlay";
import { useStoryData } from "../context/StoryDataContext";
import { db } from "../firebase/config";
import { useImageProcessor } from "../hooks/useImageProcessor";

const abasPrincipais = [
  { id: "perfil", label: "Meu perfil" },
  { id: "pesquisar", label: "Pesquisar" },
  { id: "amigos", label: "Amigos" },
];

const paletasPerfil = [
  { nome: "Vinho suave", cor: "#8f1d43" },
  { nome: "Lilás calmo", cor: "#8c6ad8" },
  { nome: "Pêssego", cor: "#d98d70" },
  { nome: "Sálvia", cor: "#5f9f8b" },
  { nome: "Azul névoa", cor: "#5d86a8" },
];

const fundosPerfil = [
  { id: "lavanda", label: "Lavanda" },
  { id: "creme", label: "Creme" },
  { id: "salvia", label: "Sálvia" },
  { id: "papel", label: "Papel" },
];

const estilosCartao = [
  { id: "delicado", label: "Delicado" },
  { id: "minimalista", label: "Minimalista" },
  { id: "caderno", label: "Papel de caderno" },
];

const fontesTitulo = [
  { id: "serifada", label: "Serifada" },
  { id: "limpa", label: "Limpa" },
  { id: "literaria", label: "Literária" },
];

const tiposConteudo = ["Personagem", "Capítulo", "Local", "Item do mundo", "Imagem", "Outro"];

const filtrosConteudoPrivado = [
  { id: "Todos", label: "Todos" },
  { id: "Personagem", label: "Personagens" },
  { id: "Capítulo", label: "Capítulos" },
  { id: "Local", label: "Lugares" },
  { id: "Item do mundo", label: "Itens" },
  { id: "Imagem", label: "Imagens" },
];

const perfilInicial = {
  nome: "",
  fotoUrl: "",
  capaUrl: "",
  descricao: "",
  generos: "",
  usuarioHandle: "",
  pronomes: "",
  obraAtual: "",
  corPerfil: "#8f1d43",
  fundoPerfil: "lavanda",
  estiloCartao: "delicado",
  fonteTitulo: "serifada",
  mostrarGeneros: true,
  mostrarObraAtual: true,
  mostrarAmigos: true,
  perfilPublicoAtivo: true,
  livrosDestaqueIds: [],
  personagensDestaqueIds: [],
};

const conteudoInicial = {
  tipo: "Personagem",
  titulo: "",
  descricao: "",
  imagemUrl: "",
  textoLongo: "",
};

function limparParaFirebase(valor) {
  if (valor === undefined) return undefined;
  if (valor === null) return null;

  if (typeof valor === "number") {
    return Number.isFinite(valor) ? valor : 0;
  }

  if (Array.isArray(valor)) {
    return valor.map(limparParaFirebase).filter((item) => item !== undefined);
  }

  if (typeof valor !== "object") {
    return valor;
  }

  const prototipo = Object.getPrototypeOf(valor);
  if (prototipo !== Object.prototype && prototipo !== null) {
    return valor;
  }

  return Object.entries(valor).reduce((objeto, [chave, item]) => {
    const valorLimpo = limparParaFirebase(item);
    if (valorLimpo !== undefined) {
      objeto[chave] = valorLimpo;
    }
    return objeto;
  }, {});
}

function mensagemErroFirebase(error, fallback) {
  if (error?.code === "permission-denied") return "O Firebase bloqueou essa ação. Confira as regras e tente novamente.";
  if (String(error?.message || "").includes("exceeds the maximum allowed size")) {
    return "Esse conteúdo ficou pesado demais para o Firestore. Use imagens por link ou uma imagem menor.";
  }
  if (String(error?.message || "").toLowerCase().includes("unsupported field value")) {
    return "Algum campo ficou vazio de um jeito que o Firebase não aceita. Revise e tente salvar novamente.";
  }

  return fallback;
}

export default function Comunidade() {
  const {
    usuarioId,
    usuario,
    livros,
    perfilPublico,
    perfisPublicos,
    convites,
    sincronizarPerfilPublico,
    carregarComunidade,
  } = useStoryData();

  const [abaAtiva, setAbaAtiva] = useState("perfil");
  const [comunidadeAberta, setComunidadeAberta] = useState(false);
  const [toast, setToast] = useState("");
  const [busca, setBusca] = useState("");
  const [buscaDebounced, setBuscaDebounced] = useState("");
  const [perfilEdicao, setPerfilEdicao] = useState(perfilInicial);
  const [modalPerfilAberto, setModalPerfilAberto] = useState(false);
  const [perfilVisitado, setPerfilVisitado] = useState(null);
  const [perfilSujo, setPerfilSujo] = useState(false);
  const [salvandoPerfil, setSalvandoPerfil] = useState(false);
  const [amigoSelecionadoId, setAmigoSelecionadoId] = useState("");
  const [abaAmizade, setAbaAmizade] = useState("conversa");
  const [mensagens, setMensagens] = useState([]);
  const [conteudosPrivados, setConteudosPrivados] = useState([]);
  const [conversasResumo, setConversasResumo] = useState([]);
  const [textoMensagem, setTextoMensagem] = useState("");
  const [imagemMensagem, setImagemMensagem] = useState("");
  const [mensagemRespondida, setMensagemRespondida] = useState(null);
  const [enviandoMensagem, setEnviandoMensagem] = useState(false);
  const [conteudoModalAberto, setConteudoModalAberto] = useState(false);
  const [conteudoDraft, setConteudoDraft] = useState(conteudoInicial);
  const [publicandoConteudo, setPublicandoConteudo] = useState(false);
  const [conteudoAberto, setConteudoAberto] = useState(null);
  const [filtroConteudo, setFiltroConteudo] = useState("Todos");
  const [comentarioTexto, setComentarioTexto] = useState({});
  const mensagensFimRef = useRef(null);
  const { processandoImagem, processarImagem } = useImageProcessor();

  useEffect(() => {
    document.body.classList.toggle("community-simple-active", comunidadeAberta);
    document.body.classList.toggle("community-wide-active", comunidadeAberta);
    return () => {
      document.body.classList.remove("community-simple-active");
      document.body.classList.remove("community-wide-active");
    };
  }, [comunidadeAberta]);

  useEffect(() => {
    const timeout = window.setTimeout(() => setBuscaDebounced(normalizarBusca(busca)), 320);
    return () => window.clearTimeout(timeout);
  }, [busca]);

  useEffect(() => {
    setPerfilEdicao({
      ...perfilInicial,
      ...perfilPublico,
      nome: perfilPublico?.nome || usuario?.displayName || usuario?.email?.split("@")[0] || "",
      usuarioHandle: perfilPublico?.usuarioHandle || criarHandle(perfilPublico?.nome || usuario?.displayName || usuario?.email || ""),
      fotoUrl: perfilPublico?.fotoUrl || usuario?.photoURL || "",
      corPerfil: perfilPublico?.corPerfil || "#8f1d43",
      perfilPublicoAtivo: perfilPublico?.perfilPublicoAtivo !== false,
    });
    setPerfilSujo(false);
  }, [perfilPublico, usuario]);

  useEffect(() => {
    if (!usuarioId || !perfilPublico || perfilSujo) return;

    const alteracoes = {};
    const nomePadrao = usuario?.displayName || usuario?.email?.split("@")[0] || "";

    if (!perfilPublico.nome || perfilPublico.nome === "Autor sem nome") {
      alteracoes.nome = nomePadrao || "Autor sem nome";
    }

    if (!perfilPublico.usuarioHandle) {
      alteracoes.usuarioHandle = criarHandle(perfilPublico.nome || nomePadrao || usuario?.email || "autor");
    }

    if (perfilPublico.perfilPublicoAtivo === false) {
      alteracoes.perfilPublicoAtivo = true;
    }

    if (Object.keys(alteracoes).length > 0) {
      sincronizarPerfilPublico(alteracoes, { silencioso: true }).catch(() => {});
    }
  }, [perfilPublico, perfilSujo, sincronizarPerfilPublico, usuario, usuarioId]);

  useEffect(() => {
    if (!toast) return undefined;
    const timeout = window.setTimeout(() => setToast(""), 3200);
    return () => window.clearTimeout(timeout);
  }, [toast]);

  useEffect(() => {
    const fechar = (event) => {
      if (event.key !== "Escape") return;
      if (conteudoAberto) setConteudoAberto(null);
      else if (conteudoModalAberto) fecharModalConteudo();
      else if (perfilVisitado) setPerfilVisitado(null);
      else if (modalPerfilAberto) fecharModalPerfil();
    };
    window.addEventListener("keydown", fechar);
    return () => window.removeEventListener("keydown", fechar);
  });

  const convitesAmizade = useMemo(
    () => convites.filter((convite) => convite.tipo === "amizade"),
    [convites],
  );

  const amizadeAceitaPorId = useMemo(() => {
    const mapa = new Map();
    convitesAmizade
      .filter((convite) => convite.status === "aceito")
      .forEach((convite) => {
        if (convite.deUserId === usuarioId) mapa.set(convite.paraUserId, convite);
        if (convite.paraUserId === usuarioId) mapa.set(convite.deUserId, convite);
      });
    return mapa;
  }, [convitesAmizade, usuarioId]);

  const pedidosRecebidos = useMemo(
    () => convitesAmizade.filter((convite) => convite.paraUserId === usuarioId && convite.status === "pendente"),
    [convitesAmizade, usuarioId],
  );

  const pedidosEnviados = useMemo(
    () => convitesAmizade.filter((convite) => convite.deUserId === usuarioId && convite.status === "pendente"),
    [convitesAmizade, usuarioId],
  );

  const amigos = useMemo(
    () =>
      perfisPublicos
        .filter((perfil) => amizadeAceitaPorId.has(perfil.id))
        .sort((a, b) => String(a.nome).localeCompare(String(b.nome))),
    [amizadeAceitaPorId, perfisPublicos],
  );

  const amigoSelecionado = useMemo(
    () => amigos.find((perfil) => perfil.id === amigoSelecionadoId) || null,
    [amigoSelecionadoId, amigos],
  );

  const amizadeSelecionadaId = useMemo(
    () => (amigoSelecionado ? criarAmizadeId(usuarioId, amigoSelecionado.id) : ""),
    [amigoSelecionado, usuarioId],
  );

  const montarMetadadosConversa = () => {
    if (!amizadeSelecionadaId || !amigoSelecionado || !usuarioId) return null;

    const participantes = [String(usuarioId), String(amigoSelecionado.id)].sort();

    return {
      id: amizadeSelecionadaId,
      participantes,
      participantesIds: participantes,
      participantesInfo: {
        [usuarioId]: {
          nome: perfilEdicao.nome || usuario?.displayName || "Autor",
          fotoUrl: perfilEdicao.fotoUrl || usuario?.photoURL || "",
        },
        [amigoSelecionado.id]: {
          nome: amigoSelecionado.nome || "Autor",
          fotoUrl: amigoSelecionado.fotoUrl || "",
        },
      },
      atualizadoEm: serverTimestamp(),
    };
  };

  const garantirConversaSelecionada = async () => {
    const metadados = montarMetadadosConversa();
    if (!metadados) return false;

    await setDoc(doc(db, "conversasComunidade", amizadeSelecionadaId), limparParaFirebase(metadados), { merge: true });
    return true;
  };

  const perfisPesquisaveis = useMemo(() => {
    const perfis = perfisPublicos.filter((perfil) => perfil.id !== usuarioId);
    if (!buscaDebounced) {
      return perfis
        .filter((perfil) => temGeneroEmComum(perfil.generos, perfilEdicao.generos) || perfil.online)
        .slice(0, 8);
    }

    return perfis.filter((perfil) =>
      textoInclui([perfil.nome, perfil.usuarioHandle, perfil.nomeBusca, perfil.usuarioBusca, perfil.generos, perfil.descricao, perfil.obraAtual], buscaDebounced),
    );
  }, [buscaDebounced, perfilEdicao.generos, perfisPublicos, usuarioId]);

  const livrosDestaque = useMemo(
    () => livros.filter((livro) => (perfilEdicao.livrosDestaqueIds || []).includes(livro.id)).slice(0, 1),
    [livros, perfilEdicao.livrosDestaqueIds],
  );

  const personagensDisponiveis = useMemo(
    () =>
      livros.flatMap((livro) =>
        (livro.personagens || []).map((personagem) => ({
          ...personagem,
          livroTitulo: livro.titulo,
        })),
      ),
    [livros],
  );

  const destaquePerfil = useMemo(() => {
    const personagensIds = (perfilEdicao.personagensDestaqueIds || []).map(String).slice(0, 3);
    const personagens = personagensIds
      .map((id) => personagensDisponiveis.find((item) => String(item.id) === id))
      .filter(Boolean)
      .map((personagem) => ({
        tipo: "Personagem",
        titulo: personagem.nome,
        livroTitulo: personagem.livroTitulo,
        descricao: personagem.historia || personagem.chamada || personagem.desejo || personagem.arco || "",
        imagemUrl: personagem.fotoUrl,
      }));

    const livro = livrosDestaque[0];
    const obra = livro
      ? {
        tipo: "Obra",
        titulo: livro.titulo,
        descricao: livro.sinopse || livro.premissa || livro.genero || "Obra em destaque",
        imagemUrl: livro.capaUrl,
      }
      : null;

    return personagens.length > 0 || obra ? { personagens, obra } : null;
  }, [livrosDestaque, personagensDisponiveis, perfilEdicao.personagensDestaqueIds]);

  useEffect(() => {
    if (!usuarioId) {
      setConversasResumo([]);
      return undefined;
    }

    const conversasQuery = query(collection(db, "conversasComunidade"), where("participantes", "array-contains", usuarioId));

    return onSnapshot(
      conversasQuery,
      (snapshot) => {
        setConversasResumo(snapshot.docs.map((documento) => ({ id: documento.id, ...documento.data() })));
      },
      () => setConversasResumo([]),
    );
  }, [usuarioId]);

  useEffect(() => {
    if (!amizadeSelecionadaId) {
      setMensagens([]);
      setConteudosPrivados([]);
      return undefined;
    }

    let ativo = true;
    const canceladores = [];

    const iniciarConversa = async () => {
      try {
        await garantirConversaSelecionada();
        if (!ativo) return;

        const mensagensRef = collection(db, "conversasComunidade", amizadeSelecionadaId, "mensagens");
        const conteudosRef = collection(db, "conversasComunidade", amizadeSelecionadaId, "conteudos");

        canceladores.push(onSnapshot(
          mensagensRef,
          (snapshot) => {
            setMensagens(
              snapshot.docs
                .map((documento) => ({ id: documento.id, ...documento.data() }))
                .sort((a, b) => dataOrdenacaoChat(a) - dataOrdenacaoChat(b)),
            );
          },
          () => setToast("Não foi possível carregar a conversa. Verifique as regras do Firebase."),
        ));

        canceladores.push(onSnapshot(
          conteudosRef,
          (snapshot) => {
            setConteudosPrivados(
              snapshot.docs
                .map((documento) => ({ id: documento.id, ...documento.data() }))
                .sort((a, b) => dataOrdenacaoChat(b) - dataOrdenacaoChat(a)),
            );
          },
          () => setToast("Não foi possível carregar os conteúdos desta conversa."),
        ));
      } catch (error) {
        if (ativo) {
          setToast(error.code === "permission-denied"
            ? "O Firebase bloqueou a criação desta conversa."
            : "Não foi possível abrir esta conversa.");
        }
      }
    };

    iniciarConversa();

    return () => {
      ativo = false;
      canceladores.forEach((cancelar) => cancelar());
    };
  }, [amizadeSelecionadaId, amigoSelecionado, perfilEdicao.fotoUrl, perfilEdicao.nome, usuario?.displayName, usuario?.photoURL, usuarioId]);

  useEffect(() => {
    if (!amizadeSelecionadaId || !usuarioId) return;

    setDoc(doc(db, "conversasComunidade", amizadeSelecionadaId), limparParaFirebase({
      leituraPorUsuario: {
        [usuarioId]: serverTimestamp(),
      },
    }), { merge: true }).catch(() => {});
  }, [amizadeSelecionadaId, usuarioId, mensagens.length, conteudosPrivados.length]);

  const statusAmizade = (perfilId) => {
    if (amizadeAceitaPorId.has(perfilId)) return "amigo";
    if (pedidosEnviados.some((pedido) => pedido.paraUserId === perfilId)) return "enviado";
    if (pedidosRecebidos.some((pedido) => pedido.deUserId === perfilId)) return "recebido";
    return "nenhum";
  };

  const pedidoRecebidoDe = (perfilId) => pedidosRecebidos.find((pedido) => pedido.deUserId === perfilId);
  const pedidoEnviadoPara = (perfilId) => pedidosEnviados.find((pedido) => pedido.paraUserId === perfilId);

  const mostrarToast = (mensagem) => setToast(mensagem);

  const abrirModalPerfil = () => {
    setModalPerfilAberto(true);
    setPerfilSujo(false);
  };

  const fecharModalPerfil = () => {
    setModalPerfilAberto(false);
    setPerfilSujo(false);
  };

  const alterarPerfil = (alteracoes) => {
    setPerfilEdicao((perfil) => ({ ...perfil, ...alteracoes }));
    setPerfilSujo(true);
  };

  const salvarPerfil = async (event) => {
    event.preventDefault();
    if (salvandoPerfil) return;

    try {
      setSalvandoPerfil(true);
      const alteracoesPerfil = limparParaFirebase({
        nome: perfilEdicao.nome.trim() || "Autor sem nome",
        usuarioHandle: normalizarHandle(perfilEdicao.usuarioHandle || perfilEdicao.nome),
        nomeBusca: normalizarBusca([perfilEdicao.nome, perfilEdicao.usuarioHandle, perfilEdicao.generos, perfilEdicao.descricao, perfilEdicao.obraAtual].join(" ")),
        usuarioBusca: normalizarBusca(perfilEdicao.usuarioHandle || perfilEdicao.nome),
        pronomes: perfilEdicao.pronomes || "",
        fotoUrl: perfilEdicao.fotoUrl || "",
        capaUrl: perfilEdicao.capaUrl || "",
        descricao: perfilEdicao.descricao || "",
        generos: perfilEdicao.generos || "",
        obraAtual: perfilEdicao.obraAtual || "",
        corPerfil: perfilEdicao.corPerfil || "#8f1d43",
        fundoPerfil: perfilEdicao.fundoPerfil || "lavanda",
        estiloCartao: perfilEdicao.estiloCartao || "delicado",
        fonteTitulo: perfilEdicao.fonteTitulo || "serifada",
        mostrarGeneros: perfilEdicao.mostrarGeneros !== false,
        mostrarObraAtual: perfilEdicao.mostrarObraAtual !== false,
        mostrarAmigos: perfilEdicao.mostrarAmigos !== false,
        perfilPublicoAtivo: true,
        livrosDestaqueIds: perfilEdicao.livrosDestaqueIds || [],
        personagensDestaqueIds: (perfilEdicao.personagensDestaqueIds || []).slice(0, 3),
      });
      if (alteracoesPerfil.fotoUrl === (perfilPublico?.fotoUrl || "")) {
        delete alteracoesPerfil.fotoUrl;
      }
      if (alteracoesPerfil.capaUrl === (perfilPublico?.capaUrl || "")) {
        delete alteracoesPerfil.capaUrl;
      }
      const perfilSalvo = await sincronizarPerfilPublico(alteracoesPerfil, { silencioso: true });

      if (perfilSalvo) {
        setPerfilEdicao((perfil) => ({ ...perfil, ...perfilSalvo }));
      }
      await carregarComunidade();
      setModalPerfilAberto(false);
      setPerfilSujo(false);
      mostrarToast("Perfil salvo.");
    } catch (error) {
      mostrarToast(mensagemErroFirebase(error, "Não foi possível salvar o perfil agora."));
    } finally {
      setSalvandoPerfil(false);
    }
  };

  const selecionarFotoPerfil = async (event) => {
    const arquivo = event.target.files?.[0];
    if (!arquivo) return;
    try {
      const fotoUrl = await processarImagem(
        arquivo,
        { tamanhoMaximo: 620, bytesMaximos: 95 * 1024, qualidade: 0.78, formato: "image/jpeg" },
        "Foto do perfil",
      );
      alterarPerfil({ fotoUrl });
    } catch (error) {
      mostrarToast(error.message || "Não foi possível carregar a foto.");
    } finally {
      event.target.value = "";
    }
  };

  const selecionarCapaPerfil = async (event) => {
    const arquivo = event.target.files?.[0];
    if (!arquivo) return;
    try {
      const capaUrl = await processarImagem(
        arquivo,
        { tamanhoMaximo: 1100, bytesMaximos: 130 * 1024, qualidade: 0.76, formato: "image/jpeg" },
        "Capa do perfil",
      );
      alterarPerfil({ capaUrl });
    } catch (error) {
      mostrarToast(error.message || "Não foi possível carregar a capa.");
    } finally {
      event.target.value = "";
    }
  };

  const enviarPedidoAmizade = async (perfil) => {
    if (!perfil?.id || statusAmizade(perfil.id) !== "nenhum") return;
    try {
      await addDoc(collection(db, "convites"), limparParaFirebase({
        deUserId: usuarioId,
        deNome: perfilEdicao.nome || usuario?.displayName || "Autor",
        deFoto: perfilEdicao.fotoUrl || usuario?.photoURL || "",
        paraUserId: perfil.id,
        paraNome: perfil.nome,
        tipo: "amizade",
        papel: "Amizade",
        mensagem: "Pedido de amizade",
        status: "pendente",
        criadoEm: serverTimestamp(),
      }));
      await carregarComunidade();
      mostrarToast("Solicitação enviada.");
    } catch (error) {
      mostrarToast(mensagemErroFirebase(error, "Não foi possível enviar a solicitação."));
    }
  };

  const responderPedido = async (pedido, status) => {
    try {
      await setDoc(doc(db, "convites", pedido.id), limparParaFirebase({ status, respondidoEm: serverTimestamp() }), { merge: true });
      await carregarComunidade();
      mostrarToast(status === "aceito" ? "Agora vocês são amigos." : "Pedido recusado.");
      if (status === "aceito") {
        setAbaAtiva("amigos");
        setAmigoSelecionadoId(pedido.deUserId === usuarioId ? pedido.paraUserId : pedido.deUserId);
      }
    } catch (error) {
      mostrarToast(mensagemErroFirebase(error, "Não foi possível atualizar este pedido."));
    }
  };

  const cancelarPedido = async (pedido) => {
    if (!pedido?.id) return;
    try {
      await deleteDoc(doc(db, "convites", pedido.id));
      await carregarComunidade();
      mostrarToast("Pedido cancelado.");
    } catch (error) {
      mostrarToast(mensagemErroFirebase(error, "Não foi possível cancelar este pedido."));
    }
  };

  const abrirMensagem = (perfilId) => {
    setAbaAtiva("amigos");
    setAmigoSelecionadoId(perfilId);
    setAbaAmizade("conversa");
  };

  const enviarMensagem = async (event) => {
    event.preventDefault();
    if (enviandoMensagem) return;
    if (!amizadeSelecionadaId) {
      mostrarToast("Escolha um amigo para conversar.");
      return;
    }
    if (!textoMensagem.trim() && !imagemMensagem) return;
    const texto = textoMensagem.trim();
    const imagemUrl = imagemMensagem;
    const momentoLocal = Date.now();
    try {
      setEnviandoMensagem(true);
      await garantirConversaSelecionada();
      await addDoc(collection(db, "conversasComunidade", amizadeSelecionadaId, "mensagens"), limparParaFirebase({
        autorId: usuarioId,
        autorNome: perfilEdicao.nome || "Autor",
        autorFoto: perfilEdicao.fotoUrl || "",
        texto,
        imagemUrl,
        resposta: mensagemRespondida
          ? {
            id: mensagemRespondida.id,
            autorNome: mensagemRespondida.autorNome || (mensagemRespondida.autorId === usuarioId ? perfilEdicao.nome || "Você" : amigoSelecionado?.nome || "Autor"),
            texto: resumirTexto(mensagemRespondida.texto || (mensagemRespondida.imagemUrl ? "Imagem compartilhada" : ""), 90),
          }
          : null,
        criadoEm: serverTimestamp(),
        criadoEmLocal: momentoLocal,
        estado: "enviada",
      }));
      await setDoc(doc(db, "conversasComunidade", amizadeSelecionadaId), limparParaFirebase({
        ultimaMensagem: texto || "Imagem enviada",
        ultimaMensagemAutorId: usuarioId,
        ultimaMensagemEm: serverTimestamp(),
        ultimaAtividade: texto || "Imagem enviada",
        ultimaAtividadeAutorId: usuarioId,
        ultimaAtividadeTipo: "mensagem",
        ultimaAtividadeEm: serverTimestamp(),
        ultimaAtividadeEmLocal: momentoLocal,
        atualizadoEm: serverTimestamp(),
      }), { merge: true });
      setTextoMensagem("");
      setImagemMensagem("");
      setMensagemRespondida(null);
      mostrarToast("Mensagem enviada.");
    } catch (error) {
      mostrarToast(mensagemErroFirebase(error, "Não foi possível enviar a mensagem agora."));
    } finally {
      setEnviandoMensagem(false);
    }
  };

  const selecionarImagemMensagem = async (event) => {
    const arquivo = event.target.files?.[0];
    if (!arquivo) return;
    await processarArquivoMensagem(arquivo);
    event.target.value = "";
  };

  const processarArquivoMensagem = async (arquivo) => {
    if (!arquivo) return;
    if (!String(arquivo.type || "").startsWith("image/")) {
      mostrarToast("Selecione uma imagem para compartilhar.");
      return;
    }

    try {
      const imagemUrl = await processarImagem(
        arquivo,
        { tamanhoMaximo: 900, bytesMaximos: 110 * 1024, qualidade: 0.76, formato: "image/jpeg" },
        "Imagem da mensagem",
      );
      setImagemMensagem(imagemUrl);
    } catch (error) {
      mostrarToast(error.message || "Não foi possível carregar a imagem.");
    }
  };

  const abrirNovoConteudo = (tipo = "Personagem") => {
    setConteudoDraft({ ...conteudoInicial, tipo: tiposConteudo.includes(tipo) ? tipo : "Personagem" });
    setConteudoModalAberto(true);
  };

  const fecharModalConteudo = () => {
    setConteudoModalAberto(false);
    setConteudoDraft(conteudoInicial);
  };

  const selecionarImagemConteudo = async (event) => {
    const arquivo = event.target.files?.[0];
    if (!arquivo) return;
    try {
      const imagemUrl = await processarImagem(
        arquivo,
        { tamanhoMaximo: 980, bytesMaximos: 120 * 1024, qualidade: 0.76, formato: "image/jpeg" },
        "Imagem do conteúdo",
      );
      setConteudoDraft((draft) => ({ ...draft, imagemUrl }));
    } catch (error) {
      mostrarToast(error.message || "Não foi possível carregar a imagem.");
    } finally {
      event.target.value = "";
    }
  };

  const publicarConteudo = async (event) => {
    event.preventDefault();
    if (publicandoConteudo) return;
    if (!amizadeSelecionadaId) {
      mostrarToast("Escolha um amigo antes de publicar.");
      return;
    }
    if (!conteudoDraft.titulo.trim()) return;
    const momentoLocal = Date.now();
    try {
      setPublicandoConteudo(true);
      await garantirConversaSelecionada();
      await addDoc(collection(db, "conversasComunidade", amizadeSelecionadaId, "conteudos"), limparParaFirebase({
        ...conteudoDraft,
        titulo: conteudoDraft.titulo.trim(),
        autorId: usuarioId,
        autorNome: perfilEdicao.nome || "Autor",
        autorFoto: perfilEdicao.fotoUrl || "",
        comentarios: [],
        criadoEm: serverTimestamp(),
        criadoEmLocal: momentoLocal,
        atualizadoEm: serverTimestamp(),
      }));
      await setDoc(doc(db, "conversasComunidade", amizadeSelecionadaId), limparParaFirebase({
        ultimoConteudo: conteudoDraft.titulo.trim(),
        ultimoConteudoTipo: conteudoDraft.tipo,
        ultimoConteudoAutorId: usuarioId,
        ultimoConteudoEm: serverTimestamp(),
        ultimaAtividade: "Compartilhou " + conteudoDraft.titulo.trim(),
        ultimaAtividadeAutorId: usuarioId,
        ultimaAtividadeTipo: "conteudo",
        ultimaAtividadeEm: serverTimestamp(),
        ultimaAtividadeEmLocal: momentoLocal,
        atualizadoEm: serverTimestamp(),
      }), { merge: true });
      setConteudoDraft(conteudoInicial);
      setConteudoModalAberto(false);
      mostrarToast("Conteúdo publicado.");
    } catch (error) {
      mostrarToast(mensagemErroFirebase(error, "Não foi possível publicar este conteúdo agora."));
    } finally {
      setPublicandoConteudo(false);
    }
  };

  const comentarConteudo = async (conteudo) => {
    const texto = comentarioTexto[conteudo.id]?.trim();
    if (!texto) return;
    try {
      await garantirConversaSelecionada();
      const comentarios = [
        ...(conteudo.comentarios || []),
        {
          id: "comentario-" + Date.now(),
          autorId: usuarioId,
          autorNome: perfilEdicao.nome || "Autor",
          autorFoto: perfilEdicao.fotoUrl || "",
          texto,
          criadoEm: new Date().toISOString(),
        },
      ];
      await setDoc(doc(db, "conversasComunidade", amizadeSelecionadaId, "conteudos", conteudo.id), limparParaFirebase({
        comentarios,
        atualizadoEm: serverTimestamp(),
      }), { merge: true });
      setComentarioTexto((mapa) => ({ ...mapa, [conteudo.id]: "" }));
    } catch (error) {
      mostrarToast(mensagemErroFirebase(error, "Não foi possível comentar agora."));
    }
  };

  const excluirConteudo = async (conteudo) => {
    try {
      await garantirConversaSelecionada();
      await deleteDoc(doc(db, "conversasComunidade", amizadeSelecionadaId, "conteudos", conteudo.id));
      setConteudoAberto(null);
      mostrarToast("Conteúdo excluído.");
    } catch (error) {
      mostrarToast(mensagemErroFirebase(error, "Não foi possível excluir este conteúdo."));
    }
  };

  const copiarMensagem = async (mensagem) => {
    const texto = mensagem.texto || mensagem.imagemUrl || "";
    if (!texto) return;

    try {
      await navigator.clipboard?.writeText(texto);
      mostrarToast("Mensagem copiada.");
    } catch {
      mostrarToast("Não foi possível copiar a mensagem.");
    }
  };

  const reagirMensagem = () => {
    mostrarToast("Reação registrada.");
  };

  const excluirMensagem = async (mensagem) => {
    if (!amizadeSelecionadaId || mensagem.autorId !== usuarioId) return;

    try {
      await deleteDoc(doc(db, "conversasComunidade", amizadeSelecionadaId, "mensagens", mensagem.id));
      mostrarToast("Mensagem excluída.");
    } catch (error) {
      mostrarToast(error.code === "permission-denied" ? "Você só pode excluir suas mensagens." : "Não foi possível excluir a mensagem.");
    }
  };

  const conteudosFiltrados = useMemo(
    () =>
      filtroConteudo === "Todos"
        ? conteudosPrivados
        : conteudosPrivados.filter((conteudo) => tipoConteudoCombinaFiltro(conteudo.tipo, filtroConteudo)),
    [conteudosPrivados, filtroConteudo],
  );

  const conversasNaoLidas = useMemo(
    () =>
      conversasResumo.filter((conversa) => {
        const ultimaAtividade = dataOrdenacaoConversa(conversa);
        const leituraUsuario = dataParaMillis(conversa?.leituraPorUsuario?.[usuarioId]);
        return Boolean(conversa?.ultimaAtividadeAutorId && conversa.ultimaAtividadeAutorId !== usuarioId && ultimaAtividade > leituraUsuario);
      }).length,
    [conversasResumo, usuarioId],
  );
  const pedidosNovos = pedidosRecebidos.length;
  const avisosComunidade = pedidosNovos + conversasNaoLidas;
  const conversaAberta = abaAtiva === "amigos" && Boolean(amigoSelecionado);

  if (!comunidadeAberta) {
    return (
      <CommunityEntry
        perfil={perfilEdicao}
        pedidosNovos={avisosComunidade}
        onEnter={() => setComunidadeAberta(true)}
      />
    );
  }

  return (
    <div
      className={"community-simple " + (conversaAberta ? "community-conversation-mode" : "")}
      style={{
        "--community-profile": perfilEdicao.corPerfil || "#8f1d43",
      }}
    >
      <ImageProcessingOverlay estado={processandoImagem} />
      {toast && <div className="simple-toast" role="status">{toast}</div>}

      {!conversaAberta && (
        <header className="simple-community-top in-community">
          <button type="button" className="community-exit-button" onClick={() => setComunidadeAberta(false)}>
            Voltar
          </button>
          <div>
            <span>Comunidade</span>
            <strong>Um cantinho entre escritores</strong>
          </div>
          <nav aria-label="Navegação da comunidade">
            {abasPrincipais.map((aba) => (
              <button
                key={aba.id}
                type="button"
                className={abaAtiva === aba.id ? "active" : ""}
                onClick={() => {
                  setAbaAtiva(aba.id);
                  setAmigoSelecionadoId("");
                }}
              >
                {aba.label}
                {aba.id === "amigos" && avisosComunidade > 0 && <small>{avisosComunidade}</small>}
              </button>
            ))}
          </nav>
        </header>
      )}

      <main className="simple-community-main">
        {abaAtiva === "perfil" && (
          <ProfileHome
            perfil={perfilEdicao}
            amigos={amigos}
            conteudosCount={conteudosPrivados.length}
            destaque={destaquePerfil}
            onEdit={abrirModalPerfil}
          />
        )}

        {abaAtiva === "pesquisar" && (
          <SearchPeople
            busca={busca}
            setBusca={setBusca}
            perfis={perfisPesquisaveis}
            statusAmizade={statusAmizade}
            pedidoRecebidoDe={pedidoRecebidoDe}
            onOpenProfile={setPerfilVisitado}
            onRequestFriend={enviarPedidoAmizade}
            onAccept={responderPedido}
            onMessage={abrirMensagem}
          />
        )}

        {abaAtiva === "amigos" && (
          <FriendsHome
            amigos={amigos}
            pedidosRecebidos={pedidosRecebidos}
            pedidosEnviados={pedidosEnviados}
            perfisPublicos={perfisPublicos}
            amigoSelecionado={amigoSelecionado}
            conversasResumo={conversasResumo}
            mensagens={mensagens}
            mensagensFimRef={mensagensFimRef}
            textoMensagem={textoMensagem}
            setTextoMensagem={setTextoMensagem}
            imagemMensagem={imagemMensagem}
            setImagemMensagem={setImagemMensagem}
            mensagemRespondida={mensagemRespondida}
            setMensagemRespondida={setMensagemRespondida}
            enviandoMensagem={enviandoMensagem}
            abaAmizade={abaAmizade}
            setAbaAmizade={setAbaAmizade}
            conteudos={conteudosFiltrados}
            conteudosTodos={conteudosPrivados}
            filtroConteudo={filtroConteudo}
            setFiltroConteudo={setFiltroConteudo}
            usuarioId={usuarioId}
            onSelectFriend={setAmigoSelecionadoId}
            onBack={() => setAmigoSelecionadoId("")}
            onOpenProfile={setPerfilVisitado}
            onAccept={responderPedido}
            onDecline={responderPedido}
            onCancel={cancelarPedido}
            onSendMessage={enviarMensagem}
            onSelectMessageImage={selecionarImagemMensagem}
            onDropMessageImage={processarArquivoMensagem}
            onNewContent={abrirNovoConteudo}
            onOpenContent={setConteudoAberto}
            onReplyMessage={setMensagemRespondida}
            onCopyMessage={copiarMensagem}
            onReactMessage={reagirMensagem}
            onDeleteMessage={excluirMensagem}
            comentarioTexto={comentarioTexto}
            setComentarioTexto={setComentarioTexto}
            onComment={comentarConteudo}
          />
        )}
      </main>

      {!conversaAberta && <nav className="simple-mobile-tabs" aria-label="Navegação móvel da comunidade">
        {abasPrincipais.map((aba) => (
          <button
            key={aba.id}
            type="button"
            className={abaAtiva === aba.id ? "active" : ""}
            onClick={() => {
              setAbaAtiva(aba.id);
              setAmigoSelecionadoId("");
            }}
          >
            {aba.label.replace("Meu ", "")}
            {aba.id === "amigos" && avisosComunidade > 0 && <small>{avisosComunidade}</small>}
          </button>
        ))}
      </nav>}

      {modalPerfilAberto && (
        <EditProfileModal
          perfil={perfilEdicao}
          livros={livros}
          personagens={personagensDisponiveis}
          destaque={destaquePerfil}
          salvando={salvandoPerfil}
          onChange={alterarPerfil}
          onSave={salvarPerfil}
          onClose={fecharModalPerfil}
          onPhoto={selecionarFotoPerfil}
          onCover={selecionarCapaPerfil}
        />
      )}

      {perfilVisitado && (
        <ProfilePreviewModal
          perfil={perfilVisitado}
          status={statusAmizade(perfilVisitado.id)}
          pedido={pedidoRecebidoDe(perfilVisitado.id)}
          amigosCount={amizadeAceitaPorId.has(perfilVisitado.id) ? amigos.length : null}
          onClose={() => setPerfilVisitado(null)}
          onRequestFriend={() => enviarPedidoAmizade(perfilVisitado)}
          onAccept={(pedido) => responderPedido(pedido, "aceito")}
          onMessage={() => abrirMensagem(perfilVisitado.id)}
        />
      )}

      {conteudoModalAberto && (
        <NewContentModal
          draft={conteudoDraft}
          setDraft={setConteudoDraft}
          livros={livros}
          onImage={selecionarImagemConteudo}
          onClose={fecharModalConteudo}
          onPublish={publicarConteudo}
          publicando={publicandoConteudo}
        />
      )}

      {conteudoAberto && (
        <ContentViewModal
          conteudo={conteudoAberto}
          usuarioId={usuarioId}
          onClose={() => setConteudoAberto(null)}
          onDelete={() => excluirConteudo(conteudoAberto)}
        />
      )}
    </div>
  );
}

function CommunityEntry({ perfil, pedidosNovos, onEnter }) {
  return (
    <section className="community-entry-shell" style={{ "--community-profile": perfil.corPerfil || "#8f1d43" }}>
      <article className="community-entry-card">
        <div className="entry-profile-orbit">
          <Avatar nome={perfil.nome} fotoUrl={perfil.fotoUrl} large />
        </div>
        <div>
          <span>Comunidade</span>
          <h1>Seu cantinho criativo com outros escritores</h1>
          <p>
            Personalize seu perfil, encontre pessoas pelo nome ou gênero e abra conversas privadas para compartilhar personagens,
            capítulos e ideias.
          </p>
          <div className="entry-step-row">
            <small>Perfil bonito</small>
            <small>Amizades</small>
            <small>Conversas privadas</small>
          </div>
          <button type="button" onClick={onEnter}>
            Entrar
            {pedidosNovos > 0 && <strong>{pedidosNovos}</strong>}
          </button>
        </div>
      </article>
    </section>
  );
}

function ProfileHome({ perfil, amigos, conteudosCount, destaque, onEdit }) {
  return (
    <section className="simple-profile-screen">
      <ProfileCard perfil={perfil} amigosCount={amigos.length} conteudosCount={conteudosCount} destaque={destaque} owner onEdit={onEdit} />
      <aside className="profile-guide-card">
        <span>Primeiros passos</span>
        <h2>Seu perfil é a porta de entrada</h2>
        <p>Deixe uma foto, uma bio curta e uma obra em destaque. Depois vá em Pesquisar para encontrar outros escritores.</p>
        <button type="button" onClick={onEdit}>Editar perfil</button>
      </aside>
    </section>
  );
}

function SearchPeople({ busca, setBusca, perfis, statusAmizade, pedidoRecebidoDe, onOpenProfile, onRequestFriend, onAccept, onMessage }) {
  return (
    <section className="simple-search-screen">
      <header className="simple-section-head">
        <div>
          <span>Pesquisar</span>
          <h1>Encontre pessoas pelo nome, usuário, obra ou gênero</h1>
        </div>
        <input value={busca} onChange={(event) => setBusca(event.target.value)} placeholder="Pesquise por nome, usuário, obra ou gênero" />
      </header>

      {!busca.trim() && (
        <p className="simple-hint">Sugestões leves aparecem aqui: perfis novos, autores online e gêneros próximos aos seus.</p>
      )}

      <div className="people-result-grid">
        {perfis.map((perfil) => {
          const status = statusAmizade(perfil.id);
          const pedido = pedidoRecebidoDe(perfil.id);
          return (
            <article
              key={perfil.id}
              className={"person-card status-" + status}
              style={{ "--person-color": perfil.corPerfil || "#8f1d43" }}
            >
              <div
                className="person-card-cover"
                style={perfil.capaUrl ? { backgroundImage: "linear-gradient(180deg, rgba(36, 19, 27, 0.12), rgba(36, 19, 27, 0.42)), url(" + perfil.capaUrl + ")" } : undefined}
              />
              <button type="button" className="person-card-main" onClick={() => onOpenProfile(perfil)}>
                <Avatar nome={perfil.nome} fotoUrl={perfil.fotoUrl} large />
                <div>
                  <strong>{perfil.nome}</strong>
                  <small>@{perfil.usuarioHandle || criarHandle(perfil.nome)}</small>
                  <p>{resumirTexto(perfil.descricao || "Perfil em construção.", 92)}</p>
                  <div className="person-card-tags">
                    {perfil.generos && <span>{perfil.generos}</span>}
                    {perfil.obraAtual && <span>{perfil.obraAtual}</span>}
                  </div>
                </div>
              </button>
              <footer className="person-card-actions">
                <button type="button" className="person-open-profile" onClick={() => onOpenProfile(perfil)}>
                  Ver perfil
                </button>
                {status === "amigo" && <button type="button" className="person-action-primary" onClick={() => onMessage(perfil.id)}>Mensagem</button>}
                {status === "enviado" && <button type="button" className="person-action-muted" disabled>Enviada</button>}
                {status === "recebido" && <button type="button" className="person-action-primary" onClick={() => onAccept(pedido, "aceito")}>Aceitar</button>}
                {status === "nenhum" && <button type="button" className="person-action-primary" onClick={() => onRequestFriend(perfil)}>Adicionar</button>}
              </footer>
            </article>
          );
        })}
      </div>

      {perfis.length === 0 && (
        <EmptyState text="Nenhuma pessoa encontrada. Tente outro nome ou gênero." />
      )}
    </section>
  );
}

function FriendsHome({
  amigos,
  pedidosRecebidos,
  pedidosEnviados,
  perfisPublicos,
  amigoSelecionado,
  conversasResumo,
  mensagens,
  mensagensFimRef,
  textoMensagem,
  setTextoMensagem,
  imagemMensagem,
  setImagemMensagem,
  mensagemRespondida,
  setMensagemRespondida,
  enviandoMensagem,
  abaAmizade,
  setAbaAmizade,
  conteudos,
  conteudosTodos,
  filtroConteudo,
  setFiltroConteudo,
  usuarioId,
  onSelectFriend,
  onBack,
  onOpenProfile,
  onAccept,
  onDecline,
  onCancel,
  onSendMessage,
  onSelectMessageImage,
  onDropMessageImage,
  onNewContent,
  onOpenContent,
  onReplyMessage,
  onCopyMessage,
  onReactMessage,
  onDeleteMessage,
  comentarioTexto,
  setComentarioTexto,
  onComment,
}) {
  const [buscaAmigo, setBuscaAmigo] = useState("");
  const amigosFiltrados = amigos.filter((amigo) =>
    textoInclui([amigo.nome, amigo.usuarioHandle, amigo.generos], buscaAmigo.toLowerCase()),
  );
  const resumoPorConversa = useMemo(
    () => new Map((conversasResumo || []).map((conversa) => [String(conversa.id), conversa])),
    [conversasResumo],
  );

  if (amigoSelecionado) {
    return (
      <FriendRoom
        amigo={amigoSelecionado}
        mensagens={mensagens}
        mensagensFimRef={mensagensFimRef}
        textoMensagem={textoMensagem}
        setTextoMensagem={setTextoMensagem}
        imagemMensagem={imagemMensagem}
        setImagemMensagem={setImagemMensagem}
        mensagemRespondida={mensagemRespondida}
        setMensagemRespondida={setMensagemRespondida}
        enviandoMensagem={enviandoMensagem}
        abaAmizade={abaAmizade}
        setAbaAmizade={setAbaAmizade}
        conteudos={conteudos}
        conteudosTodos={conteudosTodos}
        filtroConteudo={filtroConteudo}
        setFiltroConteudo={setFiltroConteudo}
        usuarioId={usuarioId}
        onBack={onBack}
        onOpenProfile={onOpenProfile}
        onSendMessage={onSendMessage}
        onSelectMessageImage={onSelectMessageImage}
        onDropMessageImage={onDropMessageImage}
        onNewContent={onNewContent}
        onOpenContent={onOpenContent}
        onReplyMessage={onReplyMessage}
        onCopyMessage={onCopyMessage}
        onReactMessage={onReactMessage}
        onDeleteMessage={onDeleteMessage}
        comentarioTexto={comentarioTexto}
        setComentarioTexto={setComentarioTexto}
        onComment={onComment}
      />
    );
  }

  return (
    <section className="simple-friends-screen">
      <header className="simple-section-head">
        <div>
          <span>Amigos</span>
          <h1>Conversas e pedidos</h1>
        </div>
        <input value={buscaAmigo} onChange={(event) => setBuscaAmigo(event.target.value)} placeholder="Encontrar amigo" />
      </header>

      <div className="friends-dashboard">
        <section className="friend-list-card">
          <h2>Meus amigos</h2>
          <div className="friend-list">
            {amigosFiltrados.map((amigo) => {
              const conversa = resumoPorConversa.get(criarAmizadeId(usuarioId, amigo.id));
              const ultimaAtividade = dataOrdenacaoConversa(conversa);
              const leituraUsuario = dataParaMillis(conversa?.leituraPorUsuario?.[usuarioId]);
              const naoLida = Boolean(conversa?.ultimaAtividadeAutorId && conversa.ultimaAtividadeAutorId !== usuarioId && ultimaAtividade > leituraUsuario);
              const resumo = conversa?.ultimaAtividade || conversa?.ultimaMensagem || conversa?.ultimoConteudo;

              return (
                <button key={amigo.id} type="button" className={naoLida ? "has-unread" : ""} onClick={() => onSelectFriend(amigo.id)}>
                  <Avatar nome={amigo.nome} fotoUrl={amigo.fotoUrl} />
                  <span>
                    <strong>{amigo.nome}</strong>
                    <small>{naoLida ? "Nova mensagem" : resumo || (amigo.online ? "online" : "Toque para abrir conversa")}</small>
                  </span>
                  {naoLida ? <b className="friend-unread-badge">Nova</b> : amigo.online && <i />}
                </button>
              );
            })}
          </div>
          {amigos.length === 0 && <EmptyState text="Quando uma amizade for aceita, a conversa aparece aqui." />}
        </section>

        <section className="friend-requests-card">
          <h2>Pedidos</h2>
          <div className="request-stack">
            {pedidosRecebidos.map((pedido) => {
              const perfil = perfisPublicos.find((item) => item.id === pedido.deUserId) || pedido;
              return (
                <article key={pedido.id}>
                  <Avatar nome={perfil.nome || pedido.deNome} fotoUrl={perfil.fotoUrl || pedido.deFoto} />
                  <div>
                    <strong>{perfil.nome || pedido.deNome}</strong>
                    <small>Quer ser seu amigo</small>
                  </div>
                  <footer>
                    <button type="button" onClick={() => onAccept(pedido, "aceito")}>Aceitar</button>
                    <button type="button" onClick={() => onDecline(pedido, "recusado")}>Recusar</button>
                  </footer>
                </article>
              );
            })}

            {pedidosEnviados.map((pedido) => {
              const perfil = perfisPublicos.find((item) => item.id === pedido.paraUserId) || pedido;
              return (
                <article key={pedido.id}>
                  <Avatar nome={perfil.nome || pedido.paraNome} fotoUrl={perfil.fotoUrl} />
                  <div>
                    <strong>{perfil.nome || pedido.paraNome}</strong>
                    <small>Pendente</small>
                  </div>
                  <footer>
                    <button type="button" onClick={() => onCancel(pedido)}>Cancelar pedido</button>
                  </footer>
                </article>
              );
            })}
          </div>
          {pedidosRecebidos.length + pedidosEnviados.length === 0 && <p className="muted-copy">Sem pedidos pendentes.</p>}
        </section>
      </div>
    </section>
  );
}

function FriendRoom({
  amigo,
  mensagens,
  mensagensFimRef,
  textoMensagem,
  setTextoMensagem,
  imagemMensagem,
  setImagemMensagem,
  mensagemRespondida,
  setMensagemRespondida,
  enviandoMensagem,
  abaAmizade,
  setAbaAmizade,
  conteudos,
  conteudosTodos,
  filtroConteudo,
  setFiltroConteudo,
  usuarioId,
  onBack,
  onOpenProfile,
  onSendMessage,
  onSelectMessageImage,
  onDropMessageImage,
  onNewContent,
  onOpenContent,
  onReplyMessage,
  onCopyMessage,
  onReactMessage,
  onDeleteMessage,
  comentarioTexto,
  setComentarioTexto,
  onComment,
}) {
  const [imagemAberta, setImagemAberta] = useState(null);
  const [arrastandoArquivo, setArrastandoArquivo] = useState(false);
  const [menuCriativoAberto, setMenuCriativoAberto] = useState(false);
  const textareaRef = useRef(null);
  const inputImagemRef = useRef(null);
  const statusAmigo = amigo.online ? "Online" : "Visto recentemente";
  const podeEnviar = Boolean(textoMensagem.trim() || imagemMensagem) && !enviandoMensagem;
  const itensChat = useMemo(
    () =>
      [
        ...mensagens.map((mensagem) => ({ ...mensagem, itemChatTipo: "mensagem", dataOrdenacao: dataOrdenacaoChat(mensagem) })),
        ...conteudosTodos.map((conteudo) => ({ ...conteudo, itemChatTipo: "conteudo", dataOrdenacao: dataOrdenacaoChat(conteudo) })),
      ].sort((a, b) => a.dataOrdenacao - b.dataOrdenacao),
    [conteudosTodos, mensagens],
  );

  useEffect(() => {
    const campo = textareaRef.current;
    if (!campo) return;

    campo.style.height = "auto";
    campo.style.height = Math.min(campo.scrollHeight, 148) + "px";
  }, [textoMensagem]);

  useEffect(() => {
    mensagensFimRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [itensChat.length, mensagensFimRef]);

  useEffect(() => {
    if (!imagemAberta) return undefined;

    const fecharComEsc = (event) => {
      if (event.key === "Escape") setImagemAberta(null);
    };

    window.addEventListener("keydown", fecharComEsc);
    return () => window.removeEventListener("keydown", fecharComEsc);
  }, [imagemAberta]);

  const processarImagemSolta = async (arquivo) => {
    setArrastandoArquivo(false);
    await onDropMessageImage?.(arquivo);
  };

  const colarImagem = async (event) => {
    const arquivo = Array.from(event.clipboardData?.files || []).find((item) => String(item.type || "").startsWith("image/"));
    if (!arquivo) return;

    await processarImagemSolta(arquivo);
  };

  const soltarArquivo = async (event) => {
    event.preventDefault();
    const arquivo = Array.from(event.dataTransfer?.files || []).find((item) => String(item.type || "").startsWith("image/"));
    if (arquivo) await processarImagemSolta(arquivo);
    else setArrastandoArquivo(false);
  };

  const abrirConteudoCriativo = (tipo) => {
    setMenuCriativoAberto(false);
    if (tipo === "Imagem") {
      inputImagemRef.current?.click();
      return;
    }

    onNewContent(tipo);
  };

  return (
    <section className="friend-room creative-chat-room">
      <header className="friend-room-head creative-chat-head">
        <button type="button" className="chat-back-button" onClick={onBack}>Voltar</button>
        <button type="button" className="chat-friend-profile" onClick={() => onOpenProfile(amigo)}>
          <Avatar nome={amigo.nome} fotoUrl={amigo.fotoUrl} large />
          <span className="chat-friend-identity">
            <strong>{amigo.nome}<span>{statusAmigo}</span></strong>
            <small>@{amigo.usuarioHandle || criarHandle(amigo.nome)}</small>
          </span>
        </button>
        <nav className="friend-room-tabs" aria-label="Área da conversa">
          <button type="button" className={abaAmizade === "conversa" ? "active" : ""} onClick={() => setAbaAmizade("conversa")}>Conversa</button>
          <button type="button" className={abaAmizade === "conteudos" ? "active" : ""} onClick={() => setAbaAmizade("conteudos")}>Conteúdos</button>
        </nav>
      </header>

      {abaAmizade === "conversa" ? (
        <div
          className={"chat-panel creative-chat-panel " + (arrastandoArquivo ? "is-dragging" : "")}
          onDragEnter={(event) => {
            event.preventDefault();
            setArrastandoArquivo(true);
          }}
          onDragOver={(event) => event.preventDefault()}
          onDragLeave={(event) => {
            const proximoAlvo = event.relatedTarget;
            if (proximoAlvo?.nodeType && event.currentTarget.contains(proximoAlvo)) return;
            setArrastandoArquivo(false);
          }}
          onDrop={soltarArquivo}
        >
          {arrastandoArquivo && <div className="chat-drop-hint">Solte aqui para compartilhar</div>}

          <div className="message-list creative-message-list">
            {itensChat.length === 0 && (
              <div className="chat-empty-state">
                <span aria-hidden="true" />
                <strong>Comece uma nova história juntos</strong>
                <p>Envie uma mensagem, uma imagem ou compartilhe algo do seu universo</p>
              </div>
            )}
            {itensChat.map((item, index) => {
              if (item.itemChatTipo === "conteudo") {
                const meuConteudo = item.autorId === usuarioId;
                return (
                  <article key={"conteudo-" + item.id} className={"chat-shared-card " + (meuConteudo ? "sent " : "received ") + classeTipoConteudo(item.tipo)}>
                    {item.imagemUrl && <img src={item.imagemUrl} alt="" />}
                    <div>
                      <span>{meuConteudo ? "Você enviou" : "Recebido"} · {rotuloTipoConteudo(item.tipo)}</span>
                      <strong>{item.titulo}</strong>
                      <p>{resumirTexto(item.descricao || item.textoLongo || "Conteúdo criativo compartilhado nesta conversa.", 120)}</p>
                      <footer>
                        <small>{formatarHora(item.criadoEm || item.criadoEmLocal)} · {item.autorId === usuarioId ? "por você" : "por " + item.autorNome}</small>
                        <button type="button" onClick={() => onOpenContent(item)}>{item.tipo === "Capítulo" ? "Ler" : "Ver"}</button>
                      </footer>
                    </div>
                  </article>
                );
              }

              const minha = item.autorId === usuarioId;
              const anterior = itensChat[index - 1];
              const proximo = itensChat[index + 1];
              const agrupada = anterior?.itemChatTipo === "mensagem" && anterior.autorId === item.autorId;
              const ultimaDoGrupo = proximo?.itemChatTipo !== "mensagem" || proximo.autorId !== item.autorId;

              return (
                <article
                  key={"mensagem-" + item.id}
                  className={"chat-message-row " + (minha ? "mine" : "friend") + (agrupada ? " is-grouped" : "") + (ultimaDoGrupo ? " is-last" : "")}
                >
                  {!minha && <span className="message-avatar-slot">{ultimaDoGrupo && <Avatar nome={item.autorNome} fotoUrl={item.autorFoto} />}</span>}
                  <div className="message-bubble">
                    {item.resposta?.texto && (
                      <button type="button" className="message-reply-quote" onClick={() => onReplyMessage(item)}>
                        <span>{item.resposta.autorNome}</span>
                        <small>{item.resposta.texto}</small>
                      </button>
                    )}
                    {item.imagemUrl && (
                      <button type="button" className="message-image-button" onClick={() => setImagemAberta(item.imagemUrl)}>
                        <img src={item.imagemUrl} alt="Imagem enviada na conversa" />
                      </button>
                    )}
                    {item.texto && <p>{item.texto}</p>}
                    <small className="message-meta">{formatarHora(item.criadoEm || item.criadoEmLocal)} · {minha ? "Enviada" : "Recebida"}</small>
                    <div className="message-actions">
                      <button type="button" onClick={() => onReplyMessage(item)}>Responder</button>
                    </div>
                  </div>
                </article>
              );
            })}
            <span ref={mensagensFimRef} />
          </div>

          <form className="message-composer creative-message-composer" onSubmit={onSendMessage}>
            {imagemMensagem && (
              <div className="message-image-preview">
                <img src={imagemMensagem} alt="Prévia do anexo" />
                <button type="button" onClick={() => setImagemMensagem("")}>Remover imagem</button>
              </div>
            )}
            {mensagemRespondida && (
              <div className="reply-preview">
                <span>Respondendo {mensagemRespondida.autorId === usuarioId ? "você" : mensagemRespondida.autorNome}</span>
                <p>{resumirTexto(mensagemRespondida.texto || (mensagemRespondida.imagemUrl ? "Imagem compartilhada" : ""), 120)}</p>
                <button type="button" onClick={() => setMensagemRespondida(null)} aria-label="Cancelar resposta">X</button>
              </div>
            )}
            <div className="message-composer-row">
              <input ref={inputImagemRef} type="file" accept="image/*" onChange={onSelectMessageImage} />
              <div className="creative-share-wrap">
                <button type="button" className="message-icon-button creative" onClick={() => setMenuCriativoAberto((aberto) => !aberto)} aria-expanded={menuCriativoAberto} aria-label="Adicionar algo">
                  +
                </button>
                {menuCriativoAberto && (
                  <div className="creative-share-menu">
                    {["Imagem", "Personagem", "Capítulo", "Local", "Item do mundo"].map((tipo) => (
                      <button key={tipo} type="button" onClick={() => abrirConteudoCriativo(tipo)}>{tipo}</button>
                    ))}
                  </div>
                )}
              </div>
              <textarea
                style={{ overflow: "hidden" }}
                ref={textareaRef}
                value={textoMensagem}
                onChange={(event) => setTextoMensagem(event.target.value)}
                onPaste={colarImagem}
                onKeyDown={(event) => {
                  if (event.key === "Enter" && !event.shiftKey) {
                    event.preventDefault();
                    event.currentTarget.form?.requestSubmit();
                  }
                }}
                rows={1}
                placeholder="Escreva uma mensagem..."
              />
              <button type="submit" className="message-send-button" disabled={!podeEnviar} aria-label="Enviar mensagem">
                {enviandoMensagem ? "..." : ">"}
              </button>
            </div>
          </form>

          {imagemAberta && (
            <div className="chat-image-lightbox" role="dialog" aria-modal="true" onMouseDown={(event) => event.target === event.currentTarget && setImagemAberta(null)}>
              <button type="button" onClick={() => setImagemAberta(null)} aria-label="Fechar imagem">X</button>
              <img src={imagemAberta} alt="Imagem ampliada da conversa" />
            </div>
          )}
        </div>
      ) : (
        <PrivateContentWall
          conteudos={conteudos}
          conteudosTodos={conteudosTodos}
          filtroConteudo={filtroConteudo}
          setFiltroConteudo={setFiltroConteudo}
          usuarioId={usuarioId}
          onNewContent={onNewContent}
          onOpenContent={onOpenContent}
          comentarioTexto={comentarioTexto}
          setComentarioTexto={setComentarioTexto}
          onComment={onComment}
        />
      )}
    </section>
  );
}

function PrivateContentWall({ conteudos, conteudosTodos, filtroConteudo, setFiltroConteudo, usuarioId, onNewContent, onOpenContent, comentarioTexto, setComentarioTexto, onComment }) {
  return (
    <section className="private-wall creative-content-wall">
      <header>
        <div>
          <span>Arquivo criativo</span>
          <h2>Tudo que vocês compartilharam</h2>
        </div>
        <button type="button" onClick={() => onNewContent("Personagem")}>Novo conteúdo</button>
      </header>

      <div className="content-filter-mini">
        {filtrosConteudoPrivado.map((filtro) => (
          <button key={filtro.id} type="button" className={filtroConteudo === filtro.id ? "active" : ""} onClick={() => setFiltroConteudo(filtro.id)}>
            {filtro.label}
          </button>
        ))}
      </div>

      <div className="private-content-grid">
        {conteudos.map((conteudo) => (
          <article key={conteudo.id} className={"private-content-card " + (conteudo.autorId === usuarioId ? "sent " : "received ") + classeTipoConteudo(conteudo.tipo)}>
            <button type="button" onClick={() => onOpenContent(conteudo)}>
              {conteudo.imagemUrl ? <img src={conteudo.imagemUrl} alt="" /> : <i>{rotuloTipoConteudo(conteudo.tipo).slice(0, 1)}</i>}
              <span>{rotuloTipoConteudo(conteudo.tipo)}</span>
              <strong>{conteudo.titulo}</strong>
              <p>{resumirTexto(conteudo.descricao || conteudo.textoLongo || "Conteúdo criativo salvo nesta conversa.", 96)}</p>
              <small>{conteudo.autorId === usuarioId ? "Publicado por você" : "Publicado por " + conteudo.autorNome} · {formatarDataCurta(conteudo.criadoEm || conteudo.criadoEmLocal)}</small>
            </button>
          </article>
        ))}
      </div>

      {conteudos.length === 0 && conteudosTodos.length > 0 && (
        <EmptyState text="Nada desse tipo foi compartilhado ainda." />
      )}

      {conteudosTodos.length === 0 && (
        <EmptyState
          text="Este arquivo ainda está vazio. Compartilhe um personagem, capítulo, lugar ou imagem com seu amigo."
          actionLabel="Criar primeiro conteúdo"
          onAction={() => onNewContent("Personagem")}
        />
      )}
    </section>
  );
}

function EditProfileModal({ perfil, livros, personagens, destaque, salvando, onChange, onSave, onClose, onPhoto, onCover }) {
  const personagensSelecionados = (perfil.personagensDestaqueIds || []).map(String).slice(0, 3);
  const alternarPersonagem = (personagemId) => {
    const id = String(personagemId);
    const jaSelecionado = personagensSelecionados.includes(id);
    const proximos = jaSelecionado
      ? personagensSelecionados.filter((item) => item !== id)
      : [...personagensSelecionados, id].slice(0, 3);

    onChange({ personagensDestaqueIds: proximos });
  };

  return (
    <div className="simple-modal-backdrop" role="dialog" aria-modal="true" aria-label="Editar perfil" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <form className="edit-profile-dialog" onSubmit={onSave}>
        <header>
          <div>
            <span>Editar perfil</span>
            <h2>Personalize como outros escritores verão você</h2>
          </div>
          <button type="button" onClick={onClose} aria-label="Fechar">X</button>
        </header>

        <section className="profile-edit-preview">
          <ProfileCard perfil={perfil} amigosCount={0} conteudosCount={0} destaque={destaque} compact />
        </section>

        <section className="profile-edit-grid">
          <div className="edit-block">
            <h3>Identidade</h3>
            <div className="media-picker-row">
              <label>Foto<input type="file" accept="image/*" onChange={onPhoto} /></label>
              <label>Capa<input type="file" accept="image/*" onChange={onCover} /></label>
            </div>
            <label>Nome<input value={perfil.nome} onChange={(event) => onChange({ nome: event.target.value })} /></label>
            <label>@usuário<input value={perfil.usuarioHandle} onChange={(event) => onChange({ usuarioHandle: event.target.value })} /></label>
            <label>Pronomes opcionais<input value={perfil.pronomes || ""} onChange={(event) => onChange({ pronomes: event.target.value })} /></label>
          </div>

          <div className="edit-block">
            <h3>Apresentação</h3>
            <label>Bio curta<textarea value={perfil.descricao} onChange={(event) => onChange({ descricao: event.target.value })} rows={4} /></label>
            <label>Gêneros favoritos<input value={perfil.generos} onChange={(event) => onChange({ generos: event.target.value })} /></label>
            <label>Obra atual<input value={perfil.obraAtual || ""} onChange={(event) => onChange({ obraAtual: event.target.value })} /></label>
          </div>

          <div className="edit-block">
            <h3>Aparência</h3>
            <ChoiceRow label="Cor principal">
              {paletasPerfil.map((paleta) => (
                <button key={paleta.cor} type="button" className={perfil.corPerfil === paleta.cor ? "active" : ""} onClick={() => onChange({ corPerfil: paleta.cor })}>
                  <i style={{ background: paleta.cor }} /> {paleta.nome}
                </button>
              ))}
            </ChoiceRow>
            <ChoiceRow label="Fundo">
              {fundosPerfil.map((fundo) => (
                <button key={fundo.id} type="button" className={perfil.fundoPerfil === fundo.id ? "active" : ""} onClick={() => onChange({ fundoPerfil: fundo.id })}>{fundo.label}</button>
              ))}
            </ChoiceRow>
            <ChoiceRow label="Cartões">
              {estilosCartao.map((estilo) => (
                <button key={estilo.id} type="button" className={perfil.estiloCartao === estilo.id ? "active" : ""} onClick={() => onChange({ estiloCartao: estilo.id })}>{estilo.label}</button>
              ))}
            </ChoiceRow>
            <ChoiceRow label="Título">
              {fontesTitulo.map((fonte) => (
                <button key={fonte.id} type="button" className={perfil.fonteTitulo === fonte.id ? "active" : ""} onClick={() => onChange({ fonteTitulo: fonte.id })}>{fonte.label}</button>
              ))}
            </ChoiceRow>
          </div>

          <div className="edit-block">
            <h3>Destaque</h3>
            <label>Obra para aparecer primeiro
              <select value={(perfil.livrosDestaqueIds || [])[0] || ""} onChange={(event) => onChange({ livrosDestaqueIds: event.target.value ? [event.target.value] : [] })}>
                <option value="">Nenhuma obra</option>
                {livros.map((livro) => <option key={livro.id} value={livro.id}>{livro.titulo}</option>)}
              </select>
            </label>
            <div className="highlight-character-picker">
              <span>Personagens em destaque (até 3)</span>
              <div>
                {personagens.map((personagem) => {
                  const ativo = personagensSelecionados.includes(String(personagem.id));
                  const travado = !ativo && personagensSelecionados.length >= 3;
                  return (
                    <button
                      key={personagem.id}
                      type="button"
                      className={ativo ? "active" : ""}
                      disabled={travado}
                      onClick={() => alternarPersonagem(personagem.id)}
                    >
                      <Avatar nome={personagem.nome} fotoUrl={personagem.fotoUrl} />
                      <strong>{personagem.nome}</strong>
                      <small>{personagem.livroTitulo}</small>
                    </button>
                  );
                })}
              </div>
            </div>
            <label className="switch-line"><input type="checkbox" checked={perfil.mostrarGeneros !== false} onChange={(event) => onChange({ mostrarGeneros: event.target.checked })} /> Mostrar gêneros</label>
            <label className="switch-line"><input type="checkbox" checked={perfil.mostrarObraAtual !== false} onChange={(event) => onChange({ mostrarObraAtual: event.target.checked })} /> Mostrar obra atual</label>
            <label className="switch-line"><input type="checkbox" checked={perfil.mostrarAmigos !== false} onChange={(event) => onChange({ mostrarAmigos: event.target.checked })} /> Mostrar contagem de amigos</label>
          </div>
        </section>

        <footer>
          <button type="button" onClick={onClose}>Cancelar</button>
          <button type="submit" disabled={salvando}>{salvando ? "Salvando..." : "Salvar alterações"}</button>
        </footer>
      </form>
    </div>
  );
}

function NewContentModal({ draft, setDraft, livros, onImage, onClose, onPublish, publicando }) {
  const [livroFiltroId, setLivroFiltroId] = useState("");
  const fontes = useMemo(() => montarFontesCompartilhamento(livros, draft.tipo), [livros, draft.tipo]);
  const livrosComFontes = useMemo(() => {
    const mapa = new Map();
    fontes.forEach((fonte) => {
      if (!mapa.has(fonte.livroId)) {
        mapa.set(fonte.livroId, { id: fonte.livroId, titulo: fonte.livroTitulo });
      }
    });
    return Array.from(mapa.values());
  }, [fontes]);
  const fontesVisiveis = livroFiltroId ? fontes.filter((fonte) => String(fonte.livroId) === String(livroFiltroId)) : fontes;

  useEffect(() => {
    if (livrosComFontes.length === 0) {
      setLivroFiltroId("");
      return;
    }

    if (!livrosComFontes.some((livro) => String(livro.id) === String(livroFiltroId))) {
      setLivroFiltroId(String(livrosComFontes[0].id));
    }
  }, [livroFiltroId, livrosComFontes]);

  const trocarTipo = (tipo) => {
    setDraft({ ...conteudoInicial, tipo });
  };

  const selecionarFonte = (fonte) => {
    setDraft({
      ...draft,
      tipo: fonte.tipo,
      titulo: fonte.titulo,
      descricao: fonte.descricao,
      imagemUrl: fonte.imagemUrl || "",
      textoLongo: fonte.textoLongo || "",
      origemId: fonte.id,
      origemChave: fonte.chave,
      origemTipo: fonte.tipoOriginal || fonte.tipo,
      origemLivroId: fonte.livroId,
      origemLivroTitulo: fonte.livroTitulo,
      origemSecaoId: fonte.secaoId || "",
      origemSecaoNome: fonte.secaoNome || "",
      palavras: fonte.palavras || 0,
      minutos: fonte.minutos || 0,
      numeroCapitulo: fonte.numeroCapitulo || "",
    });
  };

  const tipoTemFontes = !["Imagem", "Outro"].includes(normalizarTipoConteudo(draft.tipo));

  return (
    <div className="simple-modal-backdrop" role="dialog" aria-modal="true" aria-label="Novo conteúdo" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <form className="new-content-dialog" onSubmit={onPublish}>
        <header>
          <div>
            <span>Novo conteúdo</span>
            <h2>Compartilhe algo da sua obra com este amigo</h2>
          </div>
          <button type="button" onClick={onClose} aria-label="Fechar">X</button>
        </header>
        <label>Tipo
          <select value={draft.tipo} onChange={(event) => trocarTipo(event.target.value)}>
            {tiposConteudo.map((tipo) => <option key={tipo}>{tipo}</option>)}
          </select>
        </label>

        {tipoTemFontes && (
          <section className="share-source-picker">
            <div>
              <span>Escolha de onde compartilhar</span>
              <strong>{fontes.length} item(ns) encontrados</strong>
            </div>
            {livrosComFontes.length > 0 ? (
              <>
                <label>Livro
                  <select value={livroFiltroId} onChange={(event) => setLivroFiltroId(event.target.value)}>
                    {livrosComFontes.map((livro) => <option key={livro.id} value={livro.id}>{livro.titulo}</option>)}
                  </select>
                </label>
                <div className="share-source-list">
                  {fontesVisiveis.map((fonte) => (
                    <button
                      key={fonte.chave}
                      type="button"
                      className={draft.origemChave === fonte.chave ? "active" : ""}
                      onClick={() => selecionarFonte(fonte)}
                    >
                      {fonte.imagemUrl ? <img src={fonte.imagemUrl} alt="" /> : <i>{fonte.titulo.slice(0, 1)}</i>}
                      <span>
                        <strong>{fonte.titulo}</strong>
                        <small>{fonte.subtitulo}</small>
                      </span>
                    </button>
                  ))}
                </div>
              </>
            ) : (
              <p>Nenhum item desse tipo foi criado nos seus livros ainda.</p>
            )}
          </section>
        )}

        <label>Título obrigatório<input value={draft.titulo} onChange={(event) => setDraft({ ...draft, titulo: event.target.value })} required /></label>
        <label>Descrição curta<textarea value={draft.descricao} onChange={(event) => setDraft({ ...draft, descricao: event.target.value })} rows={4} /></label>
        {draft.tipo === "Capítulo" && (
          <label>Texto do capítulo<textarea value={draft.textoLongo} onChange={(event) => setDraft({ ...draft, textoLongo: event.target.value })} rows={9} /></label>
        )}
        <div className="content-image-picker">
          {draft.imagemUrl && <img src={draft.imagemUrl} alt="Prévia do conteúdo" />}
          <div className="content-image-actions">
            <label>Selecionar imagem<input type="file" accept="image/*" onChange={onImage} /></label>
            {draft.imagemUrl && (
              <button type="button" className="content-remove-image" onClick={() => setDraft({ ...draft, imagemUrl: "" })}>
                Remover imagem
              </button>
            )}
          </div>
          <label className="content-image-link">
            Link da imagem
            <input
              value={draft.imagemUrl}
              onChange={(event) => setDraft({ ...draft, imagemUrl: event.target.value })}
              placeholder="https://..."
            />
          </label>
        </div>
        <footer>
          <button type="button" onClick={onClose}>Cancelar</button>
          <button type="submit" disabled={publicando}>{publicando ? "Publicando..." : "Publicar"}</button>
        </footer>
      </form>
    </div>
  );
}

function ContentViewModal({ conteudo, usuarioId, onClose, onDelete }) {
  const tipo = normalizarTipoConteudo(conteudo.tipo);
  const ehCapitulo = tipo === "Capítulo";
  const descricao = conteudo.descricao || (ehCapitulo ? "Capítulo compartilhado nesta conversa." : "Sem descrição.");
  const horarioEnvio = formatarDataHora(conteudo.criadoEm || conteudo.criadoEmLocal);
  const paragrafos = String(conteudo.textoLongo || "")
    .split(/\n{2,}/)
    .map((paragrafo) => paragrafo.trim())
    .filter(Boolean);

  return (
    <div className="simple-modal-backdrop" role="dialog" aria-modal="true" aria-label={conteudo.titulo} onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <article className={"content-view-dialog " + (ehCapitulo ? "chapter-reading-dialog" : "")}>
        <header className="content-view-top">
          <div>
            <span>{tipo} compartilhado</span>
            <h2>{conteudo.titulo}</h2>
            <p>{descricao}</p>
            <small>Enviado por {conteudo.autorNome || "Autor"} · {horarioEnvio}</small>
          </div>
          <button type="button" onClick={onClose} aria-label="Fechar">X</button>
        </header>

        {ehCapitulo ? (
          <section className="shared-chapter-reading">
            {conteudo.imagemUrl && <img src={conteudo.imagemUrl} alt="" />}
            <article>
              {paragrafos.length > 0
                ? paragrafos.map((paragrafo, index) => <p key={index}>{paragrafo}</p>)
                : <p>Este capítulo foi compartilhado sem texto salvo.</p>}
            </article>
          </section>
        ) : (
          <>
            {conteudo.imagemUrl && <img src={conteudo.imagemUrl} alt="" />}
            {conteudo.textoLongo && (
              <div className="long-chapter-text">
                {paragrafos.map((paragrafo, index) => <p key={index}>{paragrafo}</p>)}
              </div>
            )}
          </>
        )}
        {(conteudo.comentarios || []).length > 0 && (
          <section className="content-view-comments">
            <h3>Comentários</h3>
            {(conteudo.comentarios || []).map((comentario) => (
              <p key={comentario.id}><strong>{comentario.autorNome}:</strong> {comentario.texto}</p>
            ))}
          </section>
        )}
        <footer>
          {conteudo.autorId === usuarioId && <button type="button" onClick={onDelete}>Excluir conteúdo</button>}
          <button type="button" onClick={onClose}>Fechar</button>
        </footer>
      </article>
    </div>
  );
}

function ProfilePreviewModal({ perfil, status, pedido, amigosCount, onClose, onRequestFriend, onAccept, onMessage }) {
  return (
    <div className="simple-modal-backdrop" role="dialog" aria-modal="true" aria-label={"Perfil de " + perfil.nome} onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <article className="profile-preview-dialog">
        <button type="button" className="floating-close" onClick={onClose} aria-label="Fechar">X</button>
        <ProfileCard perfil={perfil} amigosCount={amigosCount} conteudosCount={null} />
        <footer>
          {status === "amigo" && <button type="button" onClick={onMessage}>Mensagem</button>}
          {status === "enviado" && <button type="button" disabled>Solicitação enviada</button>}
          {status === "recebido" && <button type="button" onClick={() => onAccept(pedido)}>Aceitar</button>}
          {status === "nenhum" && <button type="button" onClick={onRequestFriend}>Adicionar amigo</button>}
        </footer>
      </article>
    </div>
  );
}

function ProfileCard({ perfil, amigosCount, conteudosCount, destaque, owner = false, compact = false, onEdit }) {
  const personagens = destaque?.personagens || [];
  const obra = destaque?.obra || null;

  return (
    <article className={"profile-identity-card " + (compact ? "compact " : "") + "style-" + (perfil.estiloCartao || "delicado") + " bg-" + (perfil.fundoPerfil || "lavanda") + " title-" + (perfil.fonteTitulo || "serifada")}>
      <div className="profile-cover-simple" style={perfil.capaUrl ? { backgroundImage: "linear-gradient(90deg, rgba(34, 11, 20, 0.42), rgba(34, 11, 20, 0.08)), url(" + perfil.capaUrl + ")" } : undefined} />
      <div className="profile-card-body">
        <Avatar nome={perfil.nome} fotoUrl={perfil.fotoUrl} large />
        <div>
          <h1>{perfil.nome || "Seu nome de autor"}</h1>
          <small>@{perfil.usuarioHandle || criarHandle(perfil.nome || "autor")} {perfil.pronomes ? "· " + perfil.pronomes : ""}</small>
          <p>{perfil.descricao || "Escreva uma frase curta para apresentar suas histórias."}</p>
          <div className="profile-soft-tags">
            {perfil.mostrarGeneros !== false && perfil.generos && <span>{perfil.generos}</span>}
            {perfil.mostrarObraAtual !== false && perfil.obraAtual && <span>{perfil.obraAtual}</span>}
          </div>
        </div>
        {owner && <button type="button" onClick={onEdit}>Editar perfil</button>}
      </div>
      <footer>
        {perfil.mostrarAmigos !== false && amigosCount !== null && <span><strong style={{marginRight: '4px'}}>{amigosCount}</strong>amigos</span>}
        {conteudosCount !== null && <span><strong style={{marginRight: '4px'}}>{conteudosCount}</strong> conteúdos</span>}
      </footer>
      {personagens.length > 0 && (
        <section className="profile-featured-characters">
          <header>
            <span>Personagens em destaque</span>
          </header>
          <div>
            {personagens.map((personagem) => (
              <article key={personagem.titulo + personagem.livroTitulo}>
                {personagem.imagemUrl ? <img style={{width: '300px', height: '400px', objectFit: 'cover'}} src={personagem.imagemUrl} alt="" /> : <div>{personagem.titulo.slice(0, 1)}</div>}
                <strong>{personagem.titulo}</strong>
                <small>{personagem.livroTitulo}</small>
              </article>
            ))}
          </div>
        </section>
      )}
      {obra && (
        <section className="profile-featured-card">
          {obra.imagemUrl && <img src={obra.imagemUrl} alt="" />}
          <div>
            <span>{obra.tipo} em destaque</span>
            <strong style={{fontSize: '1.50rem', lineHeight: '1.3', fontFamily: 'Georgia, "Times New Roman", serif'}}> {obra.titulo} </strong>
            <p>{resumirTexto(obra.descricao, 130)}</p>
          </div>
        </section>
      )}
    </article>
  );
}

function ChoiceRow({ label, children }) {
  return (
    <div className="choice-row">
      <span>{label}</span>
      <div>{children}</div>
    </div>
  );
}

function Avatar({ nome, fotoUrl, large = false }) {
  return (
    <span className={large ? "simple-avatar large" : "simple-avatar"}>
      {fotoUrl ? <img src={fotoUrl} alt="" /> : (nome || "A").slice(0, 1)}
    </span>
  );
}

function EmptyState({ text, actionLabel, onAction }) {
  return (
    <article className="simple-empty-state">
      <span />
      <p>{text}</p>
      {actionLabel && <button type="button" onClick={onAction}>{actionLabel}</button>}
    </article>
  );
}

function criarAmizadeId(a = "", b = "") {
  return [String(a), String(b)].sort().join("__");
}

function criarHandle(valor = "") {
  return normalizarHandle(valor || "autor");
}

function normalizarHandle(valor = "") {
  const handle = String(valor)
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9_]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 24);
  return handle || "autor";
}

function normalizarBusca(valor = "") {
  return String(valor || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function textoInclui(valores = [], termo = "") {
  const termoNormalizado = normalizarBusca(termo);
  return valores.filter(Boolean).some((valor) => normalizarBusca(valor).includes(termoNormalizado));
}

function temGeneroEmComum(a = "", b = "") {
  const generosA = String(a).toLowerCase().split(/[,;]+/).map((item) => item.trim()).filter(Boolean);
  const generosB = String(b).toLowerCase().split(/[,;]+/).map((item) => item.trim()).filter(Boolean);
  return generosA.some((genero) => generosB.includes(genero));
}

function resumirTexto(texto = "", limite = 140) {
  const limpo = String(texto || "").replace(/\s+/g, " ").trim();
  if (limpo.length <= limite) return limpo;
  return limpo.slice(0, limite).trim() + "...";
}

function montarFontesCompartilhamento(livros = [], tipo = "Personagem") {
  const tipoNormalizado = normalizarTipoConteudo(tipo);
  if (tipoNormalizado === "Personagem") return montarFontesPersonagens(livros);
  if (tipoNormalizado === "Capítulo") return montarFontesCapitulos(livros);
  if (tipoNormalizado === "Local") return montarFontesLocais(livros);
  if (tipoNormalizado === "Item do mundo") return montarFontesMundo(livros);
  return [];
}

function montarFontesPersonagens(livros = []) {
  return livros.flatMap((livro) =>
    (livro.personagens || []).map((personagem) => ({
      chave: "personagem-" + livro.id + "-" + personagem.id,
      id: personagem.id,
      tipo: "Personagem",
      tipoOriginal: "personagem",
      livroId: livro.id,
      livroTitulo: livro.titulo || "Livro sem título",
      titulo: personagem.nome || "Personagem sem nome",
      subtitulo: (livro.titulo || "Livro") + (personagem.papel ? " · " + personagem.papel : ""),
      descricao: personagem.descricao || personagem.historia || personagem.chamada || personagem.desejo || personagem.arco || personagem.segredo || "",
      imagemUrl: personagem.fotoUrl || personagem.imagemUrl || "",
      textoLongo: [
        personagem.historia,
        personagem.chamada,
        personagem.desejo && "Desejo: " + personagem.desejo,
        personagem.medo && "Medo: " + personagem.medo,
        personagem.segredo && "Segredo: " + personagem.segredo,
        personagem.arco && "Arco: " + personagem.arco,
      ].filter(Boolean).join("\n\n"),
    })),
  );
}

function montarFontesCapitulos(livros = []) {
  return livros.flatMap((livro) =>
    [...(livro.capitulos || [])]
      .sort((a, b) => (Number(a.ordem) || 0) - (Number(b.ordem) || 0))
      .map((capitulo, indice) => {
        const textoLongo = montarTextoCapituloCompartilhado(capitulo);
        const palavras = Number(capitulo.palavras) || contarPalavrasCompartilhamento(textoLongo);
        const minutos = Number(capitulo.minutos) || somarMinutosSessoes(capitulo.sessoes);

        return {
          chave: "capitulo-" + livro.id + "-" + capitulo.id,
          id: capitulo.id,
          tipo: "Capítulo",
          tipoOriginal: "capitulo",
          livroId: livro.id,
          livroTitulo: livro.titulo || "Livro sem título",
          titulo: capitulo.titulo || "Capítulo sem título",
          subtitulo: (livro.titulo || "Livro") + " · Capítulo " + (indice + 1) + " · " + palavras.toLocaleString("pt-BR") + " palavras",
          descricao: capitulo.resumo || capitulo.objetivo || "Capítulo de " + (livro.titulo || "uma obra"),
          imagemUrl: livro.capaUrl || "",
          textoLongo,
          palavras,
          minutos,
          numeroCapitulo: indice + 1,
        };
      }),
  );
}

function montarFontesLocais(livros = []) {
  return livros.flatMap((livro) =>
    (livro.mundo?.lugares || []).flatMap((lugar) => {
      const localPrincipal = {
        chave: "local-" + livro.id + "-" + lugar.id,
        id: lugar.id,
        tipo: "Local",
        tipoOriginal: "lugares",
        livroId: livro.id,
        livroTitulo: livro.titulo || "Livro sem título",
        secaoId: "lugares",
        secaoNome: "Lugares",
        titulo: lugar.nome || "Lugar sem nome",
        subtitulo: (livro.titulo || "Livro") + " · Lugar principal",
        descricao: descricaoItemMundo(lugar),
        imagemUrl: lugar.imagemUrl || "",
        textoLongo: montarTextoItemMundo(lugar),
      };

      const ramificacoes = [...(lugar.ramificacoes || [])]
        .sort((a, b) => (Number(a.ordem) || 0) - (Number(b.ordem) || 0))
        .map((ramo) => ({
          chave: "local-" + livro.id + "-" + lugar.id + "-ramo-" + ramo.id,
          id: ramo.id,
          tipo: "Local",
          tipoOriginal: "ramificacao",
          livroId: livro.id,
          livroTitulo: livro.titulo || "Livro sem título",
          secaoId: "lugares",
          secaoNome: "Lugares",
          titulo: ramo.nome || "Lugar ligado",
          subtitulo: (livro.titulo || "Livro") + " · " + (lugar.nome || "Lugar") + " / ramificação",
          descricao: descricaoItemMundo(ramo),
          imagemUrl: ramo.imagemUrl || lugar.imagemUrl || "",
          textoLongo: montarTextoItemMundo(ramo),
        }));

      return [localPrincipal, ...ramificacoes];
    }),
  );
}

function montarFontesMundo(livros = []) {
  return livros.flatMap((livro) => {
    const secoes = montarSecoesMundoCompartilhamento(livro).filter((secao) => secao.id !== "lugares");

    return secoes.flatMap((secao) =>
      (livro.mundo?.[secao.id] || []).flatMap((item) => {
        const fontePrincipal = {
          chave: "mundo-" + livro.id + "-" + secao.id + "-" + item.id,
          id: item.id,
          tipo: "Item do mundo",
          tipoOriginal: secao.id,
          livroId: livro.id,
          livroTitulo: livro.titulo || "Livro sem título",
          secaoId: secao.id,
          secaoNome: secao.nome,
          titulo: item.nome || "Item sem nome",
          subtitulo: (livro.titulo || "Livro") + " · " + secao.nome,
          descricao: descricaoItemMundo(item),
          imagemUrl: item.imagemUrl || "",
          textoLongo: montarTextoItemMundo(item, secao.id),
        };

        const mapasInternos = secao.id === "mapas"
          ? [...(item.mapasInternos || [])]
              .sort((a, b) => (Number(a.ordem) || 0) - (Number(b.ordem) || 0))
              .map((mapa) => ({
                chave: "mundo-" + livro.id + "-" + secao.id + "-" + item.id + "-mapa-" + mapa.id,
                id: mapa.id,
                tipo: "Item do mundo",
                tipoOriginal: "mapaInterno",
                livroId: livro.id,
                livroTitulo: livro.titulo || "Livro sem título",
                secaoId: secao.id,
                secaoNome: secao.nome,
                titulo: mapa.nome || "Mapa interno",
                subtitulo: (livro.titulo || "Livro") + " · " + (item.nome || "Mapa") + " / imagem interna",
                descricao: descricaoItemMundo(mapa),
                imagemUrl: mapa.imagemUrl || item.imagemUrl || "",
                textoLongo: montarTextoItemMundo(mapa),
              }))
          : [];

        return [fontePrincipal, ...mapasInternos];
      }),
    );
  });
}

function montarSecoesMundoCompartilhamento(livro) {
  const fixas = [
    { id: "lugares", nome: "Lugares" },
    { id: "faccoes", nome: "Facções" },
    { id: "regras", nome: "Regras" },
    { id: "mapas", nome: "Mapas" },
    { id: "linhaDoTempo", nome: "Linha do Tempo" },
  ];
  const mapa = new Map(fixas.map((secao) => [secao.id, secao]));

  (livro?.secoesMundo || []).forEach((secao) => {
    if (!secao?.id) return;
    mapa.set(secao.id, { id: secao.id, nome: secao.nome || nomeSecaoMundo(secao.id) });
  });

  Object.keys(livro?.mundo || {}).forEach((secaoId) => {
    if (!mapa.has(secaoId)) mapa.set(secaoId, { id: secaoId, nome: nomeSecaoMundo(secaoId) });
  });

  return Array.from(mapa.values());
}

function montarTextoCapituloCompartilhado(capitulo = {}) {
  const sessoes = [...(capitulo.sessoes || [])]
    .filter((sessao) => sessao.ativo !== false)
    .sort((a, b) => (Number(a.ordem) || 0) - (Number(b.ordem) || 0));
  const textoSessoes = sessoes
    .map((sessao) => {
      const texto = String(sessao.texto || "").trim();
      if (!texto) return "";
      return [sessao.titulo, texto].filter(Boolean).join("\n");
    })
    .filter(Boolean)
    .join("\n\n");

  return textoSessoes || capitulo.cenaAtual || capitulo.texto || "";
}

function montarTextoItemMundo(item = {}, tipo = "") {
  if (tipo === "linhaDoTempo" && (item.blocos || []).length > 0) {
    return (item.blocos || [])
      .map((bloco) => [bloco.titulo, bloco.descricao, bloco.setaTexto && "Ligação: " + bloco.setaTexto].filter(Boolean).join("\n"))
      .join("\n\n");
  }

  return [
    item.descricao,
    item.costumes && "Costumes: " + item.costumes,
    item.conflito && "Conflito: " + item.conflito,
    item.conexoes && "Conexões: " + item.conexoes,
  ].filter(Boolean).join("\n\n");
}

function descricaoItemMundo(item = {}) {
  return item.descricao || item.costumes || item.conflito || item.conexoes || "Sem descrição registrada.";
}

function nomeSecaoMundo(id = "") {
  const nomes = {
    lugares: "Lugares",
    faccoes: "Facções",
    regras: "Regras",
    mapas: "Mapas",
    linhaDoTempo: "Linha do Tempo",
  };
  if (nomes[id]) return nomes[id];
  return String(id || "Seção")
    .replace(/[-_]+/g, " ")
    .replace(/\b\w/g, (letra) => letra.toUpperCase());
}

function contarPalavrasCompartilhamento(texto = "") {
  return String(texto || "").trim().split(/\s+/).filter(Boolean).length;
}

function somarMinutosSessoes(sessoes = []) {
  return (sessoes || []).reduce((total, sessao) => total + (Number(sessao.minutos) || 0), 0);
}

function dataParaMillis(valor) {
  const data = normalizarData(valor);
  return data ? data.getTime() : 0;
}

function dataOrdenacaoChat(item = {}) {
  return dataParaMillis(item.criadoEm) || Number(item.criadoEmLocal || 0) || dataParaMillis(item.atualizadoEm);
}

function dataOrdenacaoConversa(conversa = {}) {
  return (
    dataParaMillis(conversa.ultimaAtividadeEm) ||
    Number(conversa.ultimaAtividadeEmLocal || 0) ||
    dataParaMillis(conversa.ultimaMensagemEm) ||
    dataParaMillis(conversa.ultimoConteudoEm) ||
    dataParaMillis(conversa.atualizadoEm)
  );
}

function formatarDataCurta(valor) {
  const data = normalizarData(valor);
  if (!data) return "Sem data";
  return new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "short" }).format(data);
}

function formatarDataHora(valor) {
  const data = normalizarData(valor);
  if (!data) return "Agora";
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(data);
}

function formatarHora(valor) {
  const data = normalizarData(valor);
  if (!data) return "Agora";
  return new Intl.DateTimeFormat("pt-BR", { hour: "2-digit", minute: "2-digit" }).format(data);
}

function formatarDataRelativa(valor) {
  const data = normalizarData(valor);
  if (!data) return "Agora";
  const minutos = Math.floor((Date.now() - data.getTime()) / 60000);
  if (minutos < 1) return "Agora";
  if (minutos < 60) return "há " + minutos + " min";
  const horas = Math.floor(minutos / 60);
  if (horas < 24) return "há " + horas + " h";
  const dias = Math.floor(horas / 24);
  if (dias < 7) return "há " + dias + " dia" + (dias > 1 ? "s" : "");
  return formatarDataCurta(data);
}

function normalizarData(valor) {
  if (!valor) return null;
  if (valor instanceof Date) return valor;
  if (typeof valor?.toDate === "function") return valor.toDate();
  if (typeof valor === "number") return new Date(valor);
  const data = new Date(valor);
  return Number.isNaN(data.getTime()) ? null : data;
}

function normalizarTipoConteudo(tipo = "") {
  const valor = String(tipo || "").toLowerCase();
  if (valor.includes("personagem")) return "Personagem";
  if (valor.includes("cap")) return "Capítulo";
  if (valor.includes("local") || valor.includes("lugar")) return "Local";
  if (valor.includes("imagem")) return "Imagem";
  if (valor.includes("mundo") || valor.includes("item")) return "Item do mundo";
  return "Outro";
}

function tipoConteudoCombinaFiltro(tipo, filtro) {
  if (filtro === "Todos") return true;
  return normalizarTipoConteudo(tipo) === filtro;
}

function rotuloTipoConteudo(tipo) {
  return normalizarTipoConteudo(tipo);
}

function classeTipoConteudo(tipo) {
  return "content-type-" + normalizarTipoConteudo(tipo)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}
