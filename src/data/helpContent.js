export const perguntasAjuda = [
  {
    categoria: "Livros",
    pergunta: "Qual é o melhor jeito de começar?",
    resposta: "Comece pela página Livros. Crie uma obra, escolha uma cor, adicione uma capa se quiser e selecione esse livro como ativo. Todo o restante do estúdio passa a trabalhar em cima dele.",
  },
  {
    categoria: "Livros",
    pergunta: "Por que cada livro tem uma cor?",
    resposta: "A cor ajuda o site a mudar de identidade conforme o livro ativo. Ela aparece em botões, destaques, estantes e detalhes, deixando cada projeto mais reconhecível.",
  },
  {
    categoria: "Mundo",
    pergunta: "O que deve entrar em Mundo?",
    resposta: "Use Mundo para registrar lugares, facções, regras, mapas, linhas do tempo e seções próprias. O ideal é cada item ter função narrativa: conflito, influência sobre personagens ou utilidade para cenas.",
  },
  {
    categoria: "Mundo",
    pergunta: "Quando uso lugares, ramificações e mapas?",
    resposta: "Use Lugares para regiões principais. Use ramificações para bairros, salas, vilas ou áreas dentro de um lugar. Use Mapas quando quiser guardar imagens maiores, rotas e versões visuais do território.",
  },
  {
    categoria: "Personagens",
    pergunta: "Como organizo um elenco grande?",
    resposta: "Crie papéis, use imagens, vincule personagens a regiões do Mundo e mantenha desejo, medo, segredo e arco preenchidos. Isso ajuda a lembrar por que cada pessoa existe na história.",
  },
  {
    categoria: "Personagens",
    pergunta: "Posso apagar papéis criados por mim?",
    resposta: "Sim. Em Ajustes, os papéis personalizados do livro ativo aparecem em uma área própria. Se um papel estiver em uso, os personagens passam para um papel substituto ao remover.",
  },
  {
    categoria: "Escrita",
    pergunta: "Como capítulos e sessões funcionam?",
    resposta: "O capítulo é o bloco maior da história. Dentro dele, crie sessões menores para cenas ou subcapítulos. Sessões ativas entram nos cálculos, e sessões concluídas formam a leitura final do capítulo.",
  },
  {
    categoria: "Escrita",
    pergunta: "Como acompanhar progresso sem bagunçar o texto?",
    resposta: "Use metas de palavras no livro, capítulos e sessões. A tela de escrita guarda tempo, palavras e status, mas o campo de digitação fica limpo para evitar bugs visuais.",
  },
  {
    categoria: "Ideias",
    pergunta: "Para que servem Ideias?",
    resposta: "Ideias é o lugar para cenas possíveis, explicações do mundo, dúvidas, soluções e anotações que ainda não viraram texto final. Você pode ligar ideias a itens do Mundo para não perder contexto.",
  },
  {
    categoria: "Comunidade",
    pergunta: "O que posso compartilhar com amigos?",
    resposta: "Nas conversas, você pode enviar mensagens, imagens, personagens, capítulos, locais e itens do Mundo. Conteúdos enviados e recebidos aparecem com cores diferentes para ficar claro quem compartilhou.",
  },
  {
    categoria: "Comunidade",
    pergunta: "Como sei que recebi algo novo?",
    resposta: "A Comunidade mostra indicadores de novidades na entrada, na aba de amigos e nas conversas. Ao abrir a conversa, as mensagens e conteúdos são marcados como lidos.",
  },
  {
    categoria: "Imagens",
    pergunta: "Por que imagens grandes pesam no site?",
    resposta: "Imagens selecionadas do computador viram dados dentro do Firestore e podem aumentar o peso do livro. Links externos costumam manter o livro mais leve e preservar melhor a qualidade original.",
  },
  {
    categoria: "Ajustes",
    pergunta: "O que devo olhar em Ajustes?",
    resposta: "Use Ajustes para metas gerais, papéis personalizados, resumo do livro ativo e o peso estimado dos dados no Firebase. É uma área de manutenção do projeto.",
  },
  {
    categoria: "Dados",
    pergunta: "O site salva tudo automaticamente?",
    resposta: "Muitas edições são salvas automaticamente nas páginas principais. A criação de itens grandes ainda usa botões de confirmar para evitar salvar conteúdo incompleto por acidente.",
  },
];

