# Site Qualidados

Site institucional estático (HTML, CSS e JavaScript), sem etapa de build.

## Rodar localmente

```bash
node server.js
```

Abra http://localhost:4173. Use sempre um servidor: abrindo os arquivos direto (`file://`), os módulos 3D não carregam.

## Estrutura

| Arquivo | O que faz |
| --- | --- |
| `index.html` | Home: hero 3D, Sobre nós, missão drone, Grupo GPS, especialidades, soluções, história, cultura, presença, conteúdo, pessoas e contato |
| `institucional.html`, `servicos.html`, `esg.html`, `conteudo.html`, `pessoas.html`, `contato.html` | Páginas internas |
| `assets/css/style.css` | Todo o visual (tokens do design system QualiDados: vinho, dourado e neutros quentes; fontes Poppins e IBM Plex Mono) |
| `assets/js/layout.js` | Header, mega menu, menu mobile, rodapé, cortina de transição e ícones (compartilhados por todas as páginas) |
| `assets/js/main.js` | Interações e animações (GSAP + ScrollTrigger, Lenis) |
| `assets/js/hero3d.js` | Partículas 3D do hero (Three.js): engrenagem, mapa do Brasil, hélice e gêmeo digital |
| `assets/js/drone.js` | Missão drone: sede e locais de contratos em 3D (Three.js), com resolução adaptativa e sombras calculadas só ao trocar de destino |
| `assets/js/dashboards.js` | Telas ilustrativas das soluções digitais |

## Bibliotecas (via CDN)

- GSAP 3.12 + ScrollTrigger: animações ligadas ao scroll
- Lenis: rolagem suave
- Three.js 0.160, via import map em `index.html`

## Pontos a configurar antes de publicar

- **Logos**: carregados de `qualidados.com.br` (constante `ASSETS` em `layout.js`). Copie-os para `assets/img/` e troque os caminhos.
- **Formulário de contato**: sem backend, abre o e-mail do visitante já preenchido. Para envio direto, adicione `data-endpoint="URL"` ao `<form data-form>`; o site envia um POST em JSON para essa URL.
- **Animações reduzidas**: o site respeita a preferência do sistema (`prefers-reduced-motion`). O visitante pode trocar pelo botão no rodapé (a escolha fica salva no navegador).

## Conteúdo

Os textos vêm do site atual, do portfólio oficial e do comunicado de aquisição pelo Grupo GPS (22/09/2026, sujeita à aprovação do CADE). As cenas 3D e os dashboards são ilustrativos.
