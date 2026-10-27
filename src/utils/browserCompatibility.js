export function prepararNavegador() {
  if (typeof document === "undefined") return;

  document.documentElement.lang = "pt-BR";
  document.documentElement.dir = "ltr";
  document.documentElement.setAttribute("translate", "no");

  garantirMetaCharset();
  garantirMeta("viewport", "width=device-width, initial-scale=1");
  garantirMeta("google", "notranslate");
}

function garantirMetaCharset() {
  let meta = document.querySelector("meta[charset]");

  if (!meta) {
    meta = document.createElement("meta");
    document.head.prepend(meta);
  }

  meta.setAttribute("charset", "UTF-8");
}

function garantirMeta(nome, conteudo) {
  let meta = document.querySelector(`meta[name="${nome}"]`);

  if (!meta) {
    meta = document.createElement("meta");
    meta.setAttribute("name", nome);
    document.head.appendChild(meta);
  }

  meta.setAttribute("content", conteudo);
}
