/* Tema, idioma, navegação e animações. Sem dependências externas. */
(function () {
  "use strict";

  var STORE_THEME = "gj.theme";
  var STORE_LANG = "gj.lang";
  var root = document.documentElement;
  var reduced = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var currentLang = "pt";

  /* localStorage pode lançar (modo privado, cookies bloqueados) — nunca quebrar a página. */
  function read(key) {
    try { return window.localStorage.getItem(key); } catch (e) { return null; }
  }
  function write(key, value) {
    try { window.localStorage.setItem(key, value); } catch (e) { /* ignora */ }
  }

  /* ---------- Tema ---------- */
  function applyTheme(theme) {
    var next = theme === "light" ? "light" : "dark";
    root.setAttribute("data-theme", next);
    var meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute("content", next === "light" ? "#f7f9fc" : "#0b1117");
    write(STORE_THEME, next);
  }

  function initTheme() {
    var saved = read(STORE_THEME);
    if (saved === "light" || saved === "dark") { applyTheme(saved); return; }
    var prefersLight = window.matchMedia && window.matchMedia("(prefers-color-scheme: light)").matches;
    applyTheme(prefersLight ? "light" : "dark");
  }

  /* ---------- Idioma ---------- */
  function translate(lang) {
    var dict = (window.I18N && window.I18N[lang]) || null;
    if (!dict) return;
    currentLang = lang;

    // Texto: sempre textContent, nunca innerHTML.
    document.querySelectorAll("[data-i18n]").forEach(function (el) {
      var value = dict[el.getAttribute("data-i18n")];
      if (typeof value === "string") el.textContent = value;
    });

    // Atributos: formato "attr:chave", separados por vírgula.
    document.querySelectorAll("[data-i18n-attr]").forEach(function (el) {
      el.getAttribute("data-i18n-attr").split(",").forEach(function (pair) {
        var parts = pair.split(":");
        if (parts.length !== 2) return;
        var value = dict[parts[1].trim()];
        if (typeof value === "string") el.setAttribute(parts[0].trim(), value);
      });
    });

    if (dict["doc.title"]) document.title = dict["doc.title"];
    var desc = document.querySelector('meta[name="description"]');
    if (desc && dict["doc.desc"]) desc.setAttribute("content", dict["doc.desc"]);

    root.setAttribute("lang", lang === "en" ? "en" : "pt-BR");

    document.querySelectorAll(".lang-switch button").forEach(function (btn) {
      var active = btn.getAttribute("data-lang") === lang;
      btn.classList.toggle("is-active", active);
      btn.setAttribute("aria-pressed", active ? "true" : "false");
    });

    write(STORE_LANG, lang);
    restartTyping();
  }

  function initLang() {
    var saved = read(STORE_LANG);
    if (saved === "pt" || saved === "en") { translate(saved); return; }
    var nav = (navigator.language || "pt").toLowerCase();
    translate(nav.indexOf("pt") === 0 ? "pt" : "en");
  }

  /* ---------- Efeito de digitação na chamada do hero ---------- */
  var typing = { timer: 0, word: 0, char: 0, erasing: false };

  function typedWords() {
    var dict = (window.I18N && window.I18N[currentLang]) || {};
    var words = dict["hero.roleWords"];
    return Array.isArray(words) && words.length ? words : [];
  }

  function restartTyping() {
    var el = document.getElementById("typed");
    if (!el) return;
    clearTimeout(typing.timer);
    var words = typedWords();
    if (!words.length) return;

    // Sem animação: mostra a primeira frase e para por aqui.
    if (reduced) { el.textContent = words[0]; return; }

    typing.word = 0; typing.char = 0; typing.erasing = false;
    el.textContent = "";
    step(el, words);
  }

  function step(el, words) {
    var word = words[typing.word % words.length];
    var delay;

    if (!typing.erasing) {
      typing.char++;
      el.textContent = word.slice(0, typing.char);
      if (typing.char >= word.length) { typing.erasing = true; delay = 2000; }
      else delay = 45 + Math.random() * 45;
    } else {
      typing.char--;
      el.textContent = word.slice(0, typing.char);
      if (typing.char <= 0) { typing.erasing = false; typing.word++; delay = 260; }
      else delay = 22;
    }
    typing.timer = setTimeout(function () { step(el, words); }, delay);
  }

  /* ---------- Revelação ao rolar ---------- */
  function initReveal() {
    var items = document.querySelectorAll(".reveal");
    if (!items.length) return;

    // Sem IntersectionObserver ou com movimento reduzido: tudo visível de imediato.
    if (reduced || !("IntersectionObserver" in window)) {
      items.forEach(function (el) { el.classList.add("is-visible"); });
      return;
    }

    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        show(entry.target);
      });
    }, { rootMargin: "0px 0px -8% 0px", threshold: 0.08 });

    function show(el) {
      el.classList.add("is-visible");
      io.unobserve(el);
    }

    // Um salto de âncora passa por cima de blocos inteiros sem disparar o observer,
    // deixando-os em branco até o visitante rolar de volta. Esta varredura revela
    // tudo que já ficou na altura da janela ou acima dela.
    function sweep() {
      var pending = 0;
      items.forEach(function (el) {
        if (el.classList.contains("is-visible")) return;
        if (el.getBoundingClientRect().top < window.innerHeight) show(el);
        else pending++;
      });
      if (!pending) {
        window.removeEventListener("scroll", onScroll);
        window.removeEventListener("hashchange", sweep);
      }
    }

    var ticking = false;
    function onScroll() {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(function () { ticking = false; sweep(); });
    }

    items.forEach(function (el) { io.observe(el); });
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("hashchange", sweep);
    sweep();
  }

  /* ---------- Contadores das estatísticas ---------- */
  function countUp(el) {
    var target = parseInt(el.getAttribute("data-count"), 10);
    if (isNaN(target)) return;
    var suffix = el.getAttribute("data-suffix") || "";
    if (reduced) { el.textContent = target + suffix; return; }

    var start = performance.now();
    var duration = 1100;
    function frame(now) {
      var t = Math.min((now - start) / duration, 1);
      var eased = 1 - Math.pow(1 - t, 3);
      el.textContent = Math.round(target * eased) + suffix;
      if (t < 1) requestAnimationFrame(frame);
    }
    requestAnimationFrame(frame);
  }

  function initCounters() {
    var nums = document.querySelectorAll("[data-count]");
    if (!nums.length) return;
    if (!("IntersectionObserver" in window)) { nums.forEach(countUp); return; }

    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        countUp(entry.target);
        io.unobserve(entry.target);
      });
    }, { threshold: 0.6 });
    nums.forEach(function (el) { io.observe(el); });
  }

  /* ---------- Barra de progresso de leitura ---------- */
  function initProgress() {
    var bar = document.getElementById("scrollProgress");
    if (!bar) return;
    var ticking = false;

    function update() {
      var max = document.documentElement.scrollHeight - window.innerHeight;
      var pct = max > 0 ? (window.scrollY / max) * 100 : 0;
      bar.style.width = Math.min(100, Math.max(0, pct)) + "%";
      ticking = false;
    }
    window.addEventListener("scroll", function () {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(update);
    }, { passive: true });
    update();
  }

  /* ---------- Constelação do hero ---------- */
  function initCanvas() {
    var canvas = document.getElementById("heroCanvas");
    if (!canvas || reduced || !canvas.getContext) return;

    var ctx = canvas.getContext("2d");
    var dots = [];
    var raf = 0;
    var w = 0, h = 0;

    function resize() {
      var rect = canvas.parentElement.getBoundingClientRect();
      var dpr = Math.min(window.devicePixelRatio || 1, 2);
      w = rect.width; h = rect.height;
      canvas.width = w * dpr;
      canvas.height = h * dpr;
      canvas.style.width = w + "px";
      canvas.style.height = h + "px";
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      // Densidade proporcional à área, com teto para não pesar no celular.
      var count = Math.min(70, Math.round((w * h) / 16000));
      dots = [];
      for (var i = 0; i < count; i++) {
        dots.push({
          x: Math.random() * w, y: Math.random() * h,
          vx: (Math.random() - 0.5) * 0.25, vy: (Math.random() - 0.5) * 0.25,
          r: 1 + Math.random() * 1.4
        });
      }
    }

    function draw() {
      var light = root.getAttribute("data-theme") === "light";
      var dot = light ? "3, 105, 161" : "56, 189, 248";
      ctx.clearRect(0, 0, w, h);

      for (var i = 0; i < dots.length; i++) {
        var d = dots[i];
        d.x += d.vx; d.y += d.vy;
        if (d.x < 0 || d.x > w) d.vx *= -1;
        if (d.y < 0 || d.y > h) d.vy *= -1;

        ctx.beginPath();
        ctx.arc(d.x, d.y, d.r, 0, Math.PI * 2);
        ctx.fillStyle = "rgba(" + dot + ", " + (light ? 0.5 : 0.65) + ")";
        ctx.fill();

        for (var j = i + 1; j < dots.length; j++) {
          var o = dots[j];
          var dist = Math.hypot(d.x - o.x, d.y - o.y);
          if (dist > 130) continue;
          ctx.beginPath();
          ctx.moveTo(d.x, d.y);
          ctx.lineTo(o.x, o.y);
          ctx.strokeStyle = "rgba(" + dot + ", " + (1 - dist / 130) * (light ? 0.14 : 0.2) + ")";
          ctx.lineWidth = 1;
          ctx.stroke();
        }
      }
      raf = requestAnimationFrame(draw);
    }

    // Fora da tela a animação não precisa rodar — poupa bateria no celular.
    function toggle(run) {
      if (run && !raf) raf = requestAnimationFrame(draw);
      if (!run && raf) { cancelAnimationFrame(raf); raf = 0; }
    }

    resize();
    toggle(true);
    window.addEventListener("resize", resize);

    if ("IntersectionObserver" in window) {
      new IntersectionObserver(function (entries) {
        toggle(entries[0].isIntersecting);
      }, { threshold: 0 }).observe(canvas);
    }
    document.addEventListener("visibilitychange", function () {
      toggle(!document.hidden);
    });
  }

  /* ---------- Ligações ---------- */
  function bind() {
    var themeBtn = document.getElementById("themeToggle");
    if (themeBtn) {
      themeBtn.addEventListener("click", function () {
        applyTheme(root.getAttribute("data-theme") === "light" ? "dark" : "light");
      });
    }

    document.querySelectorAll(".lang-switch button").forEach(function (btn) {
      btn.addEventListener("click", function () { translate(btn.getAttribute("data-lang")); });
    });

    var navToggle = document.getElementById("navToggle");
    var navMenu = document.getElementById("navMenu");
    if (navToggle && navMenu) {
      navToggle.addEventListener("click", function () {
        var open = navMenu.classList.toggle("is-open");
        navToggle.setAttribute("aria-expanded", open ? "true" : "false");
      });
      navMenu.addEventListener("click", function (event) {
        if (event.target.tagName === "A") {
          navMenu.classList.remove("is-open");
          navToggle.setAttribute("aria-expanded", "false");
        }
      });
    }

    // Só uma pergunta do FAQ aberta por vez.
    var faq = document.querySelectorAll(".faq-item");
    faq.forEach(function (item) {
      item.addEventListener("toggle", function () {
        if (!item.open) return;
        faq.forEach(function (other) { if (other !== item) other.open = false; });
      });
    });

    // Pergunta fechada não sai no PDF: abre todas antes de imprimir e restaura depois.
    var wasOpen = [];
    window.addEventListener("beforeprint", function () {
      wasOpen = [];
      faq.forEach(function (item, i) { wasOpen[i] = item.open; item.open = true; });
    });
    window.addEventListener("afterprint", function () {
      faq.forEach(function (item, i) { item.open = !!wasOpen[i]; });
    });

    var printBtn = document.getElementById("printBtn");
    if (printBtn) printBtn.addEventListener("click", function () { window.print(); });

    var year = document.getElementById("year");
    if (year) year.textContent = String(new Date().getFullYear());
  }

  function start() {
    initLang();
    bind();
    initReveal();
    initCounters();
    initProgress();
    initCanvas();
  }

  initTheme();
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", start);
  else start();
})();
