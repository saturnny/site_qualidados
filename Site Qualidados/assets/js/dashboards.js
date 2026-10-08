/* ==========================================================================
   Qualidados — telas ilustrativas das soluções digitais
   QDDash.render(key) → HTML da tela
   QDDash.play(el, key) → anima a tela e devolve uma função para parar
   ========================================================================== */
(function () {
  "use strict";

  var CHECK = '<svg viewBox="0 0 24 24"><path d="M20 6L9 17l-5-5"/></svg>';

  function sCurve(t) { return 1 / (1 + Math.exp(-10 * (t - 0.5))); }

  function curvePath(fn, w, h, from, to, steps) {
    var d = "";
    for (var i = 0; i <= steps; i++) {
      var t = from + (to - from) * (i / steps);
      var x = t * w, y = h - fn(t) * h;
      d += (i ? "L" : "M") + x.toFixed(1) + " " + y.toFixed(1);
    }
    return d;
  }

  function gridLines(w, h, rows) {
    var s = "";
    for (var i = 0; i <= rows; i++) {
      var y = (h / rows) * i;
      s += '<line class="grid-line" x1="0" x2="' + w + '" y1="' + y + '" y2="' + y + '"/>';
    }
    return s;
  }

  var T = {};

  /* ---------- Fiscal 4.0 ---------- */
  T.fiscal = function () {
    var items = [
      ["Torque dos estojos do flange", "ok"],
      ["Teste de estanqueidade", "ok"],
      ["Alinhamento bomba–motor", "warn"],
      ["Instrumentação calibrada", "ok"],
      ["Registro fotográfico e vídeo", "ok"]
    ];
    var rows = items.map(function (it) {
      return '<div class="check-row"><span class="check-box">' + CHECK + "</span>" + it[0] +
        '<span class="tag-s ' + it[1] + '">' + (it[1] === "ok" ? "CONFORME" : "DESVIO") + "</span></div>";
    }).join("");
    return '' +
      '<div class="w-grid" style="grid-template-columns:1.05fr 1fr">' +
        '<div class="scan-frame">' +
          '<svg class="equip" viewBox="0 0 200 140" fill="none" stroke="currentColor" stroke-width="1.2"><rect x="72" y="16" width="46" height="100" rx="23"/><path d="M72 48H32v40H20M118 58h36V30h16M118 98h22"/><rect x="12" y="82" width="8" height="12"/><circle cx="148" cy="98" r="8"/><path d="M95 116v14M80 130h30M154 22v16M72 70h46M72 90h46" opacity=".5"/></svg>' +
          '<span class="scan-line"></span>' +
          '<span class="ar-tag" style="left:62%;top:14%">PSV-104 · OK</span>' +
          '<span class="ar-tag crit" style="left:14%;top:66%">FLANGE F-12 · DESVIO</span>' +
          '<span class="ar-tag" style="left:66%;top:74%">V-201 · 4,2 bar</span>' +
        "</div>" +
        '<div class="w"><div class="w__label"><span>Checklist · P-201A</span><span>AR</span></div><div style="margin-top:6px">' + rows + "</div></div>" +
      "</div>" +
      '<div class="w-grid" style="grid-template-columns:repeat(3,minmax(0,1fr))">' +
        '<div class="w"><div class="w__label">Itens inspecionados</div><div class="w__value"><span data-dcount="186">0</span><small>/240</small></div><div class="bar-track"><div class="bar-fill" data-dbar="0.775"></div></div></div>' +
        '<div class="w"><div class="w__label">Desvios abertos</div><div class="w__value"><span data-dcount="7">0</span></div><div class="w__delta neg">▲ 2 em campo</div></div>' +
        '<div class="w"><div class="w__label">Avanço físico</div><div class="w__value"><span data-dcount="77.5" data-dec="1">0</span><small>%</small></div><div class="w__delta">▲ 3,1% semana</div></div>' +
      "</div>";
  };

  /* ---------- QD Inspect ---------- */
  T.inspect = function () {
    var pts = [[40, 150, "ok"], [95, 110, "ok"], [150, 132, "warn"], [205, 78, "ok"], [262, 104, "crit"], [318, 58, "ok"], [362, 92, "warn"]];
    var path = pts.map(function (p, i) { return (i ? "L" : "M") + p[0] + " " + p[1]; }).join("");
    var col = { ok: "#5CD08A", warn: "#C9A961", crit: "#FF7A8A" };
    var circles = pts.map(function (p, i) {
      return '<g class="rp" style="opacity:0"><circle cx="' + p[0] + '" cy="' + p[1] + '" r="10" fill="' + col[p[2]] + '" opacity=".15"/>' +
        '<circle cx="' + p[0] + '" cy="' + p[1] + '" r="4.5" fill="' + col[p[2]] + '"/>' +
        '<text x="' + (p[0] + 9) + '" y="' + (p[1] - 10) + '" fill="rgba(246,238,233,.6)" font-size="9" font-family="IBM Plex Mono, monospace">P' + String(i + 1).padStart(2, "0") + "</text></g>";
    }).join("");
    var list = [["B-104 · Bomba centrífuga", "crit", "ALTA"], ["TQ-02 · Tanque de estocagem", "warn", "MÉDIA"], ["E-310 · Trocador de calor", "warn", "MÉDIA"], ["C-501 · Compressor", "ok", "BAIXA"]];
    return '' +
      '<div class="w-grid" style="grid-template-columns:repeat(4,minmax(0,1fr))">' +
        '<div class="w"><div class="w__label">Inspeções hoje</div><div class="w__value" data-dcount="42">0</div></div>' +
        '<div class="w"><div class="w__label">Não conformidades</div><div class="w__value" data-dcount="5">0</div></div>' +
        '<div class="w"><div class="w__label">Rotas ativas</div><div class="w__value" data-dcount="6">0</div></div>' +
        '<div class="w"><div class="w__label">Sincronização</div><div class="w__value" style="font-size:15px;margin-top:9px;color:#5CD08A" data-sync>● Online</div></div>' +
      "</div>" +
      '<div class="w-grid" style="grid-template-columns:1.4fr 1fr">' +
        '<div class="route-map"><svg viewBox="0 0 400 200" preserveAspectRatio="xMidYMid meet">' +
          '<g fill="none" stroke="rgba(234,219,181,.14)"><rect x="20" y="20" width="90" height="50" rx="4"/><rect x="130" y="24" width="60" height="70" rx="4"/><rect x="220" y="130" width="80" height="50" rx="4"/><rect x="300" y="18" width="80" height="30" rx="4"/><circle cx="330" cy="150" r="24"/></g>' +
          '<path class="route" d="' + path + '" fill="none" stroke="#C9A961" stroke-width="1.6" stroke-dasharray="5 5"/>' + circles +
        "</svg></div>" +
        '<div class="w"><div class="w__label"><span>Criticidade</span><span>GPS</span></div><div style="margin-top:4px">' +
          list.map(function (l) { return '<div class="check-row is-done" style="opacity:0">' + l[0] + '<span class="tag-s ' + l[1] + '">' + l[2] + "</span></div>"; }).join("") +
        "</div></div>" +
      "</div>";
  };

  /* ---------- Cleopatra Enterprise ---------- */
  T.cleopatra = function () {
    var tasks = [["Isolamento e bloqueio", 0, 14, 1], ["Abertura de equipamentos", 10, 22, 1], ["Inspeção interna", 20, 26, 0.9], ["Reparos mecânicos", 34, 34, 0.55], ["Testes hidrostáticos", 62, 18, 0], ["Partida da unidade", 80, 16, 0]];
    var gantt = tasks.map(function (t, i) {
      return '<div class="gantt-row"><span style="white-space:nowrap;overflow:hidden;text-overflow:ellipsis">' + t[0] + '</span><div class="gantt-track">' +
        '<div class="gantt-bar' + (i === 3 ? " gold" : "") + '" style="left:' + t[1] + "%;width:" + t[2] + '%"><i style="transform:scaleX(' + t[3] + ')"></i></div></div></div>';
    }).join("");
    var W = 600, H = 120;
    var plan = curvePath(sCurve, W, H, 0, 1, 60);
    var real = curvePath(function (t) { return sCurve(t) * (1 + 0.04 * Math.sin(t * 9)) + 0.015; }, W, H, 0, 0.64, 40);
    return '' +
      '<div class="w"><div class="w__label"><span>Parada programada · U-200</span><span>D+12 de 21</span></div>' +
        '<div style="position:relative;margin-top:10px;display:grid;gap:4px">' + gantt +
        '<div style="position:absolute;top:-4px;bottom:-4px;left:calc(132px + (100% - 132px) * .6);width:1px;background:#E0405A"></div></div>' +
      "</div>" +
      '<div class="w-grid" style="grid-template-columns:1.6fr 1fr">' +
        '<div class="w chart"><div class="w__label"><span>Curva S · avanço físico</span><span class="legend"><span><i class="dash"></i>Planejado</span><span><i></i>Real</span></span></div>' +
          '<svg viewBox="0 0 ' + W + " " + (H + 6) + '" style="margin-top:10px"><defs><linearGradient id="gArea" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stop-color="#C9A961" stop-opacity=".28"/><stop offset="1" stop-color="#C9A961" stop-opacity="0"/></linearGradient></defs>' +
          gridLines(W, H, 4) +
          '<path class="plan" d="' + plan + '"/>' +
          '<path class="area" d="' + real + "L" + (0.64 * W) + " " + H + "L0 " + H + 'Z" style="opacity:0"/>' +
          '<path class="real" d="' + real + '"/>' +
          "</svg></div>" +
        '<div class="w-grid" style="gap:10px">' +
          '<div class="w"><div class="w__label">SPI</div><div class="w__value" data-dcount="1.03" data-dec="2">0</div></div>' +
          '<div class="w"><div class="w__label">Avanço real</div><div class="w__value"><span data-dcount="64">0</span><small>%</small></div></div>' +
        "</div>" +
      "</div>";
  };

  /* ---------- QG IA ---------- */
  T.qgia = function () {
    var W = 600, H = 130;
    var hist = curvePath(function (t) { return 0.28 + 0.06 * Math.sin(t * 40) + 0.04 * Math.sin(t * 13) + (t > 0.55 ? (t - 0.55) * 0.9 : 0); }, W, H, 0, 0.72, 90);
    var fore = curvePath(function (t) { return 0.28 + (t - 0.55) * 0.9 + (t - 0.72) * 1.1; }, W, H, 0.72, 1, 20);
    var arcLen = 251.3;
    return '' +
      '<div class="w-grid" style="grid-template-columns:1fr 2fr">' +
        '<div class="w gauge"><div class="w__label" style="width:100%">Saúde do ativo</div>' +
          '<svg viewBox="0 0 200 120"><path d="M20 110a80 80 0 0 1 160 0" fill="none" stroke="rgba(234,219,181,.1)" stroke-width="12" stroke-linecap="round"/>' +
          '<path class="g-arc" d="M20 110a80 80 0 0 1 160 0" fill="none" stroke="url(#gGauge)" stroke-width="12" stroke-linecap="round" stroke-dasharray="' + arcLen + '" stroke-dashoffset="' + arcLen + '"/>' +
          '<defs><linearGradient id="gGauge"><stop offset="0" stop-color="#9E2235"/><stop offset="1" stop-color="#C9A961"/></linearGradient></defs></svg>' +
          '<div class="gauge__val"><b><span data-dcount="87">0</span>%</b><small>B-301 · BOMBA</small></div>' +
        "</div>" +
        '<div class="w chart"><div class="w__label"><span>Vibração RMS · predição</span><span class="legend"><span><i></i>Medido</span><span><i class="red"></i>Previsto</span></span></div>' +
          '<svg viewBox="0 0 ' + W + " " + (H + 6) + '" style="margin-top:10px">' + gridLines(W, H, 4) +
          '<rect x="' + (0.86 * W) + '" y="0" width="' + (0.14 * W) + '" height="' + H + '" fill="rgba(224,64,90,.12)"/>' +
          '<line x1="0" x2="' + W + '" y1="' + (H * 0.28) + '" y2="' + (H * 0.28) + '" stroke="rgba(224,64,90,.55)" stroke-dasharray="3 5"/>' +
          '<text x="' + (W - 4) + '" y="' + (H * 0.28 - 6) + '" text-anchor="end" fill="#FF7A8A" font-size="10" font-family="IBM Plex Mono, monospace">LIMITE ISO 10816</text>' +
          '<path class="real" d="' + hist + '"/><path class="crim" d="' + fore + '" stroke-dasharray="6 5"/>' +
          "</svg></div>" +
      "</div>" +
      '<div class="w-grid" style="grid-template-columns:1.6fr 1fr 1fr">' +
        '<div class="w"><div class="w__label">Alertas preditivos</div>' +
          '<div class="check-row is-done" style="opacity:0">B-301 · rolamento: falha provável em 18 dias<span class="tag-s crit">p 0,82</span></div>' +
          '<div class="check-row is-done" style="opacity:0">M-114 · desalinhamento incipiente<span class="tag-s warn">p 0,47</span></div>' +
        "</div>" +
        '<div class="w"><div class="w__label">Disponibilidade</div><div class="w__value"><span data-dcount="97.4" data-dec="1">0</span><small>%</small></div><div class="w__delta">▲ 1,2 p.p.</div></div>' +
        '<div class="w"><div class="w__label">MTBF</div><div class="w__value"><span data-dcount="412">0</span><small>h</small></div><div class="w__delta">▲ 8%</div></div>' +
      "</div>";
  };

  /* ---------- EngAgil ---------- */
  T.engagil = function () {
    var bars = [0.62, 0.84, 0.71, 0.93, 0.56, 0.78];
    var labels = ["F1", "F2", "F3", "F4", "F5", "F6"];
    var chart = bars.map(function (b, i) {
      return '<div style="display:grid;gap:6px;justify-items:center;flex:1"><div style="height:74px;width:100%;display:flex;align-items:flex-end"><div class="bar-fill" data-dbar-v="' + b + '" style="width:100%;height:' + (b * 100) + '%;transform-origin:bottom;border-radius:3px 3px 0 0;background:linear-gradient(180deg,#C9A961,#9E2235)"></div></div><span style="font-family:IBM Plex Mono,monospace;font-size:9.5px;color:rgba(246,238,233,.5)">' + labels[i] + "</span></div>";
    }).join("");
    return '' +
      '<div class="kanban">' +
        '<div class="kanban__col" data-col="0"><h5><span>A FAZER</span><span>3</span></h5>' +
          '<div class="k-card">Montagem de tubulação — Rack 3<small>FRENTE 02 · 120 HH</small></div>' +
          '<div class="k-card" data-mover>Pintura de estruturas<small>FRENTE 05 · 64 HH</small></div>' +
          '<div class="k-card">Instalação de suportes<small>FRENTE 01 · 40 HH</small></div>' +
        "</div>" +
        '<div class="kanban__col" data-col="1"><h5><span>EM EXECUÇÃO</span><span>2</span></h5>' +
          '<div class="k-card">Soldagem de spools<small>FRENTE 04 · GEORREF. OK</small></div>' +
          '<div class="k-card">Concretagem base B-07<small>FRENTE 03 · 88 HH</small></div>' +
        "</div>" +
        '<div class="kanban__col" data-col="2"><h5><span>CONCLUÍDO</span><span>4</span></h5>' +
          '<div class="k-card">Escavação e aterro<small>ASSINADO DIGITALMENTE</small></div>' +
          '<div class="k-card">Isolamento térmico<small>ASSINADO DIGITALMENTE</small></div>' +
        "</div>" +
      "</div>" +
      '<div class="w-grid" style="grid-template-columns:1.3fr 1fr">' +
        '<div class="w"><div class="w__label"><span>Produtividade por frente</span><span>HH real / HH orçado</span></div><div style="display:flex;gap:8px;margin-top:12px">' + chart + "</div></div>" +
        '<div class="w-grid" style="gap:10px">' +
          '<div class="w"><div class="w__label">Frentes ativas</div><div class="w__value" data-dcount="6">0</div></div>' +
          '<div class="w"><div class="w__label">Registros georreferenciados</div><div class="w__value" data-dcount="1284">0</div></div>' +
        "</div>" +
      "</div>";
  };

  function render(key) { return T[key] ? T[key]() : ""; }

  /* ---------- Animações ---------- */
  function countUp(el, dur) {
    var to = parseFloat(el.getAttribute("data-dcount"));
    var dec = parseInt(el.getAttribute("data-dec") || "0", 10);
    var start = performance.now();
    var raf;
    function tick(now) {
      var p = Math.min(1, (now - start) / dur);
      var e = 1 - Math.pow(1 - p, 3);
      el.textContent = (to * e).toLocaleString("pt-BR", { minimumFractionDigits: dec, maximumFractionDigits: dec });
      if (p < 1) raf = requestAnimationFrame(tick);
    }
    raf = requestAnimationFrame(tick);
    return function () {
      cancelAnimationFrame(raf);
      el.textContent = to.toLocaleString("pt-BR", { minimumFractionDigits: dec, maximumFractionDigits: dec });
    };
  }

  function drawPath(p, dur, delay) {
    var len = p.getTotalLength ? p.getTotalLength() : 600;
    p.style.transition = "none";
    p.style.strokeDasharray = len;
    p.style.strokeDashoffset = len;
    p.getBoundingClientRect();
    p.style.transition = "stroke-dashoffset " + dur + "ms cubic-bezier(.2,.8,.2,1) " + (delay || 0) + "ms";
    p.style.strokeDashoffset = 0;
  }

  function play(el, key) {
    var stops = [];
    var timers = [];
    var later = function (fn, ms) { timers.push(setTimeout(fn, ms)); };

    el.querySelectorAll("[data-dcount]").forEach(function (c) { stops.push(countUp(c, 1600)); });

    el.querySelectorAll("[data-dbar]").forEach(function (b) {
      b.style.transition = "none"; b.style.transform = "scaleX(0)";
      b.getBoundingClientRect();
      b.style.transition = "transform 1.6s cubic-bezier(.2,.8,.2,1) .2s";
      b.style.transform = "scaleX(" + b.getAttribute("data-dbar") + ")";
    });
    el.querySelectorAll("[data-dbar-v]").forEach(function (b, i) {
      b.style.transition = "none"; b.style.transform = "scaleY(0)";
      b.getBoundingClientRect();
      b.style.transition = "transform 1.2s cubic-bezier(.2,.8,.2,1) " + (0.1 + i * 0.08) + "s";
      b.style.transform = "scaleY(1)";
    });
    el.querySelectorAll(".gantt-bar").forEach(function (b, i) {
      b.style.transition = "none"; b.style.transform = "scaleX(0)";
      b.getBoundingClientRect();
      b.style.transition = "transform 1s cubic-bezier(.2,.8,.2,1) " + (i * 0.12) + "s";
      b.style.transform = "scaleX(1)";
    });

    if (key === "fiscal") {
      var rows = el.querySelectorAll(".check-row");
      rows.forEach(function (r) { r.classList.remove("is-done"); });
      rows.forEach(function (r, i) { later(function () { r.classList.add("is-done"); }, 500 + i * 650); });
    }

    if (key === "inspect") {
      var route = el.querySelector(".route");
      if (route) {
        route.style.strokeDashoffset = 0;
        var off = 0;
        var iv = setInterval(function () { off -= 1; route.style.strokeDashoffset = off; }, 50);
        timers.push({ iv: iv });
      }
      el.querySelectorAll(".rp").forEach(function (g, i) {
        g.style.transition = "opacity .5s"; g.style.opacity = 0;
        later(function () { g.style.opacity = 1; }, 200 + i * 180);
      });
      el.querySelectorAll(".check-row").forEach(function (r, i) {
        r.style.transition = "opacity .5s, transform .5s"; r.style.opacity = 0; r.style.transform = "translateX(10px)";
        later(function () { r.style.opacity = 1; r.style.transform = "none"; }, 400 + i * 220);
      });
      var sync = el.querySelector("[data-sync]");
      if (sync) {
        var on = true;
        var iv2 = setInterval(function () {
          on = !on;
          sync.textContent = on ? "● Online" : "◌ Offline";
          sync.style.color = on ? "#5CD08A" : "#C9A961";
        }, 2600);
        timers.push({ iv: iv2 });
      }
    }

    if (key === "cleopatra") {
      var real = el.querySelector(".real");
      if (real) drawPath(real, 1800, 300);
      var area = el.querySelector(".area");
      if (area) { area.style.transition = "opacity 1s 1.6s"; area.style.opacity = 0; area.getBoundingClientRect(); area.style.opacity = 1; }
    }

    if (key === "qgia") {
      var arc = el.querySelector(".g-arc");
      if (arc) {
        arc.style.transition = "none"; arc.style.strokeDashoffset = 251.3; arc.getBoundingClientRect();
        arc.style.transition = "stroke-dashoffset 1.8s cubic-bezier(.2,.8,.2,1) .2s";
        arc.style.strokeDashoffset = 251.3 * (1 - 0.87);
      }
      var r2 = el.querySelector(".real"); if (r2) drawPath(r2, 1800, 200);
      var c2 = el.querySelector(".crim"); if (c2) { c2.style.opacity = 0; later(function () { c2.style.transition = "opacity .8s"; c2.style.opacity = 1; }, 1800); }
      el.querySelectorAll(".check-row").forEach(function (r, i) {
        r.style.transition = "opacity .5s"; r.style.opacity = 0;
        later(function () { r.style.opacity = 1; }, 1200 + i * 400);
      });
    }

    if (key === "engagil") {
      var mover = el.querySelector("[data-mover]");
      var cols = el.querySelectorAll(".kanban__col");
      if (mover && cols.length === 3) {
        var home = cols[0];
        home.appendChild(mover);
        var step = 0;
        var move = function () {
          step = (step + 1) % 3;
          mover.classList.add("is-moving");
          var first = mover.getBoundingClientRect();
          cols[step].insertBefore(mover, cols[step].children[1] || null);
          var last = mover.getBoundingClientRect();
          mover.style.transition = "none";
          mover.style.transform = "translate(" + (first.left - last.left) + "px," + (first.top - last.top) + "px)";
          mover.getBoundingClientRect();
          mover.style.transition = "transform .8s cubic-bezier(.2,.8,.2,1)";
          mover.style.transform = "none";
          later(function () { mover.classList.remove("is-moving"); }, 900);
        };
        var iv3 = setInterval(move, 2200);
        timers.push({ iv: iv3 });
      }
    }

    return function stop() {
      stops.forEach(function (s) { s(); });
      timers.forEach(function (t) { if (t && t.iv) clearInterval(t.iv); else clearTimeout(t); });
    };
  }

  window.QDDash = { render: render, play: play };
})();
