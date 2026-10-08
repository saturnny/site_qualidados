/* ==========================================================================
   Qualidados — layout compartilhado (ícones, header, menu mobile, footer)
   Carregado de forma síncrona logo após o placeholder #qd-header.
   ========================================================================== */
(function () {
  "use strict";

  var ASSETS = {
    // Logos oficiais (arquivos originais da marca). Para hospedar localmente,
    // copie-os para assets/img/ e troque estes caminhos.
    logoColor: "https://qualidados.com.br/wp-content/themes/qualidados/assets/images/logo.png",
    logoWhite: "https://qualidados.com.br/wp-content/themes/qualidados/assets/images/logo-footer.png"
  };

  var CONTACT = {
    phone: "+55 71 3339-2600",
    phoneHref: "tel:+557133392600",
    email: "contatoqd@qualidados.com.br",
    jobs: "https://qualidados.gupy.io/",
    linkedin: "https://www.linkedin.com/company/qualidados-engenharia/",
    instagram: "https://www.instagram.com/qualidadosengenharia/",
    facebook: "https://www.facebook.com/qualidadosengenharia/"
  };

  /* ---------- Ícones (traço 1.5, 24×24) ---------- */
  var P = {
    arrow: '<path d="M5 12h14M13 6l6 6-6 6"/>',
    arrowUpRight: '<path d="M7 17L17 7M8 7h9v9"/>',
    chevron: '<path d="M6 9l6 6 6-6"/>',
    plus: '<path d="M12 5v14M5 12h14"/>',
    wrench: '<path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/>',
    gantt: '<path d="M3 3v18h18"/><path d="M7 7h6M10 11h7M8 15h5"/>',
    pulse: '<path d="M22 12h-4l-3 9L9 3l-3 9H2"/>',
    compass: '<circle cx="12" cy="12" r="10"/><path d="M16.24 7.76l-2.12 6.36-6.36 2.12 2.12-6.36 6.36-2.12z"/>',
    cpu: '<rect x="4" y="4" width="16" height="16" rx="2"/><rect x="9" y="9" width="6" height="6"/><path d="M9 1v3M15 1v3M9 20v3M15 20v3M20 9h3M20 14h3M1 9h3M1 14h3"/>',
    gear: '<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>',
    phone: '<path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.13.96.36 1.9.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.91.34 1.85.57 2.81.7A2 2 0 0 1 22 16.92z"/>',
    mail: '<rect x="2" y="4" width="20" height="16" rx="2"/><path d="M22 6l-10 7L2 6"/>',
    pin: '<path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/>',
    linkedin: '<path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-4 0v7h-4v-7a6 6 0 0 1 6-6zM2 9h4v12H2z"/><circle cx="4" cy="4" r="2"/>',
    instagram: '<rect x="2" y="2" width="20" height="20" rx="5"/><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"/><path d="M17.5 6.5h.01"/>',
    facebook: '<path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z"/>',
    shield: '<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><path d="M9 12l2 2 4-4"/>',
    leaf: '<path d="M11 20A7 7 0 0 1 9.8 6.1C15.5 5 17 4.48 19 2c1 2 2 4.18 2 8 0 5.5-4.78 10-10 10z"/><path d="M2 21c0-3 1.85-5.36 5.08-6C9.5 14.52 12 13 13 12"/>',
    users: '<path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/>',
    scale: '<path d="M16 16l3-8 3 8c-.87.65-1.92 1-3 1s-2.13-.35-3-1zM2 16l3-8 3 8c-.87.65-1.92 1-3 1s-2.13-.35-3-1z"/><path d="M7 21h10M12 3v18M3 7h2c2 0 5-1 7-2 2 1 5 2 7 2h2"/>',
    check: '<path d="M20 6L9 17l-5-5"/>',
    globe: '<circle cx="12" cy="12" r="10"/><path d="M2 12h20M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/>',
    heart: '<path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>',
    book: '<path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/>',
    award: '<circle cx="12" cy="8" r="7"/><path d="M8.21 13.89L7 23l5-3 5 3-1.21-9.12"/>',
    target: '<circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/>',
    zap: '<path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/>',
    smile: '<circle cx="12" cy="12" r="10"/><path d="M8 14s1.5 2 4 2 4-2 4-2M9 9h.01M15 9h.01"/>',
    star: '<path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>',
    flag: '<path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"/><path d="M4 22v-7"/>',
    download: '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3"/>',
    clock: '<circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/>',
    layers: '<path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/>',
    file: '<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6M16 13H8M16 17H8M10 9H8"/>',
    lock: '<rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>',
    news: '<path d="M4 22h16a2 2 0 0 0 2-2V4a2 2 0 0 0-2-2H8a2 2 0 0 0-2 2v16a2 2 0 0 1-2 2zm0 0a2 2 0 0 1-2-2v-9c0-1.1.9-2 2-2h2"/><path d="M18 14h-8M15 18h-5M10 6h8v4h-8z"/>',
    mic: '<path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2M12 19v4M8 23h8"/>',
    megaphone: '<path d="M3 11l18-5v12L3 14v-3z"/><path d="M11.6 16.8a3 3 0 1 1-5.8-1.6"/>',
    graduation: '<path d="M22 10L12 5 2 10l10 5 10-5z"/><path d="M6 12v5c3 3 9 3 12 0v-5"/>',
    briefcase: '<rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/>',
    building: '<rect x="4" y="2" width="16" height="20" rx="2"/><path d="M9 22v-4h6v4M8 6h.01M16 6h.01M12 6h.01M12 10h.01M12 14h.01M16 10h.01M16 14h.01M8 10h.01M8 14h.01"/>',
    handshake: '<path d="M11 17l2 2a1 1 0 1 0 3-3"/><path d="M14 14l2.5 2.5a1 1 0 1 0 3-3l-3.88-3.88a3 3 0 0 0-4.24 0l-.88.88a1 1 0 1 1-3-3l2.81-2.81a5.79 5.79 0 0 1 7.06-.87l.47.28a2 2 0 0 0 1.42.25L21 4"/><path d="M21 3l1 11h-2M3 3L2 14l6.5 6.5a1 1 0 1 0 3-3M3 4h8"/>',
    recycle: '<path d="M7 19H4.815a1.83 1.83 0 0 1-1.57-.881 1.785 1.785 0 0 1-.004-1.784L7.196 9.5"/><path d="M11 19h8.203a1.83 1.83 0 0 0 1.556-.89 1.784 1.784 0 0 0 0-1.775l-1.226-2.12"/><path d="M14 16l-3 3 3 3M8.293 13.596L7.196 9.5 3.1 10.598M9.344 5.811l1.093-1.892A1.83 1.83 0 0 1 11.985 3a1.784 1.784 0 0 1 1.546.888l3.943 6.843"/><path d="M13.378 9.633l4.096 1.098 1.097-4.096"/>',
    search: '<circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/>',
    eye: '<path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>',
    wifi: '<path d="M5 12.55a11 11 0 0 1 14.08 0M1.42 9a16 16 0 0 1 21.16 0M8.53 16.11a6 6 0 0 1 6.95 0M12 20h.01"/>',
    brain: '<path d="M9.5 2A2.5 2.5 0 0 1 12 4.5v15a2.5 2.5 0 0 1-4.96.44 2.5 2.5 0 0 1-2.96-3.08 3 3 0 0 1-.34-5.58 2.5 2.5 0 0 1 1.32-4.24 2.5 2.5 0 0 1 1.98-3A2.5 2.5 0 0 1 9.5 2z"/><path d="M14.5 2A2.5 2.5 0 0 0 12 4.5v15a2.5 2.5 0 0 0 4.96.44 2.5 2.5 0 0 0 2.96-3.08 3 3 0 0 0 .34-5.58 2.5 2.5 0 0 0-1.32-4.24 2.5 2.5 0 0 0-1.98-3A2.5 2.5 0 0 0 14.5 2z"/>',
    hardhat: '<path d="M2 18a1 1 0 0 0 1 1h18a1 1 0 0 0 1-1v-2a1 1 0 0 0-1-1H3a1 1 0 0 0-1 1v2z"/><path d="M10 10V5a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1v5M4 15v-3a6 6 0 0 1 6-6M14 6a6 6 0 0 1 6 6v3"/>',
    external: '<path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6M15 3h6v6M10 14L21 3"/>'
  };

  function icon(name, cls) {
    return '<svg class="ico' + (cls ? " " + cls : "") + '" viewBox="0 0 24 24" aria-hidden="true">' + (P[name] || "") + "</svg>";
  }
  function arrowIco() {
    return '<span class="btn-ico">' + icon("arrow") + icon("arrow") + "</span>";
  }

  /* ---------- Navegação ---------- */
  var NAV = [
    {
      id: "institucional", label: "Institucional", href: "institucional.html",
      intro: "Genuinamente baiana: mais de 30 anos de engenharia com tecnologia, de Salvador para todo o Brasil.",
      items: [
        { label: "Sobre nós", desc: "Quem somos e o que fazemos", href: "index.html#sobre", icon: "flag" },
        { label: "Sobrevoo da sede", desc: "Visão aérea em 3D, em Salvador", href: "index.html#sede", icon: "pin" },
        { label: "Grupo GPS", desc: "O novo capítulo da Qualidados", href: "index.html#gps", icon: "handshake" },
        { label: "A Qualidados", desc: "Nossa história desde 1993", href: "institucional.html#historia", icon: "building" },
        { label: "Cultura", desc: "Propósito, visão e valores", href: "institucional.html#cultura", icon: "target" },
        { label: "Presença Nacional", desc: "Salvador, Rio de Janeiro e Uberaba", href: "institucional.html#presenca", icon: "globe" },
        { label: "Liderança", desc: "Conselho e executivos", href: "institucional.html#lideranca", icon: "users" },
        { label: "SGI", desc: "ISO 9001, 14001 e 45001", href: "institucional.html#sgi", icon: "award" },
        { label: "LGPD", desc: "Proteção de dados pessoais", href: "institucional.html#lgpd", icon: "lock" }
      ]
    },
    {
      id: "servicos", label: "Serviços", href: "servicos.html",
      intro: "Especialidades de engenharia e plataformas digitais para operações industriais.",
      items: [
        { label: "Especialidades", desc: "Paradas, projetos, ativos e consultoria", href: "servicos.html#especialidades", icon: "wrench" },
        { label: "Soluções", desc: "Plataformas digitais para a indústria", href: "servicos.html#solucoes", icon: "cpu" },
        { label: "Gerenciamento de Paradas", desc: "Pioneirismo e 30 anos de know-how", href: "servicos.html#paradas", icon: "gear" },
        { label: "Gestão de Ativos", desc: "Confiabilidade e manutenção (ISO 55)", href: "servicos.html#ativos", icon: "pulse" }
      ]
    },
    {
      id: "esg", label: "ESG", href: "esg.html",
      intro: "Sustentabilidade como alicerce: Pacto Global da ONU e os ODS no centro da estratégia.",
      items: [
        { label: "Nosso Compromisso", desc: "Pacto Global da ONU e ODS", href: "esg.html#compromisso", icon: "handshake" },
        { label: "Meio Ambiente", desc: "Gestão ambiental ISO 14001", href: "esg.html#meio-ambiente", icon: "leaf" },
        { label: "Social", desc: "Programa Qualidar-se", href: "esg.html#social", icon: "heart" },
        { label: "Governança", desc: "Conselho, comitês e compliance", href: "esg.html#governanca", icon: "scale" }
      ]
    },
    {
      id: "conteudo", label: "Conteúdo", href: "conteudo.html",
      intro: "Artigos técnicos dos nossos engenheiros e as novidades da Qualidados.",
      items: [
        { label: "Artigos Técnicos", desc: "Gestão, inovação e engenharia", href: "conteudo.html#artigos", icon: "file" },
        { label: "QualiNews", desc: "Notícias e eventos", href: "conteudo.html#qualinews", icon: "news" },
        { label: "Press Releases", desc: "Comunicados oficiais", href: "conteudo.html#press", icon: "megaphone" },
        { label: "Qualidados na Mídia", desc: "Matérias e entrevistas", href: "conteudo.html#midia", icon: "mic" }
      ]
    },
    {
      id: "pessoas", label: "Pessoas", href: "pessoas.html",
      intro: "Gente que transforma a indústria. Certificada Great Place To Work.",
      items: [
        { label: "Seja um QD", desc: "Cultura e ambiente de trabalho", href: "pessoas.html#seja-um-qd", icon: "users" },
        { label: "Equidade, Diversidade e Inclusão", desc: "Um ambiente para todos", href: "pessoas.html#edi", icon: "heart" },
        { label: "Desenvolvimento", desc: "Universidade QD", href: "pessoas.html#desenvolvimento", icon: "book" },
        { label: "Valorização da vida", desc: "Programa Você em Equilíbrio", href: "pessoas.html#valorizacao", icon: "shield" },
        { label: "Programa de Estágio", desc: "Dois anos de aprendizado", href: "pessoas.html#estagio", icon: "graduation" },
        { label: "Trabalhe Conosco", desc: "Vagas abertas na Gupy", href: CONTACT.jobs, icon: "briefcase", external: true }
      ]
    },
    { id: "contato", label: "Contato", href: "contato.html" }
  ];

  var page = document.body.getAttribute("data-page") || "";

  function extAttrs(item) {
    return item.external ? ' target="_blank" rel="noopener"' : "";
  }

  function renderHeader() {
    var items = NAV.map(function (n) {
      var current = n.id === page ? ' aria-current="page"' : "";
      if (!n.items) {
        return '<li class="nav-item"><a class="nav-link" href="' + n.href + '"' + current + ">" + n.label + "</a></li>";
      }
      var links = n.items.map(function (it) {
        return '<a class="mega__link" href="' + it.href + '"' + extAttrs(it) + '><span class="ico-wrap">' + icon(it.icon) +
          "</span><span><strong>" + it.label + "</strong><span>" + it.desc + "</span></span></a>";
      }).join("");
      return '<li class="nav-item has-mega">' +
        '<button class="nav-link" type="button" aria-expanded="false"' + current + ">" + n.label + icon("chevron", "chev") + "</button>" +
        '<div class="mega"><div class="mega__panel"><div class="mega__card">' +
        '<div class="mega__intro"><span class="eyebrow">' + n.label + "</span><h3>" + n.label + "</h3><p>" + n.intro + '</p>' +
        '<a class="link-arrow" href="' + n.href + '" style="margin-top:22px">Visão geral ' + icon("arrow") + "</a></div>" +
        '<div class="mega__links">' + links + "</div>" +
        "</div></div></div></li>";
    }).join("");

    var header =
      '<header class="site-header" id="siteHeader">' +
      '<div class="container header-inner">' +
      '<a class="brand" href="index.html" aria-label="Qualidados — página inicial">' +
      '<img class="logo--light" src="' + ASSETS.logoWhite + '" alt="Qualidados — Engenharia com Tecnologia" width="417" height="114">' +
      '<img class="logo--color" src="' + ASSETS.logoColor + '" alt="" aria-hidden="true" width="257" height="67">' +
      "</a>" +
      '<nav class="main-nav" aria-label="Navegação principal"><ul>' + items + "</ul></nav>" +
      '<div class="header-actions">' +
      '<a class="link-vagas" href="' + CONTACT.jobs + '" target="_blank" rel="noopener"><span class="dot"></span>Vagas</a>' +
      '<a class="btn btn-primary btn-sm" href="contato.html" data-magnetic>Fale conosco' + arrowIco() + "</a>" +
      '<button class="burger" type="button" aria-label="Abrir menu" aria-expanded="false" aria-controls="mobileMenu"><span></span><span></span></button>' +
      "</div></div></header>";

    var mobileItems = NAV.map(function (n, i) {
      if (!n.items) {
        return '<li><a class="mobile-menu__row" href="' + n.href + '">' + n.label + icon("arrow") + "</a></li>";
      }
      var sub = n.items.map(function (it) {
        return '<a href="' + it.href + '"' + extAttrs(it) + ">" + it.label + "</a>";
      }).join("");
      return '<li><button class="mobile-menu__row" type="button" aria-expanded="false" aria-controls="mm-' + i + '">' + n.label + icon("plus") + "</button>" +
        '<div class="mobile-menu__sub" id="mm-' + i + '"><div><a href="' + n.href + '">Visão geral</a>' + sub + "</div></div></li>";
    }).join("");

    var mobile =
      '<div class="mobile-menu" id="mobileMenu" aria-hidden="true">' +
      '<ul class="mobile-menu__list">' + mobileItems + "</ul>" +
      '<div class="mobile-menu__foot">' +
      '<a class="btn btn-gold" href="' + CONTACT.jobs + '" target="_blank" rel="noopener" style="justify-self:start">Ver vagas abertas' + arrowIco() + "</a>" +
      '<a href="' + CONTACT.phoneHref + '">' + CONTACT.phone + "</a>" +
      '<a href="mailto:' + CONTACT.email + '">' + CONTACT.email + "</a>" +
      "</div></div>";

    var curtain =
      '<div class="page-transition" aria-hidden="true"><div class="pt__panel"></div>' +
      '<div class="pt__inner"><img class="pt__logo" src="' + ASSETS.logoWhite + '" alt="" width="417" height="114">' +
      '<span class="pt__bar"><i></i></span><span class="pt__label">Qualidados</span></div></div>';

    var holder = document.getElementById("qd-header");
    if (holder) holder.outerHTML = curtain + header + mobile;
  }

  function renderFooter() {
    var holder = document.getElementById("qd-footer");
    if (!holder) return;
    var hideCta = holder.hasAttribute("data-no-cta");
    var cta = hideCta ? "" :
      '<div class="footer-cta"><div class="glow"></div><div class="container footer-cta__inner">' +
      '<div><span class="eyebrow">Vamos conversar</span><h2 class="title" style="margin-top:22px" data-split>Sua próxima parada, <em>sob controle</em>.</h2></div>' +
      '<div style="display:flex;gap:14px;flex-wrap:wrap">' +
      '<a class="btn btn-primary" href="contato.html" data-magnetic>Fale com um especialista' + arrowIco() + "</a>" +
      '<a class="btn btn-ghost" href="servicos.html#solucoes">Conheça as soluções' + arrowIco() + "</a>" +
      "</div></div></div>";

    var col = function (title, links) {
      return '<div class="footer-col"><h4>' + title + "</h4><ul>" + links.map(function (l) {
        return '<li><a href="' + l[1] + '"' + (l[2] ? ' target="_blank" rel="noopener"' : "") + ">" + l[0] + "</a></li>";
      }).join("") + "</ul></div>";
    };

    var footer =
      '<footer class="site-footer on-dark">' + cta +
      '<div class="container">' +
      '<div class="footer-main">' +
      '<div class="footer-brand"><img src="' + ASSETS.logoWhite + '" alt="Qualidados — Engenharia com Tecnologia" width="417" height="114" loading="lazy">' +
      "<p>Gerenciamento de paradas, projetos e ativos industriais com metodologia própria e soluções digitais. Desde 1993.</p>" +
      '<div class="socials">' +
      '<a href="' + CONTACT.linkedin + '" target="_blank" rel="noopener" aria-label="LinkedIn">' + icon("linkedin") + "</a>" +
      '<a href="' + CONTACT.instagram + '" target="_blank" rel="noopener" aria-label="Instagram">' + icon("instagram") + "</a>" +
      '<a href="' + CONTACT.facebook + '" target="_blank" rel="noopener" aria-label="Facebook">' + icon("facebook") + "</a>" +
      "</div></div>" +
      col("Institucional", [["A Qualidados", "institucional.html#historia"], ["Cultura", "institucional.html#cultura"], ["Liderança", "institucional.html#lideranca"], ["SGI", "institucional.html#sgi"], ["LGPD", "institucional.html#lgpd"]]) +
      col("Serviços", [["Especialidades", "servicos.html#especialidades"], ["Soluções", "servicos.html#solucoes"], ["Conteúdo", "conteudo.html"], ["ESG", "esg.html"], ["Compliance", "esg.html#compliance"]]) +
      col("Pessoas", [["Seja um QD", "pessoas.html#seja-um-qd"], ["Diversidade", "pessoas.html#edi"], ["Desenvolvimento", "pessoas.html#desenvolvimento"], ["Estágio", "pessoas.html#estagio"], ["Vagas", CONTACT.jobs, true]]) +
      '<div class="footer-col footer-contact-col"><h4>Contato</h4><div class="footer-contact">' +
      '<a href="' + CONTACT.phoneHref + '">' + CONTACT.phone + "</a>" +
      '<a href="mailto:' + CONTACT.email + '">' + CONTACT.email + "</a>" +
      "<span>Av. Oceânica, 3638, sala 401 — Rio Vermelho, Salvador/BA</span>" +
      '<div class="footer-badges"><span>ISO 9001</span><span>ISO 14001</span><span>ISO 45001</span><span>GPTW</span></div>' +
      "</div></div>" +
      "</div>" +
      '<div class="footer-bottom">' +
      "<span>© " + new Date().getFullYear() + " Qualidados Engenharia. Todos os direitos reservados.</span>" +
      '<nav aria-label="Rodapé"><a href="institucional.html#lgpd">Privacidade e LGPD</a><a href="esg.html#compliance">Canal de denúncias · 0800 899 5900</a><button class="motion-toggle" type="button" data-motion-toggle>Animações</button></nav>' +
      '<button class="to-top" type="button" aria-label="Voltar ao topo">' + icon("arrow") + "</button>" +
      "</div>" +
      '<div class="footer-giant" aria-hidden="true">QualiDados</div>' +
      "</div></footer>";

    holder.outerHTML = footer;
  }

  /* ---------- Hidratação de ícones: <i data-icon="nome"></i> ---------- */
  function hydrateIcons(root) {
    (root || document).querySelectorAll("[data-icon]").forEach(function (el) {
      el.outerHTML = icon(el.getAttribute("data-icon"), el.getAttribute("class") || "");
    });
    (root || document).querySelectorAll("[data-arrow]").forEach(function (el) {
      el.insertAdjacentHTML("beforeend", arrowIco());
      el.removeAttribute("data-arrow");
    });
  }

  function ready() {
    renderFooter();
    hydrateIcons();
  }

  window.QD = { icon: icon, arrowIco: arrowIco, contact: CONTACT, assets: ASSETS, hydrateIcons: hydrateIcons, ready: ready };

  renderHeader();
  document.addEventListener("DOMContentLoaded", ready);
})();