export const tutoriaisPraticos = [
  {
    id: "primeiro-livro",
    titulo: "Primeiros passos no estúdio",
    descricao: "Um passeio geral: criar livro, entender o menu e saber para que serve cada área.",
    passos: [
      {
        seletor: '[data-tour="nav-novidades"]',
        titulo: "Comece por aqui",
        texto: "Este botão sempre abre o roteiro inicial. Ele serve como mapa rápido quando você volta depois de um tempo.",
      },
      {
        seletor: '[data-tour="livro-seletor"]',
        titulo: "Livro ativo",
        texto: "O livro ativo define qual obra o site está mostrando. Mundo, personagens, ideias e escrita mudam conforme essa seleção.",
      },
      {
        rota: "/livros",
        seletor: '[data-tour="livro-criar"]',
        titulo: "Crie ou adicione livros",
        texto: "Use este botão para abrir a criação. Título, gênero, cor, meta e capa ajudam a dar identidade ao projeto.",
      },
      {
        rota: "/livros",
        seletor: '[data-tour="livro-estante"]',
        titulo: "Use a estante",
        texto: "Os livros ficam organizados como uma coleção. Clique em um livro para abrir a ficha e trabalhar nele.",
      },
      {
        rota: "/mundo",
        seletores: ['[data-tour="mundo-criar"]', '[data-tour="livro-obrigatorio"]', '[data-tour="nav-mundo"]'],
        titulo: "Monte o mundo",
        texto: "Mundo guarda lugares, facções, regras, mapas e linhas do tempo. Se ainda não houver livro ativo, volte para Livros primeiro.",
      },
      {
        rota: "/personagens",
        seletores: ['[data-tour="personagem-criar"]', '[data-tour="livro-obrigatorio"]', '[data-tour="nav-personagens"]'],
        titulo: "Crie o elenco",
        texto: "Personagens ficam mais úteis quando têm papel, desejo, medo, segredo, imagem e ligação com regiões do mundo.",
      },
      {
        rota: "/escrita",
        seletores: ['[data-tour="escrita-lista"]', '[data-tour="livro-obrigatorio"]', '[data-tour="nav-escrita"]'],
        titulo: "Planeje a escrita",
        texto: "A escrita é organizada por capítulos e sessões. Use metas e status para saber o que está em rascunho, revisão ou concluído.",
      },
      {
        rota: "/ideias",
        seletores: ['[data-tour="ideias-lista"]', '[data-tour="livro-obrigatorio"]', '[data-tour="nav-ideias"]'],
        titulo: "Capture ideias",
        texto: "Use Ideias para guardar cenas, explicações, dúvidas e soluções antes de decidir se entram na história.",
      },
      {
        rota: "/comunidade",
        seletor: '[data-tour="nav-comunidade"]',
        titulo: "Converse com escritores",
        texto: "A Comunidade reúne perfil, amigos e conversas. Você pode compartilhar personagens, capítulos e itens do Mundo.",
      },
      {
        rota: "/configuracoes",
        seletores: ['[data-tour="config-metas"]', '[data-tour="nav-configuracoes"]'],
        titulo: "Revise os ajustes",
        texto: "Ajustes guarda metas, peso do livro no Firebase, papéis personalizados e resumo de organização.",
      },
      {
        rota: "/ajuda",
        seletor: '[data-tour="ajuda-busca"]',
        titulo: "Volte à Ajuda quando precisar",
        texto: "Pesquise dúvidas, leia respostas rápidas ou inicie um tutorial específico para uma área.",
      },
    ],
  },
  {
    id: "organizar-mundo",
    titulo: "Organizar o mundo",
    descricao: "Mostra onde registrar lugares, mapas, facções, regras e linhas do tempo.",
    passos: [
      {
        seletor: '[data-tour="nav-mundo"]',
        titulo: "Abra Mundo",
        texto: "Mundo é o centro de tudo que existe fora dos personagens: regiões, regras, grupos, mapas e história do cenário.",
      },
      {
        rota: "/mundo",
        seletores: ['[data-tour="mundo-criar"]', '[data-tour="livro-obrigatorio"]'],
        titulo: "Escolha a seção certa",
        texto: "Crie lugares para espaços físicos, facções para grupos, regras para limites do universo e mapas para referências visuais.",
      },
      {
        rota: "/mundo",
        seletores: ['[data-tour="mundo-lista"]', '[data-tour="livro-obrigatorio"]'],
        titulo: "Revise a estante do mundo",
        texto: "Os itens criados aparecem na estante. Abra cada um para editar descrição, vínculos, imagens, personagens e ramificações.",
      },
      {
        rota: "/personagens",
        seletores: ['[data-tour="personagem-criar"]', '[data-tour="nav-personagens"]'],
        titulo: "Ligue mundo e elenco",
        texto: "Depois de criar lugares, vincule personagens a regiões. Isso deixa a escrita mais contextual e fácil de consultar.",
      },
    ],
  },
  {
    id: "criar-elenco",
    titulo: "Criar personagens úteis",
    descricao: "Ajuda a montar fichas com imagem, papel, região e função narrativa.",
    passos: [
      {
        seletor: '[data-tour="nav-personagens"]',
        titulo: "Abra Personagens",
        texto: "O elenco do livro ativo fica aqui. Cada personagem pode virar uma carta visual e uma ficha editável.",
      },
      {
        rota: "/personagens",
        seletores: ['[data-tour="personagem-criar"]', '[data-tour="livro-obrigatorio"]'],
        titulo: "Crie ou edite uma ficha",
        texto: "Preencha nome, papel, imagem e campos narrativos. Não precisa escrever tudo de uma vez: volte quando descobrir mais.",
      },
      {
        rota: "/personagens",
        seletores: ['[data-tour="personagem-lista"]', '[data-tour="livro-obrigatorio"]'],
        titulo: "Use a estante do elenco",
        texto: "A lista funciona como uma coleção de cartas. Clique em um personagem para abrir detalhes e editar sem poluir a página.",
      },
      {
        rota: "/configuracoes",
        seletores: ['[data-tour="config-papeis"]', '[data-tour="nav-configuracoes"]'],
        titulo: "Limpe papéis antigos",
        texto: "Se você criou papéis demais, remova os que não usa em Ajustes. Isso mantém as opções de personagens mais claras.",
      },
    ],
  },
  {
    id: "planejar-escrita",
    titulo: "Planejar escrita",
    descricao: "Mostra como criar capítulos, sessões e acompanhar metas sem perder o foco.",
    passos: [
      {
        seletor: '[data-tour="nav-escrita"]',
        titulo: "Abra Escrita",
        texto: "A página Escrita concentra capítulos, sessões, metas, tempo e leitura do texto final.",
      },
      {
        rota: "/escrita",
        seletores: ['[data-tour="escrita-lista"]', '[data-tour="livro-obrigatorio"]'],
        titulo: "Olhe a estante de capítulos",
        texto: "Capítulos ficam em uma estante. Abra um capítulo para ver sessões, status, metas e opções de leitura.",
      },
      {
        rota: "/escrita",
        seletores: ['[data-tour="escrita-capitulo"]', '[data-tour="livro-obrigatorio"]'],
        titulo: "Crie o próximo capítulo",
        texto: "Cada capítulo pode ter resumo, meta própria, cor e sessões internas para organizar cenas ou subcapítulos.",
      },
      {
        rota: "/ideias",
        seletores: ['[data-tour="ideias-lista"]', '[data-tour="nav-ideias"]'],
        titulo: "Guarde material solto",
        texto: "Quando uma cena ainda não cabe em um capítulo, coloque em Ideias. Depois você decide onde usar.",
      },
    ],
  },
  {
    id: "organizar-ideias",
    titulo: "Organizar ideias e tarefas",
    descricao: "Ensina a guardar explicações, cenas possíveis e pendências criativas.",
    passos: [
      {
        seletor: '[data-tour="nav-ideias"]',
        titulo: "Abra Ideias",
        texto: "Ideias funciona como uma bancada para anotações, hipóteses, cenas futuras e explicações do mundo.",
      },
      {
        rota: "/ideias",
        seletores: ['[data-tour="ideias-lista"]', '[data-tour="livro-obrigatorio"]'],
        titulo: "Revise a biblioteca de ideias",
        texto: "Use categorias e estados para separar material bruto, coisas a investigar e ideias prontas para entrar na história.",
      },
      {
        rota: "/ideias",
        seletores: ['[data-tour="tarefas-lista"]', '[data-tour="livro-obrigatorio"]'],
        titulo: "Transforme ideia em tarefa",
        texto: "Pendências claras ajudam a avançar: revisar capítulo, criar mapa, resolver motivação ou pesquisar um detalhe.",
      },
    ],
  },
  {
    id: "comunidade-escritores",
    titulo: "Usar a Comunidade",
    descricao: "Mostra o básico de perfil, amigos, conversas e compartilhamento criativo.",
    passos: [
      {
        seletor: '[data-tour="nav-comunidade"]',
        titulo: "Abra Comunidade",
        texto: "A Comunidade fica separada do livro ativo. Ela serve para perfil público, amizades, conversas e trocas entre escritores.",
      },
      {
        rota: "/comunidade",
        seletor: '[data-tour="nav-comunidade"]',
        titulo: "Entre no espaço social",
        texto: "Ao entrar, a página ganha mais espaço. Use perfil, pesquisa e amigos para encontrar ou conversar com outros usuários.",
      },
      {
        rota: "/comunidade",
        seletor: '[data-tour="nav-comunidade"]',
        titulo: "Compartilhe com contexto",
        texto: "No chat, use o botão + para enviar personagens, capítulos, locais e itens do Mundo em cartões especiais.",
      },
    ],
  },
  {
    id: "ajustes-manutencao",
    titulo: "Manter o projeto leve",
    descricao: "Explica metas, peso no Firebase, papéis personalizados e resumo do livro ativo.",
    passos: [
      {
        seletor: '[data-tour="nav-configuracoes"]',
        titulo: "Abra Ajustes",
        texto: "Ajustes é a área de manutenção do estúdio. Ela não substitui as páginas criativas, apenas ajuda a organizar o projeto.",
      },
      {
        rota: "/configuracoes",
        seletor: '[data-tour="config-metas"]',
        titulo: "Defina metas gerais",
        texto: "As metas ajudam a medir progresso no livro e na escrita sem precisar recalcular tudo manualmente.",
      },
      {
        rota: "/configuracoes",
        seletor: '[data-tour="config-peso"]',
        titulo: "Acompanhe o peso",
        texto: "O medidor mostra se o livro ativo está ficando pesado demais para o limite do documento principal no Firestore.",
      },
      {
        rota: "/configuracoes",
        seletor: '[data-tour="config-papeis"]',
        titulo: "Organize papéis",
        texto: "Papéis criados por você podem ser removidos aqui, mantendo a seleção de personagens mais limpa.",
      },
    ],
  },
  {
    id: "usar-ajuda",
    titulo: "Como usar a Ajuda",
    descricao: "Mostra como pesquisar dúvidas e iniciar tutoriais guiados.",
    passos: [
      {
        rota: "/ajuda",
        seletor: '[data-tour="nav-ajuda"]',
        titulo: "Abra Ajuda",
        texto: "A Ajuda fica no menu lateral e também no atalho do topo quando você está em outras páginas.",
      },
      {
        rota: "/ajuda",
        seletor: '[data-tour="ajuda-busca"]',
        titulo: "Pesquise por tema",
        texto: "Digite termos como livro, mundo, personagem, escrita, comunidade, imagem ou Firebase.",
      },
      {
        rota: "/ajuda",
        seletor: '[data-tour="ajuda-faq"]',
        titulo: "Abra respostas rápidas",
        texto: "As perguntas frequentes explicam decisões do site e ajudam a lembrar onde fica cada coisa.",
      },
      {
        rota: "/ajuda",
        seletor: '[data-tour="ajuda-tutoriais"]',
        titulo: "Inicie tutoriais específicos",
        texto: "Escolha um tutorial quando quiser aprender um fluxo inteiro, como criar elenco, montar mundo ou cuidar dos ajustes.",
      },
    ],
  },
];
