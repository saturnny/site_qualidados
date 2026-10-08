/* ==========================================================================
   Qualidados — interações e animações
   Dependências opcionais: GSAP + ScrollTrigger, Lenis (tudo degrada sem elas)
   ========================================================================== */
(function () {
  "use strict";
  window.__qdReady = true;

  var d = document;
  var html = d.documentElement;
  // "motion-reduced" vem do script no <head>: preferência do sistema ou escolha salva do visitante.
  // No modo reduzido o site continua animado, mas só com fades (sem inércia, parallax ou pin).
  var reduce = html.classList.contains("motion-reduced");
  var fine = window.matchMedia("(hover: hover) and (pointer: fine)").matches;
  var gsap = window.gsap;
  var ST = window.ScrollTrigger;
  var anim = !!(gsap && ST);

  if (anim) gsap.registerPlugin(ST);
  else html.classList.remove("js-anim");

  var lenis = null;
  var menuOpen = false;
  var megaOpen = false;

  function $(s, r) { return (r || d).querySelector(s); }
  function $$(s, r) { return Array.prototype.slice.call((r || d).querySelectorAll(s)); }
  function store(k, v) { try { if (v === undefined) return sessionStorage.getItem(k); sessionStorage.setItem(k, v); } catch (e) { return null; } }

  /* ------------------------------------------------------------------
     Smooth scroll
  ------------------------------------------------------------------ */
  function initLenis() {
    if (reduce || !window.Lenis) return;
    lenis = new window.Lenis({ duration: 1.15, easing: function (t) { return Math.min(1, 1.001 - Math.pow(2, -10 * t)); }, smoothWheel: true });
    if (anim) {
      lenis.on("scroll", ST.update);
      gsap.ticker.add(function (time) { lenis.raf(time * 1000); });
      gsap.ticker.lagSmoothing(0);
    } else {
      var raf = function (t) { lenis.raf(t); requestAnimationFrame(raf); };
      requestAnimationFrame(raf);
    }
  }

  function headerOffset() {
    var sub = $(".subnav");
    return 76 + (sub ? sub.offsetHeight : 0);
  }

  function scrollToEl(el, immediate) {
    if (!el) return;
    var off = -headerOffset() + 1;
    if (lenis) lenis.scrollTo(el, { offset: off, immediate: !!immediate, duration: 1.4 });
    else window.scrollTo({ top: el.getBoundingClientRect().top + window.pageYOffset + off, behavior: immediate || reduce ? "auto" : "smooth" });
  }

  function initAnchors() {
    d.addEventListener("click", function (e) {
      var a = e.target.closest("a[href*='#']");
      if (!a) return;
      var url = new URL(a.href, location.href);
      if (url.pathname !== location.pathname || !url.hash) return;
      var target = d.getElementById(decodeURIComponent(url.hash.slice(1)));
      if (!target) return;
      e.preventDefault();
      closeMenu();
      closeAllMega();
      scrollToEl(target);
      history.replaceState(null, "", url.hash);
      applyHashFilter(url.hash);
    });
  }

  /* ------------------------------------------------------------------
     Header, mega menu, menu mobile
  ------------------------------------------------------------------ */
  var header, lastY = 0;

  function onScroll() {
    var y = window.pageYOffset;
    if (header) {
      header.classList.toggle("is-solid", y > 40 || megaOpen);
      if (!menuOpen && !megaOpen && y > 420 && y > lastY + 4) {
        header.classList.add("is-hidden");
        html.classList.add("header-hidden");
      } else if (y < lastY - 4 || y < 420) {
        header.classList.remove("is-hidden");
        html.classList.remove("header-hidden");
      }
    }
    var bar = $(".scroll-progress span");
    if (bar) {
      var max = d.documentElement.scrollHeight - window.innerHeight;
      bar.style.transform = "scaleX(" + (max > 0 ? y / max : 0) + ")";
    }
    lastY = y;
  }

  function setMega(item, open) {
    item.classList.toggle("is-open", open);
    var btn = $(".nav-link", item);
    if (btn) btn.setAttribute("aria-expanded", String(open));
    megaOpen = !!$(".nav-item.is-open");
    if (header) header.classList.toggle("is-solid", window.pageYOffset > 40 || megaOpen);
  }
  function closeAllMega() { $$(".nav-item.has-mega").forEach(function (i) { setMega(i, false); }); }

  function initHeader() {
    header = d.getElementById("siteHeader");
    var bar = d.createElement("div");
    bar.className = "scroll-progress";
    bar.innerHTML = "<span></span>";
    d.body.appendChild(bar);

    var closeTimer;
    $$(".nav-item.has-mega").forEach(function (item) {
      var btn = $(".nav-link", item);
      item.addEventListener("mouseenter", function () {
        if (!fine) return;
        clearTimeout(closeTimer);
        $$(".nav-item.has-mega").forEach(function (i) { if (i !== item) setMega(i, false); });
        setMega(item, true);
      });
      item.addEventListener("mouseleave", function () {
        if (!fine) return;
        closeTimer = setTimeout(function () { setMega(item, false); }, 200);
      });
      btn.addEventListener("click", function () {
        var open = !item.classList.contains("is-open");
        closeAllMega();
        setMega(item, open);
      });
    });
    d.addEventListener("click", function (e) { if (!e.target.closest(".nav-item")) closeAllMega(); });
    d.addEventListener("keydown", function (e) { if (e.key === "Escape") { closeAllMega(); closeMenu(); } });

    var burger = $(".burger");
    if (burger) burger.addEventListener("click", function () { menuOpen ? closeMenu() : openMenu(); });
    $$(".mobile-menu__row[aria-controls]").forEach(function (row) {
      row.addEventListener("click", function () {
        var sub = d.getElementById(row.getAttribute("aria-controls"));
        var open = row.getAttribute("aria-expanded") !== "true";
        row.setAttribute("aria-expanded", String(open));
        sub.classList.toggle("is-open", open);
      });
    });
    $$(".mobile-menu a").forEach(function (a) { a.addEventListener("click", function () { closeMenu(); }); });

    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();

    var top = $(".to-top");
    if (top) top.addEventListener("click", function () {
      if (lenis) lenis.scrollTo(0, { duration: 1.6 }); else window.scrollTo({ top: 0, behavior: "smooth" });
    });
  }

  function openMenu() {
    menuOpen = true;
    html.classList.add("menu-open");
    if (header) header.classList.remove("is-hidden");
    var b = $(".burger"); if (b) { b.setAttribute("aria-expanded", "true"); b.setAttribute("aria-label", "Fechar menu"); }
    var m = $("#mobileMenu"); if (m) m.setAttribute("aria-hidden", "false");
    if (lenis) lenis.stop(); else d.body.style.overflow = "hidden";
  }
  function closeMenu() {
    if (!menuOpen) return;
    menuOpen = false;
    html.classList.remove("menu-open");
    var b = $(".burger"); if (b) { b.setAttribute("aria-expanded", "false"); b.setAttribute("aria-label", "Abrir menu"); }
    var m = $("#mobileMenu"); if (m) m.setAttribute("aria-hidden", "true");
    if (lenis) lenis.start(); else d.body.style.overflow = "";
  }

  /* ------------------------------------------------------------------
     Cursor e botões magnéticos
  ------------------------------------------------------------------ */
  function initCursor() {
    if (!fine || reduce) return;
    var c = d.createElement("div");
    c.className = "cursor is-hidden";
    c.innerHTML = '<div class="cursor__ring"></div><div class="cursor__dot"></div>';
    d.body.appendChild(c);
    var dot = $(".cursor__dot", c), ring = $(".cursor__ring", c);
    var mx = -100, my = -100, rx = -100, ry = -100;
    d.addEventListener("mousemove", function (e) {
      mx = e.clientX; my = e.clientY;
      c.classList.remove("is-hidden");
      dot.style.transform = "translate(" + mx + "px," + my + "px)";
    }, { passive: true });
    d.addEventListener("mouseleave", function () { c.classList.add("is-hidden"); });
    d.addEventListener("mouseover", function (e) {
      c.classList.toggle("is-hover", !!e.target.closest("a, button, [data-cursor], .spec, .office, input, textarea, select, label"));
    });
    (function loop() {
      rx += (mx - rx) * 0.18; ry += (my - ry) * 0.18;
      ring.style.transform = "translate(" + rx + "px," + ry + "px)";
      requestAnimationFrame(loop);
    })();
  }

  function initMagnetic() {
    if (!fine || !anim || reduce) return;
    $$("[data-magnetic]").forEach(function (el) {
      el.addEventListener("mousemove", function (e) {
        var r = el.getBoundingClientRect();
        var x = e.clientX - (r.left + r.width / 2), y = e.clientY - (r.top + r.height / 2);
        gsap.to(el, { x: x * 0.22, y: y * 0.3, duration: 0.6, ease: "power3.out" });
      });
      el.addEventListener("mouseleave", function () { gsap.to(el, { x: 0, y: 0, duration: 0.9, ease: "elastic.out(1, .4)" }); });
    });
  }

  /* ------------------------------------------------------------------
     Split de texto por palavra
  ------------------------------------------------------------------ */
  function splitText(el) {
    if (el.classList.contains("is-split")) return $$(".split-word", el);
    var walk = function (node) {
      Array.prototype.slice.call(node.childNodes).forEach(function (child) {
        if (child.nodeType === 3) {
          var parts = child.textContent.split(/(\s+)/);
          var frag = d.createDocumentFragment();
          parts.forEach(function (p) {
            if (!p) return;
            if (/^\s+$/.test(p)) { frag.appendChild(d.createTextNode(" ")); return; }
            var line = d.createElement("span"); line.className = "split-line";
            var w = d.createElement("span"); w.className = "split-word"; w.textContent = p;
            line.appendChild(w); frag.appendChild(line);
          });
          node.replaceChild(frag, child);
        } else if (child.nodeType === 1 && child.tagName !== "BR") {
          walk(child);
        }
      });
    };
    walk(el);
    el.classList.add("is-split");
    return $$(".split-word", el);
  }

  function wordsFrom() { return reduce ? { opacity: 0 } : { yPercent: 115 }; }

  function initSplits() {
    $$("[data-split]").forEach(function (el) {
      if (el.getAttribute("data-split") === "hero") return;
      var words = splitText(el);
      if (!anim) return;
      gsap.fromTo(words, wordsFrom(), {
        yPercent: 0, opacity: 1, duration: reduce ? 0.8 : 1.15, ease: "expo.out", stagger: reduce ? 0.02 : 0.035,
        scrollTrigger: { trigger: el, start: "top 88%", once: true }
      });
    });
  }

  /* ------------------------------------------------------------------
     Reveals, parallax, contadores
  ------------------------------------------------------------------ */
  function initReveals() {
    if (!anim) return;
    // Revela um pouco antes de entrar na tela, com duração curta e stagger leve,
    // para os cards já estarem visíveis quando o olho chega neles.
    ST.batch("[data-reveal]", {
      start: "top 104%",
      interval: 0.04,
      batchMax: 8,
      once: true,
      onEnter: function (batch) {
        gsap.to(batch, { opacity: 1, x: 0, y: 0, scale: 1, duration: 0.75, ease: "power3.out", stagger: 0.05, overwrite: true });
      }
    });
    if (!reduce) $$("[data-parallax]").forEach(function (el) {
      var v = parseFloat(el.getAttribute("data-parallax")) || 0.15;
      gsap.to(el, { yPercent: -v * 100, ease: "none", scrollTrigger: { trigger: el.parentElement, start: "top bottom", end: "bottom top", scrub: true } });
    });
    $$("[data-draw] path, [data-draw] line, [data-draw] circle, [data-draw] rect, [data-draw] polyline").forEach(function (p, i) {
      var len = p.getTotalLength ? p.getTotalLength() : 400;
      gsap.fromTo(p, { strokeDasharray: len, strokeDashoffset: len }, { strokeDashoffset: 0, duration: 2.4, ease: "power2.inOut", delay: 0.2 + (i % 12) * 0.06 });
    });
  }

  function fmt(n, dec) { return n.toLocaleString("pt-BR", { minimumFractionDigits: dec, maximumFractionDigits: dec }); }

  function initCounters() {
    $$("[data-count]").forEach(function (el) {
      var to = parseFloat(el.getAttribute("data-count"));
      var dec = parseInt(el.getAttribute("data-dec") || "0", 10);
      if (!anim) { el.textContent = fmt(to, dec); return; }
      var o = { v: 0 };
      el.textContent = fmt(0, dec);
      gsap.to(o, {
        v: to, duration: 2.2, ease: "power3.out",
        scrollTrigger: { trigger: el, start: "top 90%", once: true },
        onUpdate: function () { el.textContent = fmt(o.v, dec); }
      });
    });
    $$("[data-meter]").forEach(function (el) {
      var v = el.getAttribute("data-meter");
      if (!("IntersectionObserver" in window)) { el.style.setProperty("--v", v); return; }
      var io = new IntersectionObserver(function (en) {
        if (en[0].isIntersecting) { el.style.setProperty("--v", v); io.disconnect(); }
      }, { threshold: 0.4 });
      io.observe(el);
    });
  }

  /* ------------------------------------------------------------------
     Manifesto: palavras acendem com o scroll
  ------------------------------------------------------------------ */
  function initManifesto() {
    $$("[data-manifesto]").forEach(function (el) {
      var words = [];
      var walk = function (node, accent) {
        Array.prototype.slice.call(node.childNodes).forEach(function (child) {
          if (child.nodeType === 3) {
            var frag = d.createDocumentFragment();
            child.textContent.split(/(\s+)/).forEach(function (p) {
              if (!p) return;
              if (/^\s+$/.test(p)) { frag.appendChild(d.createTextNode(" ")); return; }
              var s = d.createElement("span");
              s.className = "mw" + (accent ? " accent" : "");
              s.textContent = p;
              words.push(s);
              frag.appendChild(s);
            });
            node.replaceChild(frag, child);
          } else if (child.nodeType === 1) {
            walk(child, accent || child.tagName === "EM");
          }
        });
      };
      walk(el, false);
      if (!anim) { words.forEach(function (w) { w.classList.add("is-on"); }); return; }
      ST.create({
        trigger: el, start: "top 78%", end: "bottom 50%", scrub: true,
        onUpdate: function (self) {
          var n = Math.round(self.progress * words.length);
          for (var i = 0; i < words.length; i++) words[i].classList.toggle("is-on", i < n);
        }
      });
    });
  }

  /* ------------------------------------------------------------------
     Hero (home): preloader, intro, modos, relógio
  ------------------------------------------------------------------ */
  function heroIntro() {
    var h1 = $("[data-split='hero']");
    var words = h1 ? splitText(h1) : [];
    if (!anim) return;
    var tl = gsap.timeline({ delay: html.classList.contains("is-arriving") ? 0.5 : 0.05 });
    if (words.length) tl.fromTo(words, wordsFrom(), { yPercent: 0, opacity: 1, duration: reduce ? 1 : 1.4, ease: "expo.out", stagger: reduce ? 0.03 : 0.055 }, 0);
    tl.to("[data-hero]", { opacity: 1, y: 0, duration: 1.2, ease: "expo.out", stagger: 0.1 }, 0.35);
    tl.fromTo(".hero__hud > *", { opacity: 0 }, { opacity: 1, duration: 1.2, stagger: 0.05 }, 0.6);
  }

  function initPreloader(done) {
    var pre = $(".preloader");
    if (!pre) { done(); return; }
    if (!anim || reduce || html.classList.contains("no-preloader") || html.classList.contains("is-arriving")) { pre.remove(); done(); return; }
    if (lenis) lenis.stop();
    var count = $(".preloader__count", pre);
    var o = { v: 0 };
    var tl = gsap.timeline({
      onComplete: function () {
        pre.remove();
        if (lenis) lenis.start();
        store("qd-preloaded", "1");
      }
    });
    tl.to(".preloader__logo", { opacity: 1, y: 0, duration: 0.8, ease: "expo.out" })
      .to(o, { v: 100, duration: 1.3, ease: "power2.inOut", onUpdate: function () { count.textContent = String(Math.round(o.v)).padStart(3, "0"); } }, 0.1)
      .to(".preloader__bar span", { scaleX: 1, duration: 1.3, ease: "power2.inOut" }, 0.1)
      .to(pre, { clipPath: "inset(0 0 100% 0)", duration: 1, ease: "expo.inOut" }, "+=0.15")
      .add(done, "-=0.55");
  }

  function initHeroModes() {
    var modes = $$(".mode");
    if (!modes.length) return;
    var DUR = 6500;
    var cur = 0, elapsed = 0, last = performance.now(), visible = true;
    var labelEl = $("[data-mode-label]");
    var setMode = function (i) {
      cur = i; elapsed = 0;
      modes.forEach(function (m, k) {
        m.classList.remove("is-active");
        m.setAttribute("aria-pressed", "false");
        if (k === i) { void m.offsetWidth; m.classList.add("is-active"); m.setAttribute("aria-pressed", "true"); }
      });
      window.QD_MODE = i;
      window.dispatchEvent(new CustomEvent("qd:mode", { detail: { index: i } }));
      if (labelEl) labelEl.textContent = modes[i].getAttribute("data-label") || "";
    };
    modes.forEach(function (m, i) {
      m.style.setProperty("--mode-dur", DUR + "ms");
      m.addEventListener("click", function () { setMode(i); });
    });
    var hero = $(".hero");
    if (hero && "IntersectionObserver" in window) {
      new IntersectionObserver(function (en) { visible = en[0].isIntersecting; }, { threshold: 0.2 }).observe(hero);
    }
    setMode(0);
    (function loop(now) {
      if (visible && !d.hidden) {
        elapsed += now - last;
        if (elapsed >= DUR) setMode((cur + 1) % modes.length);
      }
      last = now;
      requestAnimationFrame(loop);
    })(performance.now());
  }

  function initClock() {
    var els = $$("[data-clock]");
    if (!els.length) return;
    var f;
    try { f = new Intl.DateTimeFormat("pt-BR", { timeZone: "America/Bahia", hour: "2-digit", minute: "2-digit", second: "2-digit" }); }
    catch (e) { f = new Intl.DateTimeFormat("pt-BR", { hour: "2-digit", minute: "2-digit", second: "2-digit" }); }
    var tick = function () { var t = f.format(new Date()); els.forEach(function (el) { el.textContent = t; }); };
    tick(); setInterval(tick, 1000);
  }

  /* ------------------------------------------------------------------
     Especialidades (painéis)
  ------------------------------------------------------------------ */
  function initSpecs() {
    $$("[data-spec-group]").forEach(function (group) {
      var specs = $$(".spec", group);
      var activate = function (s) {
        specs.forEach(function (x) { x.classList.toggle("is-active", x === s); x.setAttribute("aria-expanded", String(x === s)); });
      };
      specs.forEach(function (s) {
        s.addEventListener("mouseenter", function () { if (fine && window.innerWidth > 1024) activate(s); });
        s.addEventListener("click", function (e) { if (!e.target.closest("a")) activate(s); });
        s.addEventListener("keydown", function (e) { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); activate(s); } });
      });
    });
  }

  /* ------------------------------------------------------------------
     Console de soluções
  ------------------------------------------------------------------ */
  var SOL_URL = { fiscal: "fiscal-4.0", inspect: "qd-inspect", cleopatra: "cleopatra-enterprise", qgia: "qg-ia", engagil: "engagil" };

  function initConsole() {
    var root = $("[data-console]");
    if (!root || !window.QDDash) return;
    var tabs = $$(".sol-tab", root);
    var screenWrap = $(".device__screen", root);
    var urlEl = $(".device__url", root);
    var infos = $$("[data-info]", root);
    var DUR = 8000;
    tabs.forEach(function (t) { t.style.setProperty("--sol-dur", DUR + "ms"); });
    screenWrap.innerHTML = tabs.map(function (t) {
      var k = t.getAttribute("data-key");
      return '<div class="screen" data-screen="' + k + '">' + window.QDDash.render(k) + "</div>";
    }).join("");
    var screens = $$(".screen", screenWrap);
    var cur = -1, stop = null, elapsed = 0, last = performance.now(), running = false, paused = false;

    var activate = function (i) {
      if (stop) stop();
      cur = i; elapsed = 0;
      tabs.forEach(function (t, k) {
        t.classList.remove("is-active");
        t.setAttribute("aria-selected", "false");
        if (k === i) { void t.offsetWidth; t.classList.add("is-active"); t.setAttribute("aria-selected", "true"); }
      });
      var key = tabs[i].getAttribute("data-key");
      screens.forEach(function (s) { s.classList.toggle("is-active", s.getAttribute("data-screen") === key); });
      infos.forEach(function (n) { n.hidden = n.getAttribute("data-info") !== key; });
      if (urlEl) urlEl.textContent = "app.qualidados.com.br/" + SOL_URL[key];
      stop = window.QDDash.play(screens[i], key);
      var list = $(".console__list", root);
      if (list && list.scrollWidth > list.clientWidth) list.scrollTo({ left: tabs[i].offsetLeft - 16, behavior: "smooth" });
    };

    tabs.forEach(function (t, i) { t.addEventListener("click", function () { activate(i); }); });
    root.addEventListener("mouseenter", function () { paused = true; root.classList.add("is-paused"); });
    root.addEventListener("mouseleave", function () { paused = false; root.classList.remove("is-paused"); });

    if ("IntersectionObserver" in window) {
      new IntersectionObserver(function (en) {
        running = en[0].isIntersecting;
        if (running && cur === -1) activate(0);
      }, { threshold: 0.3 }).observe(root);
    } else { activate(0); running = true; }

    (function loop(now) {
      if (running && !paused && !d.hidden && cur > -1) {
        elapsed += now - last;
        if (elapsed >= DUR) activate((cur + 1) % tabs.length);
      }
      last = now;
      requestAnimationFrame(loop);
    })(performance.now());
  }

  function initDevices() {
    if (!window.QDDash) return;
    $$("[data-dash]").forEach(function (dev) {
      var key = dev.getAttribute("data-dash");
      var sc = $(".device__screen", dev);
      sc.innerHTML = '<div class="screen is-active">' + window.QDDash.render(key) + "</div>";
      var screen = $(".screen", sc);
      var stop = null;
      if (!("IntersectionObserver" in window)) { window.QDDash.play(screen, key); return; }
      new IntersectionObserver(function (en) {
        if (en[0].isIntersecting) { if (!stop) stop = window.QDDash.play(screen, key); }
        else if (stop) { stop(); stop = null; }
      }, { threshold: 0.35 }).observe(dev);
    });
  }

  /* ------------------------------------------------------------------
     Timeline horizontal (home) e vertical (institucional)
  ------------------------------------------------------------------ */
  function initTimeline() {
    var sec = $("[data-htimeline]");
    if (!sec) return;
    var track = $(".timeline-track", sec);
    var items = $$(".tl-item", sec);
    var axis = $(".timeline-axis span", sec);
    var native = function () {
      sec.classList.add("is-native");
      items.forEach(function (i) { i.classList.add("is-on"); });
      if (axis) axis.style.transform = "scaleX(1)";
    };
    if (!anim || reduce) { native(); return; }
    var dist = function () { return Math.max(0, track.scrollWidth - window.innerWidth); };
    var mm = gsap.matchMedia();
    mm.add("(min-width: 1025px)", function () {
      sec.classList.remove("is-native");
      items.forEach(function (i) { i.classList.remove("is-on"); });
      if (axis) axis.style.transform = "scaleX(0)";
      gsap.to(track, {
        x: function () { return -dist(); },
        ease: "none",
        scrollTrigger: {
          trigger: sec, start: "top top", end: function () { return "+=" + dist(); },
          pin: $(".timeline-pin", sec), scrub: 0.8, invalidateOnRefresh: true, anticipatePin: 1,
          onUpdate: function (self) {
            if (axis) axis.style.transform = "scaleX(" + self.progress + ")";
            var lim = window.innerWidth * 0.62;
            items.forEach(function (it) { it.classList.toggle("is-on", it.getBoundingClientRect().left < lim); });
          }
        }
      });
      return native;
    });
    mm.add("(max-width: 1024px)", native);
  }

  function initVTimeline() {
    $$(".vtimeline").forEach(function (vt) {
      var items = $$(".vt-item", vt);
      var prog = $(".vtimeline__progress", vt);
      if (!anim) { items.forEach(function (i) { i.classList.add("is-on"); }); if (prog) prog.style.transform = "scaleY(1)"; return; }
      ST.create({
        trigger: vt, start: "top 60%", end: "bottom 60%", scrub: true,
        onUpdate: function (self) {
          if (prog) prog.style.transform = "scaleY(" + self.progress + ")";
          var lim = window.innerHeight * 0.6;
          items.forEach(function (it) { it.classList.toggle("is-on", it.getBoundingClientRect().top < lim); });
        }
      });
    });
  }

  /* ------------------------------------------------------------------
     Valores: brilho segue o ponteiro
  ------------------------------------------------------------------ */
  function initValues() {
    $$(".value").forEach(function (v) {
      var set = function (e) {
        var r = v.getBoundingClientRect();
        v.style.setProperty("--mx", ((e.clientX - r.left) / r.width) * 100 + "%");
        v.style.setProperty("--my", ((e.clientY - r.top) / r.height) * 100 + "%");
      };
      v.addEventListener("mouseenter", set);
      v.addEventListener("mousemove", set);
    });
  }

  /* ------------------------------------------------------------------
     Mapa do Brasil em matriz de pontos
  ------------------------------------------------------------------ */
  var BRAZIL = [[-51.6, 4.2], [-50.9, 3.3], [-50.0, 1.8], [-50.4, 0.3], [-49.0, -0.2], [-48.4, -0.8], [-47.8, -0.6], [-46.8, -0.9], [-45.3, -1.4], [-44.4, -2.3], [-43.4, -2.5], [-41.8, -2.9], [-39.9, -2.8], [-38.5, -3.7], [-37.3, -4.7], [-36.0, -5.1], [-35.2, -5.4], [-34.9, -6.9], [-34.8, -8.0], [-35.1, -9.0], [-35.8, -9.8], [-36.9, -10.8], [-37.6, -11.8], [-38.4, -12.9], [-38.9, -13.8], [-39.0, -15.0], [-38.9, -16.2], [-39.2, -17.6], [-39.7, -18.6], [-40.2, -20.0], [-40.9, -21.2], [-41.0, -22.0], [-42.0, -22.97], [-43.2, -23.05], [-44.6, -23.3], [-45.4, -23.8], [-46.4, -24.0], [-47.4, -24.7], [-48.3, -25.6], [-48.6, -26.4], [-48.6, -27.6], [-48.8, -28.5], [-49.7, -29.3], [-50.3, -30.5], [-51.0, -31.5], [-52.1, -32.3], [-53.4, -33.75], [-53.5, -33.1], [-53.2, -32.5], [-54.1, -31.9], [-55.5, -30.9], [-56.4, -30.4], [-57.6, -30.2], [-57.1, -29.8], [-56.0, -28.7], [-55.0, -27.8], [-54.0, -27.2], [-53.8, -26.3], [-54.1, -25.6], [-54.6, -25.55], [-54.3, -24.07], [-55.2, -24.0], [-55.7, -22.55], [-56.8, -22.3], [-57.9, -22.1], [-57.8, -20.0], [-57.7, -19.0], [-57.5, -18.2], [-58.4, -17.3], [-58.4, -16.3], [-60.2, -16.3], [-60.5, -15.1], [-60.3, -13.7], [-61.8, -13.5], [-63.0, -12.7], [-64.4, -12.4], [-65.3, -11.5], [-65.3, -10.8], [-66.6, -9.9], [-67.6, -10.6], [-68.6, -11.0], [-69.6, -11.0], [-70.6, -11.0], [-70.5, -9.5], [-72.2, -10.0], [-73.2, -9.2], [-73.0, -8.5], [-73.9, -7.3], [-73.1, -5.8], [-72.9, -5.1], [-69.95, -4.23], [-69.4, -1.3], [-69.6, -0.5], [-70.0, 0.6], [-69.2, 1.0], [-67.3, 2.0], [-66.8, 1.2], [-65.5, 0.8], [-64.2, 1.5], [-63.4, 2.2], [-64.0, 3.9], [-62.8, 4.0], [-61.0, 4.5], [-60.2, 5.2], [-59.9, 4.4], [-59.6, 2.8], [-59.8, 1.5], [-58.9, 1.3], [-56.5, 1.9], [-55.0, 2.5], [-54.0, 2.3], [-52.9, 2.2], [-52.3, 3.2]];

  var CITIES = [
    { code: "SSA", name: "Salvador · Matriz", lon: -38.5, lat: -12.97, hq: true },
    { code: "RIO", name: "Rio de Janeiro", lon: -43.2, lat: -22.9 },
    { code: "UBA", name: "Uberaba", lon: -47.93, lat: -19.75 }
  ];

  function inPoly(x, y, poly) {
    var inside = false;
    for (var i = 0, j = poly.length - 1; i < poly.length; j = i++) {
      var xi = poly[i][0], yi = poly[i][1], xj = poly[j][0], yj = poly[j][1];
      if (((yi > y) !== (yj > y)) && (x < (xj - xi) * (y - yi) / (yj - yi) + xi)) inside = !inside;
    }
    return inside;
  }

  function initMap() {
    $$("[data-map]").forEach(function (wrap) {
      var canvas = $("canvas", wrap);
      if (!canvas) return;
      var ctx = canvas.getContext("2d");
      var LON0 = -75, LON1 = -33.5, LAT0 = 6, LAT1 = -34.5;
      var STEP = 0.78;
      var dots = [];
      for (var lat = LAT0; lat >= LAT1; lat -= STEP) {
        for (var lon = LON0; lon <= LON1; lon += STEP) {
          if (inPoly(lon, lat, BRAZIL)) dots.push({ lon: lon, lat: lat, seed: Math.random() });
        }
      }
      var active = 0, W = 0, H = 0, dpr = 1, visible = false, t0 = performance.now();
      var proj = function (lon, lat) { return [(lon - LON0) / (LON1 - LON0) * W, (LAT0 - lat) / (LAT0 - LAT1) * H]; };
      var hq = CITIES[0];

      var resize = function () {
        var r = wrap.getBoundingClientRect();
        dpr = Math.min(2, window.devicePixelRatio || 1);
        W = r.width; H = r.height;
        canvas.width = W * dpr; canvas.height = H * dpr;
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        var hp = proj(hq.lon, hq.lat);
        dots.forEach(function (p) {
          var xy = proj(p.lon, p.lat);
          p.x = xy[0]; p.y = xy[1];
          p.dist = Math.hypot(p.x - hp[0], p.y - hp[1]);
        });
      };

      var draw = function (now) {
        if (visible) {
          var t = (now - t0) / 1000;
          ctx.clearRect(0, 0, W, H);
          var maxR = W * 0.95;
          var r1 = (t * W * 0.16) % maxR, r2 = ((t * W * 0.16) + maxR / 2) % maxR;
          var dr = Math.max(1.1, W / 420);
          for (var i = 0; i < dots.length; i++) {
            var p = dots[i];
            var w1 = Math.max(0, 1 - Math.abs(p.dist - r1) / (W * 0.05));
            var w2 = Math.max(0, 1 - Math.abs(p.dist - r2) / (W * 0.05));
            var w = Math.max(w1 * (1 - r1 / maxR), w2 * (1 - r2 / maxR));
            var tw = 0.24 + 0.1 * Math.sin(t * 1.6 + p.seed * 12);
            if (w > 0.02) {
              ctx.fillStyle = "rgba(" + Math.round(201 + 23 * w) + "," + Math.round(169 - 110 * w) + "," + Math.round(97 - 30 * w) + "," + (tw + w * 0.8) + ")";
              ctx.beginPath(); ctx.arc(p.x, p.y, dr * (1 + w * 0.8), 0, 6.283); ctx.fill();
            } else {
              ctx.fillStyle = "rgba(234,219,181," + tw + ")";
              ctx.fillRect(p.x - dr * 0.8, p.y - dr * 0.8, dr * 1.6, dr * 1.6);
            }
          }
          var h = proj(hq.lon, hq.lat);
          CITIES.forEach(function (c, idx) {
            if (c.hq) return;
            var e = proj(c.lon, c.lat);
            var mx = (h[0] + e[0]) / 2 + (e[1] - h[1]) * 0.35, my = (h[1] + e[1]) / 2 - (e[0] - h[0]) * 0.35;
            ctx.lineWidth = 1;
            ctx.setLineDash([]);
            ctx.strokeStyle = idx === active ? "rgba(201,169,97,.55)" : "rgba(201,169,97,.22)";
            ctx.beginPath(); ctx.moveTo(h[0], h[1]); ctx.quadraticCurveTo(mx, my, e[0], e[1]); ctx.stroke();
            ctx.setLineDash([10, 400]);
            ctx.lineDashOffset = -((t * 120 + idx * 80) % 410);
            ctx.lineWidth = 2;
            ctx.strokeStyle = "#EADBB5";
            ctx.beginPath(); ctx.moveTo(h[0], h[1]); ctx.quadraticCurveTo(mx, my, e[0], e[1]); ctx.stroke();
          });
          ctx.setLineDash([]);
          CITIES.forEach(function (c, idx) {
            var q = proj(c.lon, c.lat);
            var isA = idx === active;
            var pulse = (t * 0.8 + idx * 0.3) % 1;
            ctx.strokeStyle = c.hq ? "rgba(224,64,90," + (1 - pulse) + ")" : "rgba(201,169,97," + (1 - pulse) + ")";
            ctx.lineWidth = 1.2;
            ctx.beginPath(); ctx.arc(q[0], q[1], 6 + pulse * (isA ? 30 : 18), 0, 6.283); ctx.stroke();
            ctx.fillStyle = c.hq ? "#E0405A" : "#C9A961";
            ctx.beginPath(); ctx.arc(q[0], q[1], isA ? 6 : 4.5, 0, 6.283); ctx.fill();
            ctx.fillStyle = "#0E0406";
            ctx.beginPath(); ctx.arc(q[0], q[1], isA ? 2.4 : 1.8, 0, 6.283); ctx.fill();
            ctx.font = "500 " + Math.max(10, W / 52) + "px 'IBM Plex Mono', monospace";
            ctx.fillStyle = isA ? "#F6EEE9" : "rgba(246,238,233,.6)";
            var lx = c.code === "UBA" ? q[0] - 14 : q[0] + 14;
            ctx.textAlign = c.code === "UBA" ? "right" : "left";
            ctx.fillText(c.code, lx, q[1] + 4);
          });
        }
        requestAnimationFrame(draw);
      };

      resize();
      window.addEventListener("resize", resize);
      if ("IntersectionObserver" in window) new IntersectionObserver(function (en) { visible = en[0].isIntersecting; }).observe(wrap);
      else visible = true;
      requestAnimationFrame(draw);

      var scope = wrap.closest("section") || d;
      $$("[data-office]", scope).forEach(function (o) {
        var idx = parseInt(o.getAttribute("data-office"), 10);
        var on = function () {
          active = idx;
          $$("[data-office]", scope).forEach(function (x) { x.classList.toggle("is-active", x === o); });
        };
        o.addEventListener("mouseenter", on);
        o.addEventListener("focus", on);
        o.addEventListener("click", on);
      });
    });
  }

  /* ------------------------------------------------------------------
     Arte generativa dos cards de conteúdo
  ------------------------------------------------------------------ */
  function initArt() {
    var G = "#C9A961", G2 = "#EADBB5", R = "#9E2235";
    var bg = function (id) {
      return '<defs><radialGradient id="bg' + id + '" cx="80%" cy="10%" r="100%"><stop offset="0" stop-color="#6B1520"/><stop offset=".6" stop-color="#1A070B"/><stop offset="1" stop-color="#0E0406"/></radialGradient></defs><rect width="320" height="180" fill="url(#bg' + id + ')"/>';
    };
    var grid = function () {
      var s = "";
      for (var x = 0; x <= 320; x += 20) s += '<line x1="' + x + '" y1="0" x2="' + x + '" y2="180" stroke="' + G + '" stroke-opacity=".06"/>';
      for (var y = 0; y <= 180; y += 20) s += '<line x1="0" y1="' + y + '" x2="320" y2="' + y + '" stroke="' + G + '" stroke-opacity=".06"/>';
      return s;
    };
    var arts = [
      function () { // anéis / alvo de valor
        var s = "";
        for (var i = 1; i < 9; i++) s += '<circle cx="250" cy="130" r="' + i * 22 + '" fill="none" stroke="' + (i % 3 ? G : R) + '" stroke-opacity="' + (0.55 - i * 0.05) + '"' + (i % 2 ? ' stroke-dasharray="3 5"' : "") + "/>";
        s += '<circle cx="250" cy="130" r="5" fill="' + G2 + '"/><path d="M40 150 L120 110 L170 124 L250 130" fill="none" stroke="' + G2 + '" stroke-width="1.5"/>';
        return s;
      },
      function () { // histograma + curva normal (simulação probabilística)
        var s = "", d = "";
        for (var i = 0; i < 26; i++) {
          var x = 30 + i * 10, t = (i - 12.5) / 5;
          var h = Math.exp(-t * t / 2) * 110 * (0.85 + 0.3 * Math.abs(Math.sin(i * 7.3)));
          s += '<rect x="' + x + '" y="' + (155 - h) + '" width="7" height="' + h + '" fill="' + (i > 18 ? R : G) + '" fill-opacity=".55"/>';
        }
        for (var k = 0; k <= 60; k++) { var xx = 30 + k * 4.4, tt = (k - 30) / 12; d += (k ? "L" : "M") + xx.toFixed(1) + " " + (155 - Math.exp(-tt * tt / 2) * 118).toFixed(1); }
        s += '<path d="' + d + '" fill="none" stroke="' + G2 + '" stroke-width="1.6"/><line x1="220" y1="20" x2="220" y2="160" stroke="' + R + '" stroke-dasharray="4 4"/><text x="226" y="30" fill="' + G2 + '" font-size="9" font-family="IBM Plex Mono, monospace">P80</text>';
        return s;
      },
      function () { // barras de crescimento
        var s = "", vals = [34, 42, 40, 55, 61, 72, 88, 104, 126];
        vals.forEach(function (v, i) { s += '<rect x="' + (40 + i * 28) + '" y="' + (160 - v) + '" width="16" height="' + v + '" fill="' + (i === vals.length - 1 ? G : R) + '" fill-opacity="' + (i === vals.length - 1 ? 0.9 : 0.35 + i * 0.05) + '"/>'; });
        s += '<path d="M48 124 L76 116 L104 118 L132 103 L160 97 L188 86 L216 70 L244 54 L272 30" fill="none" stroke="' + G2 + '" stroke-width="1.6"/><circle cx="272" cy="30" r="4" fill="' + G2 + '"/><text x="222" y="24" fill="' + G + '" font-size="12" font-weight="600" font-family="Poppins, sans-serif">+55%</text>';
        return s;
      },
      function () { // rede de nós
        var pts = [[40, 50], [90, 120], [140, 70], [200, 130], [230, 50], [280, 100], [120, 150], [260, 160]], s = "";
        [[0, 2], [1, 2], [2, 4], [2, 3], [3, 5], [4, 5], [1, 6], [3, 7], [5, 7]].forEach(function (e) { s += '<line x1="' + pts[e[0]][0] + '" y1="' + pts[e[0]][1] + '" x2="' + pts[e[1]][0] + '" y2="' + pts[e[1]][1] + '" stroke="' + G + '" stroke-opacity=".45"/>'; });
        pts.forEach(function (p, i) { s += '<circle cx="' + p[0] + '" cy="' + p[1] + '" r="' + (i === 2 ? 7 : 4) + '" fill="' + (i === 2 ? R : G2) + '"/>' + (i === 2 ? '<circle cx="' + p[0] + '" cy="' + p[1] + '" r="16" fill="none" stroke="' + R + '" stroke-opacity=".6"/>' : ""); });
        return s;
      },
      function () { // hélice
        var s = "";
        for (var i = 0; i < 40; i++) {
          var x = 20 + i * 7.2, a = i * 0.42;
          var y1 = 90 + Math.sin(a) * 40, y2 = 90 - Math.sin(a) * 40;
          if (i % 2 === 0) s += '<line x1="' + x + '" y1="' + y1 + '" x2="' + x + '" y2="' + y2 + '" stroke="' + G + '" stroke-opacity=".25"/>';
          s += '<circle cx="' + x + '" cy="' + y1 + '" r="2.6" fill="' + G2 + '"/><circle cx="' + x + '" cy="' + y2 + '" r="2.6" fill="' + R + '"/>';
        }
        return s;
      },
      function () { // engrenagem técnica
        var s = "", teeth = 16, d = "";
        for (var i = 0; i <= teeth * 4; i++) {
          var a = (i / (teeth * 4)) * Math.PI * 2, r = (i % 4 < 2) ? 70 : 58;
          d += (i ? "L" : "M") + (230 + Math.cos(a) * r).toFixed(1) + " " + (100 + Math.sin(a) * r).toFixed(1);
        }
        s += '<path d="' + d + 'Z" fill="none" stroke="' + G + '" stroke-opacity=".7"/><circle cx="230" cy="100" r="22" fill="none" stroke="' + G2 + '"/><circle cx="230" cy="100" r="40" fill="none" stroke="' + R + '" stroke-dasharray="3 5"/>';
        s += '<line x1="30" y1="100" x2="150" y2="100" stroke="' + G + '" stroke-opacity=".5"/><line x1="30" y1="60" x2="30" y2="140" stroke="' + G + '" stroke-opacity=".5"/><text x="36" y="92" fill="' + G2 + '" font-size="9" font-family="IBM Plex Mono, monospace">Ø140 · Z16</text>';
        return s;
      }
    ];
    $$("[data-art]").forEach(function (el, k) {
      var n = parseInt(el.getAttribute("data-art"), 10);
      if (isNaN(n)) n = k;
      el.innerHTML = '<svg viewBox="0 0 320 180" preserveAspectRatio="xMidYMid slice" aria-hidden="true">' + bg(k) + grid() + arts[n % arts.length]() + "</svg>";
    });
  }

  /* ------------------------------------------------------------------
     Filtros de conteúdo
  ------------------------------------------------------------------ */
  var HASH_FILTER = { "#artigos": "artigos", "#qualinews": "qualinews", "#press": "press", "#midia": "midia" };

  function setFilter(group, value) {
    $$(".filter", group).forEach(function (b) {
      var on = b.getAttribute("data-filter") === value;
      b.classList.toggle("is-active", on);
      b.setAttribute("aria-pressed", String(on));
    });
    var scope = group.closest("section") || d;
    var shown = [];
    $$(".post[data-cat]", scope).forEach(function (p) {
      var ok = value === "todos" || p.getAttribute("data-cat") === value;
      p.classList.toggle("is-hidden", !ok);
      if (ok) shown.push(p);
    });
    if (anim && shown.length) gsap.fromTo(shown, { opacity: 0, y: 24 }, { opacity: 1, y: 0, duration: 0.7, ease: "expo.out", stagger: 0.05, overwrite: true });
    if (anim) ST.refresh();
  }

  function applyHashFilter(hash) {
    var g = $("[data-filters]");
    if (g && HASH_FILTER[hash]) setFilter(g, HASH_FILTER[hash]);
  }

  function initFilters() {
    $$("[data-filters]").forEach(function (group) {
      $$(".filter", group).forEach(function (b) {
        b.addEventListener("click", function () { setFilter(group, b.getAttribute("data-filter")); });
      });
    });
    applyHashFilter(location.hash);
  }

  /* ------------------------------------------------------------------
     Subnav (scrollspy)
  ------------------------------------------------------------------ */
  function initSubnav() {
    var nav = $(".subnav");
    if (!nav || !("IntersectionObserver" in window)) return;
    var links = $$("a[href^='#']", nav);
    var map = {};
    links.forEach(function (a) { var s = d.getElementById(a.getAttribute("href").slice(1)); if (s) map[s.id] = a; });
    var list = $("ul", nav);
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (!en.isIntersecting) return;
        links.forEach(function (l) { l.classList.remove("is-active"); });
        var a = map[en.target.id];
        if (a) {
          a.classList.add("is-active");
          if (list.scrollWidth > list.clientWidth) list.scrollTo({ left: a.offsetLeft - 20, behavior: "smooth" });
        }
      });
    }, { rootMargin: "-40% 0px -55% 0px" });
    Object.keys(map).forEach(function (id) { io.observe(d.getElementById(id)); });
  }

  /* ------------------------------------------------------------------
     Formulário de contato
  ------------------------------------------------------------------ */
  function initForms() {
    $$("[data-form]").forEach(function (form) {
      var emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
      var validate = function (field) {
        var input = $("input, textarea, select", field);
        if (!input) return true;
        var v = (input.value || "").trim();
        var ok = true;
        if (input.required && !v) ok = false;
        if (ok && input.type === "email" && v && !emailRe.test(v)) ok = false;
        field.classList.toggle("has-error", !ok);
        input.setAttribute("aria-invalid", String(!ok));
        return ok;
      };
      $$(".field", form).forEach(function (f) {
        var input = $("input, textarea, select", f);
        if (input) input.addEventListener("blur", function () { if (input.value) validate(f); });
      });
      form.addEventListener("submit", function (e) {
        e.preventDefault();
        var ok = true;
        $$(".field", form).forEach(function (f) { if (!validate(f)) ok = false; });
        var consent = $("input[name='consent']", form);
        if (consent && !consent.checked) { ok = false; consent.focus(); }
        if (!ok) { var bad = $(".has-error input, .has-error textarea, .has-error select", form); if (bad) bad.focus(); return; }

        var data = {};
        new FormData(form).forEach(function (v, k) { data[k] = v; });
        var endpoint = form.getAttribute("data-endpoint");
        var done = function () { form.classList.add("is-sent"); };
        if (endpoint) {
          fetch(endpoint, { method: "POST", headers: { "Content-Type": "application/json", Accept: "application/json" }, body: JSON.stringify(data) })
            .then(done).catch(done);
        } else {
          var to = (window.QD && window.QD.contact.email) || "contatoqd@qualidados.com.br";
          var body = "Nome: " + (data.nome || "") + "\nEmpresa: " + (data.empresa || "") + "\nE-mail: " + (data.email || "") + "\nTelefone: " + (data.telefone || "") + "\nAssunto: " + (data.assunto || "") + "\n\n" + (data.mensagem || "");
          window.location.href = "mailto:" + to + "?subject=" + encodeURIComponent("[Site] " + (data.assunto || "Contato")) + "&body=" + encodeURIComponent(body);
          done();
        }
      });
      var again = $("[data-form-reset]", form);
      if (again) again.addEventListener("click", function () { form.reset(); form.classList.remove("is-sent"); });
    });
  }

  /* ------------------------------------------------------------------
     Sobrevoo da sede: pin, capítulos e navegação (a cena 3D fica em drone.js)
  ------------------------------------------------------------------ */
  window.QDScrollTo = function (y) {
    if (lenis) lenis.scrollTo(y, { duration: 1.4 });
    else window.scrollTo({ top: y, behavior: reduce ? "auto" : "smooth" });
  };

  function initDrone() {
    var root = $("[data-drone]");
    if (!root) return;
    var dests = $$(".dest", root);
    var infos = $$(".dest-info", root);
    var autoBtn = $("[data-drone-auto]", root);
    var autoBar = $(".dest-auto__bar i", root);
    var state = window.QDDrone = window.QDDrone || {};
    // Cada parada: ~5 s de voo + ~8 s orbitando o destino
    var DUR = 13000, cur = 0, auto = !reduce, elapsed = 0, visible = false, last = performance.now();

    var setAuto = function (on) {
      auto = on;
      elapsed = 0;
      if (autoBtn) { autoBtn.setAttribute("aria-pressed", String(on)); autoBtn.classList.toggle("is-on", on); }
      if (autoBar) autoBar.style.transform = "scaleX(0)";
    };
    var stepEl = $("[data-drone-step]", root);
    var go = function (i, byUser) {
      cur = i;
      state.dest = i;
      elapsed = 0;
      if (stepEl) stepEl.textContent = (i + 1) + " / " + dests.length;
      dests.forEach(function (b, k) { b.classList.toggle("is-active", k === i); b.setAttribute("aria-pressed", String(k === i)); });
      infos.forEach(function (n, k) { n.classList.toggle("is-active", k === i); });
      window.dispatchEvent(new CustomEvent("qd:drone-dest", { detail: { index: i } }));
      if (byUser) setAuto(false);
      var list = $(".dest-list", root);
      if (list && list.scrollWidth > list.clientWidth + 4) list.scrollTo({ left: dests[i].offsetLeft - 16, behavior: "smooth" });
    };

    dests.forEach(function (b, i) { b.addEventListener("click", function () { go(i, true); }); });
    window.addEventListener("qd:drone-go", function (e) { go(e.detail.index, true); });
    // Qualquer interação com a câmera pausa o tour; anterior/próximo e setas do teclado navegam
    window.addEventListener("qd:drone-interact", function () { if (auto) setAuto(false); });
    var prevBtn = $("[data-drone-prev]", root), nextBtn = $("[data-drone-next]", root);
    if (prevBtn) prevBtn.addEventListener("click", function () { go((cur - 1 + dests.length) % dests.length, true); });
    if (nextBtn) nextBtn.addEventListener("click", function () { go((cur + 1) % dests.length, true); });
    d.addEventListener("keydown", function (e) {
      var tg = e.target;
      if (!visible || e.altKey || e.ctrlKey || e.metaKey || (tg && tg.closest && tg.closest("input, textarea, select, [contenteditable]"))) return;
      if (e.key === "ArrowRight") { e.preventDefault(); go((cur + 1) % dests.length, true); }
      else if (e.key === "ArrowLeft") { e.preventDefault(); go((cur - 1 + dests.length) % dests.length, true); }
      else if (e.key === "+" || e.key === "=") window.dispatchEvent(new CustomEvent("qd:drone-zoom", { detail: { dir: "in" } }));
      else if (e.key === "-") window.dispatchEvent(new CustomEvent("qd:drone-zoom", { detail: { dir: "out" } }));
    });
    if (autoBtn) autoBtn.addEventListener("click", function () { setAuto(!auto); });
    setAuto(auto);
    state.dest = 0;

    if ("IntersectionObserver" in window) {
      new IntersectionObserver(function (en) { visible = en[0].isIntersecting; }, { threshold: 0.45 }).observe(root);
    }
    (function loop(now) {
      var dt = now - last;
      last = now;
      if (auto && visible && !d.hidden) {
        elapsed += dt;
        if (autoBar) autoBar.style.transform = "scaleX(" + Math.min(1, elapsed / DUR) + ")";
        if (elapsed >= DUR) go((cur + 1) % dests.length, false);
      }
      requestAnimationFrame(loop);
    })(last);

    if (anim) {
      gsap.from($$(".drone__intro, .dest-list, .dest-infos", root), { opacity: 0, x: -30, duration: 0.9, ease: "power3.out", stagger: 0.1, scrollTrigger: { trigger: root, start: "top 65%", once: true } });
    }
  }

  /* ------------------------------------------------------------------
     Grupo GPS: as duas linhas do tempo se desenham com o scroll
  ------------------------------------------------------------------ */
  function initGps() {
    var svg = $(".gps-svg");
    if (!svg || !anim || reduce) return;
    var paths = $$(".gps-path", svg);
    paths.forEach(function (p) {
      var len = p.getTotalLength();
      p.style.strokeDasharray = len;
      p.style.strokeDashoffset = len;
    });
    var tl = gsap.timeline({ scrollTrigger: { trigger: svg, start: "top 80%", end: "bottom 60%", scrub: 0.8 } });
    tl.to(paths[0], { strokeDashoffset: 0, ease: "none", duration: 1 }, 0)
      .to(paths[1], { strokeDashoffset: 0, ease: "none", duration: 0.75 }, 0.25)
      .to(paths[2], { strokeDashoffset: 0, ease: "none", duration: 0.25 }, 1)
      .fromTo($$(".gps-pop, .gps-merge", svg), { opacity: 0 }, { opacity: 1, duration: 0.3, stagger: 0.1 }, 0);
  }

  /* ------------------------------------------------------------------
     Cards: holofote que segue o ponteiro + leve inclinação 3D
  ------------------------------------------------------------------ */
  function initSpotlight() {
    if (!fine) return;
    $$(".card, .post, .leader, .office, .people-stat, .doc, .p-card, .big-number, .gps-fact, .does__list li, .quote").forEach(function (el) {
      if (getComputedStyle(el).position === "static") el.style.position = "relative";
      var s = d.createElement("span");
      s.className = "spotlight";
      s.setAttribute("aria-hidden", "true");
      el.appendChild(s);
      el.addEventListener("pointermove", function (e) {
        var r = el.getBoundingClientRect();
        el.style.setProperty("--sx", (e.clientX - r.left) + "px");
        el.style.setProperty("--sy", (e.clientY - r.top) + "px");
      });
    });
    if (!anim || reduce) return;
    $$(".card, .post, .leader, .people-stat, .gps-fact").forEach(function (el) {
      el.addEventListener("pointermove", function (e) {
        var r = el.getBoundingClientRect();
        var px = (e.clientX - r.left) / r.width - 0.5, py = (e.clientY - r.top) / r.height - 0.5;
        gsap.to(el, { rotationY: px * 6, rotationX: -py * 6, transformPerspective: 900, duration: 0.6, ease: "power3.out", overwrite: "auto" });
      });
      el.addEventListener("pointerleave", function () {
        gsap.to(el, { rotationY: 0, rotationX: 0, duration: 0.8, ease: "power3.out", overwrite: "auto" });
      });
    });
  }

  /* ------------------------------------------------------------------
     Eyebrows com efeito de decodificação
  ------------------------------------------------------------------ */
  function initScramble() {
    if (!anim || reduce) return;
    var chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789/#·";
    $$(".eyebrow").forEach(function (el) {
      var node = null;
      for (var i = el.childNodes.length - 1; i >= 0; i--) {
        var c = el.childNodes[i];
        if (c.nodeType === 3 && c.textContent.trim()) { node = c; break; }
      }
      if (!node) return;
      var final = node.textContent;
      ST.create({
        trigger: el, start: "top 96%", once: true,
        onEnter: function () {
          var start = performance.now(), dur = 650;
          (function step(now) {
            var p = Math.min(1, (now - start) / dur);
            var n = Math.floor(final.length * p);
            var out = final.slice(0, n);
            for (var k = n; k < final.length; k++) out += final[k] === " " ? " " : chars[(Math.random() * chars.length) | 0];
            node.textContent = out;
            if (p < 1) requestAnimationFrame(step); else node.textContent = final;
          })(start);
        }
      });
    });
  }

  /* ------------------------------------------------------------------
     Hero: saída com parallax ao rolar
  ------------------------------------------------------------------ */
  function initHeroScroll() {
    var hero = $(".hero");
    if (!hero || !anim || reduce) return;
    var opts = { trigger: hero, start: "top top", end: "bottom top", scrub: true };
    gsap.to(".hero__content", { yPercent: -16, opacity: 0.1, ease: "none", scrollTrigger: opts });
    gsap.to(".hero__canvas", { scale: 1.15, opacity: 0.3, ease: "none", scrollTrigger: opts });
    gsap.to(".hero__hud", { opacity: 0, ease: "none", scrollTrigger: opts });
  }

  /* ------------------------------------------------------------------
     Letreiro de setores acelera com a velocidade do scroll
  ------------------------------------------------------------------ */
  function initMarqueeVelocity() {
    var track = $(".marquee__track");
    if (!track || !lenis || reduce || !track.getAnimations) return;
    var boost = 0;
    lenis.on("scroll", function (l) { boost = Math.min(5, Math.abs(l.velocity || 0) * 0.12); });
    (function loop() {
      var a = track.getAnimations()[0];
      if (a) a.playbackRate += (1 + boost - a.playbackRate) * 0.08;
      boost *= 0.94;
      requestAnimationFrame(loop);
    })();
  }

  /* ------------------------------------------------------------------
     Transição entre páginas
  ------------------------------------------------------------------ */
  function initPageTransitions() {
    var overlay = $(".page-transition");
    if (!overlay) return;
    d.addEventListener("click", function (e) {
      if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      var a = e.target.closest("a[href]");
      if (!a || a.target === "_blank" || a.hasAttribute("download")) return;
      var url = new URL(a.href, location.href);
      if (url.origin !== location.origin || url.pathname === location.pathname) return;
      if (!/(\.html|\/)$/.test(url.pathname)) return;
      e.preventDefault();
      var label = $(".pt__label", overlay);
      if (label) label.textContent = (a.getAttribute("aria-label") || a.textContent || "Qualidados").trim().replace(/\s+/g, " ").slice(0, 42);
      try { sessionStorage.setItem("qd-nav", "1"); } catch (err) {}
      html.classList.remove("is-arriving");
      html.classList.add("is-leaving");
      setTimeout(function () { location.href = url.href; }, reduce ? 260 : 580);
    });
    window.addEventListener("pageshow", function (ev) {
      if (ev.persisted) html.classList.remove("is-leaving", "is-arriving");
    });
  }

  /* ------------------------------------------------------------------
     Dashboards: escala proporcional (desenhados para 700 px de largura)
  ------------------------------------------------------------------ */
  function initDashScale() {
    var screens = $$(".device__screen");
    if (!screens.length) return;
    var fit = function () {
      screens.forEach(function (s) { s.style.setProperty("--dash-scale", String(Math.min(1, s.clientWidth / 700))); });
    };
    fit();
    if ("ResizeObserver" in window) {
      var ro = new ResizeObserver(fit);
      screens.forEach(function (s) { ro.observe(s); });
    } else window.addEventListener("resize", fit);
  }

  /* ------------------------------------------------------------------
     Preferência de animação (botão no rodapé)
  ------------------------------------------------------------------ */
  function initMotionToggle() {
    $$("[data-motion-toggle]").forEach(function (btn) {
      if (!btn.classList.contains("drone__motion")) btn.textContent = reduce ? "Animações: reduzidas · ativar completas" : "Animações: completas · reduzir";
      btn.setAttribute("aria-pressed", String(!reduce));
      btn.addEventListener("click", function () {
        try { localStorage.setItem("qd-motion", reduce ? "full" : "reduced"); } catch (e) {}
        location.reload();
      });
    });
  }

  /* ------------------------------------------------------------------
     Boot
  ------------------------------------------------------------------ */
  function init() {
    if (window.QD && window.QD.ready) window.QD.ready();
    initLenis();
    initHeader();
    initAnchors();
    initCursor();
    initMagnetic();
    initSplits();
    initReveals();
    initCounters();
    initManifesto();
    initHeroScroll();
    initSpecs();
    initConsole();
    initDevices();
    initDashScale();
    initDrone();
    initGps();
    initTimeline();
    initVTimeline();
    initValues();
    initArt();
    initMap();
    initFilters();
    initSubnav();
    initForms();
    initClock();
    initHeroModes();
    initMotionToggle();
    initSpotlight();
    initScramble();
    initMarqueeVelocity();
    initPageTransitions();

    // Vindo de outra página do site, a cortina ainda está saindo: atrasa a entrada do hero.
    var arriveDelay = html.classList.contains("is-arriving") ? 0.45 : 0;
    if ($(".hero")) initPreloader(heroIntro);
    else {
      var pre = $(".preloader"); if (pre) pre.remove();
      var ph = $("[data-split='hero']");
      if (ph) {
        var words = splitText(ph);
        if (anim) {
          gsap.fromTo(words, wordsFrom(), { yPercent: 0, opacity: 1, duration: reduce ? 1 : 1.3, ease: "expo.out", stagger: reduce ? 0.03 : 0.05, delay: 0.1 + arriveDelay });
          gsap.to("[data-hero]", { opacity: 1, y: 0, duration: 1.2, ease: "expo.out", stagger: 0.1, delay: 0.35 + arriveDelay });
        }
      }
    }

    var refresh = function () { if (anim) ST.refresh(); };
    if (d.fonts && d.fonts.ready) d.fonts.ready.then(refresh);
    window.addEventListener("load", function () {
      refresh();
      if (location.hash) {
        var t = d.getElementById(decodeURIComponent(location.hash.slice(1)));
        if (t) setTimeout(function () { scrollToEl(t, true); }, 60);
      }
    });
  }

  if (d.readyState === "loading") d.addEventListener("DOMContentLoaded", init);
  else init();
})();
